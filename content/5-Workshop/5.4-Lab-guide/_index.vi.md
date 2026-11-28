---
title: "Hướng dẫn thực hành từng bước"
date: 2026-11-20
weight: 4
chapter: false
pre: " <b> 5.4. </b> "
---

Mã nguồn đầy đủ: [static/code/imageguard](https://github.com/Pham-Nhut-An/fcj-workshop/tree/main/static/code/imageguard). Thay `<ACCOUNT_ID>` bằng Account ID của bạn (12 số liền).

## Step 1 – Tài nguyên nền tảng

### 1.1. S3 bucket ảnh
**S3 → Create bucket** → `imageguard-images-<ACCOUNT_ID>` · ACLs disabled · **Block all public access** · Versioning Disable · **SSE-S3**.

- **Management → Lifecycle rule** `delete-uploads-30d`: prefix `uploads/`, xóa sau **30 ngày**.
- **Permissions → Bucket policy**: từ chối mọi request không dùng HTTPS (`aws:SecureTransport = false`).

![Hình 1.1 – Đặt tên bucket, chọn ACLs disabled](../../../images/5-workshop/1-1-s3-create-general.png)
*Hình 1.1 – Đặt tên bucket, chọn ACLs disabled*

![Hình 1.2 – Block all public access, tắt Versioning, mã hóa SSE-S3](../../../images/5-workshop/1-2-s3-create-security.png)
*Hình 1.2 – Block all public access, tắt Versioning, mã hóa SSE-S3*

![Hình 1.3 – Lifecycle rule xóa ảnh trong uploads/ sau 30 ngày](../../../images/5-workshop/1-3-s3-lifecycle.png)
*Hình 1.3 – Lifecycle rule xóa ảnh trong uploads/ sau 30 ngày*

![Hình 1.4 – Tab Permissions: Block public access On và bucket policy bắt HTTPS](../../../images/5-workshop/1-4-s3-permissions.png)
*Hình 1.4 – Tab Permissions: Block public access On và bucket policy bắt HTTPS*


### 1.2. DynamoDB
**Create table** `imageguard-images` · Partition key `userId` (String) · Sort key `imageId` (String) · **On-demand**.

![Hình 1.5 – Bảng imageguard-images: userId / imageId, chế độ On-demand](../../../images/5-workshop/2-1-dynamodb.png)
*Hình 1.5 – Bảng imageguard-images: userId / imageId, chế độ On-demand*


### 1.3. SNS và SQS
- SNS **Standard** topic `imageguard-alerts`, **Encryption tắt** (xem [Xử lý sự cố](../5.5-testing/)), subscription Email → bấm **Confirm subscription** trong email.
- SQS **Standard** `imageguard-process-dlq`, retention **14 ngày**, SSE-SQS mặc định.

![Hình 1.6 – Tạo SNS topic Standard imageguard-alerts](../../../images/5-workshop/3-1-sns-create-topic.png)
*Hình 1.6 – Tạo SNS topic Standard imageguard-alerts*

![Hình 1.7 – Email xác nhận đăng ký nhận cảnh báo](../../../images/5-workshop/3-2-sns-confirm-email.png)
*Hình 1.7 – Email xác nhận đăng ký nhận cảnh báo*

![Hình 1.8 – Subscription ở trạng thái Confirmed](../../../images/5-workshop/3-3-sns-confirmed.png)
*Hình 1.8 – Subscription ở trạng thái Confirmed*

![Hình 1.9 – Tạo SQS Standard imageguard-process-dlq, giữ message 14 ngày](../../../images/5-workshop/4-1-sqs-create.png)
*Hình 1.9 – Tạo SQS Standard imageguard-process-dlq, giữ message 14 ngày*


### 1.4. IAM role cho `process-image`
**IAM → Roles → Create role** → AWS service **Lambda** → **không gắn managed policy nào** → `imageguard-process-image-role` → **Create inline policy** (JSON):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {"Sid": "ReadUploadedImages", "Effect": "Allow", "Action": "s3:GetObject", "Resource": "arn:aws:s3:::imageguard-images-<ACCOUNT_ID>/uploads/*"},
    {"Sid": "AnalyzeImagesWithRekognition", "Effect": "Allow", "Action": ["rekognition:DetectModerationLabels", "rekognition:DetectLabels"], "Resource": "*"},
    {"Sid": "UpdateImageResults", "Effect": "Allow", "Action": "dynamodb:UpdateItem", "Resource": "arn:aws:dynamodb:us-east-1:<ACCOUNT_ID>:table/imageguard-images"},
    {"Sid": "SendModerationAlerts", "Effect": "Allow", "Action": "sns:Publish", "Resource": "arn:aws:sns:us-east-1:<ACCOUNT_ID>:imageguard-alerts"},
    {"Sid": "SendFailedEventsToDLQ", "Effect": "Allow", "Action": "sqs:SendMessage", "Resource": "arn:aws:sqs:us-east-1:<ACCOUNT_ID>:imageguard-process-dlq"},
    {"Sid": "WriteOwnLogsOnly", "Effect": "Allow", "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"], "Resource": ["arn:aws:logs:us-east-1:<ACCOUNT_ID>:log-group:/aws/lambda/imageguard-process-image", "arn:aws:logs:us-east-1:<ACCOUNT_ID>:log-group:/aws/lambda/imageguard-process-image:*"]}
  ]
}
```

Trang Review phải hiện đủ **6 service**. Nếu báo *"The policy failed legacy parsing"* thì kiểm tra lại Account ID (xem mục 5.5).

![Hình 1.10 – Trusted entity: AWS service Lambda](../../../images/5-workshop/5-1-iam-role-trusted.png)
*Hình 1.10 – Trusted entity: AWS service Lambda*

![Hình 1.11 – Không gắn managed policy nào](../../../images/5-workshop/5-2-iam-role-no-managed.png)
*Hình 1.11 – Không gắn managed policy nào*

![Hình 1.12 – Inline policy dạng JSON](../../../images/5-workshop/5-3-iam-inline-policy.png)
*Hình 1.12 – Inline policy dạng JSON*

![Hình 1.13 – Role chỉ có đúng 1 inline policy](../../../images/5-workshop/5-4-iam-role-summary.png)
*Hình 1.13 – Role chỉ có đúng 1 inline policy*


## Step 2 – Lambda `process-image` và S3 Event

### 2.1. Tạo function
**Lambda → Create function → Author from scratch** · tên `imageguard-process-image` · **Python 3.12** · **Additional settings**: ARM64 **bật**, Custom execution role **bật** → `imageguard-process-image-role`, Function URL **tắt**.

![Hình 2.1 – Tạo Lambda: Python 3.12, ARM64, dùng role có sẵn, tắt Function URL](../../../images/5-workshop/6-1-lambda-create.png)
*Hình 2.1 – Tạo Lambda: Python 3.12, ARM64, dùng role có sẵn, tắt Function URL*


Dán `process_image/lambda_function.py` → **Deploy**. Memory **256 MB**, Timeout **30 giây**.

![Hình 2.2 – Dán code và Deploy thành công](../../../images/5-workshop/7-1-lambda-code-deployed.png)
*Hình 2.2 – Dán code và Deploy thành công*

![Hình 2.3 – Memory 256 MB, Timeout 30 giây](../../../images/5-workshop/8-1-lambda-general-config.png)
*Hình 2.3 – Memory 256 MB, Timeout 30 giây*


| Biến môi trường | Giá trị |
|---|---|
| `TABLE_NAME` | `imageguard-images` |
| `BUCKET_NAME` | `imageguard-images-<ACCOUNT_ID>` |
| `TOPIC_ARN` | `arn:aws:sns:us-east-1:<ACCOUNT_ID>:imageguard-alerts` |
| `BLOCKED_CATEGORIES` | `Explicit,Violence,Visually Disturbing,Drugs & Tobacco,Hate Symbols` |
| `MIN_MODERATION_CONFIDENCE` | `60` |
| `MAX_LABELS` · `MIN_LABEL_CONFIDENCE` | `10` · `80` |

![Hình 2.4 – 7 biến môi trường của process-image](../../../images/5-workshop/9-1-lambda-env-vars.png)
*Hình 2.4 – 7 biến môi trường của process-image*


### 2.2. Ý chính trong code

```python
# Retry co exponential backoff cho throttling / 5xx
BOTO_CONFIG = Config(retries={"max_attempts": 5, "mode": "standard"})

