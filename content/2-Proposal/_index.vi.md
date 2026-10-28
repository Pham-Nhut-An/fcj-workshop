---
title: "Proposal"
date: 2026-10-28
weight: 2
chapter: false
pre: " <b> 2. </b> "
---

# SmartDoc – Xử lý hóa đơn tự động bằng AI trên nền tảng AWS Serverless

{{% notice info %}}
**Trạng thái:** Bản đề xuất v1.0 (28/10/2026). Sơ đồ kiến trúc chính thức sẽ được nhóm tự vẽ bằng draw.io với bộ AWS Architecture Icons và bổ sung vào mục 4.
{{% /notice %}}

## 1. Tổng quan

**SmartDoc** là một ứng dụng web serverless giúp hộ kinh doanh nhỏ, cửa hàng, nhóm sinh viên hoặc cá nhân **số hóa hóa đơn/biên lai giấy chỉ bằng một tấm ảnh**. Người dùng đăng nhập, chụp hoặc tải ảnh hóa đơn lên; hệ thống tự động dùng mô hình AI đa phương thức (multimodal) **Amazon Nova Lite** trên **Amazon Bedrock** để đọc nội dung, trích xuất các trường quan trọng (tên cửa hàng, ngày, tổng tiền, thuế, danh sách mặt hàng), **phân loại** khoản chi (ăn uống, đi lại, văn phòng phẩm…) và **tóm tắt** ngắn gọn. Kết quả được lưu vào **Amazon DynamoDB** và hiển thị lại trên giao diện web chỉ sau vài giây.

Toàn bộ hệ thống chạy theo kiến trúc **hướng sự kiện (event-driven)** và **serverless**: không có máy chủ nào phải quản lý, chỉ trả tiền theo lượt sử dụng.

## 2. Vấn đề cần giải quyết

- Hộ kinh doanh nhỏ và cá nhân vẫn nhận nhiều **hóa đơn, biên lai giấy** (nhà hàng, siêu thị, taxi, văn phòng phẩm). Việc nhập tay từng hóa đơn vào Excel tốn thời gian, dễ sai sót và dễ thất lạc chứng từ.
- Các công cụ OCR thông thường chỉ trả về **văn bản thô**, người dùng vẫn phải tự tìm tổng tiền, ngày tháng và tự phân loại.
- Hóa đơn tại Việt Nam thường là **tiếng Việt có dấu**, nhiều định dạng khác nhau, nên khó dùng một mẫu (template) cố định.

**Giải pháp:** dùng mô hình AI đa phương thức để vừa *đọc* vừa *hiểu* hóa đơn trong một bước, trả về dữ liệu có cấu trúc (JSON) để lưu trữ, tra cứu và thống kê.

## 3. Mục tiêu & Phạm vi

### 3.1. Mục tiêu

1. Xây dựng pipeline tự động: **Upload ảnh → AI trích xuất → Lưu trữ → Hiển thị** chạy hoàn toàn trên AWS.
2. Áp dụng **AWS Well-Architected Framework**, đặc biệt là trụ cột **Security** (IAM Least Privilege, không public tài nguyên, không hard-code credentials).
3. Giám sát đầy đủ bằng **Amazon CloudWatch** (Logs, Metrics, Alarms) và cảnh báo qua email bằng **Amazon SNS**.
4. Giữ chi phí vận hành ở mức **dưới 2 USD/tháng** với kịch bản tải thực tế (mục 6).
5. Viết tài liệu **step-by-step song ngữ** để người khác có thể tự triển khai lại.

### 3.2. Tiêu chí hoàn thành (Success criteria)

| Tiêu chí | Mục tiêu đo lường |
|---|---|
| Thời gian xử lý 1 hóa đơn (từ lúc upload đến khi có kết quả) | ≤ 15 giây |
| Độ chính xác trích xuất **tổng tiền** và **ngày** trên bộ 30 hóa đơn mẫu | ≥ 85% |
| Người dùng chưa đăng nhập gọi API | Bị từ chối (HTTP 401) |
| Người dùng A xem dữ liệu của người dùng B | Không thể |
| Lỗi xử lý (ảnh hỏng, AI trả sai định dạng) | Được ghi log, đánh dấu `FAILED`, gửi cảnh báo email |
| Bucket S3 bị truy cập trực tiếp từ Internet | Bị chặn (Block Public Access) |

