"""
ImageGuard - Lambda `imageguard-process-image`

Trigger : S3 Event ObjectCreated:Put (prefix `uploads/`, suffix `.jpg`)
Luong   : kiem tra key -> DetectModerationLabels -> (neu hop le) DetectLabels
          -> SNS alert neu REJECTED -> UpdateItem co dieu kien PENDING -> APPROVED/REJECTED
Loi     : loi tam thoi (throttling, 5xx) -> raise -> Lambda async retry 2 lan -> DLQ (SQS)

Environment variables:
  TABLE_NAME                 imageguard-images
  BUCKET_NAME                imageguard-images-<ACCOUNT_ID>
  TOPIC_ARN                  arn:aws:sns:us-east-1:<ACCOUNT_ID>:imageguard-alerts
  BLOCKED_CATEGORIES         Explicit,Violence,Visually Disturbing,Drugs & Tobacco,Hate Symbols
  MIN_MODERATION_CONFIDENCE  60
  MAX_LABELS                 10
  MIN_LABEL_CONFIDENCE       80
"""
import json
import logging
import os
import re
import time
from datetime import datetime, timezone
from decimal import Decimal
from urllib.parse import unquote_plus

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

# Retry voi exponential backoff + jitter cho loi throttling / 5xx.
# Che do "standard" cua botocore tu xu ly ThrottlingException,
# ProvisionedThroughputExceededException, loi mang... toi da 5 lan goi.
BOTO_CONFIG = Config(
    retries={"max_attempts": 5, "mode": "standard"},
    connect_timeout=5,
    read_timeout=10,
)

# Tao client ngoai handler de tai su dung giua cac lan invoke (giam cold start)
rekognition = boto3.client("rekognition", config=BOTO_CONFIG)
sns = boto3.client("sns", config=BOTO_CONFIG)
table = boto3.resource("dynamodb", config=BOTO_CONFIG).Table(os.environ["TABLE_NAME"])

BUCKET_NAME = os.environ["BUCKET_NAME"]
TOPIC_ARN = os.environ["TOPIC_ARN"]
BLOCKED_CATEGORIES = {
    c.strip()
    for c in os.environ.get(
        "BLOCKED_CATEGORIES",
        "Explicit,Violence,Visually Disturbing,Drugs & Tobacco,Hate Symbols",
    ).split(",")
    if c.strip()
}
MIN_MODERATION_CONFIDENCE = float(os.environ.get("MIN_MODERATION_CONFIDENCE", "60"))
MAX_LABELS = int(os.environ.get("MAX_LABELS", "10"))
MIN_LABEL_CONFIDENCE = float(os.environ.get("MIN_LABEL_CONFIDENCE", "80"))

# Rekognition chi doc duoc anh toi da 15 MB khi lay tu S3
MAX_IMAGE_BYTES = 15 * 1024 * 1024

# Chi chap nhan key dung dinh dang uploads/{userId}/{imageId}.{jpg|jpeg|png}
# -> chan path traversal, ky tu la, key do ke xau tu dat.
KEY_PATTERN = re.compile(
    r"^uploads/([A-Za-z0-9-]{1,64})/([A-Za-z0-9-]{1,64})\.(jpg|jpeg|png)$"
)

# Loi do chinh tam anh hong -> retry cung vo ich -> danh dau REJECTED, khong retry
NON_RETRYABLE_IMAGE_ERRORS = {"InvalidImageFormatException", "ImageTooLargeException"}


class InvalidImageError(Exception):
    """Anh khong doc duoc (sai dinh dang / qua lon)."""


def lambda_handler(event, context):
    records = event.get("Records", [])
    for record in records:
        process_record(record)
    return {"processed": len(records)}


