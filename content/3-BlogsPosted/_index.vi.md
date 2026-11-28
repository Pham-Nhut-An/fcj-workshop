---
title: "Các bài blogs đã đăng"
date: 2026-09-14
weight: 3
chapter: false
pre: " <b> 3. </b> "
---

Phần này liệt kê 3 bài blog đã đăng lên cộng đồng [AWS Study Group](https://www.facebook.com/groups/awsstudygroupfcj) ngày 06/11/2026.

### [Blog 1 - Xử lý tài liệu tự cải thiện với Amazon Bedrock AgentCore](3.1-blog1/)
Bài viết giới thiệu giải pháp mẫu dùng AI agent trên Amazon Bedrock AgentCore để xử lý tài liệu (hóa đơn, biểu mẫu) mà không cần viết sẵn template cho từng loại. Hệ thống kết hợp Amazon Textract, Strands Agents và S3 Vectors để ghi nhớ các lần sửa lỗi trước đó và tự cải thiện theo thời gian.

### [Blog 2 - Chọn vector store nào cho Amazon Bedrock Knowledge Bases?](3.2-blog2/)
Bài viết so sánh 3 lựa chọn lưu vector cho RAG trên Bedrock: Amazon OpenSearch Service, Aurora PostgreSQL với pgvector và Amazon S3 Vectors, mỗi lựa chọn thử trên một bài toán khác nhau, kèm số liệu về độ trễ và kích thước index để chọn đúng dịch vụ.

### [Blog 3 - Lambda, SQS và EventBridge nay hỗ trợ payload tới 1 MB](3.3-blog3/)
Bài viết tóm tắt việc AWS nâng giới hạn payload từ 256 KB lên 1 MB cho Lambda (gọi bất đồng bộ), SQS và EventBridge, ảnh hưởng tới kiến trúc event-driven và những điểm cần lưu ý như bộ nhớ, timeout và load test.