### 3.3. Phạm vi

| Trong phạm vi (In scope) | Ngoài phạm vi (Out of scope) |
|---|---|
| Ảnh hóa đơn/biên lai **1 trang** (JPG/PNG, ≤ 5 MB) | PDF nhiều trang |
| Trích xuất trường chính, phân loại, tóm tắt | Tích hợp phần mềm kế toán, hóa đơn điện tử (XML) |
| Đăng ký/đăng nhập bằng Amazon Cognito | Phân quyền nhiều vai trò (admin, kế toán…) |
| Danh sách & chi tiết hóa đơn của chính người dùng | Báo cáo thống kê nâng cao, xuất Excel |
| 1 Region: **us-east-1** | Multi-Region, Disaster Recovery |

## 4. Kiến trúc giải pháp

<!-- Khi đã vẽ xong, lưu file vào static/images/2-proposal/architecture.png rồi bỏ comment dòng dưới:
![SmartDoc Architecture](../../images/2-proposal/architecture.png)
-->

### 4.1. Các dịch vụ AWS sử dụng và lý do lựa chọn

| Dịch vụ | Vai trò trong hệ thống | Lý do lựa chọn |
|---|---|---|
| **Amazon S3** | (1) Lưu ảnh hóa đơn (bucket private); (2) lưu web tĩnh | Lưu trữ bền vững 99.999999999%, rẻ, phát sinh **S3 Event** để kích hoạt xử lý |
| **Amazon CloudFront** | Phân phối web tĩnh qua HTTPS, truy cập S3 qua **Origin Access Control (OAC)** | Bucket web không cần public; có HTTPS miễn phí; nằm trong Always Free (1 TB/tháng) |
| **Amazon Cognito** (User Pool) | Đăng ký, đăng nhập, cấp **JWT token** | Dịch vụ quản lý danh tính có sẵn, miễn phí tới 10.000 MAU, không tự lưu mật khẩu |
| **Amazon API Gateway** (HTTP API) | REST endpoint cho web; xác thực bằng **JWT Authorizer** gắn Cognito | Rẻ hơn REST API (~1 USD/1 triệu request), tích hợp sẵn Cognito |
| **AWS Lambda** (Python 3.12) | 3 hàm: `presign-upload`, `process-document`, `get-documents` | Serverless, trả theo lượt chạy, tự mở rộng (scale) |
| **Amazon Bedrock** – Amazon Nova Lite | Đọc ảnh hóa đơn, trích xuất JSON, phân loại, tóm tắt | Mô hình đa phương thức (nhận ảnh), giá rất thấp (0,06 USD/1 triệu token đầu vào), có sẵn trong Region us-east-1 |
| **Amazon DynamoDB** (On-demand) | Lưu kết quả trích xuất theo từng người dùng | NoSQL serverless, trả theo request, độ trễ thấp, 25 GB miễn phí |
| **Amazon SQS** | **Dead-Letter Queue (DLQ)** chứa sự kiện xử lý thất bại | Không mất dữ liệu khi lỗi, có thể xử lý lại |
| **Amazon CloudWatch** | Logs, Metrics (mặc định + custom), Alarms, Dashboard | Giám sát tập trung, bắt buộc theo yêu cầu workshop |
| **Amazon SNS** | Gửi email cảnh báo khi Alarm kích hoạt | Đơn giản, 1.000 email/tháng miễn phí |
| **AWS IAM** | Mỗi Lambda 1 IAM Role riêng theo Least Privilege | Nền tảng bảo mật của toàn hệ thống |

> **Vì sao không dùng Amazon Textract?** Ban đầu nhóm định dùng Textract để OCR, nhưng khi tìm hiểu thì thấy: (1) với tài khoản AWS mới ở **Free plan**, Textract chỉ dùng được sau khi nâng cấp lên **Paid plan**; (2) Textract không hỗ trợ tiếng Việt, mà hóa đơn tại Việt Nam chủ yếu là tiếng Việt. Mô hình đa phương thức Nova Lite xử lý được cả hai bước đọc và hiểu, nên kiến trúc gọn hơn và rẻ hơn.

### 4.2. Luồng dữ liệu (Data flow)

