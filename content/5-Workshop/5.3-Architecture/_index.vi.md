---
title: "Kiến trúc"
date: 2026-11-20
weight: 3
chapter: false
pre: " <b> 5.3. </b> "
---

![Sơ đồ kiến trúc ImageGuard](../../../images/2-proposal/imageguard-architecture.drawio.png)
*Hình: Sơ đồ kiến trúc ImageGuard*

Sơ đồ chia theo 5 nhóm: **Frontend**, **Authentication & API**, **Compute**, **Storage & AI**, **Notification & Monitoring**. CloudFront nằm ngoài khung Region vì là dịch vụ toàn cầu (global). Màu mũi tên cho biết loại luồng: **xanh dương** là luồng tải ảnh lên, **xanh lá** là luồng xem ảnh, **cam** là luồng xử lý bằng AI, **xám nét đứt** là giám sát, **đỏ nét đứt** là quyền IAM. Mũi tên vẽ theo chiều **gửi yêu cầu** (request).

## Luồng xử lý (khớp số trên sơ đồ)

| # | Từ → Đến | Mô tả |
|---|---|---|
| 1 | User → CloudFront → S3 `imageguard-web` | Trình duyệt tải trang web tĩnh (HTML/JS) qua HTTPS. CloudFront đọc bucket web private bằng **OAC** |
| 2 | User → Cognito | Đăng nhập bằng **Cognito Managed Login** (Authorization Code + PKCE), nhận JWT (ID token + access token) |
| 3 | User → API Gateway | Gọi `POST /upload-url` kèm access token; **JWT Authorizer** kiểm tra chữ ký, issuer và audience |
| 3a | API Gateway → `presign-upload` | Lambda lấy `userId` từ claim `sub`, sinh `imageId` (UUID) |
| 3b | `presign-upload` → DynamoDB | Ghi item `PENDING`, rồi trả về presigned PUT URL (hết hạn 5 phút) cho key `uploads/{sub}/{imageId}.jpg` |
| 4 | User → S3 `imageguard-images` | Trình duyệt `PUT` ảnh thẳng lên S3 bằng presigned URL, ảnh không đi qua API Gateway hay Lambda |
| 5 | S3 → `process-image` | **S3 Event** `ObjectCreated:Put` (prefix `uploads/`, suffix `.jpg`) gọi Lambda theo kiểu **bất đồng bộ** (asynchronous) |
| 6 | `process-image` → Rekognition | Gọi `DetectModerationLabels` (ngưỡng 60%). Không vi phạm thì gọi tiếp `DetectLabels` (tối đa 10 nhãn, ≥ 80%) |
| 6a | Rekognition → S3 | Rekognition tự đọc ảnh từ S3 (`S3Object`), Lambda không phải tải ảnh về |
| 7 | `process-image` → DynamoDB | `UpdateItem` **có điều kiện** `status = PENDING` → `APPROVED` hoặc `REJECTED` |
| 8 | `process-image` → SNS → Admin | Chỉ khi ảnh `REJECTED` **và** DynamoDB đã cập nhật thành công thì mới gửi email cảnh báo |
| 9 | `process-image` → SQS DLQ | Lambda lỗi sau 2 lần thử lại (retry) thì sự kiện được đưa vào hàng đợi lỗi, giữ 14 ngày |
| 10 | User → API Gateway | Gọi `GET /images` kèm access token (dùng chung mũi tên với bước 3) |
| 10a | API Gateway → `get-images` | Lambda lấy `userId` từ claim `sub` |
| 10b | `get-images` → DynamoDB | `Query` theo `userId`, sắp ảnh mới nhất trước, tối đa 50 ảnh; chỉ ảnh `APPROVED` được ký presigned GET URL (5 phút) |
| 10c | User → S3 `imageguard-images` | Trình duyệt tải ảnh đã duyệt bằng presigned GET URL |
| 11 | Lambda → CloudWatch | Log có cấu trúc (JSON) và 5 custom metric theo Embedded Metric Format (EMF) |
| 12 | CloudWatch → SNS | 7 alarm gửi email khi chuyển sang ALARM và khi trở lại OK |
| – | IAM → Lambda | Mỗi Lambda có 1 IAM role riêng theo nguyên tắc quyền tối thiểu |

## Vì sao chọn từng dịch vụ

