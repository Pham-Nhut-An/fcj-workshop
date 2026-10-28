---
title: "Proposal"
date: 2026-10-28
weight: 2
chapter: false
pre: " <b> 2. </b> "
---

# SmartDoc – AI-Powered Invoice Processing on AWS Serverless

{{% notice info %}}
**Status:** Proposal v1.0 (28/10/2026). The official architecture diagram will be drawn by the team in draw.io using the AWS Architecture Icons and added to Section 4.
{{% /notice %}}

## 1. Overview

**SmartDoc** is a serverless web application that helps small businesses, shops, student groups and individuals **digitize paper invoices and receipts from a single photo**. A user signs in and uploads a photo of an invoice. The system then uses the multimodal AI model **Amazon Nova Lite** on **Amazon Bedrock** to read the content, extract key fields (vendor, date, total, tax, line items), **classify** the expense (food, transport, office supplies, …) and write a short **summary**. Results are stored in **Amazon DynamoDB** and shown back in the web UI within seconds.

The whole system follows an **event-driven**, **serverless** architecture: there are no servers to manage, and the team pays only for actual usage.

## 2. Problem Statement

- Small businesses and individuals still receive many **paper invoices and receipts** (restaurants, supermarkets, taxis, office supplies). Typing each one into Excel by hand is slow and error-prone, and paper receipts are easily lost.
- Traditional OCR tools return only **raw text**, so users still have to find the total and the date and categorize each expense themselves.
- Invoices in Vietnam are mostly in **Vietnamese with diacritics** and come in many layouts, so a fixed template does not work well.

**Solution:** use a multimodal AI model that *reads* and *understands* an invoice in one step and returns structured data (JSON) for storage, search and reporting.

## 3. Objectives & Scope

### 3.1. Objectives

1. Build an automated pipeline, **Upload → AI extraction → Storage → Display**, that runs entirely on AWS.
2. Apply the **AWS Well-Architected Framework**, especially the **Security** pillar (IAM least privilege, no public resources, no hard-coded credentials).
3. Provide full observability with **Amazon CloudWatch** (Logs, Metrics, Alarms) and email alerts through **Amazon SNS**.
4. Keep operating cost **below USD 2/month** under a realistic workload (Section 6).
5. Write a **bilingual step-by-step guide** that lets others reproduce the deployment.

### 3.2. Success Criteria

| Criterion | Target |
|---|---|
| End-to-end processing time per invoice (upload → result) | ≤ 15 seconds |
| Extraction accuracy for **total** and **date** on a 30-invoice test set | ≥ 85% |
| API calls without signing in | Rejected (HTTP 401) |
| User A reading User B's data | Not possible |
| Processing errors (corrupt image, malformed AI output) | Logged, marked `FAILED`, email alert sent |
| Direct Internet access to S3 buckets | Blocked (Block Public Access) |

### 3.3. Scope

| In scope | Out of scope |
|---|---|
| **Single-page** invoice/receipt images (JPG/PNG, ≤ 5 MB) | Multi-page PDFs |
| Key-field extraction, classification, summary | Integration with accounting software or e-invoices (XML) |
| Sign-up/sign-in with Amazon Cognito | Multiple roles (admin, accountant, …) |
| List and detail views of the user's own invoices | Advanced reporting, Excel export |
| Single Region: **us-east-1** | Multi-Region, disaster recovery |

## 4. Solution Architecture

<!-- When the diagram is ready, save it to static/images/2-proposal/architecture.png and uncomment the line below:
![SmartDoc Architecture](../images/2-proposal/architecture.png)
-->

### 4.1. AWS Services and Rationale

| Service | Role in the system | Why it was chosen |
|---|---|---|
| **Amazon S3** | (1) Stores invoice images (private bucket); (2) hosts the static website | 99.999999999% durability, low cost, emits **S3 Events** to trigger processing |
| **Amazon CloudFront** | Serves the static site over HTTPS and reads S3 through **Origin Access Control (OAC)** | The website bucket stays private; free HTTPS; covered by the Always Free tier (1 TB/month) |
| **Amazon Cognito** (User Pool) | Sign-up, sign-in, issues **JWT tokens** | Managed identity, free up to 10,000 MAU, the app never stores passwords |
| **Amazon API Gateway** (HTTP API) | REST endpoints for the web app, protected by a Cognito **JWT authorizer** | Cheaper than REST APIs (~USD 1 per million requests), native Cognito integration |
| **AWS Lambda** (Python 3.12) | Three functions: `presign-upload`, `process-document`, `get-documents` | Serverless, pay per invocation, scales automatically |
| **Amazon Bedrock** – Amazon Nova Lite | Reads the invoice image, extracts JSON, classifies, summarizes | Multimodal (accepts images), very low price (USD 0.06 per 1M input tokens), available in-Region in us-east-1 |
| **Amazon DynamoDB** (On-demand) | Stores extraction results per user | Serverless NoSQL, pay per request, low latency, 25 GB free |
| **Amazon SQS** | **Dead-Letter Queue (DLQ)** for failed processing events | No data loss on failure; events can be reprocessed |
| **Amazon CloudWatch** | Logs, metrics (built-in + custom), alarms, dashboard | Centralized monitoring, required by the workshop |
| **Amazon SNS** | Sends email when an alarm fires | Simple; 1,000 emails/month free |
| **AWS IAM** | One dedicated least-privilege IAM role per Lambda function | Security foundation of the whole system |