# Chi nhan key dung dinh dang -> chan key la, path traversal
KEY_PATTERN = re.compile(r"^uploads/([A-Za-z0-9-]{1,64})/([A-Za-z0-9-]{1,64})\.(jpg|jpeg|png)$")

# UpdateItem co dieu kien: item phai ton tai va dang PENDING
ConditionExpression="attribute_exists(#uid) AND #st = :pending"

# Chi gui SNS khi DB da cap nhat thanh cong
if blocked and updated:
    publish_alert(user_id, image_id, key, blocked)
```

Metric được ghi bằng **Embedded Metric Format**: in một dòng JSON có khóa `_aws` ra log, CloudWatch tự tạo metric `ImagesProcessed`, `ImagesApproved`, `ImagesRejected`, `ProcessingLatency`, `AlertPublishFailed` (namespace `ImageGuard`). Không cần quyền `cloudwatch:PutMetricData`.

### 2.3. Retry, DLQ và trigger
- **Configuration → Asynchronous invocation**: Maximum age 1 giờ, Retry attempts **2**.
- **Destinations → On failure** → SQS `imageguard-process-dlq`.
- **Add trigger → S3**: bucket ảnh, event **PUT**, prefix `uploads/`, suffix `.jpg`.

![Hình 2.5 – Asynchronous invocation: tối đa 1 giờ, thử lại 2 lần](../../../images/5-workshop/10-1-lambda-async-config.png)
*Hình 2.5 – Asynchronous invocation: tối đa 1 giờ, thử lại 2 lần*

![Hình 2.6 – Destination On failure → SQS DLQ](../../../images/5-workshop/10-2-lambda-destination.png)
*Hình 2.6 – Destination On failure → SQS DLQ*

![Hình 2.7 – S3 trigger: event PUT, prefix uploads/, suffix .jpg](../../../images/5-workshop/11-1-s3-trigger-config.png)
*Hình 2.7 – S3 trigger: event PUT, prefix uploads/, suffix .jpg*

![Hình 2.8 – Function overview: S3 → Lambda → SQS](../../../images/5-workshop/11-2-lambda-overview.png)
*Hình 2.8 – Function overview: S3 → Lambda → SQS*

![Hình 2.9 – Resource-based policy có aws:SourceArn và aws:SourceAccount (chống confused deputy)](../../../images/5-workshop/11-3-lambda-resource-policy.png)
*Hình 2.9 – Resource-based policy có aws:SourceArn và aws:SourceAccount (chống confused deputy)*

### 2.4. Kiểm tra nhanh Step 2 (chưa cần web)

1. **DynamoDB → Explore items → Create item**: `userId` = `test-user-001`, `imageId` = `img-001`, thêm attribute String `status` = `PENDING`. Làm tương tự cho `img-002`.
2. **S3** → tạo folder `uploads/test-user-001/` → upload ảnh bia tên `img-001.jpg`, ảnh súng đồ chơi tên `img-002.jpg`.
3. Đợi khoảng 10 giây rồi **Explore items → Run**.

![Hình 2.10 – Các item thử nghiệm ở trạng thái PENDING](../../../images/5-workshop/12-1-dynamodb-pending.png)
*Hình 2.10 – Các item thử nghiệm ở trạng thái PENDING*

![Hình 2.11 – Ảnh thử nghiệm trong uploads/test-user-001/](../../../images/5-workshop/13-1-s3-uploaded.png)
*Hình 2.11 – Ảnh thử nghiệm trong uploads/test-user-001/*

![Hình 2.12 – Kết quả: img-001 APPROVED, img-002 REJECTED](../../../images/5-workshop/14-1-dynamodb-result.png)
*Hình 2.12 – Kết quả: img-001 APPROVED, img-002 REJECTED*

![Hình 2.13 – Ảnh hợp lệ: danh sách nhãn (labels)](../../../images/5-workshop/14-2-item-approved-labels.png)
*Hình 2.13 – Ảnh hợp lệ: danh sách nhãn (labels)*

![Hình 2.14 – Ảnh vi phạm: blockedCategories = Violence](../../../images/5-workshop/14-3-item-rejected.png)
*Hình 2.14 – Ảnh vi phạm: blockedCategories = Violence*

![Hình 2.15 – Email cảnh báo quản trị viên nhận được](../../../images/5-workshop/14-4-sns-alert-email.png)
*Hình 2.15 – Email cảnh báo quản trị viên nhận được*

![Hình 2.16 – Log image_processed trong CloudWatch Logs](../../../images/5-workshop/14-5-cloudwatch-log.png)
*Hình 2.16 – Log image_processed trong CloudWatch Logs*

### 2.5. Kiểm tra DLQ (cố ý gây lỗi)

1. Đổi biến môi trường `TABLE_NAME` thành tên bảng không tồn tại.
2. Tab **Test** → Invocation type **Asynchronous** → gửi sự kiện S3 mẫu trỏ tới một ảnh có sẵn.
3. Sau khoảng 3 phút (1 lần chạy + 2 lần thử lại) → **SQS → imageguard-process-dlq → Poll for messages**.
4. Trả `TABLE_NAME` về `imageguard-images`.

![Hình 2.17 – Tạm đổi TABLE_NAME để gây lỗi](../../../images/5-workshop/15-0-env-table-name-wrong.jpg)
*Hình 2.17 – Tạm đổi TABLE_NAME để gây lỗi*

![Hình 2.18 – Gọi Lambda bất đồng bộ từ tab Test](../../../images/5-workshop/15-1-lambda-async-invoke.jpg)
*Hình 2.18 – Gọi Lambda bất đồng bộ từ tab Test*

![Hình 2.19 – DLQ nhận 1 message sau khi hết lượt thử lại](../../../images/5-workshop/15-2a-dlq-messages-list.jpg)
*Hình 2.19 – DLQ nhận 1 message sau khi hết lượt thử lại*

![Hình 2.20 – Trả TABLE_NAME về giá trị đúng](../../../images/5-workshop/15-3-env-restored.jpg)
*Hình 2.20 – Trả TABLE_NAME về giá trị đúng*

Nội dung message trong DLQ xem ở [mục 5.5](../5.5-testing/).


## Step 3 – Cognito, API Gateway, web tĩnh

Step 3 có thể làm trên Console theo thứ tự bên dưới, hoặc chạy script [`setup.sh`](https://github.com/Pham-Nhut-An/fcj-workshop/tree/main/static/code/imageguard/scripts/setup.sh) trong **CloudShell** để tạo toàn bộ bằng AWS CLI (khoảng 3 phút).

![Hình 3.1 – Kết quả chạy setup.sh trong CloudShell](../../../images/5-workshop/23-0-cloudshell-setup-output.jpg)
*Hình 3.1 – Kết quả chạy setup.sh trong CloudShell*


### 3.1. Hai Lambda cho API
Tạo 2 role riêng (least privilege) rồi 2 function Python 3.12 arm64, 128 MB, 10 giây:

| Lambda | Quyền inline policy | Biến môi trường |
|---|---|---|
| `imageguard-presign-upload` | `s3:PutObject` (uploads/*), `dynamodb:PutItem`, log | `BUCKET_NAME`, `TABLE_NAME`, `URL_EXPIRES_SECONDS=300` |
| `imageguard-get-images` | `dynamodb:Query`, `s3:GetObject` (uploads/*), log | `BUCKET_NAME`, `TABLE_NAME`, `URL_EXPIRES_SECONDS=300`, `MAX_ITEMS=50` |

`presign-upload` lấy `userId` từ `requestContext.authorizer.jwt.claims.sub`, tự sinh `imageId` (UUID), tạo item `PENDING` rồi ký presigned PUT URL. Presigned URL được ký bằng quyền của Lambda, nên role phải có `s3:PutObject`.

### 3.2. Web tĩnh + CloudFront
1. Bucket `imageguard-web-<ACCOUNT_ID>` (private, SSE-S3), upload `index.html`, `app.js`, `config.js`.
2. **CloudFront → Create distribution**: origin S3 bucket web với **OAC**, Redirect HTTP to HTTPS, CachingOptimized, Response headers **SecurityHeadersPolicy**, Default root object `index.html`, WAF không bật.
3. Bucket policy chỉ cho `cloudfront.amazonaws.com` với `AWS:SourceArn` = ARN distribution.

![Hình 3.2 – Trang ImageGuard qua CloudFront](../../../images/5-workshop/21-6-web-home-dark.jpg)
*Hình 3.2 – Trang ImageGuard qua CloudFront*


### 3.3. Cognito
User pool `imageguard-users`, đăng nhập bằng **email**, cho tự đăng ký. App client **SPA, không có client secret**: Authorization code grant, scope `openid email`, callback và sign-out URL = `https://<CLOUDFRONT_DOMAIN>/`. Tạo domain (Managed login).