1. Người dùng mở web qua **CloudFront** → đăng nhập bằng **Cognito** → nhận JWT token.
2. Web gọi `POST /upload-url` trên **API Gateway** (kèm token). API Gateway kiểm tra token bằng JWT Authorizer rồi gọi Lambda **`presign-upload`**.
3. `presign-upload` tạo bản ghi trạng thái `PENDING` trong DynamoDB và trả về một **Presigned URL** (link upload tạm thời, hết hạn sau 5 phút) cho đường dẫn `uploads/{userId}/{documentId}.jpg`.
4. Trình duyệt upload ảnh **thẳng lên S3** bằng Presigned URL (ảnh không đi qua Lambda/API Gateway).
5. S3 phát sinh sự kiện **ObjectCreated** (chỉ với prefix `uploads/`) → gọi bất đồng bộ Lambda **`process-document`**.
6. `process-document` đọc ảnh từ S3 → gọi **Bedrock Converse API** với model Nova Lite và prompt yêu cầu trả JSON → kiểm tra (validate) JSON → cập nhật DynamoDB thành `DONE` (hoặc `FAILED` nếu lỗi).
7. Nếu Lambda lỗi sau 2 lần thử lại, sự kiện được đưa vào **SQS DLQ**.
8. Web gọi `GET /documents` → Lambda **`get-documents`** truy vấn DynamoDB **chỉ theo `userId` lấy từ token** → hiển thị kết quả.
9. Tất cả Lambda ghi log và metric vào **CloudWatch**; Alarm gửi email qua **SNS** khi có lỗi.

### 4.3. Thiết kế bảo mật (Security pillar)

| Nguyên tắc | Cách áp dụng trong SmartDoc |
|---|---|
| **Least Privilege** | Mỗi Lambda có Role riêng. Ví dụ `process-document` chỉ được `s3:GetObject` trên `uploads/*`, `bedrock:InvokeModel` **đúng 1 model** Nova Lite, `dynamodb:UpdateItem` **đúng 1 bảng**. `presign-upload` chỉ được `s3:PutObject` trên `uploads/*`. Không dùng `*` cho Action/Resource |
| **Không public tài nguyên** | Cả 2 bucket bật **Block Public Access**. Bucket web chỉ cho CloudFront đọc qua OAC. Bucket ảnh chỉ nhận upload qua Presigned URL ngắn hạn |
| **Xác thực & cô lập dữ liệu** | Mọi API đều yêu cầu JWT từ Cognito. `userId` luôn lấy từ claim `sub` trong token, **không** lấy từ dữ liệu client gửi lên → người dùng không xem được dữ liệu của người khác |
| **Không hard-code credentials** | Lambda dùng IAM Role (credential tạm thời do AWS tự cấp). Tên bucket/bảng/model đưa vào **Environment variables**. Repository GitHub không chứa access key; có `.gitignore` |
| **Mã hóa** | S3 và DynamoDB mã hóa khi lưu (SSE mặc định); mọi kết nối dùng HTTPS/TLS |
| **Bảo vệ đầu vào** | Presigned URL giới hạn `Content-Type` ảnh; Lambda kiểm tra kích thước ≤ 5 MB; validate JSON từ AI trước khi lưu |
| **Quyền riêng tư dữ liệu AI** | Theo tài liệu AWS, Bedrock không dùng prompt và kết quả của khách hàng để huấn luyện mô hình |

> **Vì sao không đặt Lambda trong VPC/Private Subnet?** Hệ thống không có cơ sở dữ liệu hay máy chủ nào cần nằm trong mạng riêng. Lambda gọi S3, DynamoDB, Bedrock qua HTTPS và được xác thực bằng IAM. Nếu đưa Lambda vào VPC thì phải trả thêm phí NAT Gateway hoặc Interface VPC Endpoint (khoảng vài chục USD/tháng) mà không tăng thêm bảo mật đáng kể cho kiến trúc này. Nhóm ghi nhận đây là một hướng mở rộng nếu sau này có yêu cầu tuân thủ.

### 4.4. Đối chiếu với AWS Well-Architected Framework