> **Why not Amazon Textract?** The team first planned to use Textract for OCR, but research showed that (1) on a new AWS account on the **Free plan**, Textract is only available after upgrading to the **Paid plan**, and (2) Textract does not support Vietnamese, while most invoices in Vietnam are in Vietnamese. The multimodal Nova Lite model handles both reading and understanding, so the architecture is simpler and cheaper.

### 4.2. Data Flow

1. The user opens the website through **CloudFront**, signs in with **Cognito** and receives a JWT token.
2. The web app calls `POST /upload-url` on **API Gateway** with the token. API Gateway validates the token with the JWT authorizer and invokes the **`presign-upload`** Lambda.
3. `presign-upload` creates a `PENDING` record in DynamoDB and returns a **presigned URL** (a temporary upload link that expires after 5 minutes) for the key `uploads/{userId}/{documentId}.jpg`.
4. The browser uploads the image **directly to S3** with the presigned URL, so the image never passes through Lambda or API Gateway.
5. S3 emits an **ObjectCreated** event (only for the `uploads/` prefix), which asynchronously invokes the **`process-document`** Lambda.
6. `process-document` reads the image from S3, calls the **Bedrock Converse API** with Nova Lite and a prompt that asks for JSON output, validates the JSON, and updates DynamoDB to `DONE` (or `FAILED` on error).
7. If the Lambda still fails after 2 retries, the event is sent to the **SQS DLQ**.
8. The web app calls `GET /documents`. The **`get-documents`** Lambda queries DynamoDB **only by the `userId` taken from the token** and returns the results.
9. Every Lambda writes logs and metrics to **CloudWatch**; alarms send emails through **SNS** when errors occur.

### 4.3. Security Design (Security Pillar)

| Principle | How SmartDoc applies it |
|---|---|
| **Least privilege** | Each Lambda has its own role. For example, `process-document` may only call `s3:GetObject` on `uploads/*`, `bedrock:InvokeModel` on **exactly one** Nova Lite model and `dynamodb:UpdateItem` on **exactly one** table. `presign-upload` may only call `s3:PutObject` on `uploads/*`. No `*` in actions or resources |
| **No public resources** | Both buckets have **Block Public Access** enabled. The website bucket is readable only by CloudFront via OAC. The image bucket accepts uploads only through short-lived presigned URLs |
| **Authentication & data isolation** | Every API requires a Cognito JWT. `userId` always comes from the token's `sub` claim, **never** from client input, so users cannot read each other's data |
| **No hard-coded credentials** | Lambdas use IAM roles (temporary credentials issued by AWS). Bucket, table and model names are passed as **environment variables**. The GitHub repository contains no access keys and has a `.gitignore` |
| **Encryption** | S3 and DynamoDB encrypt data at rest by default; all traffic uses HTTPS/TLS |
| **Input protection** | Presigned URLs restrict the image `Content-Type`; the Lambda rejects files > 5 MB; AI output is validated before it is stored |
| **AI data privacy** | According to AWS documentation, Bedrock does not use customer prompts or outputs to train models |

> **Why are the Lambdas not placed in a VPC/private subnet?** The system has no database or server that needs a private network. The Lambdas reach S3, DynamoDB and Bedrock over HTTPS, authenticated by IAM. Putting them in a VPC would add NAT Gateway or interface VPC endpoint charges (tens of USD per month) without a meaningful security gain for this architecture. The team lists it as a future extension if compliance requires it.

### 4.4. Mapping to the AWS Well-Architected Framework

| Pillar | Application |
|---|---|
| Operational Excellence | CloudWatch Logs (14-day retention), dashboard, alarms; a reproducible deployment guide |
| Security | See Section 4.3 |
| Reliability | Event-driven design; Lambda retries twice automatically; the DLQ keeps failed events; clear `PENDING/DONE/FAILED` states |
| Performance Efficiency | Direct-to-S3 uploads with presigned URLs; a small, fast model (Nova Lite); key-based DynamoDB queries |
| Cost Optimization | 100% serverless, pay per use; S3 Lifecycle deletes images after 30 days; 14-day log retention; AWS Budgets alerts |
| Sustainability | No idle resources; compute is used only when an invoice needs processing |

## 5. Plan & Timeline

Internship period: 14/09/2026 – 04/12/2026. Planned workshop submission deadline: **19/11/2026** (15 days before the internship certificate is needed).

### 5.1. Roles

| Member | Main responsibility |
|---|---|
| Member A | Team lead, integration, IAM & security |
| Member B | `process-document` Lambda, Bedrock prompt, accuracy evaluation |
| Member C | Cognito, API Gateway, `presign-upload` and `get-documents` Lambdas |
| Member D | Static web UI, S3 + CloudFront (OAC) |
| Member E | CloudWatch, SNS, DLQ, cost estimation, clean-up guide |

