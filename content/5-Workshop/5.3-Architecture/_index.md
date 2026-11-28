---
title: "Architecture"
date: 2026-11-20
weight: 3
chapter: false
pre: " <b> 5.3. </b> "
---

![ImageGuard architecture diagram](../../images/2-proposal/imageguard-architecture.drawio.png)
*Figure: ImageGuard architecture diagram*

The diagram has 5 groups: **Frontend**, **Authentication & API**, **Compute**, **Storage & AI**, **Notification & Monitoring**. CloudFront sits outside the Region box because it is a global service. Arrow colors show the flow type: **blue** for upload, **green** for viewing, **orange** for AI processing, **dashed grey** for monitoring, **dashed red** for IAM permissions. Arrows point in the **request** direction.

## Request flow (matches the numbers on the diagram)

| # | From → To | Description |
|---|---|---|
| 1 | User → CloudFront → S3 `imageguard-web` | The browser loads the static site (HTML/JS) over HTTPS. CloudFront reads the private web bucket via **OAC** |
| 2 | User → Cognito | Sign-in with **Cognito Managed Login** (Authorization Code + PKCE), returning JWTs (ID token + access token) |
| 3 | User → API Gateway | Calls `POST /upload-url` with the access token; the **JWT Authorizer** checks signature, issuer and audience |
| 3a | API Gateway → `presign-upload` | The Lambda takes `userId` from the `sub` claim and generates `imageId` (UUID) |
| 3b | `presign-upload` → DynamoDB | Writes a `PENDING` item, then returns a presigned PUT URL (5 minutes) for the key `uploads/{sub}/{imageId}.jpg` |
| 4 | User → S3 `imageguard-images` | The browser `PUT`s the image straight to S3 with the presigned URL; the image never passes through API Gateway or Lambda |
| 5 | S3 → `process-image` | **S3 Event** `ObjectCreated:Put` (prefix `uploads/`, suffix `.jpg`) invokes the Lambda **asynchronously** |
| 6 | `process-image` → Rekognition | Calls `DetectModerationLabels` (60% threshold). If nothing is blocked, calls `DetectLabels` (up to 10 labels, ≥ 80%) |
| 6a | Rekognition → S3 | Rekognition reads the image from S3 itself (`S3Object`); the Lambda never downloads it |
| 7 | `process-image` → DynamoDB | **Conditional** `UpdateItem` on `status = PENDING` → `APPROVED` or `REJECTED` |
| 8 | `process-image` → SNS → Admin | Sends the alert email only when the image is `REJECTED` **and** the DynamoDB update succeeded |
| 9 | `process-image` → SQS DLQ | After 2 failed retries the event goes to the dead-letter queue, kept for 14 days |
| 10 | User → API Gateway | Calls `GET /images` with the access token (shares the arrow with step 3) |
| 10a | API Gateway → `get-images` | The Lambda takes `userId` from the `sub` claim |
| 10b | `get-images` → DynamoDB | `Query` by `userId`, newest first, at most 50 items; only `APPROVED` images get a presigned GET URL (5 minutes) |
| 10c | User → S3 `imageguard-images` | The browser downloads approved images with the presigned GET URL |
| 11 | Lambda → CloudWatch | Structured JSON logs and 5 custom metrics via Embedded Metric Format (EMF) |
| 12 | CloudWatch → SNS | 7 alarms email on ALARM and on return to OK |
| – | IAM → Lambda | Each Lambda has its own least-privilege IAM role |

## Why each service

| Service | Role | Why | Alternatives considered |
|---|---|---|---|
| **Amazon S3** | Stores images and the static site | 99.999999999% durability, cheap, S3 Events trigger processing, Lifecycle deletes old images | EBS/EFS: must be attached to a server, more expensive |
| **AWS Lambda** | Runs the 3 functions | No servers to manage, scales with the number of images, pay per invocation; almost USD 0 when idle | EC2/ECS: runs 24/7 even with no images |
| **Amazon Rekognition** | Moderation and labeling | Ready-made content moderation models, no training data, pay per image | Amazon Bedrock: quota 0 on new accounts (see 5.5); training our own model: needs data and GPUs |
| **Amazon DynamoDB** | Stores status and labels | Serverless, on-demand pricing per request, fast queries by `userId`, conditional writes | RDS: instance runs 24/7, needs a VPC |
| **Amazon API Gateway (HTTP API)** | API for the web app | Built-in JWT Authorizer for Cognito, CORS, throttling; about 70% cheaper than REST API | REST API: more features than needed; Lambda Function URL: no JWT Authorizer |
| **Amazon Cognito** | Sign-up and sign-in | Managed Login UI, OAuth 2.0 + PKCE, no passwords stored by us | Custom login: high security risk |
| **Amazon CloudFront** | Serves the site | HTTPS by default, edge caching near users, OAC keeps the web bucket private | S3 static website hosting: HTTP only, bucket must be public |
| **Amazon SNS** | Alert email | Emails the administrator with a few lines of code and also receives CloudWatch alarms | Amazon SES: suited to per-user emails, requires verifying the sender identity |
| **Amazon SQS** | Dead-letter queue | Keeps failed events 14 days for inspection and reprocessing, so no image is lost | No DLQ: an async Lambda event is dropped after the retries run out |
| **Amazon CloudWatch** | Logs, metrics, alarms, dashboard | Lambda logs here by default; EMF turns logs into metrics without API calls | External tools: extra setup and permissions |
| **AWS IAM** | Permissions | One role per Lambda, scoped to exactly the resources it needs | One shared role: a compromised function would get the rights of all three |

