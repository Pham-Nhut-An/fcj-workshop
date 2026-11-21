---
title: "Dọn dẹp tài nguyên"
date: 2026-11-20
weight: 7
chapter: false
pre: " <b> 5.7. </b> "
---

Sau khi chấm xong, xóa toàn bộ tài nguyên để không phát sinh chi phí. Làm theo thứ tự dưới đây vì có phụ thuộc (ví dụ phải tắt CloudFront trước khi xóa).

{{% notice warning %}}
Thao tác xóa **không hoàn tác được**. Tải ảnh, log hoặc số liệu cần giữ cho báo cáo về máy trước.
{{% /notice %}}

## 1. CloudFront (làm trước, mất ~10 phút)
**CloudFront → distribution `imageguard-web` → Disable** → đợi Status chuyển *Disabled* → **Delete**. Sau đó xóa Origin access control `imageguard-web-oac` (**Security → Origin access**).

## 2. Các tài nguyên còn lại bằng CloudShell

```bash
ACC=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1 AWS_PAGER=""

# 1. Monitoring
aws cloudwatch delete-dashboards --dashboard-names imageguard
aws cloudwatch delete-alarms --alarm-names $(aws cloudwatch describe-alarms --alarm-name-prefix imageguard --query 'MetricAlarms[].AlarmName' --output text)

# 2. API Gateway + Cognito
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='imageguard-api'].ApiId | [0]" --output text)
aws apigatewayv2 delete-api --api-id "$API_ID"
POOL_ID=$(aws cognito-idp list-user-pools --max-results 60 --query "UserPools[?Name=='imageguard-users'].Id | [0]" --output text)
aws cognito-idp delete-user-pool-domain --user-pool-id "$POOL_ID" --domain "imageguard-$ACC"
aws cognito-idp delete-user-pool --user-pool-id "$POOL_ID"

# 3. Lambda + log groups
for f in process-image presign-upload get-images; do
  aws lambda delete-function --function-name imageguard-$f
  aws logs delete-log-group --log-group-name /aws/lambda/imageguard-$f
done

# 4. S3 (xoa het object roi xoa bucket / empty then delete)
aws s3 rb s3://imageguard-images-$ACC --force
aws s3 rb s3://imageguard-web-$ACC --force

# 5. DynamoDB, SNS, SQS
aws dynamodb delete-table --table-name imageguard-images
aws sns delete-topic --topic-arn arn:aws:sns:us-east-1:$ACC:imageguard-alerts
aws sqs delete-queue --queue-url https://sqs.us-east-1.amazonaws.com/$ACC/imageguard-process-dlq

# 6. IAM roles (xoa inline policy truoc / delete inline policy first)
for r in process-image presign-upload get-images; do
  aws iam delete-role-policy --role-name imageguard-$r-role --policy-name imageguard-$r-policy
  aws iam delete-role --role-name imageguard-$r-role
done
```

## 3. Kiểm tra lại
- **S3, Lambda, DynamoDB, API Gateway, Cognito, SNS, SQS, CloudWatch** không còn tài nguyên tên `imageguard`.
- **Billing → Bills**: không còn chi phí phát sinh ở các ngày sau.
- Tùy chọn: gỡ group `imageguard-dev-2` và policy `AWSCloudShellFullAccess` khỏi IAM user nếu không dùng nữa.
