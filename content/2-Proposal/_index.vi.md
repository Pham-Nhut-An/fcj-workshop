---
title: "Proposal"
date: 2026-11-06
weight: 2
chapter: false
pre: " <b> 2. </b> "
---

# ImageGuard – Kiểm duyệt và gắn nhãn ảnh tự động bằng AI trên AWS Serverless

{{% notice info %}}
**Trạng thái:** Bản đề xuất v2.0 (06/11/2026). Bản v1.0 (28/10/2026) dùng Amazon Bedrock để xử lý hóa đơn; nhóm đã đổi hướng vì tài khoản bị giới hạn quota Bedrock (xem mục 4.5). Sơ đồ kiến trúc chính thức sẽ được nhóm tự vẽ bằng draw.io với bộ AWS Architecture Icons và bổ sung vào mục 4.
{{% /notice %}}

## 1. Tổng quan

**ImageGuard** là một ứng dụng web serverless giúp các trang rao vặt, diễn đàn hoặc câu lạc bộ sinh viên **tự động kiểm duyệt và phân loại ảnh do người dùng tải lên**. Khi người dùng đăng ảnh, hệ thống dùng dịch vụ AI thị giác máy tính **Amazon Rekognition** để:

1. **Kiểm duyệt (moderation):** phát hiện nội dung không phù hợp (bạo lực, nhạy cảm, vũ khí, chất cấm…). Ảnh vi phạm bị đánh dấu `REJECTED` và quản trị viên nhận email cảnh báo.
2. **Gắn nhãn (labeling):** với ảnh hợp lệ, tự động sinh nhãn mô tả nội dung (ví dụ *Laptop*, *Bicycle*, *Book*) để người dùng **tìm kiếm ảnh theo nhãn**.

Kết quả được lưu vào **Amazon DynamoDB** và hiển thị trên giao diện web chỉ sau vài giây. Toàn bộ hệ thống chạy theo kiến trúc **hướng sự kiện (event-driven)** và **serverless**: không có máy chủ nào phải quản lý, chỉ trả tiền theo lượt sử dụng.

## 2. Vấn đề cần giải quyết

- Các nền tảng cho phép người dùng đăng ảnh (rao vặt, diễn đàn, nhóm cộng đồng) nhận rất nhiều ảnh mỗi ngày. **Duyệt tay** từng ảnh tốn nhân lực, chậm, và người duyệt phải tiếp xúc trực tiếp với nội dung độc hại.
- Nếu không kiểm duyệt, ảnh vi phạm có thể xuất hiện công khai, gây ảnh hưởng tới người dùng và uy tín nền tảng.
- Ảnh do người dùng tải lên thường **không có mô tả hay thẻ (tag)**, nên rất khó tìm lại.

**Giải pháp:** tự động hóa cả hai việc bằng AI ngay khi ảnh được tải lên. Ảnh vi phạm bị chặn trước khi hiển thị; ảnh hợp lệ được gắn nhãn để tra cứu.

## 3. Mục tiêu & Phạm vi

### 3.1. Mục tiêu

1. Xây dựng pipeline tự động **Upload ảnh → AI kiểm duyệt → AI gắn nhãn → Lưu trữ → Hiển thị/Tìm kiếm** chạy hoàn toàn trên AWS.
2. Áp dụng **AWS Well-Architected Framework**, đặc biệt là trụ cột **Security** (IAM Least Privilege, không public tài nguyên, không hard-code credentials).
3. Giám sát đầy đủ bằng **Amazon CloudWatch** (Logs, Metrics, Alarms) và cảnh báo qua email bằng **Amazon SNS**.
4. Giữ chi phí vận hành ở mức **khoảng 6–7 USD/tháng** với kịch bản tải thực tế (mục 6).
5. Viết tài liệu **step-by-step song ngữ** để người khác có thể tự triển khai lại.

### 3.2. Tiêu chí hoàn thành (Success criteria)

