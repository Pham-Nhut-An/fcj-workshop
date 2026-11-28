---
title: "Proposal"
date: 2026-11-06
weight: 2
chapter: false
pre: " <b> 2. </b> "
---

# ImageGuard – AI-Powered Image Moderation and Labeling on AWS Serverless

{{% notice info %}}
**Status:** Proposal v2.0.
{{% /notice %}}

## 1. Overview

**ImageGuard** is a serverless web application that helps classified-ad sites, forums and student clubs **automatically moderate and categorize images uploaded by users**. When a user uploads a photo, the system uses the computer-vision AI service **Amazon Rekognition** to:

1. **Moderate:** detect inappropriate content (violence, explicit content, weapons, drugs, …). Violating images are marked `REJECTED` and an administrator receives an email alert.
2. **Label:** for valid images, automatically generate labels that describe the content (for example *Laptop*, *Bicycle*, *Book*) so users can see at a glance what an image contains and administrators can look it up when needed.

Results are stored in **Amazon DynamoDB** and shown in the web UI within seconds. The whole system follows an **event-driven**, **serverless** architecture: there are no servers to manage, and the team pays only for actual usage.

**Target users:**
- **End users:** members of a classifieds site, forum or student club who upload images and view their own images.
- **Platform administrators:** people responsible for content moderation, who receive an email alert when an image violates the rules.
- **Operations team:** monitors the system through the CloudWatch dashboard and alarms.

## 2. Problem Statement

- Platforms that let users post images (classified ads, forums, community groups) receive many images every day. **Manual review** is labor-intensive and slow, and it exposes reviewers directly to harmful content.
- Without moderation, violating images can appear publicly and harm users and the platform's reputation.
- User-uploaded images usually have **no description or tags**, so they are hard to find again.

**Solution:** automate both tasks with AI as soon as an image is uploaded. Violating images are blocked before they are displayed; valid images are labeled with their content.

## 3. Objectives & Scope

### 3.1. Objectives

1. Build an automated pipeline, **Upload → AI moderation → AI labeling → Storage → Display**, that runs entirely on AWS.
2. Apply the **AWS Well-Architected Framework**, especially the **Security** pillar (IAM least privilege, no public resources, no hard-coded credentials).
3. Provide full observability with **Amazon CloudWatch** (Logs, Metrics, Alarms) and email alerts through **Amazon SNS**.
4. Keep operating cost at **about USD 8–9/month** under a realistic workload (Section 6).
5. Write a **bilingual step-by-step guide** that lets others reproduce the deployment.

### 3.2. Success Criteria

| Criterion | Target |
|---|---|
| End-to-end processing time per image (upload → result) | ≤ 10 seconds |
| Violating images correctly blocked on the test set | ≥ 90% |
| Valid images wrongly blocked (false positives) on the test set | ≤ 10% |
| API calls without signing in | Rejected (HTTP 401) |
| User A reading User B's images or results | Not possible |
| Violating image detected | Email alert sent to the administrator |
| Direct Internet access to S3 buckets | Blocked (Block Public Access) |

### 3.3. Scope

| In scope | Out of scope |
|---|---|
| JPG/PNG images, ≤ 5 MB | Video, animated GIFs |
| Content moderation + automatic labeling | **Face recognition** (biometric data, privacy-sensitive) |
| Showing the status and labels of each image in the user's own image list | Searching / filtering images by label and full-text search (future work) |
| Sign-up/sign-in with Amazon Cognito | Dedicated admin UI, appeals against moderation results |
| Single Region: **us-east-1** | Multi-Region, disaster recovery |

## 4. Solution Architecture

![ImageGuard architecture diagram](../images/2-proposal/imageguard-architecture.drawio.png)

*Figure 1. ImageGuard architecture (drawn by the team in draw.io with the AWS Architecture Icons). Arrow numbers match the table in Section 4.2. Arrow colors: blue – upload flow; orange – AI processing flow; green – view results flow; dashed grey – monitoring; dashed red – IAM.*

