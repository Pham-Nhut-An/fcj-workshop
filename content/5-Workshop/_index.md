---
title: "Workshop"
date: 2026-09-14
weight: 5
chapter: false
pre: " <b> 5. </b> "
---

# ImageGuard – Automated Image Moderation and Labeling on AWS Serverless

This workshop builds **ImageGuard** from scratch: users sign in and upload images; the system uses **Amazon Rekognition** to moderate content (violence, explicit content, drugs, hate symbols…), approved images are labeled automatically, violating images are blocked and an administrator receives an email alert.

The whole system is **serverless**, runs in **us-east-1**, and costs about **USD 8.37/month** for 3,000 images.

| | |
|---|---|
| **Duration** | 3–4 hours |
| **Level** | 200 – Intermediate |
| **Main services** | Amazon S3, AWS Lambda, Amazon Rekognition, Amazon DynamoDB, Amazon API Gateway, Amazon Cognito, Amazon CloudFront, Amazon SNS, Amazon SQS, Amazon CloudWatch, AWS IAM |
| **Source code** | [static/code/imageguard](https://github.com/Pham-Nhut-An/fcj-workshop/tree/main/static/code/imageguard) |

{{% children  /%}}
