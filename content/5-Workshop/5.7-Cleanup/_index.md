---
title: "Clean-up"
date: 2026-11-20
weight: 7
chapter: false
pre: " <b> 5.7. </b> "
---

After grading, delete every resource to avoid charges. Follow this order because of dependencies (e.g. CloudFront must be disabled before deletion).

{{% notice warning %}}
Deletion **cannot be undone**. Download any images, logs or figures you need for the report first.
{{% /notice %}}

## 1. CloudFront (first, takes ~10 minutes)
**CloudFront → distribution `imageguard-web` → Disable** → wait for *Disabled* → **Delete**. Then delete the origin access control `imageguard-web-oac` (**Security → Origin access**).

## 2. Everything else with CloudShell

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

## 3. Verify
- **S3, Lambda, DynamoDB, API Gateway, Cognito, SNS, SQS, CloudWatch** show no resources named `imageguard`.
- **Billing → Bills**: no new charges on the following days.
- Optional: remove the `imageguard-dev-2` group and the `AWSCloudShellFullAccess` policy from the IAM user if no longer needed.