### 4.1. AWS Services and Rationale

| Service | Role in the system | Why it was chosen |
|---|---|---|
| **Amazon S3** | (1) Stores user images (private bucket); (2) hosts the static website | 99.999999999% durability, low cost, emits **S3 Events** to trigger processing |
| **Amazon CloudFront** | Serves the static site over HTTPS and reads S3 through **Origin Access Control (OAC)** | The website bucket stays private; free HTTPS; covered by the Always Free tier (1 TB/month) |
| **Amazon Cognito** (User Pool) | Sign-up, sign-in, issues **JWT tokens** | Managed identity, free up to 10,000 MAU, the app never stores passwords |
| **Amazon API Gateway** (HTTP API) | REST endpoints for the web app, protected by a Cognito **JWT authorizer** | Cheaper than REST APIs (~USD 1 per million requests), native Cognito integration |
| **AWS Lambda** (Python 3.12) | Three functions: `presign-upload`, `process-image`, `get-images` | Serverless, pay per invocation, scales automatically |
| **Amazon Rekognition** | `DetectModerationLabels` (moderation) and `DetectLabels` (labeling) | Pre-trained AI, no model training needed; reads images directly from S3; available on the Free plan |
| **Amazon DynamoDB** (On-demand) | Stores moderation results and labels per user | Serverless NoSQL, pay per request, low latency, 25 GB free |
| **Amazon SQS** | **Dead-Letter Queue (DLQ)** for failed processing events | No data loss on failure; events can be reprocessed |
| **Amazon CloudWatch** | Logs, metrics (built-in + custom), alarms, dashboard | Centralized monitoring, required by the workshop |
| **Amazon SNS** | Sends email when a violating image is found and when an alarm fires | Simple; 1,000 emails/month free |
| **AWS IAM** | One dedicated least-privilege IAM role per Lambda function | Security foundation of the whole system |

**Why Region us-east-1:** prices are usually the lowest among Regions and all required services are available. The ~200 ms latency from Vietnam has little impact, because the static site is served through CloudFront (with edge locations in Hanoi and Ho Chi Minh City) and the slowest step is AI image analysis anyway. For a real deployment serving Vietnamese users, the team would consider moving to Singapore (ap-southeast-1) to reduce latency and meet personal-data regulations; Region and resource names are environment variables, so no code changes are needed.

### 4.2. Data Flow

The numbers in this table match the numbers on the arrows in Figure 1.

| # | From → To | Description |
|---|---|---|
| 1 | User → CloudFront → S3 `imageguard-web` | The user opens the site over HTTPS. CloudFront reads the static site from the private bucket through **Origin Access Control (OAC)** |
| 2 | User ↔ Cognito | Sign in with Managed login (authorization code + PKCE) and receive a **JWT token** |
| 3 | User → API Gateway | The web app calls `POST /upload-url` with the token; the **JWT authorizer** validates it first |
| 3a | API Gateway → Lambda `presign-upload` | API Gateway invokes the upload-link Lambda |
| 3b | `presign-upload` → DynamoDB | Creates a `PENDING` record and returns a **presigned URL** (a temporary upload link that expires after 5 minutes) for `uploads/{userId}/{imageId}.jpg` |
| 4 | User → S3 `imageguard-images` | The browser uploads the image **directly to S3** with the presigned URL (the image never passes through API Gateway or Lambda) |
| 5 | S3 → Lambda `process-image` | The **ObjectCreated** event (only for the `uploads/` prefix) asynchronously invokes the processing Lambda |
| 6 | `process-image` → Rekognition | Calls `DetectModerationLabels`; only if the image is clean, calls `DetectLabels` (up to 10 labels, confidence ≥ 80%) |
| 6a | Rekognition → S3 `imageguard-images` | Rekognition reads the image directly from S3 (the Lambda never downloads it) |
| 7 | `process-image` → DynamoDB | Updates the record to `APPROVED` (with labels) or `REJECTED` (with the reason, when a blocked label is found with confidence ≥ 60%) |
| 8 | `process-image` → SNS → Admin | Only when the image is `REJECTED` **and** step 7 succeeded: an alert email is sent to the administrator |
| 9 | `process-image` → SQS DLQ | If the Lambda still fails after 2 retries, the event goes to the **dead-letter queue** for reprocessing |
| 10 | User → API Gateway | The web app calls `GET /images` with the token (shares the arrow of step 3) |
| 10a | API Gateway → Lambda `get-images` | API Gateway invokes the read Lambda |
| 10b | `get-images` → DynamoDB | Queries **only by the `userId` taken from the token's `sub` claim**, newest first; **APPROVED** images are shown through short-lived presigned GET URLs, never made public |
| 11 | 3 Lambdas → CloudWatch | Write logs and metrics (Embedded Metric Format) |
| 12 | CloudWatch → SNS | Alarms (Lambda errors, messages in the DLQ, API 5xx, …) send emails through SNS |
| — | IAM → 3 Lambdas | Each Lambda has its own least-privilege **IAM execution role** (Section 4.3) |

