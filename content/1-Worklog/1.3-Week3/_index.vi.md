---
title: "Worklog Tuần 3"
date: 2026-09-14
weight: 3
chapter: false
pre: " <b> 1.3. </b> "
---

### Mục tiêu tuần 3:

* Hiểu về cơ sở dữ liệu quan hệ được quản lý (RDS), cơ sở dữ liệu NoSQL (DynamoDB) và in-memory caching.
* Tìm hiểu khái niệm High Availability (tính sẵn sàng cao) và Auto Scaling với Elastic Load Balancing.

### Các công việc cần triển khai trong tuần này:
| Thứ | Công việc | Ngày bắt đầu | Ngày hoàn thành | Nguồn tài liệu |
| --- | --- | --- | --- | --- |
| 2 | - Tìm hiểu Amazon Relational Database Service (RDS): <br> &emsp; + Các DB Engine (MySQL, PostgreSQL, MariaDB) <br> &emsp; + Triển khai Multi-AZ cho High Availability & failover <br> &emsp; + Read Replicas để mở rộng khả năng đọc <br> &emsp; + Backup tự động, snapshot và maintenance window. | 28/09/2026 | 28/09/2026 | <https://cloudjourney.awsstudygroup.com/> |
| 3 | - Tìm hiểu Amazon DynamoDB (NoSQL): <br> &emsp; + Tables, Items, Attributes <br> &emsp; + Primary Key: Partition Key & Composite Key (Partition + Sort) <br> &emsp; + Global Secondary Indexes (GSI) và Local Secondary Indexes (LSI) <br> &emsp; + Chế độ capacity Provisioned và On-Demand. | 29/09/2026 | 29/09/2026 | <https://cloudjourney.awsstudygroup.com/> |
| 4 | - Tìm hiểu In-Memory Caching với Amazon ElastiCache (Redis / Memcached): <br> &emsp; + Chiến lược caching: Cache-Aside (Lazy Loading) và Write-Through <br> &emsp; + Các trường hợp dùng cache để tăng tốc truy vấn cơ sở dữ liệu. | 30/09/2026 | 30/09/2026 | <https://cloudjourney.awsstudygroup.com/> |
| 5 | - Tìm hiểu Scalability & Load Balancing: <br> &emsp; + Application Load Balancer (ALB) và Network Load Balancer (NLB) <br> &emsp; + Target Groups, Health Checks, Routing Rules <br> &emsp; + EC2 Auto Scaling Groups (ASG), Launch Templates, Dynamic Scaling Policies. | 01/10/2026 | 01/10/2026 | <https://cloudjourney.awsstudygroup.com/> |
| 6 | - Hands-on Lab (đã lên kế hoạch, chưa thực hành): <br> &emsp; + Triển khai ứng dụng web 3 tầng có High Availability <br> &emsp; + Đặt ALB ở public subnet, EC2 Auto Scaling ở private subnet và backend RDS MySQL Multi-AZ <br> &emsp; + Chạy stress test để kiểm tra auto scaling và failover tự động. | 02/10/2026 | Đang thực hiện | <https://cloudjourney.awsstudygroup.com/> |

### Kết quả đạt được tuần 3:

* Tìm hiểu kiến thức cơ bản về Amazon RDS (Multi-AZ, Read Replicas) và mô hình dữ liệu DynamoDB.
* Tìm hiểu khái niệm in-memory caching với ElastiCache.
* Tìm hiểu khái niệm ứng dụng web 3 tầng (3-tier) dùng ALB, Auto Scaling Group và RDS (chưa thực hành).
