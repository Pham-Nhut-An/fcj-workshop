---
title: "Video demo"
date: 2026-11-20
weight: 8
chapter: false
pre: " <b> 5.8. </b> "
---

**Video demo:** `[dán link YouTube / Google Drive sau khi quay]`

## Kịch bản video (5–7 phút)

| Thời điểm | Nội dung |
|---|---|
| 0:00 | Giới thiệu bài toán và sơ đồ kiến trúc (mục 5.3) |
| 1:00 | Mở web qua CloudFront → Đăng nhập / đăng ký bằng Cognito |
| 2:00 | Upload ảnh bia → vài giây sau chuyển **APPROVED**, hiện nhãn |
| 2:45 | Upload ảnh súng đồ chơi → **REJECTED**, mở email cảnh báo (nhắc ví dụ false positive) |
| 3:30 | DynamoDB: item có `userId` = `sub`, `moderationLabels`, `labels` |
| 4:00 | CloudWatch dashboard: số ảnh APPROVED/REJECTED, thời gian xử lý, alarm |
| 4:45 | Bảo mật: gọi API không token → 401; mở thẳng S3 → AccessDenied |
| 5:30 | Chi phí: AWS Pricing Calculator 8,37 USD/tháng |
| 6:00 | Tổng kết, hướng mở rộng (admin duyệt lại ảnh REJECTED, AWS WAF, presigned POST giới hạn dung lượng) |
