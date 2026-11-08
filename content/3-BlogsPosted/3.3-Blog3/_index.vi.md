---
title: "Blog 3"
date: 2026-11-06
weight: 3
chapter: false
pre: " <b> 3.3. </b> "
---

# Lambda, SQS và EventBridge nay hỗ trợ payload tới 1 MB

**Đăng trên:** AWS Study Group VN (Facebook) – 06/11/2026 – <https://www.facebook.com/groups/awsstudygroupfcj/posts/2328196167945342/>

Trong kiến trúc **event-driven (hướng sự kiện)**, các dịch vụ trao đổi dữ liệu qua **payload (phần dữ liệu đính kèm trong tin nhắn hoặc sự kiện)**. Trước đây giới hạn là 256 KB, nên dữ liệu lớn như prompt cho LLM, telemetry hay kết quả ML phải chia nhỏ, nén hoặc lưu sang S3.

Từ đầu năm 2026, AWS nâng giới hạn lên **1 MB** cho:

- **AWS Lambda**: các lần gọi **asynchronous (bất đồng bộ)**
- **Amazon SQS**: tất cả message trong queue
- **Amazon EventBridge**: tất cả event trên event bus

Thay đổi áp dụng tự động cho cả tài nguyên cũ lẫn mới, không cần bật gì thêm. Nếu bạn từng tự đặt thuộc tính `MaximumMessageSize` của SQS, hoặc viết logic chia nhỏ theo mốc 256 KB, thì có thể cần chỉnh lại.

**Lưu ý quan trọng từ bài viết:**

- Giới hạn timeout 15 phút và bộ nhớ của Lambda không đổi, parse JSON lớn có thể tốn thêm bộ nhớ và thời gian, nên cần load test với dữ liệu thực tế
- Ghi toàn bộ payload vào CloudWatch Logs sẽ làm tăng chi phí, nên chỉ log chọn lọc hoặc lấy mẫu
- Mọi consumer (bên nhận) phải xử lý được payload lớn hơn
- Pattern lưu dữ liệu lớn ở S3 rồi gửi tham chiếu (gọi là **claim check**) vẫn hữu ích khi payload vượt 1 MB, khi nhiều bên cùng cần dữ liệu, hoặc khi cần kiểm toán

Với luồng tài liệu kiểu S3, Lambda rồi Textract và Bedrock, thay đổi này giúp truyền nhiều ngữ cảnh hơn trong một message mà không cần đường vòng.

**Nguồn:** *More room to build: serverless services now support payloads up to 1 MB* – Anton Aleksandrov, Debasis Rath, AWS Compute Blog (29/01/2026)
<https://aws.amazon.com/blogs/compute/more-room-to-build-serverless-services-now-support-payloads-up-to-1-mb/>