### 4.3. Security Design (Security Pillar)

| Principle | How ImageGuard applies it |
|---|---|
| **Least privilege** | Each Lambda has its own role. `process-image` may only call `s3:GetObject` on `uploads/*`, `rekognition:DetectModerationLabels` + `rekognition:DetectLabels`, `dynamodb:UpdateItem` on **exactly one** table and `sns:Publish` to **exactly one** topic. `presign-upload` may only call `s3:PutObject` on `uploads/*` and `dynamodb:PutItem`. `get-images` may only call `dynamodb:Query` and `s3:GetObject` |
| **Rekognition limitation** | Rekognition's image-analysis APIs **do not support resource-level permissions**, so `"Resource": "*"` is required. The team compensates by allowing **exactly the 2 actions** needed, never `rekognition:*` |
| **No public resources** | Both buckets have **Block Public Access** enabled. The website bucket is readable only by CloudFront via OAC. The image bucket accepts and serves images only through short-lived presigned URLs |
| **Authentication & data isolation** | Every API requires a Cognito JWT. `userId` always comes from the token's `sub` claim, **never** from client input, so users cannot read each other's data |
| **No hard-coded credentials** | Lambdas use IAM roles (temporary credentials issued by AWS). Bucket, table and topic names are passed as **environment variables**. The GitHub repository contains no access keys and has a `.gitignore` |
| **Encryption** | S3 and DynamoDB encrypt data at rest by default; all traffic uses HTTPS/TLS |
| **Input protection** | Presigned URLs restrict the image `Content-Type`; the Lambda checks size (≤ 5 MB) and format before calling the AI |
| **Privacy** | No face recognition features are used; no biometric data is stored |

> **Why are the Lambdas not placed in a VPC/private subnet?** The system has no database or server that needs a private network. The Lambdas reach S3, DynamoDB, Rekognition and SNS over HTTPS, authenticated by IAM. Putting them in a VPC would add NAT Gateway or interface VPC endpoint charges (tens of USD per month) without a meaningful security gain for this architecture. The team lists it as a future extension if compliance requires it.

### 4.4. Mapping to the AWS Well-Architected Framework

| Pillar | Application |
|---|---|
| Operational Excellence | CloudWatch Logs (14-day retention), dashboard, alarms; a reproducible deployment guide |
| Security | See Section 4.3 |
| Reliability | Event-driven design; Lambda retries twice automatically; the DLQ keeps failed events; clear `PENDING/APPROVED/REJECTED/FAILED` states |
| Performance Efficiency | Direct-to-S3 uploads with presigned URLs; Rekognition reads images straight from S3 (the Lambda never downloads them); key-based DynamoDB queries |
| Cost Optimization | 100% serverless, pay per use; **`DetectLabels` is called only after an image passes moderation**; S3 Lifecycle; 14-day log retention; AWS Budgets |
| Sustainability | No idle resources; compute is used only when an image needs processing |