def process_record(record):
    start = time.time()
    bucket = record["s3"]["bucket"]["name"]
    # Key trong S3 Event bi URL-encode (dau cach -> '+'), phai decode truoc khi dung
    key = unquote_plus(record["s3"]["object"]["key"])
    size = record["s3"]["object"].get("size", 0)

    if bucket != BUCKET_NAME:
        log("warning", "unexpected_bucket", bucket=bucket)
        return

    match = KEY_PATTERN.match(key)
    if not match:
        log("warning", "invalid_key_skipped", key=key)
        return
    user_id, image_id = match.group(1), match.group(2)
    image = {"S3Object": {"Bucket": bucket, "Name": key}}

    if size > MAX_IMAGE_BYTES:
        finish(user_id, image_id, "REJECTED", start, reason="TOO_LARGE")
        return

    # 1) Kiem duyet noi dung
    try:
        moderation = call_rekognition(
            rekognition.detect_moderation_labels,
            Image=image,
            MinConfidence=MIN_MODERATION_CONFIDENCE,
        )
    except InvalidImageError as exc:
        finish(user_id, image_id, "REJECTED", start, reason=f"INVALID_IMAGE:{exc}")
        return

    mod_labels = moderation.get("ModerationLabels", [])
    categories = top_level_categories(mod_labels)
    blocked = sorted(categories & BLOCKED_CATEGORIES)
    moderation_items = [
        {
            "name": l["Name"],
            "parent": l.get("ParentName", ""),
            "confidence": to_decimal(l["Confidence"]),
        }
        for l in mod_labels
    ]

    labels = []
    if blocked:
        status = "REJECTED"
    else:
        status = "APPROVED"
        # 2) Chi gan nhan khi anh da hop le (tiet kiem 1 lan goi Rekognition)
        try:
            resp = call_rekognition(
                rekognition.detect_labels,
                Image=image,
                MaxLabels=MAX_LABELS,
                MinConfidence=MIN_LABEL_CONFIDENCE,
            )
            labels = [
                {"name": l["Name"], "confidence": to_decimal(l["Confidence"])}
                for l in resp.get("Labels", [])
            ]
        except InvalidImageError as exc:
            finish(user_id, image_id, "REJECTED", start, reason=f"INVALID_IMAGE:{exc}")
            return

    updated = finish(
        user_id,
        image_id,
        status,
        start,
        reason="BLOCKED_CATEGORY" if blocked else None,
        moderation_labels=moderation_items,
        labels=labels,
        blocked=blocked,
    )

    # Chi gui alert khi DB da cap nhat thanh cong (item hop le, dang PENDING).
    # -> Anh 'la' / upload trung khong spam email admin.
    if blocked and updated:
        try:
            publish_alert(user_id, image_id, key, blocked)
        except ClientError:
            # Khong raise: neu raise, lan retry se bi chan boi dieu kien PENDING.
            # Ket qua REJECTED da luu; ghi log ERROR + metric de alarm bat duoc.
            logger.exception("alert_publish_failed")
            emit_alert_failed_metric()


def call_rekognition(fn, **kwargs):
    try:
        return fn(**kwargs)
    except ClientError as exc:
        code = exc.response["Error"]["Code"]
        if code in NON_RETRYABLE_IMAGE_ERRORS:
            raise InvalidImageError(code) from exc
        # Loi khac (throttling da het luot retry, AccessDenied, 5xx...) -> raise
        # de Lambda async retry, het retry thi su kien vao DLQ.
        raise


def top_level_categories(mod_labels):
    """Lay danh muc cap 1 (L1) tu cay nhan, vd Weapons -> Violence."""
    parent_of = {l["Name"]: l.get("ParentName", "") for l in mod_labels}
    result = set()
    for label in mod_labels:
        name, seen = label["Name"], set()
        while parent_of.get(name) and name not in seen:
            seen.add(name)
            name = parent_of[name]
        result.add(name)
    return result


def publish_alert(user_id, image_id, key, blocked):
    message = {
        "event": "IMAGE_REJECTED",
        "userId": user_id,
        "imageId": image_id,
        "s3Key": key,  # chi gui key, KHONG gui link/presigned URL cua anh vi pham
        "blockedCategories": blocked,
        "time": now_iso(),
    }
    sns.publish(
        TopicArn=TOPIC_ARN,
        Subject="[ImageGuard] Anh bi tu choi",
        Message=json.dumps(message, ensure_ascii=False, indent=2),
    )