| Tiêu chí | Mục tiêu đo lường |
|---|---|
| Thời gian xử lý 1 ảnh (từ lúc upload đến khi có kết quả) | ≤ 10 giây |
| Ảnh vi phạm bị chặn đúng trên bộ ảnh thử nghiệm | ≥ 90% |
| Ảnh hợp lệ bị chặn nhầm (false positive) trên bộ ảnh thử nghiệm | ≤ 10% |
| Người dùng chưa đăng nhập gọi API | Bị từ chối (HTTP 401) |
| Người dùng A xem ảnh/kết quả của người dùng B | Không thể |
| Phát hiện ảnh vi phạm | Gửi email cảnh báo cho quản trị viên |
| Bucket S3 bị truy cập trực tiếp từ Internet | Bị chặn (Block Public Access) |

### 3.3. Phạm vi

| Trong phạm vi (In scope) | Ngoài phạm vi (Out of scope) |
|---|---|
| Ảnh JPG/PNG, ≤ 5 MB | Video, GIF động |
| Kiểm duyệt nội dung + gắn nhãn tự động | **Nhận diện khuôn mặt** (dữ liệu sinh trắc học, nhạy cảm về quyền riêng tư) |
| Tìm kiếm ảnh theo nhãn trong ảnh của chính người dùng | Tìm kiếm toàn văn trên toàn hệ thống |
| Đăng ký/đăng nhập bằng Amazon Cognito | Giao diện quản trị riêng, khiếu nại kết quả kiểm duyệt |
| 1 Region: **us-east-1** | Multi-Region, Disaster Recovery |

## 4. Kiến trúc giải pháp

<!-- Khi đã vẽ xong, lưu file vào static/images/2-proposal/architecture.png rồi bỏ comment dòng dưới:
![ImageGuard Architecture](../../images/2-proposal/architecture.png)
-->

### 4.1. Các dịch vụ AWS sử dụng và lý do lựa chọn

| Dịch vụ | Vai trò trong hệ thống | Lý do lựa chọn |
|---|---|---|
| **Amazon S3** | (1) Lưu ảnh người dùng (bucket private); (2) lưu web tĩnh | Lưu trữ bền vững 99.999999999%, rẻ, phát sinh **S3 Event** để kích hoạt xử lý |
| **Amazon CloudFront** | Phân phối web tĩnh qua HTTPS, truy cập S3 qua **Origin Access Control (OAC)** | Bucket web không cần public; có HTTPS miễn phí; nằm trong Always Free (1 TB/tháng) |
| **Amazon Cognito** (User Pool) | Đăng ký, đăng nhập, cấp **JWT token** | Dịch vụ quản lý danh tính có sẵn, miễn phí tới 10.000 MAU, ứng dụng không tự lưu mật khẩu |
| **Amazon API Gateway** (HTTP API) | REST endpoint cho web; xác thực bằng **JWT Authorizer** gắn Cognito | Rẻ hơn REST API (~1 USD/1 triệu request), tích hợp sẵn Cognito |
| **AWS Lambda** (Python 3.12) | 3 hàm: `presign-upload`, `process-image`, `get-images` | Serverless, trả theo lượt chạy, tự mở rộng (scale) |
| **Amazon Rekognition** | `DetectModerationLabels` (kiểm duyệt) và `DetectLabels` (gắn nhãn) | Dịch vụ AI có sẵn mô hình, không cần tự huấn luyện; đọc ảnh trực tiếp từ S3; dùng được trên Free plan |
| **Amazon DynamoDB** (On-demand) | Lưu kết quả kiểm duyệt và nhãn theo từng người dùng | NoSQL serverless, trả theo request, độ trễ thấp, 25 GB miễn phí |
| **Amazon SQS** | **Dead-Letter Queue (DLQ)** chứa sự kiện xử lý thất bại | Không mất dữ liệu khi lỗi, có thể xử lý lại |
| **Amazon CloudWatch** | Logs, Metrics (mặc định + custom), Alarms, Dashboard | Giám sát tập trung, bắt buộc theo yêu cầu workshop |
| **Amazon SNS** | Gửi email khi có ảnh vi phạm và khi Alarm kích hoạt | Đơn giản, 1.000 email/tháng miễn phí |
| **AWS IAM** | Mỗi Lambda 1 IAM Role riêng theo Least Privilege | Nền tảng bảo mật của toàn hệ thống |