### 4.5. Why Amazon Rekognition

The initial plan used **Amazon Bedrock** for invoice processing. During testing, the team's account had a Bedrock quota of 0, and the quota increase request was not approved. The team switched to **Amazon Rekognition** (a pre-trained AI service that is available on the current account and was tested successfully in the console) and kept most of the serverless architecture. The incident is documented in the Troubleshooting section of the workshop.

## 5. Plan & Timeline

Internship period: 14/09/2026 – 14/12/2026. Workshop submission deadline: **30/11/2026** (confirmed by FCAJ).

### 5.1. Roles

| Member | Main responsibility |
|---|---|
| Member A | Team lead, integration, IAM & security |
| Member B | `process-image` Lambda, Rekognition integration, test image set and accuracy evaluation |
| Member C | Cognito, API Gateway, `presign-upload` and `get-images` Lambdas |
| Member D | Static web UI, S3 + CloudFront (OAC) |
| Member E | CloudWatch, SNS, DLQ, cost estimation, clean-up guide |

*Every member must understand the whole architecture and be able to explain all of it, not only their own part.*

### 5.2. Weekly Timeline

| Internship week | Dates | Tasks | Output |
|---|---|---|---|
| Week 7 | 26/10 – 01/11 | Finalize topic, write proposal v1.0; test Bedrock, discover the zero quota | Proposal v1.0, incident notes |
| Week 8 | 02/11 – 08/11 | Request a quota increase (denied); switch to Rekognition, write proposal v2.0; create S3, DynamoDB, IAM roles; build the `process-image` Lambda + S3 event | Proposal v2.0, working image pipeline |
| Week 9 | 09/11 – 15/11 | Cognito, API Gateway, the two API Lambdas; static site + CloudFront; CloudWatch metrics/alarms/dashboard, SNS, DLQ; testing; AWS Pricing Calculator; record the demo video | End-to-end demo, video, cost table |
| Week 10 | 16/11 – 19/11 | Write the bilingual 5-Workshop section (step-by-step, testing, clean-up), take screenshots, finalize the diagram, peer review | **Submit workshop on 19/11** |
| Week 10–12 | 20/11 – 14/12 | Apply mentor feedback, finish blogs and worklogs, clean up resources | Final report |

## 6. Cost Estimation

**Workload scenario:** a small forum/classified-ad site receives about **3,000 images/month** (~100/day), 1 MB on average, about 3% violating, and about 30,000 views per month. Region **us-east-1**, on-demand prices, **before Free Tier/credits**.

| Service | Assumptions | Estimated cost (USD/month) |
|---|---|---|
| Amazon Rekognition | 3,000 `DetectModerationLabels` + ~2,910 `DetectLabels` calls × USD 0.001/image | 5.91 |
| AWS Lambda | 3 arm64 functions, 36,000 invocations × 500 ms × 256 MB | 0.07 (within the free tier) |
| Amazon API Gateway (HTTP API) | 33,000 requests | 0.03 |
| Amazon DynamoDB (On-demand) | ~6,000 WRU + 30,000 RRU, < 1 GB | 0.01 |
| Amazon S3 | 3 GB (30-day lifecycle), 3,000 PUT, 30,000 GET | 0.10 |
| Amazon CloudWatch | 5 custom metrics (EMF) 1.50 + 7 alarms 0.70 + 0.1 GB logs 0.05; 1 dashboard | 2.25 (within the free tier: 10 metrics, 10 alarms, 3 dashboards) |
| Amazon CloudFront | ~2 GB transfer, 40,000 requests | 0.00 (Always Free) |
| Amazon Cognito | < 10,000 MAU | 0.00 |
| Amazon SNS, Amazon SQS | About 100 emails/messages | 0.00 |
| **Total** | | **≈ USD 8.37/month (≈ USD 100/year)** |

