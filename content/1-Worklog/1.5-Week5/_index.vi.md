---
title: "Worklog Tuần 5"
date: 2026-09-14
weight: 5
chapter: false
pre: " <b> 1.5. </b> "
---

### Mục tiêu tuần 5:

* Tìm hiểu trụ cột Security trong AWS Well-Architected (IAM, KMS, WAF, PrivateLink).

### Các công việc cần triển khai trong tuần này:
| Thứ | Công việc | Ngày bắt đầu | Ngày hoàn thành | Nguồn tài liệu |
| --- | --- | --- | --- | --- |
| 2 | - Tìm hiểu IAM nâng cao & Identity Federation: <br> &emsp; + IAM Permission Boundaries & Service Control Policies (SCPs) <br> &emsp; + Điều kiện trong IAM Policy (aws:SourceIp, aws:PrincipalTag) <br> &emsp; + AWS IAM Identity Center (AWS SSO) để quản lý truy cập tập trung. | 12/10/2026 | 12/10/2026 | <https://cloudjourney.awsstudygroup.com/> |
| 3 | - Tìm hiểu bảo vệ dữ liệu & quản lý secrets: <br> &emsp; + AWS Key Management Service (KMS) - CMK đối xứng và bất đối xứng <br> &emsp; + Envelope Encryption và KMS Key Policy <br> &emsp; + AWS Secrets Manager (tự động rotation) & SSM Parameter Store. | 13/10/2026 | 13/10/2026 | <https://cloudjourney.awsstudygroup.com/> |
| 4 | - Tìm hiểu phát hiện mối đe dọa & bảo vệ vành đai: <br> &emsp; + AWS WAF (Web Application Firewall) với managed rule set & rate limiting <br> &emsp; + AWS Shield Standard & Advanced để chống DDoS <br> &emsp; + Amazon GuardDuty phát hiện mối đe dọa và bất thường tự động bằng ML. | 14/10/2026 | 14/10/2026 | <https://cloudjourney.awsstudygroup.com/> |
| 5 | - Tìm hiểu giao tiếp dịch vụ riêng tư (private): <br> &emsp; + VPC Gateway Endpoints (Amazon S3, DynamoDB) <br> &emsp; + VPC Interface Endpoints dựa trên AWS PrivateLink <br> &emsp; + Endpoint Policy để kiểm soát truy cập chặt chẽ ở tầng mạng. | 15/10/2026 | 15/10/2026 | <https://cloudjourney.awsstudygroup.com/> |
| 6 | - Technical Blog #1: Đang thực hiện (chưa đăng). | 16/10/2026 | Đang thực hiện | <https://workshop-sample.awsfcaj.com/> |

### Kết quả đạt được tuần 5:

* Tìm hiểu các khái niệm cơ bản về mã hóa KMS, Secrets Manager và AWS WAF.
* Tìm hiểu khái niệm VPC Endpoints và PrivateLink.