![Hình 3.3 – Trang đăng nhập Cognito Managed Login](../../../images/5-workshop/26-0-cognito-managed-login.jpg)
*Hình 3.3 – Trang đăng nhập Cognito Managed Login*


### 3.4. API Gateway HTTP API
- Routes `POST /upload-url` → `presign-upload`, `GET /images` → `get-images`, stage `$default` auto-deploy.
- **JWT Authorizer** `cognito-jwt`: issuer `https://cognito-idp.us-east-1.amazonaws.com/<USER_POOL_ID>`, audience `<APP_CLIENT_ID>`, gắn cho cả 2 route.
- **CORS**: chỉ origin `https://<CLOUDFRONT_DOMAIN>`, header `authorization, content-type`, method `GET, POST, OPTIONS`.
- **Throttling** default route: rate 10, burst 20.

### 3.5. Nối các phần
- CORS cho bucket ảnh: cho phép `PUT, GET` từ domain CloudFront.
- Điền `config.js` (Cognito domain, client ID, redirect URI, API URL), upload lại, tạo CloudFront invalidation `/*`.

![Hình 3.4 – Kết quả cuối: người dùng đăng nhập, tải ảnh lên và xem trạng thái APPROVED / REJECTED](../../../images/5-workshop/26-5-web-dashboard-dark.jpg)
*Hình 3.4 – Kết quả cuối: thống kê, ô tải nhiều ảnh, thư viện có lọc theo trạng thái và tìm theo nhãn*