**Lý do chọn Region us-east-1:** giá thường thấp nhất trong các Region và có đầy đủ dịch vụ. Độ trễ từ Việt Nam (~200 ms) không ảnh hưởng nhiều vì web tĩnh đi qua CloudFront (có edge location tại Hà Nội và TP.HCM), còn khâu chậm nhất là bước AI xử lý ảnh. Nếu triển khai thật cho người dùng Việt Nam, nhóm sẽ cân nhắc chuyển sang Singapore (ap-southeast-1) để giảm độ trễ và đáp ứng quy định về dữ liệu cá nhân; tên Region và tài nguyên đều đặt trong biến môi trường nên không phải sửa code.

### 4.2. Luồng dữ liệu (Data flow)

1. Người dùng mở web qua **CloudFront** → đăng nhập bằng **Cognito** → nhận JWT token.
2. Web gọi `POST /upload-url` trên **API Gateway** (kèm token). API Gateway kiểm tra token bằng JWT Authorizer rồi gọi Lambda **`presign-upload`**.
3. `presign-upload` tạo bản ghi trạng thái `PENDING` trong DynamoDB và trả về một **Presigned URL** (link upload tạm thời, hết hạn sau 5 phút) cho đường dẫn `uploads/{userId}/{imageId}.jpg`.
4. Trình duyệt upload ảnh **thẳng lên S3** bằng Presigned URL (ảnh không đi qua Lambda/API Gateway).
5. S3 phát sinh sự kiện **ObjectCreated** (chỉ với prefix `uploads/`) → gọi bất đồng bộ Lambda **`process-image`**.
6. `process-image` gọi **Rekognition `DetectModerationLabels`** (Rekognition đọc ảnh trực tiếp từ S3):
   - Nếu phát hiện nhãn thuộc danh mục bị cấm với độ tin cậy ≥ 60% → cập nhật DynamoDB thành `REJECTED` (kèm lý do) và gửi email qua **SNS**.
   - Nếu hợp lệ → gọi tiếp **`DetectLabels`** (tối đa 10 nhãn, độ tin cậy ≥ 80%) → cập nhật DynamoDB thành `APPROVED` kèm danh sách nhãn.
7. Nếu Lambda lỗi sau 2 lần thử lại, sự kiện được đưa vào **SQS DLQ**.
8. Web gọi `GET /images?label=...` → Lambda **`get-images`** truy vấn DynamoDB **chỉ theo `userId` lấy từ token**, lọc theo nhãn nếu có → hiển thị kết quả. Ảnh được xem qua **Presigned URL GET** ngắn hạn, không public.
9. Tất cả Lambda ghi log và metric vào **CloudWatch**; Alarm gửi email qua **SNS** khi có lỗi.

### 4.3. Thiết kế bảo mật (Security pillar)

| Nguyên tắc | Cách áp dụng trong ImageGuard |
|---|---|
| **Least Privilege** | Mỗi Lambda có Role riêng. `process-image` chỉ được `s3:GetObject` trên `uploads/*`, `rekognition:DetectModerationLabels` + `rekognition:DetectLabels`, `dynamodb:UpdateItem` **đúng 1 bảng**, `sns:Publish` **đúng 1 topic**. `presign-upload` chỉ được `s3:PutObject` trên `uploads/*` và `dynamodb:PutItem`. `get-images` chỉ được `dynamodb:Query` và `s3:GetObject` |
| **Giới hạn của Rekognition** | Các API phân tích ảnh của Rekognition **không hỗ trợ giới hạn theo tài nguyên (resource-level permission)**, nên bắt buộc dùng `"Resource": "*"`. Nhóm bù lại bằng cách chỉ cho phép **đúng 2 action** cần dùng, không dùng `rekognition:*` |
| **Không public tài nguyên** | Cả 2 bucket bật **Block Public Access**. Bucket web chỉ cho CloudFront đọc qua OAC. Bucket ảnh chỉ nhận/trả ảnh qua Presigned URL ngắn hạn |
| **Xác thực & cô lập dữ liệu** | Mọi API đều yêu cầu JWT từ Cognito. `userId` luôn lấy từ claim `sub` trong token, **không** lấy từ dữ liệu client gửi lên → người dùng không xem được dữ liệu của người khác |
| **Không hard-code credentials** | Lambda dùng IAM Role (credential tạm thời do AWS tự cấp). Tên bucket/bảng/topic đưa vào **Environment variables**. Repository GitHub không chứa access key; có `.gitignore` |
| **Mã hóa** | S3 và DynamoDB mã hóa khi lưu (SSE mặc định); mọi kết nối dùng HTTPS/TLS |
| **Bảo vệ đầu vào** | Presigned URL giới hạn `Content-Type` ảnh; Lambda kiểm tra kích thước ≤ 5 MB và định dạng trước khi gọi AI |
| **Quyền riêng tư** | Không dùng tính năng nhận diện khuôn mặt; không lưu dữ liệu sinh trắc học |