| Dịch vụ | Vai trò | Lý do chọn | Phương án đã cân nhắc |
|---|---|---|---|
| **Amazon S3** | Lưu ảnh và web tĩnh | Độ bền 99,999999999%, rẻ, có S3 Event để kích hoạt xử lý, có Lifecycle tự xóa ảnh cũ | EBS/EFS: phải gắn vào máy chủ, đắt hơn |
| **AWS Lambda** | Chạy 3 hàm xử lý | Không quản lý máy chủ, tự mở rộng theo lượng ảnh, trả tiền theo lượt chạy; ảnh ít thì gần như 0 USD | EC2/ECS: chạy 24/7 kể cả khi không có ảnh |
| **Amazon Rekognition** | Kiểm duyệt và gắn nhãn | Có sẵn mô hình kiểm duyệt nội dung, không cần dữ liệu huấn luyện, trả tiền theo ảnh | Amazon Bedrock: tài khoản mới có quota bằng 0 (xem 5.5); tự huấn luyện mô hình: tốn dữ liệu và GPU |
| **Amazon DynamoDB** | Lưu trạng thái và nhãn | Serverless, on-demand trả theo request, truy vấn theo `userId` nhanh, hỗ trợ ghi có điều kiện | RDS: phải chạy instance 24/7, cần VPC |
| **Amazon API Gateway (HTTP API)** | API cho web | Có sẵn JWT Authorizer cho Cognito, CORS, throttling; rẻ hơn REST API khoảng 70% | REST API: nhiều tính năng hơn nhưng hệ thống không cần; Lambda Function URL: không có JWT Authorizer |
| **Amazon Cognito** | Đăng ký, đăng nhập | Managed Login có sẵn giao diện, OAuth 2.0 + PKCE, không phải tự lưu mật khẩu | Tự viết đăng nhập: rủi ro bảo mật cao |
| **Amazon CloudFront** | Phục vụ web | HTTPS mặc định, cache ở edge gần người dùng, OAC giữ bucket web private | S3 static website hosting: chỉ HTTP, bucket phải public |
| **Amazon SNS** | Email cảnh báo | Gửi email cho quản trị viên chỉ với vài dòng code, nhận được cả alarm CloudWatch | Amazon SES: hợp khi gửi email riêng cho từng người dùng, phải xác minh danh tính người gửi |
| **Amazon SQS** | Dead-Letter Queue | Giữ sự kiện lỗi 14 ngày để xem lại và xử lý lại, không mất ảnh | Không có DLQ: Lambda bất đồng bộ lỗi quá số lần retry thì sự kiện bị bỏ |
| **Amazon CloudWatch** | Log, metric, alarm, dashboard | Lambda tự ghi log vào đây; EMF tạo metric từ log, không tốn API call | Công cụ ngoài: phải cài thêm và cấp quyền |
| **AWS IAM** | Phân quyền | Role riêng cho từng Lambda, quyền chỉ trên đúng tài nguyên cần | Dùng chung 1 role: một hàm bị lỗi sẽ có quyền của cả 3 hàm |

## Mô hình dữ liệu (DynamoDB `imageguard-images`)

| Thuộc tính | Kiểu | Ý nghĩa |
|---|---|---|
| `userId` | String – **Partition key** | Claim `sub` của Cognito. Mỗi người dùng một partition, nên `Query` chỉ trả ảnh của chính họ |
| `imageId` | String – **Sort key** | UUID do `presign-upload` sinh ra, cũng là tên file trên S3 |
| `status` | String | `PENDING` → `APPROVED` hoặc `REJECTED` |
| `createdAt`, `processedAt` | String (ISO 8601) | Lúc xin URL tải lên và lúc kiểm duyệt xong |
| `moderationLabels` | List | Nhãn kiểm duyệt Rekognition trả về (tên, danh mục cha, độ tin cậy) |
| `labels` | List | Nhãn mô tả nội dung (tên, độ tin cậy), chỉ có với ảnh hợp lệ |
| `blockedCategories` | List | Danh mục cấp 1 khiến ảnh bị chặn, ví dụ `Violence` |
| `reason` | String | `BLOCKED_CATEGORY`, `TOO_LARGE` (> 5 MB) hoặc `INVALID_IMAGE:<lỗi>` (file không phải ảnh) |

Không cần Global Secondary Index: mọi truy vấn của hệ thống đều theo `userId`, khớp đúng partition key.

## Chính sách kiểm duyệt

- Chặn danh mục cấp 1: **Explicit, Violence, Visually Disturbing, Drugs & Tobacco, Hate Symbols** (biến môi trường `BLOCKED_CATEGORIES`, đổi không cần sửa code).
- Cho qua **Alcohol** nhưng vẫn lưu nhãn để quản trị viên tra cứu.
- Kiểm duyệt trước, gắn nhãn sau: ảnh vi phạm không tốn thêm lượt `DetectLabels`.

