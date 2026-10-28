---
title: "Worklog Tuần 7"
date: 2026-09-14
weight: 7
chapter: false
pre: " <b> 1.7. </b> "
---

### Mục tiêu tuần 7:

* Tìm hiểu kiến trúc hướng sự kiện - Event-Driven Architecture (SQS, SNS, EventBridge, Step Functions).
* Hiểu cơ chế xác thực người dùng với Amazon Cognito và đăng Technical Blog #2.

### Các công việc cần triển khai trong tuần này:
| Thứ | Công việc | Ngày bắt đầu | Ngày hoàn thành | Nguồn tài liệu |
| --- | --- | --- | --- | --- |
| 2 | - Tìm hiểu các dịch vụ messaging bất đồng bộ: <br> &emsp; + Amazon SQS: Standard và FIFO Queue, Visibility Timeout, Dead-Letter Queue (DLQ) <br> &emsp; + Amazon SNS: mô hình Pub/Sub Fan-out, Topic Subscriptions (Email, SQS, Lambda). | 26/10/2026 | 26/10/2026 | <https://cloudjourney.awsstudygroup.com/> |
| 3 | - Tìm hiểu Event-Driven Architecture & Orchestration: <br> &emsp; + Amazon EventBridge: Event Bus, Event Pattern, Rule và tích hợp Partner <br> &emsp; + AWS Step Functions: State Machine, Task/Choice/Parallel State, xử lý lỗi. | 27/10/2026 | 27/10/2026 | <https://cloudjourney.awsstudygroup.com/> |
| 4 | - Tìm hiểu quản lý danh tính & người dùng với Amazon Cognito: <br> &emsp; + Cognito User Pools (đăng ký, đăng nhập, MFA, Hosted UI) <br> &emsp; + Cognito Identity Pools (Federated Identities & thông tin xác thực tạm thời IAM STS) <br> &emsp; + Xác thực JWT Token trong API Gateway Authorizer. | 28/10/2026 | Đang thực hiện | <https://cloudjourney.awsstudygroup.com/> |
| 5 | - Thực hành Hands-on Lab: <br> &emsp; + Xây dựng pipeline xử lý ảnh bất đồng bộ theo hướng sự kiện <br> &emsp; + Kiến trúc: S3 Upload -> EventBridge -> SQS Queue -> Lambda Worker (tạo thumbnail) -> cập nhật DynamoDB. | 29/10/2026 | Đang thực hiện | <https://cloudjourney.awsstudygroup.com/> |
| 6 | - Viết & đăng Technical Blog #2: <br> &emsp; + Chủ đề: 'Architecting Resilient Event-Driven Systems on AWS using EventBridge, SQS, and Step Functions' <br> &emsp; + Chia sẻ bài blog lên cộng đồng AWS Study Group và tiếp nhận góp ý. | 30/10/2026 | Đang thực hiện | <https://workshop-sample.awsfcaj.com/> |

### Kết quả đạt được tuần 7:

* Đang thực hiện
* Đang thực hiện
* Đang thực hiện