> **Vì sao không đặt Lambda trong VPC/Private Subnet?** Hệ thống không có cơ sở dữ liệu hay máy chủ nào cần nằm trong mạng riêng. Lambda gọi S3, DynamoDB, Rekognition, SNS qua HTTPS và được xác thực bằng IAM. Nếu đưa Lambda vào VPC thì phải trả thêm phí NAT Gateway hoặc Interface VPC Endpoint (khoảng vài chục USD/tháng) mà không tăng thêm bảo mật đáng kể cho kiến trúc này. Nhóm ghi nhận đây là hướng mở rộng nếu có yêu cầu tuân thủ.

### 4.4. Đối chiếu với AWS Well-Architected Framework

| Trụ cột | Áp dụng |
|---|---|
| Operational Excellence | CloudWatch Logs (lưu 14 ngày), Dashboard, Alarms; tài liệu triển khai lại được |
| Security | Như mục 4.3 |
| Reliability | Kiến trúc event-driven; Lambda tự retry 2 lần; DLQ giữ sự kiện lỗi; trạng thái `PENDING/APPROVED/REJECTED/FAILED` rõ ràng |
| Performance Efficiency | Upload thẳng lên S3 bằng Presigned URL; Rekognition đọc ảnh trực tiếp từ S3 (Lambda không phải tải ảnh về); DynamoDB truy vấn theo khóa |
| Cost Optimization | 100% serverless trả theo lượt dùng; **chỉ gọi `DetectLabels` khi ảnh đã qua kiểm duyệt**; S3 Lifecycle; Logs retention 14 ngày; AWS Budgets |
| Sustainability | Không có tài nguyên chạy không tải (idle); chỉ tốn tài nguyên khi có ảnh cần xử lý |

### 4.5. Quá trình lựa chọn dịch vụ AI

| Thời điểm | Sự kiện | Quyết định |
|---|---|---|
| 28/10/2026 | Proposal v1.0: xử lý hóa đơn bằng **Amazon Bedrock (Nova Lite)** | Chọn Bedrock vì đọc được tiếng Việt, chi phí thấp |
| 28/10/2026 | Thử trên Bedrock Playground gặp `ThrottlingException`; trang Quotas cho thấy **TPM = 0, RPM = 0** | Xác định không phải lỗi IAM mà là quota cấp tài khoản |
| 05–06/11/2026 | Gửi yêu cầu tăng quota qua Service Quotas → **bị từ chối** ("Accessibility is subject to change automatically as time passes"). Tài khoản của các thành viên khác cũng bị quota 0 | Bedrock không khả thi trong thời gian còn lại |
| 06/11/2026 | Kiểm tra danh sách dịch vụ của Free plan: Textract chỉ có ở Paid plan; **Rekognition dùng được**. Thử Label detection trên Console thành công | **Đổi sang Rekognition**, giữ nguyên ~90% kiến trúc (S3, Lambda, DynamoDB, API Gateway, Cognito, CloudFront, CloudWatch) |

Bài học: cần **kiểm tra quota và tính khả dụng của dịch vụ ngay từ đầu**, và thiết kế kiến trúc theo kiểu tách rời (loose coupling) để có thể thay một thành phần mà không phải làm lại toàn bộ.

## 5. Kế hoạch & Timeline

