---
title: "Cost"
date: 2026-11-20
weight: 6
chapter: false
pre: " <b> 5.6. </b> "
---

Estimated with the **AWS Pricing Calculator**: [view estimate](https://calculator.aws/#/estimate?id=5fa9c30d042e143fc2fd1f9387af56c6709e22f9).

Assumptions: us-east-1, **3,000 images/month**, 1 MB per image, ~3% violating, 30,000 views; on-demand prices, **before Free Tier**.

| Service | Configuration | USD/month |
|---|---|---|
| Amazon Rekognition | 3,000 `DetectModerationLabels` + 2,910 `DetectLabels` | 5.91 |
| AWS Lambda | 3 arm64 functions, 36,000 invocations, 500 ms, 256 MB | 0.07 |
| Amazon API Gateway (HTTP) | 33,000 requests | 0.03 |
| Amazon DynamoDB (On-demand) | 6,000 writes, 30,000 reads, 0.01 GB | 0.01 |
| Amazon S3 | 3 GB, 3,000 PUT, 30,000 GET | 0.10 |
| Amazon CloudWatch | 5 EMF metrics + 7 alarms + 0.1 GB logs, 1 dashboard | 2.25 |
| CloudFront, Cognito, SNS, SQS | Within the free tier | 0.00 |
| **Total** | | **8.37** (≈ USD 100/year) |

![AWS Pricing Calculator](../../images/5-workshop/29-1-pricing-calculator-summary.jpg)

**Actual cost of running the workshop:** fewer than 300 images → about USD 0.30–0.60 for Rekognition; everything else is within the free tier.

## Cost optimization

- 100% serverless: no EC2, NAT Gateway or always-on resources.
- Moderate first, label second: violating images skip `DetectLabels`.
- Rekognition reads images directly from S3 → short, low-memory Lambda runs.
- **arm64** Lambda is about 20% cheaper than x86.
- **HTTP API** is about 70% cheaper than REST API.
- S3 lifecycle deletes images after 30 days; CloudWatch Logs retention is 14 days.
- CloudWatch is 27% of the total; within the free tier (10 metrics, 10 alarms, 3 dashboards) it is close to zero.
