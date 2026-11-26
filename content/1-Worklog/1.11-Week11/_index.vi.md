---
title: "Worklog Tuần 11"
date: 2026-09-14
weight: 11
chapter: false
pre: " <b> 1.11. </b> "
---

### Mục tiêu tuần 11:

* Hoàn thiện kiểm thử và tài liệu Workshop theo hướng dẫn nộp bài của FCAJ.
* Chuẩn bị bộ file nộp nhóm (summary `.md`, architecture `.xml`) và hoàn thiện báo cáo cá nhân.

### Các công việc cần triển khai trong tuần này:
| Thứ | Công việc | Ngày bắt đầu | Ngày hoàn thành | Nguồn tài liệu |
| --- | --- | --- | --- | --- |
| 4 | - Đọc quy định nộp bài, barem chấm và tiêu chuẩn Workshop trên FCAJ Rules. <br> - Soạn file summary `.md` (Problem Statement, Proposed Solution, End-to-End Workflow, Additional, Cost) và xuất sơ đồ kiến trúc ra `.xml`; sửa icon IAM cho đúng chuẩn AWS. <br> - Kiểm thử bảo mật bổ sung: mở thẳng Object URL ảnh → 403; HTTP → 301 chuyển HTTPS; presigned URL hết hạn → 403 "Request has expired". <br> - Rà soát và cập nhật worklog, viết Tự đánh giá và Chia sẻ & Góp ý (có AI hỗ trợ trình bày). <br> - Bỏ lời hứa "tìm kiếm theo nhãn" khỏi Proposal cho khớp với bản đang chạy; thêm bảng đối chiếu tiêu chí hoàn thành vào mục 5.5. <br> - Bật DynamoDB Point-in-time recovery cho bảng `imageguard-images`. | 25/11/2026 | 25/11/2026 | <https://hcm-rules.awsfcaj.com/> <br> <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.html> |
| 5 | - Kiểm thử hàng loạt 10 ảnh từ Wikimedia Commons qua pipeline thật (script `batch_test.sh`): 8/10 đúng mong đợi; ảnh hút thuốc bị bỏ sót (Smoking 27% < ngưỡng 60%). Cập nhật kết quả vào mục 5.5. <br> - Làm lại giao diện web (ô kéo thả, bộ đếm, nhãn dạng thẻ, responsive) và deploy lên S3 + CloudFront invalidation (có AI hỗ trợ). | 26/11/2026 | 26/11/2026 | <https://docs.aws.amazon.com/rekognition/latest/dg/moderation.html> <br> <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html> |
| 6 | - Quay video demo, chụp ảnh giao diện mới và push website. <br> - Tìm và tham gia Community Event #3. | 27/11/2026 | Đang thực hiện | - |

### Kết quả đạt được tuần 11:

* Đã có bộ file nộp nhóm (summary `.md` và architecture `.xml`).
* Toàn bộ test bảo mật trong mục 5.5 đã được kiểm chứng thực tế.
* Đo được tỉ lệ chặn đúng/chặn nhầm trên 12 ảnh và rút ra hướng cải thiện (ngưỡng riêng cho từng danh mục, admin duyệt lại ảnh bị chặn).
* Đã bật PITR cho DynamoDB và deploy giao diện web mới.
* Đang thực hiện: video demo, Event 3.
