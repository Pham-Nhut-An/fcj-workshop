---
title: "Workshop"
date: 2026-09-14
weight: 5
chapter: false
pre: " <b> 5. </b> "
---

# ImageGuard – Kiểm duyệt và gắn nhãn ảnh tự động trên AWS Serverless

Workshop này hướng dẫn xây dựng **ImageGuard** từ đầu: người dùng đăng nhập, tải ảnh lên; hệ thống dùng **Amazon Rekognition** kiểm duyệt nội dung (bạo lực, khiêu dâm, ma túy, biểu tượng thù ghét…), ảnh hợp lệ được gắn nhãn tự động, ảnh vi phạm bị chặn và quản trị viên nhận email cảnh báo.

Toàn bộ hệ thống là **serverless** (không máy chủ), chạy ở Region **us-east-1**, chi phí khoảng **8,37 USD/tháng** cho 3.000 ảnh.

| | |
|---|---|
| **Thời gian thực hành** | 3–4 giờ |
| **Mức độ** | 200 – Intermediate |
| **Dịch vụ chính** | Amazon S3, AWS Lambda, Amazon Rekognition, Amazon DynamoDB, Amazon API Gateway, Amazon Cognito, Amazon CloudFront, Amazon SNS, Amazon SQS, Amazon CloudWatch, AWS IAM |
| **Mã nguồn** | [static/code/imageguard](https://github.com/Pham-Nhut-An/fcj-workshop/tree/main/static/code/imageguard) |

{{% children  /%}}
