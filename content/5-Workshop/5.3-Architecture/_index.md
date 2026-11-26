---
title: "Architecture"
date: 2026-11-20
weight: 3
chapter: false
pre: " <b> 5.3. </b> "
---

![ImageGuard architecture diagram](../../images/2-proposal/imageguard-architecture.drawio.png)

## Request flow

| # | Step |
|---|---|
| 1 | The user opens the site through **CloudFront**; CloudFront reads the private web bucket via **OAC** |
| 2 | Sign-in with **Cognito Managed Login** (Authorization Code + PKCE) → JWT |
| 3 | `POST /upload-url` via **API Gateway** (JWT Authorizer) → the `presign-upload` Lambda creates a `PENDING` item in DynamoDB and returns a presigned URL (5 minutes) |
| 4 | The browser `PUT`s the image directly to S3: `uploads/{sub}/{uuid}.jpg` |
| 5 | **S3 Event** `ObjectCreated:Put` (prefix `uploads/`, suffix `.jpg`) invokes `process-image` asynchronously |
| 6 | `DetectModerationLabels` (60% threshold). If no blocked category → `DetectLabels` (10 labels, ≥ 80%) |
| 7 | Conditional `UpdateItem` on `status = PENDING` → `APPROVED` / `REJECTED` |
| 8 | If `REJECTED` and the DB update succeeded → **SNS** emails the administrator |
| 9 | Failures after 2 retries → **SQS DLQ** (14-day retention) |
| 10 | `GET /images` → the `get-images` Lambda runs `Query` on `userId = sub`; only `APPROVED` images get a presigned GET URL |
| 11–12 | Logs + EMF metrics → **CloudWatch**; Alarms → SNS |

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
