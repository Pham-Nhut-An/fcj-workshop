---
title: "Worklog Tuần 9"
date: 2026-09-14
weight: 9
chapter: false
pre: " <b> 1.9. </b> "
---

### Mục tiêu tuần 9:

* Tìm hiểu các dịch vụ Container trên AWS (Docker, Amazon ECR, Amazon ECS với AWS Fargate).
* Tìm phương án thay thế cho bước AI của workshop (yêu cầu quota Bedrock bị từ chối).

### Các công việc cần triển khai trong tuần này:
| Thứ | Công việc | Ngày bắt đầu | Ngày hoàn thành | Nguồn tài liệu |
| --- | --- | --- | --- | --- |
| 2 | - Tiếp tục xử lý yêu cầu tăng quota Bedrock (không thành công). <br> - Xem lại tổng quan các bài đã học. | 09/11/2026 | 09/11/2026 | - |
| 3 | - Tìm hiểu kiến thức nền tảng về Containerization (lý thuyết): <br> &emsp; + Khái niệm Docker container, image và vòng đời container <br> &emsp; + Viết Dockerfile multi-stage, an toàn <br> &emsp; + Build và chạy container trên máy local. | 10/11/2026 | Đang thực hiện | <https://cloudjourney.awsstudygroup.com/> |
| 4 | - Tìm hiểu Amazon ECR & Amazon ECS: <br> &emsp; + Amazon Elastic Container Registry (ECR) để lưu trữ image riêng tư <br> &emsp; + Các thành phần Amazon ECS: Cluster, Task Definition, Service <br> &emsp; + Launch type: EC2 Launch Type và AWS Fargate (Serverless Container). | 11/11/2026 | Đang thực hiện | <https://cloudjourney.awsstudygroup.com/> |
| 5 | - Tìm hiểu Amazon Elastic Kubernetes Service (EKS): <br> &emsp; + Kiến trúc EKS: Control Plane, Managed Node Groups, Fargate Profiles <br> &emsp; + Quản lý bằng `kubectl` và `eksctl` <br> &emsp; + Pod networking, IAM Roles for Service Accounts (IRSA) và EKS Pod Identity. | 12/11/2026 | Đang thực hiện | <https://cloudjourney.awsstudygroup.com/> |
| 6 | - Thực hành Hands-on Lab: <br> &emsp; + Đóng gói container cho một ứng dụng web mẫu <br> &emsp; + Đẩy image lên Amazon ECR <br> &emsp; + Triển khai trên Amazon ECS Fargate phía sau Application Load Balancer có auto-scaling. | 13/11/2026 | Đang thực hiện | <https://cloudjourney.awsstudygroup.com/> |

### Kết quả đạt được tuần 9:

* Đang thực hiện
* Đang thực hiện
* Đang thực hiện
