---
title: "Worklog Tuần 9"
date: 2026-09-14
weight: 9
chapter: false
pre: " <b> 1.9. </b> "
---

### Mục tiêu tuần 9:

* Tìm phương án thay thế cho bước AI của workshop (yêu cầu quota Bedrock bị từ chối).
* Tìm hiểu các dịch vụ Container trên AWS (Docker, Amazon ECR, Amazon ECS với AWS Fargate).

### Các công việc cần triển khai trong tuần này:
| Thứ | Công việc | Ngày bắt đầu | Ngày hoàn thành | Nguồn tài liệu |
| --- | --- | --- | --- | --- |
| 2 | - Tiếp tục xử lý yêu cầu tăng quota Bedrock (không thành công). <br> - Xem lại tổng quan các bài đã học. | 09/11/2026 | 09/11/2026 | <https://docs.aws.amazon.com/servicequotas/latest/userguide/> |
| 3 | - Thử Amazon Rekognition trên AWS Console để thay thế Amazon Bedrock: <br> &emsp; + DetectModerationLabels: ảnh súng gỗ đồ chơi bị gắn nhãn Violence/Weapons (97,2%, một trường hợp nhận nhầm – false positive) <br> &emsp; + Ảnh bia được gắn nhãn Alcohol/Alcoholic Beverages (99,3%). | 10/11/2026 | 10/11/2026 | <https://docs.aws.amazon.com/rekognition/> |
| 4 | - Vẽ sơ đồ kiến trúc ImageGuard bằng draw.io (dùng icon AWS chính thức). | 11/11/2026 | 11/11/2026 | <https://aws.amazon.com/architecture/icons/> |
| 5 | - Viết lại Proposal cho đề tài mới ImageGuard – tự động kiểm duyệt và gắn nhãn ảnh bằng Amazon Rekognition. | 12/11/2026 | 12/11/2026 | <https://workshop-sample.awsfcaj.com/> |
| 6 | - Hoàn thiện sơ đồ kiến trúc và Proposal ImageGuard trên website báo cáo. | 13/11/2026 | 13/11/2026 | <https://workshop-sample.awsfcaj.com/> |

### Kết quả đạt được tuần 9:

* Đã thử Amazon Rekognition trên AWS Console (kiểm duyệt và nhận diện nhãn) để thay thế Amazon Bedrock.
* Đã viết lại Proposal cho đề tài ImageGuard và tự vẽ sơ đồ kiến trúc bằng draw.io.
* Phần dịch vụ container (Docker, Amazon ECR, Amazon ECS, Amazon EKS) được dời sang sau.
