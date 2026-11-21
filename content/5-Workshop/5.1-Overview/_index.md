---
title: "Workshop Overview"
date: 2026-11-20
weight: 1
chapter: false
pre: " <b> 5.1. </b> "
---

## The problem

Small forums and classified-ad sites receive thousands of images every month. Manual moderation is slow, needs people, and easily misses violent or offensive images. ImageGuard automates it: every image is moderated in **about 1–2 seconds** after upload.

## What you will build

- A static website served through **CloudFront**, sign-in with **Cognito** (OAuth 2.0 Authorization Code + PKCE).
- Users upload images **directly to S3** with a presigned URL; images never pass through API Gateway or Lambda.
- An **S3 Event** triggers the `process-image` Lambda: it calls `DetectModerationLabels`, and only if the image is allowed calls `DetectLabels`, then stores the result in **DynamoDB**.
- Violating images get the `REJECTED` status and trigger an **SNS** email. Failures after 2 retries go to an **SQS DLQ**.
- **CloudWatch** provides logs, 5 custom metrics (EMF), 7 alarms and 1 dashboard.

## What you will learn

| Topic | Content |
|---|---|
| Event-driven architecture | S3 Event → asynchronous Lambda, retries and Dead-Letter Queue |
| Security | Least privilege per Lambda, presigned URLs, JWT Authorizer, OAC, confused-deputy protection |
| AI without training a model | Amazon Rekognition Content Moderation and Label Detection |
| Operations | Embedded Metric Format, CloudWatch Alarm → SNS, dashboard |
| Cost | AWS Pricing Calculator, lifecycle rules, log retention, HTTP API |

## Contents

1. [Prerequisites](../5.2-prerequisites/)
2. [Architecture](../5.3-architecture/)
3. [Step-by-step lab](../5.4-lab-guide/)
4. [Testing and troubleshooting](../5.5-testing/)
5. [Cost](../5.6-cost/)
6. [Clean-up](../5.7-cleanup/)
7. [Demo video](../5.8-demo/)