## Thiết kế bảo mật

| Nguyên tắc | Cách làm |
|---|---|
| Least privilege | Mỗi Lambda 1 IAM role riêng, không dùng `AWSLambdaBasicExecutionRole` |
| Dữ liệu riêng tư | 2 bucket đều **Block all public access**, ACL disabled, SSE-S3, bucket policy bắt HTTPS |
| Xác thực | JWT Authorizer kiểm tra issuer (User Pool) và audience (App client); `userId` luôn lấy từ claim `sub`, không nhận từ body |
| Upload an toàn | Presigned URL do server ký, chỉ PUT được 1 key do server đặt, hết hạn 5 phút, bắt buộc `image/jpeg` |
| Chống confused deputy | Resource-based policy của Lambda có `aws:SourceArn` + `aws:SourceAccount` |
| Chống recursive trigger | Trigger chỉ prefix `uploads/`, `process-image` không có quyền ghi S3 |
| Idempotent | `UpdateItem` điều kiện `status = PENDING`: sự kiện trùng hoặc upload đè không đổi được kết quả |
| Web | CloudFront OAC, HTTPS, SecurityHeadersPolicy (HSTS, X-Frame-Options…), frontend chỉ dùng `textContent` để tránh XSS |

### Quyền của từng Lambda

| Lambda | Được phép | Không có |
|---|---|---|
| `process-image` | `s3:GetObject` (uploads/*), 2 action Rekognition, `dynamodb:UpdateItem`, `sns:Publish`, `sqs:SendMessage`, log của chính nó | PutObject, Query, PutItem |
| `presign-upload` | `s3:PutObject` (uploads/*), `dynamodb:PutItem`, log | GetObject, Query, UpdateItem |
| `get-images` | `dynamodb:Query`, `s3:GetObject` (uploads/*), log | PutObject, PutItem |

Rekognition dùng `Resource: "*"` vì `DetectModerationLabels` / `DetectLabels` không hỗ trợ resource-level permission; bù lại chỉ cấp đúng 2 action.

## Đối chiếu AWS Well-Architected Framework

| Trụ cột | Biện pháp trong ImageGuard |
|---|---|
| **Operational Excellence** (vận hành) | Log JSON có cấu trúc; 5 custom metric EMF (`ImagesProcessed`, `ImagesApproved`, `ImagesRejected`, `ProcessingLatency`, `AlertPublishFailed`); 7 alarm và dashboard `imageguard`; script `setup.sh`, `step4.sh` để triển khai lại giống hệt; ngưỡng kiểm duyệt và danh mục chặn nằm trong biến môi trường, đổi không cần sửa code |
| **Security** (bảo mật) | Xem mục "Thiết kế bảo mật": quyền tối thiểu cho từng Lambda, bucket private, JWT Authorizer, presigned URL 5 phút, OAC, chống confused deputy, không có access key hay mật khẩu trong code |
| **Reliability** (độ tin cậy) | S3, Lambda, DynamoDB, SNS, SQS đều tự chạy trên nhiều Availability Zone; Lambda bất đồng bộ retry 2 lần rồi đưa vào DLQ; boto3 retry 5 lần cho lỗi throttling; ghi có điều kiện nên sự kiện trùng không làm sai kết quả; file lỗi được đánh dấu `REJECTED` thay vì làm treo hệ thống; PITR 35 ngày |
| **Performance Efficiency** (hiệu năng) | Upload thẳng lên S3 nên API và Lambda không phải nhận ảnh; Rekognition đọc ảnh từ S3 nên Lambda không tốn bộ nhớ tải ảnh; Lambda arm64, `process-image` 256 MB, 2 hàm API 128 MB; Lambda và DynamoDB on-demand tự mở rộng theo tải; web cache ở CloudFront edge |
| **Cost Optimization** (chi phí) | 100% serverless, không có tài nguyên chạy 24/7; kiểm duyệt trước rồi mới gắn nhãn; HTTP API thay REST API; arm64; S3 Lifecycle 30 ngày; log giữ 14 ngày; Pricing Calculator 8,37 USD/tháng (mục 5.6) |
| Sustainability | Không chấm theo barem; serverless chỉ dùng tài nguyên khi có ảnh, Lifecycle xóa dữ liệu không còn cần |

## Các quyết định thiết kế quan trọng

**Vì sao upload thẳng lên S3 mà không gửi ảnh qua API?** Lambda chỉ nhận payload tối đa 6 MB khi gọi đồng bộ (ảnh 5 MB mã hóa base64 sẽ vượt), còn HTTP API tính mỗi 512 KB là một request. Presigned URL cho trình duyệt ghi đúng 1 file vào đúng 1 key do server đặt, trong 5 phút, nên vừa rẻ vừa an toàn.

**Vì sao tạo item `PENDING` trước khi cấp URL?** Để `process-image` chỉ xử lý ảnh đã được đăng ký. File ai đó tự đặt vào bucket không có item `PENDING` nên bị bỏ qua. Người dùng cũng thấy ảnh "Đang xử lý" ngay sau khi tải lên.

**Vì sao gọi Lambda bất đồng bộ kèm DLQ mà không đặt SQS ở giữa S3 và Lambda?** Lượng ảnh nhỏ, Lambda tự retry 2 lần cho kiểu gọi bất đồng bộ, và DLQ giữ lại sự kiện lỗi để xử lý lại. Đặt thêm một hàng đợi SQS ở giữa giúp chịu tải đột biến tốt hơn, nhưng thêm một thành phần mà quy mô hiện tại chưa cần. Đây là hướng mở rộng khi lượng ảnh lớn.

**Vì sao gửi SNS sau khi ghi DynamoDB?** Nếu gửi email trước mà ghi DB lỗi, Lambda retry sẽ gửi email trùng trong khi ảnh vẫn `PENDING`. Lỗi này đã gặp thật và đã sửa (xem 5.5, mục "Xử lý sự cố đã gặp").

**Vì sao chỉ ảnh `APPROVED` mới có link xem?** Ảnh vi phạm không bao giờ được hiển thị lại, kể cả với chính người tải lên. Email cho quản trị viên cũng chỉ chứa `s3Key`, không chứa link ảnh.

## Khả năng mở rộng và giới hạn

- **Mở rộng tự động:** Lambda tự tạo thêm bản chạy song song khi nhiều ảnh được tải lên cùng lúc; DynamoDB on-demand và S3 không cần cấu hình dung lượng trước.
- **Giới hạn cần biết:** quota số lượt gọi Rekognition mỗi giây và concurrency của Lambda trong tài khoản. Khi vượt quota, boto3 retry, Lambda retry, cuối cùng sự kiện vào DLQ; alarm `throttles` và `dlq-not-empty` báo cho quản trị viên.
- **API:** throttling 10 request/giây (burst 20) bảo vệ Lambda và chi phí khi bị gọi liên tục.
- **Hướng mở rộng:** hàng đợi SQS giữa S3 và Lambda để chịu tải đột biến; AWS WAF cho CloudFront; chuyển script CLI sang AWS SAM/CloudFormation.

## Sao lưu dữ liệu

Bảng `imageguard-images` bật **Point-in-time recovery (PITR – khôi phục về thời điểm bất kỳ)**: có thể khôi phục bảng về bất kỳ giây nào trong 35 ngày gần nhất nếu dữ liệu bị xóa hoặc ghi sai. Ảnh gốc nằm trong S3 (độ bền 99,999999999%), nên khi cần có thể khôi phục cả metadata lẫn ảnh.

```bash
aws dynamodb update-continuous-backups --table-name imageguard-images \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
# Kết quả: ENABLED
```

## Vì sao chọn Region us-east-1?

- **Giá thấp:** us-east-1 (N. Virginia) thường có giá thấp nhất trong các Region, kể cả Amazon Rekognition, dịch vụ chiếm phần lớn chi phí (5,91/8,37 USD mỗi tháng, xem mục 5.6).
- **Đủ dịch vụ:** tất cả dịch vụ dùng trong workshop (Rekognition Content Moderation, Cognito Managed Login, HTTP API…) đều có sẵn ở us-east-1.
- **Độ trễ không đáng kể:** từ Việt Nam tới us-east-1 khoảng 200 ms, nhưng web tĩnh được CloudFront phục vụ từ edge location gần người dùng; khâu chậm nhất là AI xử lý ảnh (khoảng 0,5–1 giây), không phải đường mạng.
- **Khi triển khai thật cho người dùng Việt Nam:** nên chuyển sang Singapore (ap-southeast-1) để giảm độ trễ và đáp ứng quy định về dữ liệu cá nhân. Tên Region và tài nguyên nằm trong biến môi trường nên không phải sửa code.

## Vì sao không dùng VPC?

Không có cơ sở dữ liệu hay máy chủ nào cần mạng riêng. Lambda gọi các dịch vụ AWS qua HTTPS và được xác thực bằng IAM. Đưa Lambda vào VPC sẽ tốn thêm NAT Gateway hoặc VPC Endpoint (vài chục USD/tháng) mà không tăng bảo mật đáng kể.
