---
title: "Week 10 Worklog"
date: 2026-09-14
weight: 10
chapter: false
pre: " <b> 1.10. </b> "
---

### Week 10 Objectives:

* Deploy the ImageGuard workshop on the AWS account (Steps 1–5).
* Write the bilingual workshop documentation on the report website.

### Tasks to be carried out this week:
| Day | Task | Start Date | Completion Date | Reference Material |
| --- | --- | --- | --- | --- |
| 2 – 5 | - Light self-study (no major tasks completed). | 16/11/2026 | 19/11/2026 | - |
| 6 | - Reviewed the ImageGuard architecture and prepared answers for mentor questions (Region choice, no VPC, IAM least privilege, cost estimate). <br> - Step 1 – foundation: S3 bucket (Block Public Access, SSE-S3, 30-day lifecycle, HTTPS-only bucket policy), DynamoDB on-demand, SNS, SQS DLQ, least-privilege IAM role. <br> - Step 2 – `process-image` Lambda (Python 3.12, arm64) + S3 Event, 2 retries, on-failure destination to the DLQ; tested APPROVED/REJECTED images and the DLQ. <br> - Step 3 – Cognito (PKCE), API Gateway HTTP API + JWT Authorizer, `presign-upload`/`get-images` Lambdas, static website through CloudFront OAC (AWS CLI in CloudShell). <br> - Step 4 – 7 CloudWatch alarms, dashboard, 14-day log retention. <br> - Step 5 – cost estimate with AWS Pricing Calculator (USD 8.37/month). <br> - Used AI (Claude) to help write code, scripts and guides; performed and verified the steps on the AWS account myself. | 20/11/2026 | 20/11/2026 | <https://docs.aws.amazon.com/lambda/> <br> <https://docs.aws.amazon.com/rekognition/> <br> <https://calculator.aws/> |
| 7 | - Wrote the bilingual 5-Workshop section (8 sub-pages), updated the Proposal cost table, added code and screenshots to the website. <br> - Fixed the Hugo build error (`getJSON` removed in newer Hugo) and pushed to GitHub Pages. | 21/11/2026 | 21/11/2026 | <https://gohugo.io/documentation/> |

### Week 10 Achievements:

* ImageGuard runs on AWS end to end: web upload → Rekognition moderation → the beer image is APPROVED, the toy gun is REJECTED and the admin receives an email.
* Found and fixed 4 issues: wrong ARN in the inline policy ("failed legacy parsing"), alert sent before the DB write (code fixed), SNS encrypted with `aws/sns` so alarms could not email, Hugo build error.
* Finished the bilingual 5-Workshop section and the AWS Pricing Calculator estimate.
* Community Event #3 not attended yet.
