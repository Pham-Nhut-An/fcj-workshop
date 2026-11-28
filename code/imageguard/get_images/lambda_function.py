"""
ImageGuard - Lambda `imageguard-get-images`
Route  : GET /images  (API Gateway HTTP API + JWT Authorizer Cognito)
Tra ve : danh sach anh CUA CHINH user dang dang nhap, moi nhat truoc.

Bao mat:
- Query theo userId = claim `sub` cua JWT -> user A khong the doc anh cua user B.
- Chi anh APPROVED moi duoc cap presigned GET URL (5 phut) de hien thi;
  anh REJECTED / PENDING khong bao gio tra link anh.

Environment variables:
  BUCKET_NAME          imageguard-images-<ACCOUNT_ID>
  TABLE_NAME           imageguard-images
  URL_EXPIRES_SECONDS  300
  MAX_ITEMS            50
"""
import json
import logging
import os
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key
from botocore.config import Config

logger = logging.getLogger()
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

BUCKET_NAME = os.environ["BUCKET_NAME"]
TABLE_NAME = os.environ["TABLE_NAME"]
URL_EXPIRES_SECONDS = int(os.environ.get("URL_EXPIRES_SECONDS", "300"))
MAX_ITEMS = int(os.environ.get("MAX_ITEMS", "50"))
REGION = os.environ.get("AWS_REGION", "us-east-1")

s3 = boto3.client(
    "s3",
    region_name=REGION,
    endpoint_url=f"https://s3.{REGION}.amazonaws.com",
    config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
)
table = boto3.resource("dynamodb", region_name=REGION).Table(TABLE_NAME)


def lambda_handler(event, context):
    user_id = (event.get("requestContext", {})
               .get("authorizer", {})
               .get("jwt", {})
               .get("claims", {})
               .get("sub"))
    if not user_id:
        return response(401, {"message": "Unauthorized"})

    items, kwargs = [], {"KeyConditionExpression": Key("userId").eq(user_id)}
    while True:
        page = table.query(**kwargs)
        items.extend(page.get("Items", []))
        if "LastEvaluatedKey" not in page or len(items) >= 1000:
            break
        kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]

    items.sort(key=lambda i: i.get("createdAt", ""), reverse=True)
    result = [to_public(user_id, i) for i in items[:MAX_ITEMS]]

    logger.info(json.dumps({"msg": "images_listed", "userId": user_id, "count": len(result)}))
    return response(200, {"images": result})


def to_public(user_id, item):
    """Chi tra cac truong can thiet cho giao dien."""
    status = item.get("status", "PENDING")
    out = {
        "imageId": item["imageId"],
        "status": status,
        "createdAt": item.get("createdAt"),
        "processedAt": item.get("processedAt"),
        "labels": [l.get("name") for l in item.get("labels", [])],
        "blockedCategories": item.get("blockedCategories", []),
        "imageUrl": None,
    }
    if status == "APPROVED":
        out["imageUrl"] = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET_NAME, "Key": f"uploads/{user_id}/{item['imageId']}.jpg"},
            ExpiresIn=URL_EXPIRES_SECONDS,
        )
    return out


def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError


def response(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False, default=decimal_default),
    }
