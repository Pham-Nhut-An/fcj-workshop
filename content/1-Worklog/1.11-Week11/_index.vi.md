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
| 5 | - Kiểm thử hàng loạt 10 ảnh từ Wikimedia Commons qua pipeline thật (script `batch_test.sh`): 8/10 đúng mong đợi; ảnh hút thuốc bị bỏ sót (Smoking 27% < ngưỡng 60%). Cập nhật kết quả vào mục 5.5. <br> - Làm lại giao diện web (ô kéo thả, bộ đếm, nhãn dạng thẻ, responsive) và deploy lên S3 + CloudFront invalidation (có AI hỗ trợ). <br> - Thêm "Đối tượng sử dụng" và "Hướng phát triển" vào Proposal. <br> - Đối chiếu kiến trúc với tài nguyên đang chạy trên AWS (S3 Event, route + JWT Authorizer, IAM role, OAC, SNS, alarm); thêm lý do chọn Region us-east-1 vào mục 5.3. <br> - Chỉnh lại sơ đồ kiến trúc (đánh số luồng khớp bảng, thêm luồng 10c xem ảnh, bỏ line jump) và xuất lại file `.xml`. <br> - Chỉnh website báo cáo theo trang mẫu: thêm Lớp ở trang chủ, danh sách Blog, bảng Tự đánh giá 12 tiêu chí, trang Chia sẻ & Góp ý. | 26/11/2026 | 26/11/2026 | <https://docs.aws.amazon.com/rekognition/latest/dg/moderation.html> <br> <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html> |
| 6 | - Xem xét bản giao diện do thành viên trong nhóm làm lại từ code ImageGuard, so sánh các thay đổi với bản gốc. <br> - Đọc kỹ trang Project trên FCAJ Rules (nội dung báo cáo, yêu cầu, tiêu chuẩn) và đối chiếu với bài làm. | 27/11/2026 | 27/11/2026 | <https://hcm-rules.awsfcaj.com/project> |
| 7 | - Làm lại giao diện web nền tối, thêm các tính năng chạy trên trình duyệt (tải nhiều ảnh, kiểm tra 3 byte đầu file JPEG, thống kê, lọc/tìm/sắp xếp theo nhãn, xem chi tiết, thông báo khi đổi trạng thái) và chọn ngôn ngữ VI/EN, không đổi kiến trúc; deploy lên S3 + CloudFront (có AI hỗ trợ). <br> - Kiểm thử 5 kịch bản lỗi E1–E5 (`error_test.sh`): file PNG, body không phải JSON, thiếu token, gửi dồn 100 request, file giả đuôi `.jpg`; chụp lại ảnh minh họa giao diện mới. <br> - Đọc barem chấm điểm trên FCAJ Rules; bổ sung giải thích vào mục 5 (bảng luồng khớp sơ đồ, lý do chọn từng dịch vụ, mô hình dữ liệu DynamoDB, đối chiếu 5 trụ cột Well-Architected, các quyết định thiết kế, chi phí khi tăng tải). <br> - Quay video demo 2 phút (đăng ký, ảnh được duyệt, ảnh bị chặn, email cảnh báo), làm mờ link unsubscribe trong email, nén video và gắn vào mục 5.8. <br> - Sửa timeline trong Proposal cho đúng ngày thực tế, cập nhật worklog. | 28/11/2026 | 28/11/2026 | <https://hcm-rules.awsfcaj.com/scoring> <br> <https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html> |

### Kết quả đạt được tuần 11:

* Đã có bộ file nộp nhóm (summary `.md` và architecture `.xml`).
* Toàn bộ test bảo mật trong mục 5.5 đã được kiểm chứng thực tế.
* Đo được tỉ lệ chặn đúng/chặn nhầm trên 12 ảnh và rút ra hướng cải thiện (ngưỡng riêng cho từng danh mục, admin duyệt lại ảnh bị chặn).
* Đã bật PITR cho DynamoDB; giao diện web mới (nền tối, chọn ngôn ngữ VI/EN) đang chạy trên CloudFront.
* Hệ thống xử lý đúng cả 5 kịch bản lỗi (trả 400/401 hoặc đánh dấu `REJECTED`, không treo pipeline).
* Mục 5-Workshop đã đủ phần giải thích bằng chữ (không có thuyết trình).
* Đã có video demo trên website (mục 5.8).
* Chưa tham gia Community Event #3.