Thời gian thực tập: 14/09/2026 – 04/12/2026. Hạn nộp Workshop dự kiến: **19/11/2026** (15 ngày trước ngày cần mộc).

### 5.1. Phân công vai trò

| Thành viên | Vai trò chính |
|---|---|
| Thành viên A | Trưởng nhóm, tích hợp hệ thống, IAM & bảo mật |
| Thành viên B | Lambda `process-image`, tích hợp Rekognition, bộ ảnh thử nghiệm và đánh giá độ chính xác |
| Thành viên C | Cognito, API Gateway, Lambda `presign-upload` và `get-images` |
| Thành viên D | Giao diện web tĩnh, S3 + CloudFront (OAC) |
| Thành viên E | CloudWatch, SNS, DLQ, dự toán chi phí, hướng dẫn Clean-up |

*Mỗi thành viên phải hiểu toàn bộ kiến trúc và tự giải thích được tất cả các phần, không chỉ phần mình phụ trách.*

### 5.2. Timeline theo tuần

| Tuần thực tập | Thời gian | Công việc | Đầu ra |
|---|---|---|---|
| Week 7 | 26/10 – 01/11 | Chốt đề tài, viết Proposal v1.0; thử Bedrock, phát hiện quota bằng 0 | Proposal v1.0, ghi nhận sự cố |
| Week 8 | 02/11 – 08/11 | Xin tăng quota (bị từ chối); đổi sang Rekognition, viết Proposal v2.0; tạo S3, DynamoDB, IAM Role; viết Lambda `process-image` + S3 Event | Proposal v2.0, pipeline xử lý ảnh chạy được |
| Week 9 | 09/11 – 15/11 | Cognito, API Gateway, 2 Lambda API; web tĩnh + CloudFront; CloudWatch metrics/alarms/dashboard, SNS, DLQ; kiểm thử; AWS Pricing Calculator; quay video demo | Demo end-to-end, video, bảng chi phí |
| Week 10 | 16/11 – 19/11 | Viết mục 5-Workshop song ngữ (step-by-step, testing, clean-up), chụp screenshot, hoàn thiện sơ đồ kiến trúc, rà soát chéo | **Nộp workshop 19/11** |
| Week 10–12 | 20/11 – 04/12 | Sửa theo góp ý mentor, hoàn thiện blog và worklog, dọn tài nguyên | Báo cáo hoàn chỉnh |

## 6. Dự toán chi phí (Cost Estimation)

**Kịch bản tải:** một diễn đàn/trang rao vặt nhỏ nhận khoảng **3.000 ảnh/tháng** (~100 ảnh/ngày), ảnh trung bình 1 MB, khoảng 3% ảnh vi phạm, khoảng 30.000 lượt xem/tìm kiếm mỗi tháng. Region **us-east-1**, giá on-demand, **chưa trừ Free Tier/credit**.

| Dịch vụ | Giả định | Chi phí ước tính (USD/tháng) |
|---|---|---|
| Amazon Rekognition | 3.000 lượt `DetectModerationLabels` + ~2.910 lượt `DetectLabels` × 0,001 USD/ảnh | 5,91 |
| AWS Lambda | 36.000 lượt chạy, ~3.200 GB-giây | 0,06 (nằm trong Free Tier) |
| Amazon API Gateway (HTTP API) | 33.000 request | 0,03 |
| Amazon DynamoDB (On-demand) | ~6.000 WRU + 30.000 RRU, < 1 GB | 0,01 |
| Amazon S3 | 3 GB (Lifecycle 30 ngày), 3.000 PUT, 6.000 GET | 0,09 |
| Amazon CloudWatch | 0,5 GB log, 3 alarm, 3 custom metric, 1 dashboard | 0,27 (phần lớn nằm trong Free Tier) |
| Amazon CloudFront | ~2 GB truyền tải, 40.000 request | 0,00 (Always Free) |
| Amazon Cognito | < 10.000 MAU | 0,00 |
| Amazon SNS, Amazon SQS | Khoảng 100 email/tin nhắn | 0,00 |
| **Tổng** | | **≈ 6,40 USD/tháng (≈ 76 USD/năm)** |

