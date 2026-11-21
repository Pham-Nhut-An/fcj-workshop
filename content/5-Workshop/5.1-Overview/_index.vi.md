---
title: "Tổng quan Workshop"
date: 2026-11-20
weight: 1
chapter: false
pre: " <b> 5.1. </b> "
---

## Bài toán

Các diễn đàn và trang rao vặt nhỏ nhận hàng nghìn ảnh mỗi tháng. Kiểm duyệt thủ công chậm, tốn người và dễ bỏ sót ảnh bạo lực hoặc phản cảm. ImageGuard tự động hóa việc này: mỗi ảnh được kiểm duyệt trong **khoảng 1–2 giây** sau khi tải lên.

## Kết quả đạt được sau Workshop

- Web tĩnh chạy qua **CloudFront**, đăng nhập bằng **Cognito** (OAuth 2.0 Authorization Code + PKCE).
- Người dùng tải ảnh **thẳng lên S3** bằng presigned URL; ảnh không đi qua API Gateway hay Lambda.
- **S3 Event** kích hoạt Lambda `process-image`: gọi `DetectModerationLabels`, nếu hợp lệ mới gọi `DetectLabels`, ghi kết quả vào **DynamoDB**.
- Ảnh vi phạm: trạng thái `REJECTED`, gửi email qua **SNS**. Lỗi xử lý sau 2 lần thử lại được đưa vào **SQS DLQ**.
- **CloudWatch** có log, 5 custom metric (EMF), 7 alarm và 1 dashboard.

## Bạn sẽ học được

| Chủ đề | Nội dung |
|---|---|
| Kiến trúc hướng sự kiện (event-driven) | S3 Event → Lambda bất đồng bộ (asynchronous), retry và Dead-Letter Queue |
| Bảo mật | Least privilege (quyền tối thiểu) cho từng Lambda, presigned URL, JWT Authorizer, OAC, chống confused deputy |
| AI không cần huấn luyện mô hình | Amazon Rekognition Content Moderation và Label Detection |
| Vận hành | Embedded Metric Format, CloudWatch Alarm → SNS, dashboard |
| Chi phí | AWS Pricing Calculator, Lifecycle, log retention, HTTP API |

## Nội dung

1. [Chuẩn bị](../5.2-prerequisites/)
2. [Kiến trúc](../5.3-architecture/)
3. [Hướng dẫn từng bước](../5.4-lab-guide/)
4. [Kiểm thử và xử lý sự cố](../5.5-testing/)
5. [Chi phí](../5.6-cost/)
6. [Dọn dẹp tài nguyên](../5.7-cleanup/)
7. [Video demo](../5.8-demo/)