## Data model (DynamoDB `imageguard-images`)

| Attribute | Type | Meaning |
|---|---|---|
| `userId` | String – **Partition key** | Cognito `sub` claim. One partition per user, so `Query` only returns that user's images |
| `imageId` | String – **Sort key** | UUID generated by `presign-upload`, also the S3 file name |
| `status` | String | `PENDING` → `APPROVED` or `REJECTED` |
| `createdAt`, `processedAt` | String (ISO 8601) | When the upload URL was requested and when moderation finished |
| `moderationLabels` | List | Moderation labels from Rekognition (name, parent category, confidence) |
| `labels` | List | Content labels (name, confidence), only for valid images |
| `blockedCategories` | List | Top-level categories that caused the block, e.g. `Violence` |
| `reason` | String | `BLOCKED_CATEGORY`, `TOO_LARGE` (> 5 MB) or `INVALID_IMAGE:<error>` (not an image) |

No Global Secondary Index is needed: every query in the system is by `userId`, which is exactly the partition key.

## Moderation policy

- Blocked top-level categories: **Explicit, Violence, Visually Disturbing, Drugs & Tobacco, Hate Symbols** (environment variable `BLOCKED_CATEGORIES`, changeable without code changes).
- **Alcohol** is allowed but its labels are still stored for administrators.
- Moderate first, label second: violating images do not cost an extra `DetectLabels` call.

## Security design

| Principle | Implementation |
|---|---|
| Least privilege | One IAM role per Lambda, no `AWSLambdaBasicExecutionRole` |
| Private data | Both buckets use **Block all public access**, ACLs disabled, SSE-S3, a bucket policy enforcing HTTPS |
| Authentication | The JWT Authorizer validates the issuer (User Pool) and audience (App client); `userId` always comes from the `sub` claim, never from the body |
| Safe upload | The server signs the presigned URL; it can PUT only one server-chosen key, expires after 5 minutes and requires `image/jpeg` |
| Confused deputy | The Lambda resource-based policy uses `aws:SourceArn` + `aws:SourceAccount` |
| Recursive trigger | The trigger only covers prefix `uploads/`, and `process-image` cannot write to S3 |
| Idempotency | `UpdateItem` conditioned on `status = PENDING`: duplicate events or overwrites cannot change a result |
| Web | CloudFront OAC, HTTPS, SecurityHeadersPolicy (HSTS, X-Frame-Options…), the frontend only uses `textContent` to avoid XSS |

### Permissions per Lambda

