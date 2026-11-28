---
title: "Video demo"
date: 2026-11-20
weight: 8
chapter: false
pre: " <b> 5.8. </b> "
---

**Sản phẩm đang chạy (production):** <https://d2tm9q0ah83pvf.cloudfront.net/>

**Video demo (2 phút):** <https://pham-nhut-an.github.io/fcj-workshop/videos/imageguard-demo.mp4>

<video controls preload="metadata" width="100%" style="max-width:960px;border-radius:8px">
  <source src="https://pham-nhut-an.github.io/fcj-workshop/videos/imageguard-demo.mp4" type="video/mp4">
  Trình duyệt không phát được video, hãy mở link ở trên.
</video>

## Nội dung video

| Thời điểm | Nội dung |
|---|---|
| 0:00 | Trang chủ ImageGuard qua CloudFront (đang ở giao diện tiếng Anh) |
| 0:04 | Chuyển sang trang Cognito Managed Login, đăng ký tài khoản mới bằng email; mật khẩu phải đủ điều kiện độ mạnh |
| 0:40 | Nhập mã xác nhận Cognito gửi qua email, tài khoản được kích hoạt |
| 0:52 | Đăng nhập xong, quay về web với bảng thống kê, ô tải ảnh và thư viện trống |
| 1:00 | Chọn ảnh xe máy `xe.jpg` và tải lên S3 bằng presigned URL |
| 1:20 | Vài giây sau ảnh chuyển **APPROVED**, có nhãn Machine, Wheel, Motorcycle, Transportation, Vehicle, Scooter và thông báo nổi |
| 1:28 | Chọn ảnh con dao `dao.jpg` và tải lên; thư viện hiện "Đang kiểm duyệt…" |
| 1:40 | Ảnh chuyển **REJECTED** với danh mục **Violence**; ảnh bị chặn không hiển thị |
| 1:44 | Mở Gmail: quản trị viên nhận email cảnh báo từ SNS gồm `userId`, `imageId`, `s3Key`, `blockedCategories` |
| 1:52 | Quay lại web: thống kê 2 ảnh, 1 đã duyệt, 1 bị chặn, thời gian hoàn tất trung bình khoảng 3 giây |

Đường link hủy đăng ký (unsubscribe) của SNS trong email đã được làm mờ, vì ai có link này đều có thể hủy email cảnh báo của quản trị viên.

Những phần không có trong video được trình bày bằng chữ và ảnh chụp màn hình ở các mục khác: kiến trúc và lý do thiết kế (5.3), cấu hình từng dịch vụ (5.4), dữ liệu trong DynamoDB, CloudWatch, kiểm thử bảo mật và kịch bản lỗi (5.5), chi phí (5.6) và dọn dẹp tài nguyên (5.7).