Trong giai đoạn phát triển và demo (dự kiến < 300 ảnh), chi phí Rekognition chỉ khoảng 0,60 USD; toàn bộ nằm trong credit của tài khoản.

*Link AWS Pricing Calculator:* `[nhóm bổ sung sau khi tạo estimate]`

### Chiến lược tối ưu chi phí

- Kiến trúc **100% serverless**: không có EC2, NAT Gateway hay tài nguyên chạy 24/7.
- **Kiểm duyệt trước, gắn nhãn sau:** ảnh vi phạm không gọi `DetectLabels`, tiết kiệm một lượt gọi API cho mỗi ảnh bị chặn.
- Rekognition **đọc ảnh trực tiếp từ S3** nên Lambda chạy ngắn (~2 giây) với bộ nhớ nhỏ (256 MB).
- **S3 Lifecycle Policy** xóa ảnh sau 30 ngày (có thể đổi sang S3 Glacier nếu cần giữ lâu).
- **CloudWatch Logs retention 14 ngày**, không để mặc định "Never expire".
- **HTTP API** thay vì REST API (rẻ hơn khoảng 70%).
- **AWS Budgets** cảnh báo khi chi phí vượt 10 USD; thực hiện **Clean-up** ngay sau khi chấm.
- Khi lưu lượng lớn hơn 1 triệu ảnh/tháng, giá Rekognition tự giảm theo bậc (tiered pricing).

## 7. Rủi ro & Phương án giảm thiểu

| Rủi ro | Ảnh hưởng | Phương án giảm thiểu |
|---|---|---|
| Rekognition chặn nhầm ảnh hợp lệ hoặc bỏ sót ảnh vi phạm | Trải nghiệm người dùng kém hoặc lọt nội dung xấu | Ngưỡng tin cậy và danh mục bị cấm đặt trong biến môi trường để tinh chỉnh; đo tỉ lệ đúng/sai trên bộ ảnh thử nghiệm |
| Quota/hạn mức dịch vụ của tài khoản mới (đã xảy ra với Bedrock) | Không gọi được AI | Đã kiểm tra Rekognition chạy được trên tài khoản; retry có backoff khi bị throttling |
| Vòng lặp kích hoạt S3 → Lambda → S3 (recursive trigger) | Tốn chi phí | Chỉ trigger trên prefix `uploads/`; Lambda không ghi ngược vào S3 |
| Lộ access key lên GitHub | Mất an toàn tài khoản | Chỉ dùng IAM Role cho Lambda; `.gitignore`; kiểm tra lại trước mỗi lần commit |
| Ảnh thử nghiệm vi phạm bản quyền hoặc quá phản cảm | Vấn đề pháp lý, đạo đức | Dùng ảnh nhóm tự chụp hoặc ảnh giấy phép miễn phí; thử kiểm duyệt bằng danh mục nhẹ (rượu bia, thuốc lá, vũ khí đồ chơi) |
| Phát sinh chi phí ngoài dự kiến | Tốn credit | AWS Budgets; checklist Clean-up |
| Thiếu thời gian (còn khoảng 2 tuần) | Không kịp nộp | Phạm vi tối giản (MVP) trước, tính năng phụ làm sau; mỗi tuần có đầu ra rõ ràng |
| Thành viên chưa vững AWS | Chậm tiến độ, không trả lời được khi mentor hỏi | Học song song với làm; review chéo; mỗi người tự giải thích lại toàn bộ kiến trúc |

## 8. Kết quả kỳ vọng

- Một ứng dụng web chạy thật: đăng nhập → upload ảnh → ảnh vi phạm bị chặn kèm email cảnh báo, ảnh hợp lệ được gắn nhãn và tìm kiếm được.
- Hệ thống giám sát gồm CloudWatch Dashboard, Alarms và email cảnh báo.
- Tài liệu workshop song ngữ, có thể triển khai lại từ đầu, kèm phần Testing, Troubleshooting và Clean-up.
- Nhóm nắm vững các kiến thức thực tế: kiến trúc event-driven serverless, IAM Least Privilege, dịch vụ AI của AWS, giám sát và tối ưu chi phí, cũng như cách xử lý khi một dịch vụ bị giới hạn quota.