*Every member must understand the whole architecture and be able to explain all of it, not only their own part.*

### 5.2. Weekly Timeline

| Internship week | Dates | Tasks | Output |
|---|---|---|---|
| Week 7 | 28/10 – 01/11 | Finalize topic and write the proposal; test Nova Lite in the Bedrock playground with 10 sample invoices; collect 30 test invoices; sketch the architecture diagram | Proposal, prompt v1, test dataset |
| Week 8 | 02/11 – 08/11 | Create S3, DynamoDB and IAM roles; build the `process-document` Lambda + S3 event; create Cognito, API Gateway and the two API Lambdas | Backend pipeline working via CLI/Postman |
| Week 9 | 09/11 – 15/11 | Build the static site + CloudFront; CloudWatch metrics/alarms/dashboard, SNS, DLQ; testing (valid, invalid, error and load cases); AWS Pricing Calculator estimate; record the demo video | End-to-end demo, video, cost table |
| Week 10 | 16/11 – 19/11 | Write the bilingual 5-Workshop section (step-by-step, testing, clean-up), take screenshots, finalize the diagram, peer review | **Submit workshop on 19/11** |
| Week 10–12 | 20/11 – 04/12 | Apply mentor feedback, finish blogs and worklogs, clean up resources | Final report |

## 6. Cost Estimation

**Workload scenario:** a small shop processes about **3,000 invoices/month** (~100/day), with 1 MB images on average and about 30,000 list/detail views per month. Region **us-east-1**, on-demand prices, **before Free Tier/credits**.

| Service | Assumptions | Estimated cost (USD/month) |
|---|---|---|
| Amazon Bedrock (Nova Lite) | 3,000 calls × (~2,000 input + ~500 output tokens) | 0.72 |
| AWS Lambda | 36,000 invocations, ~16,650 GB-seconds | 0.28 (within the 400,000 GB-s free tier) |
| Amazon API Gateway (HTTP API) | 33,000 requests | 0.03 |
| Amazon DynamoDB (On-demand) | 12,000 WRU + 30,000 RRU, < 1 GB | 0.01 |
| Amazon S3 | 3 GB (30-day lifecycle), 3,000 PUT/GET | 0.09 |
| Amazon CloudWatch | 0.5 GB logs, 3 alarms, 3 custom metrics, 1 dashboard | 0.27 (mostly within the free tier) |
| Amazon CloudFront | ~2 GB transfer, 40,000 requests | 0.00 (Always Free) |
| Amazon Cognito | < 10,000 MAU | 0.00 |
| Amazon SNS, Amazon SQS | A few dozen emails/messages | 0.00 |
| **Total** | | **≈ USD 1.40/month (≈ USD 17/year)** |

During development and the demo (fewer than 300 invoices expected), Bedrock costs only about USD 0.07, and everything is covered by the USD 200 credit of a new account.

*AWS Pricing Calculator link:* `[to be added after the estimate is created]`

### Cost Optimization Strategy

- **100% serverless** architecture: no EC2, NAT Gateway or always-on resources.
- Use **Nova Lite** instead of a larger model; cap output `maxTokens`; resize images before upload (max ~1,400 px) to reduce tokens.
- **S3 Lifecycle policy** deletes original images after 30 days (extracted data stays in DynamoDB).
- **14-day CloudWatch Logs retention** instead of the default "Never expire".
- **HTTP API** instead of REST API (about 70% cheaper).
- **AWS Budgets** alert at USD 5; run the **clean-up** right after grading.

## 7. Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Nova Lite misreads Vietnamese diacritics or blurry photos | Wrong extraction | Test 10 images in Week 7; improve the prompt; if still poor, switch to Nova Pro (same API, only the model ID changes) |
| AI returns malformed JSON | Lambda failure | Validate the JSON and retry once; otherwise mark `FAILED` and log it |
| Low Bedrock quotas on a new account | Throttling during the demo | Check Service Quotas early; retry with backoff; demo with moderate load |
| Recursive S3 → Lambda → S3 trigger | Runaway cost | Trigger only on the `uploads/` prefix; the Lambda never writes back to S3 |
| Access keys leaked to GitHub | Account compromise | Use IAM roles only; `.gitignore`; review before every commit |
| Unexpected charges | Credit loss | AWS Budgets + Free plan; clean-up checklist |
| Limited time (~3 weeks) | Missing the deadline | Build the MVP first, extras later; every week has a clear deliverable |
| Members are still new to AWS | Delays; cannot answer the mentor's questions | Learn while building; peer reviews; every member explains the full architecture |

## 8. Expected Outcomes

- A working web application: sign in → upload an invoice photo → see the extracted fields, category and summary.
- A monitoring setup with a CloudWatch dashboard, alarms and email alerts.
- A bilingual workshop guide that can be reproduced from scratch, including testing and clean-up.
- Hands-on skills for the team: event-driven serverless architecture, IAM least privilege, generative AI on Amazon Bedrock, monitoring and cost optimization on AWS.