| Trụ cột | Áp dụng |
|---|---|
| Operational Excellence | CloudWatch Logs (lưu 14 ngày), Dashboard, Alarms; tài liệu triển khai lại được |
| Security | Như mục 4.3 |
| Reliability | Kiến trúc event-driven; Lambda tự retry 2 lần; DLQ giữ sự kiện lỗi; trạng thái `PENDING/DONE/FAILED` rõ ràng |
| Performance Efficiency | Upload thẳng lên S3 bằng Presigned URL; chọn model nhỏ và nhanh (Nova Lite); DynamoDB truy vấn theo khóa |
| Cost Optimization | 100% serverless trả theo lượt dùng; S3 Lifecycle xóa ảnh sau 30 ngày; CloudWatch Logs retention 14 ngày; AWS Budgets cảnh báo chi phí |
| Sustainability | Không có tài nguyên chạy không tải (idle); chỉ tốn tài nguyên khi có hóa đơn cần xử lý |

## 5. Kế hoạch & Timeline

Thời gian thực tập: 14/09/2026 – 04/12/2026. Hạn nộp Workshop dự kiến: **19/11/2026** (15 ngày trước ngày cần mộc).

### 5.1. Phân công vai trò

| Thành viên | Vai trò chính |
|---|---|
| Thành viên A | Trưởng nhóm, tích hợp hệ thống, IAM & bảo mật |
| Thành viên B | Lambda `process-document`, prompt Bedrock, đánh giá độ chính xác |
| Thành viên C | Cognito, API Gateway, Lambda `presign-upload` và `get-documents` |
| Thành viên D | Giao diện web tĩnh, S3 + CloudFront (OAC) |
| Thành viên E | CloudWatch, SNS, DLQ, dự toán chi phí, hướng dẫn Clean-up |

*Mỗi thành viên phải hiểu toàn bộ kiến trúc và tự giải thích được tất cả các phần, không chỉ phần mình phụ trách.*

### 5.2. Timeline theo tuần

| Tuần thực tập | Thời gian | Công việc | Đầu ra |
|---|---|---|---|
| Week 7 | 28/10 – 01/11 | Chốt đề tài, viết Proposal; thử Nova Lite trên Bedrock Playground với 10 ảnh hóa đơn mẫu; thu thập 30 hóa đơn thử nghiệm; vẽ bản nháp sơ đồ kiến trúc | Proposal, prompt v1, bộ dữ liệu thử |
| Week 8 | 02/11 – 08/11 | Tạo S3, DynamoDB, IAM Role; viết Lambda `process-document` + S3 Event; tạo Cognito, API Gateway, 2 Lambda API | Pipeline backend chạy được bằng CLI/Postman |
| Week 9 | 09/11 – 15/11 | Làm web tĩnh + CloudFront; CloudWatch metrics/alarms/dashboard, SNS, DLQ; kiểm thử (đúng/sai/lỗi/tải); lập bảng AWS Pricing Calculator; quay video demo | Demo end-to-end, video, bảng chi phí |
| Week 10 | 16/11 – 19/11 | Viết mục 5-Workshop song ngữ (step-by-step, testing, clean-up), chụp screenshot, hoàn thiện sơ đồ kiến trúc, rà soát chéo | **Nộp workshop 19/11** |
| Week 10–12 | 20/11 – 04/12 | Sửa theo góp ý mentor, hoàn thiện blog và worklog, dọn tài nguyên | Báo cáo hoàn chỉnh |

## 6. Dự toán chi phí (Cost Estimation)

**Kịch bản tải:** một cửa hàng nhỏ xử lý khoảng **3.000 hóa đơn/tháng** (~100 hóa đơn/ngày), ảnh trung bình 1 MB, khoảng 30.000 lượt xem danh sách/chi tiết mỗi tháng. Region **us-east-1**, giá on-demand, **chưa trừ Free Tier/credit**.

