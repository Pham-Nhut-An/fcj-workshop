"""
ImageGuard - Lambda `imageguard-presign-upload`
Route  : POST /upload-url  (API Gateway HTTP API + JWT Authorizer Cognito)
Body   : {"contentType": "image/jpeg"}
Tra ve : {"imageId", "uploadUrl", "expiresIn"}

Bao mat:
- userId LUON lay tu claim `sub` cua JWT (API Gateway da xac thuc), KHONG nhan tu body.
- Server tu sinh imageId (uuid4) va key -> client khong dat duoc ten file / duong dan.
- Presigned URL chi PUT duoc 1 key, het han sau URL_EXPIRES_SECONDS (mac dinh 300 s),
  va bat buoc dung Content-Type da ky.

Environment variables:
  BUCKET_NAME          imageguard-images-<ACCOUNT_ID>
  TABLE_NAME           imageguard-images
  URL_EXPIRES_SECONDS  300
"""
import base64
import json
import logging
import os
import uuid
from datetime import datetime, timezone

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

BUCKET_NAME = os.environ["BUCKET_NAME"]
TABLE_NAME = os.environ["TABLE_NAME"]
URL_EXPIRES_SECONDS = int(os.environ.get("URL_EXPIRES_SECONDS", "300"))
REGION = os.environ.get("AWS_REGION", "us-east-1")

# SigV4 + endpoint theo region -> URL dang https://<bucket>.s3.us-east-1.amazonaws.com/...
# (tranh redirect 307 lam hong CORS tren trinh duyet)
s3 = boto3.client(
    "s3",
    region_name=REGION,
    endpoint_url=f"https://s3.{REGION}.amazonaws.com",
    config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
)
table = boto3.resource("dynamodb", region_name=REGION).Table(TABLE_NAME)

# Chi nhan JPEG vi S3 trigger loc suffix .jpg
ALLOWED_CONTENT_TYPES = {"image/jpeg": "jpg"}


def lambda_handler(event, context):
    user_id = get_user_id(event)
    if not user_id:
        return response(401, {"message": "Unauthorized"})

    body = parse_body(event)
    if body is None:
        return response(400, {"message": "Body phai la JSON"})

    content_type = body.get("contentType", "image/jpeg")
    if content_type not in ALLOWED_CONTENT_TYPES:
        return response(400, {"message": "Chi chap nhan image/jpeg"})

    image_id = str(uuid.uuid4())
    key = f"uploads/{user_id}/{image_id}.{ALLOWED_CONTENT_TYPES[content_type]}"
    now = datetime.now(timezone.utc).isoformat()

    try:
        # Tao item PENDING truoc khi cap URL (buoc 3b tren so do).
        # process-image chi cap nhat item da ton tai + dang PENDING.
        table.put_item(
            Item={"userId": user_id, "imageId": image_id, "status": "PENDING", "createdAt": now},
            ConditionExpression="attribute_not_exists(imageId)",
        )
    except ClientError:
        logger.exception("put_item_failed")
        return response(500, {"message": "Khong tao duoc ban ghi"})

    upload_url = s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": BUCKET_NAME, "Key": key, "ContentType": content_type},
        ExpiresIn=URL_EXPIRES_SECONDS,
        HttpMethod="PUT",
    )

    # Khong log uploadUrl (chua chu ky + session token)
    logger.info(json.dumps({"msg": "upload_url_issued", "userId": user_id, "imageId": image_id}))
    return response(201, {
        "imageId": image_id,
        "uploadUrl": upload_url,
        "contentType": content_type,
        "expiresIn": URL_EXPIRES_SECONDS,
    })


def get_user_id(event):
    claims = (event.get("requestContext", {})
              .get("authorizer", {})
              .get("jwt", {})
              .get("claims", {}))
    return claims.get("sub")


def parse_body(event):
    raw = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        raw = base64.b64decode(raw).decode("utf-8")
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except (ValueError, UnicodeDecodeError):
        return None


def response(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False),
    }