![Hình 3.5 – Cửa sổ chi tiết ảnh](../../../images/5-workshop/26-7-web-detail-dark.jpg)
*Hình 3.5 – Cửa sổ chi tiết ảnh: nhãn, thời gian tải lên / xử lý xong, Image ID*

> **Các tính năng trên giao diện** (lọc theo trạng thái, tìm theo nhãn, sắp xếp, nhãn phổ biến, thống kê, xem chi tiết, tải nhiều ảnh, kiểm tra 3 byte đầu của file JPEG) đều chạy trên trình duyệt với dữ liệu trả về từ `GET /images`, không cần thêm API hay dịch vụ nào, nên kiến trúc giữ nguyên.


## Step 4 – Giám sát

Chạy [`step4.sh`](https://github.com/Pham-Nhut-An/fcj-workshop/tree/main/static/code/imageguard/scripts/step4.sh) trong CloudShell, hoặc tạo trên Console:

| Alarm | Metric | Ngưỡng (5 phút) |
|---|---|---|
| `imageguard-{process-image,presign-upload,get-images}-errors` | AWS/Lambda Errors | ≥ 1 |
| `imageguard-process-image-throttles` | AWS/Lambda Throttles | ≥ 1 |
| `imageguard-dlq-not-empty` | AWS/SQS ApproximateNumberOfMessagesVisible | ≥ 1 |
| `imageguard-alert-publish-failed` | ImageGuard AlertPublishFailed | ≥ 1 |
| `imageguard-api-5xx` | AWS/ApiGateway 5xx | ≥ 5 |

Mọi alarm gửi thông báo cả khi chuyển **ALARM** và **OK** tới SNS `imageguard-alerts`. Dashboard `imageguard` gồm số ảnh APPROVED/REJECTED, thời gian xử lý, Lambda, API Gateway, DLQ và trạng thái alarm. Log retention **14 ngày** cho cả 3 Lambda.

![Hình 4.1 – Tạo 7 alarm và dashboard bằng step4.sh](../../../images/5-workshop/28-1-step4-alarms-created.jpg)
*Hình 4.1 – Tạo 7 alarm và dashboard bằng step4.sh*

![Hình 4.2 – Trạng thái alarm: DLQ ALARM (còn message thử nghiệm), các alarm khác OK](../../../images/5-workshop/28-2-step4-alarm-states.jpg)
*Hình 4.2 – Trạng thái alarm: DLQ ALARM (còn message thử nghiệm), các alarm khác OK*

![Hình 4.3 – Custom metric (EMF) trong namespace ImageGuard](../../../images/5-workshop/14-6-cloudwatch-metrics.png)
*Hình 4.3 – Custom metric (EMF) trong namespace ImageGuard*

![Hình 4.4 – Log group giữ log 14 ngày](../../../images/5-workshop/14-7-log-retention.png)
*Hình 4.4 – Log group giữ log 14 ngày*

![Hình 4.5 – CloudWatch dashboard imageguard](../../../images/5-workshop/28-4-dashboard.png)
*Hình 4.5 – CloudWatch dashboard imageguard*