During development and the demo (fewer than 300 images expected), Rekognition costs only about USD 0.60, and everything is covered by the account's credits.

*AWS Pricing Calculator link:* [https://calculator.aws/#/estimate?id=5fa9c30d042e143fc2fd1f9387af56c6709e22f9](https://calculator.aws/#/estimate?id=5fa9c30d042e143fc2fd1f9387af56c6709e22f9)

> **Updated after deployment (20/11/2026):** the first estimate was USD 6.40/month. During the real deployment the team added 7 CloudWatch alarms and 5 custom metrics (EMF) for monitoring, so CloudWatch rose from USD 0.27 to 2.25. Within the account's free tier this part is close to zero. Data transfer out when users view images (~3 GB/month) is inside the 100 GB/month free allowance.

### Cost Optimization Strategy

- **100% serverless** architecture: no EC2, NAT Gateway or always-on resources.
- **Moderate first, label second:** violating images skip `DetectLabels`, saving one API call per blocked image.
- Rekognition **reads images directly from S3**, so the Lambda runs briefly (~2 seconds) with little memory (256 MB).
- **S3 Lifecycle policy** deletes images after 30 days (or moves them to S3 Glacier if long-term retention is needed).
- **14-day CloudWatch Logs retention** instead of the default "Never expire".
- **HTTP API** instead of REST API (about 70% cheaper).
- **AWS Budgets** alert at USD 10; run the **clean-up** right after grading.
- Above 1 million images/month, Rekognition's tiered pricing lowers the per-image cost automatically.

## 7. Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Rekognition blocks valid images or misses violating ones | Poor user experience or harmful content slips through | Confidence threshold and blocked categories are environment variables that can be tuned; accuracy measured on the test set |
| Service quotas on new accounts (already happened with Bedrock) | AI calls fail | Rekognition verified to work on the account; retry with backoff on throttling |
| Recursive S3 → Lambda → S3 trigger | Runaway cost | Trigger only on the `uploads/` prefix; the Lambda never writes back to S3 |
| Access keys leaked to GitHub | Account compromise | Use IAM roles only; `.gitignore`; review before every commit |
| Test images that infringe copyright or are too disturbing | Legal and ethical issues | Use the team's own photos or freely licensed images; test moderation with mild categories (alcohol, tobacco, toy weapons) |
| Unexpected charges | Credit loss | AWS Budgets; clean-up checklist |
| Limited time (~2 weeks) | Missing the deadline | Build the MVP first, extras later; every week has a clear deliverable |
| Members are still new to AWS | Delays; cannot answer the mentor's questions | Learn while building; peer reviews; every member explains the full architecture |

## 8. Expected Outcomes

- A working web application: sign in → upload an image → violating images are blocked with an email alert, valid images are labeled and listed in the user's own gallery.
- A monitoring setup with a CloudWatch dashboard, alarms and email alerts.
- A bilingual workshop guide that can be reproduced from scratch, including testing, troubleshooting and clean-up.
- Hands-on skills for the team: event-driven serverless architecture, IAM least privilege, AWS AI services, monitoring and cost optimization, and how to adapt when a service is quota-restricted.

## 9. Future Work

- **Better moderation accuracy:** per-category thresholds (for example a lower threshold for `Drugs & Tobacco` so smoking images are not missed), re-measured on a 20–50 image test set.
- **Admin review step:** `REJECTED` images go to a queue for an administrator to confirm, reducing the impact of false positives (for example toy guns).
- **Search and filter images by label, PNG support**, and a public feed for approved images.
- **Infrastructure as Code:** move the CLI scripts to AWS SAM or CloudFormation and add CI/CD for automatic redeployment.
- **Extra edge protection:** attach AWS WAF to CloudFront once there is real traffic.
- **Deployment for Vietnamese users:** move to Region ap-southeast-1 (Singapore) for lower latency and personal-data rules.