def finish(user_id, image_id, status, start, reason=None,
           moderation_labels=None, labels=None, blocked=None):
    updated = save_result(user_id, image_id, status, reason,
                          moderation_labels or [], labels or [], blocked or [])
    latency_ms = int((time.time() - start) * 1000)
    log("info", "image_processed", userId=user_id, imageId=image_id,
        status=status, reason=reason, blocked=blocked or [], updated=updated)
    emit_metrics(status, latency_ms)
    return updated


def emit_alert_failed_metric():
    print(json.dumps({
        "_aws": {
            "Timestamp": int(time.time() * 1000),
            "CloudWatchMetrics": [{
                "Namespace": "ImageGuard",
                "Dimensions": [["Service"]],
                "Metrics": [{"Name": "AlertPublishFailed", "Unit": "Count"}],
            }],
        },
        "Service": "process-image",
        "AlertPublishFailed": 1,
    }))


def save_result(user_id, image_id, status, reason, moderation_labels, labels, blocked):
    """UpdateItem CO DIEU KIEN: item phai ton tai va dang PENDING.

    - Chan anh 'la' (khong do presign-upload dang ky) tao ra item moi.
    - Idempotent: S3 Event co the giao trung; lan 2 se bi tu choi.
    - Upload de len key cu khong the doi REJECTED thanh APPROVED.
    """
    try:
        table.update_item(
            Key={"userId": user_id, "imageId": image_id},
            UpdateExpression=(
                "SET #st = :st, #rs = :rs, #ml = :ml, #lb = :lb, "
                "#bc = :bc, #pa = :pa"
            ),
            ConditionExpression="attribute_exists(#uid) AND #st = :pending",
            ExpressionAttributeNames={
                "#uid": "userId",
                "#st": "status",  # 'status' la reserved word cua DynamoDB
                "#rs": "reason",
                "#ml": "moderationLabels",
                "#lb": "labels",
                "#bc": "blockedCategories",
                "#pa": "processedAt",
            },
            ExpressionAttributeValues={
                ":st": status,
                ":pending": "PENDING",
                ":rs": reason,
                ":ml": moderation_labels,
                ":lb": labels,
                ":bc": blocked,
                ":pa": now_iso(),
            },
        )
        return True
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            log("warning", "item_missing_or_already_processed",
                userId=user_id, imageId=image_id)
            return False
        raise


def emit_metrics(status, latency_ms):
    """CloudWatch Embedded Metric Format: in JSON ra log -> CloudWatch tu tao metric.
    Khong can quyen cloudwatch:PutMetricData, khong ton them API call."""
    print(json.dumps({
        "_aws": {
            "Timestamp": int(time.time() * 1000),
            "CloudWatchMetrics": [{
                "Namespace": "ImageGuard",
                "Dimensions": [["Service"]],
                "Metrics": [
                    {"Name": "ImagesProcessed", "Unit": "Count"},
                    {"Name": "ImagesApproved", "Unit": "Count"},
                    {"Name": "ImagesRejected", "Unit": "Count"},
                    {"Name": "ProcessingLatency", "Unit": "Milliseconds"},
                ],
            }],
        },
        "Service": "process-image",
        "ImagesProcessed": 1,
        "ImagesApproved": int(status == "APPROVED"),
        "ImagesRejected": int(status == "REJECTED"),
        "ProcessingLatency": latency_ms,
    }))


def log(level, msg, **fields):
    getattr(logger, level)(json.dumps({"msg": msg, **fields}, ensure_ascii=False))


def to_decimal(value):
    # DynamoDB khong nhan float -> doi sang Decimal, lam tron 2 chu so
    return Decimal(str(round(value, 2)))


def now_iso():
    return datetime.now(timezone.utc).isoformat()
