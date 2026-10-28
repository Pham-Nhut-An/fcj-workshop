---
title: "Worklog Tuần 2"
date: 2026-09-14
weight: 2
chapter: false
pre: " <b> 1.2. </b> "
---

### Mục tiêu tuần 2:

* Học kiến thức cơ bản về mạng Amazon VPC và bảo mật mạng.
* Hiểu về object storage với Amazon S3, bucket policy và host website tĩnh.

### Các công việc cần triển khai trong tuần này:
| Thứ | Công việc | Ngày bắt đầu | Ngày hoàn thành | Nguồn tài liệu |
| --- | --- | --- | --- | --- |
| 2 | - Tìm hiểu kiến trúc cốt lõi của Amazon VPC: <br> &emsp; + IPv4 CIDR block & cách chia subnet <br> &emsp; + Public Subnet và Private Subnet <br> &emsp; + Internet Gateway (IGW) & Route Tables. | 21/09/2026 | 21/09/2026 | <https://cloudjourney.awsstudygroup.com/> |
| 3 | - Tìm hiểu mạng VPC nâng cao: <br> &emsp; + NAT Gateway & NAT Instance cho phép private subnet truy cập Internet chiều đi <br> &emsp; + Cấp phát Elastic IP <br> &emsp; + Network ACLs (NACLs) và Security Groups (Stateless và Stateful). | 22/09/2026 | 22/09/2026 | <https://cloudjourney.awsstudygroup.com/> |
| 4 | - Hands-on Lab (đã lên kế hoạch, chưa thực hành): <br> &emsp; + Tạo VPC 2 tầng với Public & Private Subnet trên 2 AZ <br> &emsp; + Cấu hình IGW, NAT Gateway và Route Table tùy chỉnh <br> &emsp; + Kiểm tra kết nối Internet chiều đi của EC2 trong private subnet qua NAT Gateway. | 23/09/2026 | Đang thực hiện | <https://cloudjourney.awsstudygroup.com/> |
| 5 | - Tìm hiểu Amazon Simple Storage Service (S3): <br> &emsp; + Kiến trúc object storage của S3 & quy tắc đặt tên bucket <br> &emsp; + Các S3 Storage Class (Standard, Intelligent-Tiering, Standard-IA, Glacier) <br> &emsp; + S3 Versioning, Object Lock và Lifecycle Policy. | 24/09/2026 | 24/09/2026 | <https://cloudjourney.awsstudygroup.com/> |
| 6 | - Hands-on Lab (đã lên kế hoạch, chưa thực hành): <br> &emsp; + Host website tĩnh trên Amazon S3 <br> &emsp; + Cấu hình S3 Bucket Policy cho phép đọc công khai <br> &emsp; + Cấu hình Cross-Origin Resource Sharing (CORS) và S3 Lifecycle Rules. | 25/09/2026 | Đang thực hiện | <https://cloudjourney.awsstudygroup.com/> |

### Kết quả đạt được tuần 2:

* Tìm hiểu các khái niệm cơ bản của Amazon VPC (subnet, route table, Internet Gateway, NAT Gateway).
* Tìm hiểu khái niệm VPC 2 tầng (2-tier) tự tạo với NAT Gateway (chưa thực hành).
* Tìm hiểu các storage class và lifecycle policy của Amazon S3.
* Tìm hiểu cách host website tĩnh trên Amazon S3 với bucket policy (chưa thực hành).
