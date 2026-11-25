---
title: "Worklog Tuần 10"
date: 2026-09-14
weight: 10
chapter: false
pre: " <b> 1.10. </b> "
---

### Mục tiêu tuần 10:

* Triển khai Workshop ImageGuard trên tài khoản AWS (Step 1–5).
* Viết tài liệu Workshop song ngữ trên website báo cáo.

### Các công việc cần triển khai trong tuần này:
| Thứ | Công việc | Ngày bắt đầu | Ngày hoàn thành | Nguồn tài liệu |
| --- | --- | --- | --- | --- |
| 2 – 5 | - Tự học nhẹ (chưa hoàn thành công việc lớn nào). | 16/11/2026 | 19/11/2026 | - |
| 6 | - Rà soát kiến trúc ImageGuard và chuẩn bị câu trả lời cho mentor (chọn Region, không dùng VPC, IAM least privilege, ước tính chi phí). <br> - Step 1 – tài nguyên nền tảng: S3 bucket (Block Public Access, SSE-S3, lifecycle 30 ngày, bucket policy bắt HTTPS), DynamoDB on-demand, SNS, SQS DLQ, IAM role least privilege. <br> - Step 2 – Lambda `process-image` (Python 3.12, arm64) + S3 Event, retry 2 lần, on-failure destination vào DLQ; test ảnh APPROVED/REJECTED và test DLQ. <br> - Step 3 – Cognito (PKCE), API Gateway HTTP API + JWT Authorizer, 2 Lambda `presign-upload`/`get-images`, web tĩnh qua CloudFront OAC (dùng AWS CLI trong CloudShell). <br> - Step 4 – 7 CloudWatch Alarm, dashboard, log retention 14 ngày. <br> - Step 5 – dự toán chi phí bằng AWS Pricing Calculator (8,37 USD/tháng). <br> - Có dùng AI (Claude) hỗ trợ viết code, script và hướng dẫn; tự thao tác, kiểm tra kết quả trên tài khoản AWS. | 20/11/2026 | 20/11/2026 | <https://docs.aws.amazon.com/lambda/> <br> <https://docs.aws.amazon.com/rekognition/> <br> <https://calculator.aws/> |
| 7 | - Viết mục 5-Workshop song ngữ (8 mục con), cập nhật bảng chi phí trong Proposal, đưa code và ảnh minh họa lên website. <br> - Sửa lỗi build Hugo (`getJSON` bị bỏ ở Hugo mới) và push lên GitHub Pages. | 21/11/2026 | 21/11/2026 | <https://gohugo.io/documentation/> |

### Kết quả đạt được tuần 10:

* Hệ thống ImageGuard chạy thật trên AWS: upload ảnh qua web → Rekognition kiểm duyệt → ảnh bia APPROVED, ảnh súng đồ chơi REJECTED và quản trị viên nhận email.
* Gặp và xử lý 4 lỗi: inline policy sai ARN ("failed legacy parsing"), gửi email trước khi ghi DB (đã sửa code), SNS mã hóa bằng `aws/sns` khiến alarm không gửi được email, lỗi build Hugo.
* Hoàn thành mục 5-Workshop song ngữ và dự toán chi phí trên AWS Pricing Calculator.
* Chưa tham gia Community Event #3.