| Lambda | Allowed | Not allowed |
|---|---|---|
| `process-image` | `s3:GetObject` (uploads/*), 2 Rekognition actions, `dynamodb:UpdateItem`, `sns:Publish`, `sqs:SendMessage`, its own logs | PutObject, Query, PutItem |
| `presign-upload` | `s3:PutObject` (uploads/*), `dynamodb:PutItem`, logs | GetObject, Query, UpdateItem |
| `get-images` | `dynamodb:Query`, `s3:GetObject` (uploads/*), logs | PutObject, PutItem |

Rekognition uses `Resource: "*"` because `DetectModerationLabels` / `DetectLabels` do not support resource-level permissions; only those 2 actions are granted.

## AWS Well-Architected Framework mapping

| Pillar | Measures in ImageGuard |
|---|---|
| **Operational Excellence** | Structured JSON logs; 5 EMF custom metrics (`ImagesProcessed`, `ImagesApproved`, `ImagesRejected`, `ProcessingLatency`, `AlertPublishFailed`); 7 alarms and the `imageguard` dashboard; `setup.sh` and `step4.sh` scripts for identical redeployment; moderation thresholds and blocked categories in environment variables, changeable without code changes |
| **Security** | See "Security design": least privilege per Lambda, private buckets, JWT Authorizer, 5-minute presigned URLs, OAC, confused-deputy protection, no access keys or passwords in code |
| **Reliability** | S3, Lambda, DynamoDB, SNS and SQS run across multiple Availability Zones; async Lambda retries 2 times then goes to the DLQ; boto3 retries 5 times on throttling; conditional writes make duplicate events harmless; bad files are marked `REJECTED` instead of breaking the pipeline; 35-day PITR |
| **Performance Efficiency** | Direct upload to S3, so the API and Lambda never receive the image; Rekognition reads from S3, so the Lambda uses no memory for the image; arm64 Lambdas, `process-image` 256 MB, the two API functions 128 MB; Lambda and on-demand DynamoDB scale with load; the site is cached at CloudFront edges |
| **Cost Optimization** | 100% serverless with nothing running 24/7; moderation before labeling; HTTP API instead of REST API; arm64; 30-day S3 Lifecycle; 14-day log retention; USD 8.37/month in Pricing Calculator (section 5.6) |
| Sustainability | Not scored by the rubric; serverless only uses resources when images arrive, and Lifecycle removes data no longer needed |

## Key design decisions

**Why upload directly to S3 instead of sending the image through the API?** A synchronous Lambda accepts at most 6 MB of payload (a 5 MB image in base64 exceeds it), and HTTP API bills every 512 KB as one request. A presigned URL lets the browser write exactly one file to one server-chosen key within 5 minutes: cheaper and safer.

**Why create a `PENDING` item before issuing the URL?** So `process-image` only processes registered uploads. A file dropped into the bucket by anyone else has no `PENDING` item and is ignored. The user also sees "Processing" right after the upload.

**Why an async Lambda with a DLQ instead of an SQS queue between S3 and Lambda?** Volumes are small, async invocations already retry twice, and the DLQ keeps failed events for reprocessing. A queue in the middle handles bursts better but adds a component the current scale does not need; it is a future step for high volumes.

**Why publish to SNS after writing DynamoDB?** If the email went first and the DB write failed, the Lambda retry would send duplicate emails while the image stays `PENDING`. This bug actually happened and was fixed (see 5.5, "Troubleshooting").

**Why do only `APPROVED` images get a viewing link?** Violating images are never displayed again, not even to the uploader. The admin email only contains the `s3Key`, never an image link.

## Scalability and limits

- **Automatic scaling:** Lambda adds concurrent instances when many images arrive at once; on-demand DynamoDB and S3 need no capacity planning.
- **Limits to know:** the account's Rekognition requests-per-second quota and Lambda concurrency. Beyond them, boto3 retries, Lambda retries, and finally the event lands in the DLQ; the `throttles` and `dlq-not-empty` alarms notify the administrator.
- **API:** throttling at 10 requests/second (burst 20) protects the Lambdas and the bill from abusive callers.
- **Next steps:** an SQS queue between S3 and Lambda for bursts; AWS WAF on CloudFront; move the CLI scripts to AWS SAM/CloudFormation.

## Data backup

The `imageguard-images` table has **Point-in-time recovery (PITR)** enabled: it can be restored to any second within the last 35 days if data is deleted or overwritten by mistake. The original images live in S3 (99.999999999% durability), so both metadata and images can be recovered.

```bash
aws dynamodb update-continuous-backups --table-name imageguard-images \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
# Result: ENABLED
```

## Why Region us-east-1?

- **Low price:** us-east-1 (N. Virginia) usually has the lowest prices of all Regions, including Amazon Rekognition, which is most of the cost (USD 5.91 of 8.37 per month, see section 5.6).
- **All services available:** every service used in the workshop (Rekognition Content Moderation, Cognito Managed Login, HTTP API…) is available in us-east-1.
- **Latency is not the bottleneck:** Vietnam to us-east-1 is about 200 ms, but the static site is served by CloudFront from an edge location near the user; the slowest step is AI image analysis (about 0.5–1 second), not the network.
- **For a real deployment for Vietnamese users:** move to Singapore (ap-southeast-1) to cut latency and meet personal-data rules. The Region and resource names are environment variables, so no code changes are needed.

## Why no VPC?

There is no database or server that needs a private network. Lambda calls AWS services over HTTPS, authenticated by IAM. Putting Lambda in a VPC would add a NAT Gateway or VPC endpoints (tens of USD per month) without a meaningful security gain.