| Dịch vụ | Giả định | Chi phí ước tính (USD/tháng) |
|---|---|---|
| Amazon Bedrock (Nova Lite) | 3.000 lượt × (~2.000 token vào + ~500 token ra) | 0,72 |
| AWS Lambda | 36.000 lượt chạy, ~16.650 GB-giây | 0,28 (nằm trong Free Tier 400.000 GB-giây) |
| Amazon API Gateway (HTTP API) | 33.000 request | 0,03 |
| Amazon DynamoDB (On-demand) | 12.000 WRU + 30.000 RRU, < 1 GB | 0,01 |
| Amazon S3 | 3 GB (Lifecycle 30 ngày), 3.000 PUT/GET | 0,09 |
| Amazon CloudWatch | 0,5 GB log, 3 alarm, 3 custom metric, 1 dashboard | 0,27 (phần lớn nằm trong Free Tier) |
| Amazon CloudFront | ~2 GB truyền tải, 40.000 request | 0,00 (Always Free) |
| Amazon Cognito | < 10.000 MAU | 0,00 |
| Amazon SNS, Amazon SQS | Vài chục email/tin nhắn | 0,00 |
| **Tổng** | | **≈ 1,40 USD/tháng (≈ 17 USD/năm)** |

Trong giai đoạn phát triển và demo (dự kiến < 300 hóa đơn), chi phí Bedrock chỉ khoảng 0,07 USD; toàn bộ nằm trong credit 200 USD của tài khoản mới.

*Link AWS Pricing Calculator:* `[nhóm bổ sung sau khi tạo estimate]`

### Chiến lược tối ưu chi phí

- Kiến trúc **100% serverless**: không có EC2, NAT Gateway hay tài nguyên chạy 24/7.
- Chọn **Nova Lite** thay vì model lớn; giới hạn `maxTokens` đầu ra; giảm kích thước ảnh trước khi upload (tối đa ~1.400 px) để giảm token.
- **S3 Lifecycle Policy** xóa ảnh gốc sau 30 ngày (dữ liệu đã trích xuất vẫn nằm trong DynamoDB).
- **CloudWatch Logs retention 14 ngày**, không để mặc định "Never expire".
- **HTTP API** thay vì REST API (rẻ hơn khoảng 70%).
- **AWS Budgets** cảnh báo khi chi phí vượt 5 USD; thực hiện **Clean-up** ngay sau khi chấm.

## 7. Rủi ro & Phương án giảm thiểu

| Rủi ro | Ảnh hưởng | Phương án giảm thiểu |
|---|---|---|
| Nova Lite đọc sai tiếng Việt có dấu hoặc ảnh mờ | Kết quả trích xuất sai | Thử 10 ảnh ngay Week 7; cải thiện prompt; nếu vẫn kém thì đổi sang Nova Pro (cùng API, chỉ đổi model ID) |
| AI trả về sai định dạng JSON | Lambda lỗi | Validate JSON, thử lại 1 lần; nếu vẫn lỗi thì đánh dấu `FAILED` và ghi log |
| Quota Bedrock của tài khoản mới thấp | Lỗi throttling khi demo | Kiểm tra Service Quotas sớm; retry có backoff; demo với tải vừa phải |
| Vòng lặp kích hoạt S3 → Lambda → S3 (recursive trigger) | Tốn chi phí | Chỉ trigger trên prefix `uploads/`; Lambda không ghi ngược vào S3 |
| Lộ access key lên GitHub | Mất an toàn tài khoản | Chỉ dùng IAM Role cho Lambda; `.gitignore`; kiểm tra lại trước mỗi lần commit |
| Phát sinh chi phí ngoài dự kiến | Tốn credit | AWS Budgets + Free plan; checklist Clean-up |
| Thiếu thời gian (còn khoảng 3 tuần) | Không kịp nộp | Phạm vi tối giản (MVP) trước, tính năng phụ làm sau; mỗi tuần có đầu ra rõ ràng |
| Thành viên chưa vững AWS | Chậm tiến độ, không trả lời được khi mentor hỏi | Học song song với làm; review chéo; mỗi người tự giải thích lại toàn bộ kiến trúc |

## 8. Kết quả kỳ vọng

- Một ứng dụng web chạy thật: đăng nhập → upload ảnh hóa đơn → xem kết quả trích xuất, phân loại, tóm tắt.
- Hệ thống giám sát gồm CloudWatch Dashboard, Alarms và email cảnh báo.
- Tài liệu workshop song ngữ, có thể triển khai lại từ đầu, kèm phần Testing và Clean-up.
- Nhóm nắm vững các kiến thức thực tế: kiến trúc event-driven serverless, IAM Least Privilege, gọi Generative AI qua Amazon Bedrock, giám sát và tối ưu chi phí trên AWS.
