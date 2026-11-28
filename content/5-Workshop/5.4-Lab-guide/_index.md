---
title: "Step-by-step Lab Guide"
date: 2026-11-20
weight: 4
chapter: false
pre: " <b> 5.4. </b> "
---

Full source code: [static/code/imageguard](https://github.com/Pham-Nhut-An/fcj-workshop/tree/main/static/code/imageguard). Replace `<ACCOUNT_ID>` with your Account ID (12 digits, no dashes).

## Step 1 – Foundation resources

### 1.1. Image bucket
**S3 → Create bucket** → `imageguard-images-<ACCOUNT_ID>` · ACLs disabled · **Block all public access** · Versioning disabled · **SSE-S3**.

- **Management → Lifecycle rule** `delete-uploads-30d`: prefix `uploads/`, expire after **30 days**.
- **Permissions → Bucket policy**: deny any request without HTTPS (`aws:SecureTransport = false`).

![Figure 1.1 – Bucket name, ACLs disabled](../../images/5-workshop/1-1-s3-create-general.png)
*Figure 1.1 – Bucket name, ACLs disabled*

![Figure 1.2 – Block all public access, versioning off, SSE-S3](../../images/5-workshop/1-2-s3-create-security.png)
*Figure 1.2 – Block all public access, versioning off, SSE-S3*

![Figure 1.3 – Lifecycle rule deleting uploads/ after 30 days](../../images/5-workshop/1-3-s3-lifecycle.png)
*Figure 1.3 – Lifecycle rule deleting uploads/ after 30 days*

![Figure 1.4 – Permissions tab: Block public access On and HTTPS-only bucket policy](../../images/5-workshop/1-4-s3-permissions.png)
*Figure 1.4 – Permissions tab: Block public access On and HTTPS-only bucket policy*


### 1.2. DynamoDB
**Create table** `imageguard-images` · Partition key `userId` (String) · Sort key `imageId` (String) · **On-demand**.

![Figure 1.5 – imageguard-images table: userId / imageId, On-demand](../../images/5-workshop/2-1-dynamodb.png)
*Figure 1.5 – imageguard-images table: userId / imageId, On-demand*


### 1.3. SNS and SQS
- SNS **Standard** topic `imageguard-alerts`, **encryption off** (see [Troubleshooting](../5.5-testing/)), Email subscription → click **Confirm subscription** in the email.
- SQS **Standard** `imageguard-process-dlq`, **14-day** retention, default SSE-SQS.

![Figure 1.6 – Standard SNS topic imageguard-alerts](../../images/5-workshop/3-1-sns-create-topic.png)
*Figure 1.6 – Standard SNS topic imageguard-alerts*

![Figure 1.7 – Subscription confirmation email](../../images/5-workshop/3-2-sns-confirm-email.png)
*Figure 1.7 – Subscription confirmation email*

![Figure 1.8 – Subscription Confirmed](../../images/5-workshop/3-3-sns-confirmed.png)
*Figure 1.8 – Subscription Confirmed*

![Figure 1.9 – Standard SQS queue imageguard-process-dlq, 14-day retention](../../images/5-workshop/4-1-sqs-create.png)
*Figure 1.9 – Standard SQS queue imageguard-process-dlq, 14-day retention*


### 1.4. IAM role for `process-image`
**IAM → Roles → Create role** → AWS service **Lambda** → **attach no managed policy** → `imageguard-process-image-role` → **Create inline policy** (JSON):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {"Sid": "ReadUploadedImages", "Effect": "Allow", "Action": "s3:GetObject", "Resource": "arn:aws:s3:::imageguard-images-<ACCOUNT_ID>/uploads/*"},
    {"Sid": "AnalyzeImagesWithRekognition", "Effect": "Allow", "Action": ["rekognition:DetectModerationLabels", "rekognition:DetectLabels"], "Resource": "*"},
    {"Sid": "UpdateImageResults", "Effect": "Allow", "Action": "dynamodb:UpdateItem", "Resource": "arn:aws:dynamodb:us-east-1:<ACCOUNT_ID>:table/imageguard-images"},
    {"Sid": "SendModerationAlerts", "Effect": "Allow", "Action": "sns:Publish", "Resource": "arn:aws:sns:us-east-1:<ACCOUNT_ID>:imageguard-alerts"},
    {"Sid": "SendFailedEventsToDLQ", "Effect": "Allow", "Action": "sqs:SendMessage", "Resource": "arn:aws:sqs:us-east-1:<ACCOUNT_ID>:imageguard-process-dlq"},
    {"Sid": "WriteOwnLogsOnly", "Effect": "Allow", "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"], "Resource": ["arn:aws:logs:us-east-1:<ACCOUNT_ID>:log-group:/aws/lambda/imageguard-process-image", "arn:aws:logs:us-east-1:<ACCOUNT_ID>:log-group:/aws/lambda/imageguard-process-image:*"]}
  ]
}
```

The Review page must list **6 services**. If it says *"The policy failed legacy parsing"*, check the Account ID (see 5.5).

![Figure 1.10 – Trusted entity: AWS service Lambda](../../images/5-workshop/5-1-iam-role-trusted.png)
*Figure 1.10 – Trusted entity: AWS service Lambda*

![Figure 1.11 – No managed policy attached](../../images/5-workshop/5-2-iam-role-no-managed.png)
*Figure 1.11 – No managed policy attached*

![Figure 1.12 – JSON inline policy](../../images/5-workshop/5-3-iam-inline-policy.png)
*Figure 1.12 – JSON inline policy*

![Figure 1.13 – The role has exactly one inline policy](../../images/5-workshop/5-4-iam-role-summary.png)
*Figure 1.13 – The role has exactly one inline policy*


## Step 2 – `process-image` Lambda and S3 Event

### 2.1. Create the function
**Lambda → Create function → Author from scratch** · name `imageguard-process-image` · **Python 3.12** · **Additional settings**: ARM64 **on**, Custom execution role **on** → `imageguard-process-image-role`, Function URL **off**.

![Figure 2.1 – Create the Lambda: Python 3.12, ARM64, existing role, no Function URL](../../images/5-workshop/6-1-lambda-create.png)
*Figure 2.1 – Create the Lambda: Python 3.12, ARM64, existing role, no Function URL*


Paste `process_image/lambda_function.py` → **Deploy**. Memory **256 MB**, timeout **30 seconds**.

![Figure 2.2 – Code pasted and deployed](../../images/5-workshop/7-1-lambda-code-deployed.png)
*Figure 2.2 – Code pasted and deployed*

![Figure 2.3 – Memory 256 MB, timeout 30 seconds](../../images/5-workshop/8-1-lambda-general-config.png)
*Figure 2.3 – Memory 256 MB, timeout 30 seconds*


| Environment variable | Value |
|---|---|
| `TABLE_NAME` | `imageguard-images` |
| `BUCKET_NAME` | `imageguard-images-<ACCOUNT_ID>` |
| `TOPIC_ARN` | `arn:aws:sns:us-east-1:<ACCOUNT_ID>:imageguard-alerts` |
| `BLOCKED_CATEGORIES` | `Explicit,Violence,Visually Disturbing,Drugs & Tobacco,Hate Symbols` |
| `MIN_MODERATION_CONFIDENCE` | `60` |
| `MAX_LABELS` · `MIN_LABEL_CONFIDENCE` | `10` · `80` |

![Figure 2.4 – The 7 environment variables of process-image](../../images/5-workshop/9-1-lambda-env-vars.png)
*Figure 2.4 – The 7 environment variables of process-image*


### 2.2. Key ideas in the code

```python
# Exponential-backoff retries for throttling / 5xx
BOTO_CONFIG = Config(retries={"max_attempts": 5, "mode": "standard"})

# Accept only well-formed keys -> blocks unknown keys and path traversal
KEY_PATTERN = re.compile(r"^uploads/([A-Za-z0-9-]{1,64})/([A-Za-z0-9-]{1,64})\.(jpg|jpeg|png)$")

# Conditional UpdateItem: the item must exist and still be PENDING
ConditionExpression="attribute_exists(#uid) AND #st = :pending"

# Publish to SNS only after the DB update succeeded
if blocked and updated:
    publish_alert(user_id, image_id, key, blocked)
```

Metrics use the **Embedded Metric Format**: one JSON log line with an `_aws` key, and CloudWatch creates `ImagesProcessed`, `ImagesApproved`, `ImagesRejected`, `ProcessingLatency`, `AlertPublishFailed` (namespace `ImageGuard`). No `cloudwatch:PutMetricData` permission is needed.

### 2.3. Retries, DLQ and trigger
- **Configuration → Asynchronous invocation**: maximum age 1 hour, retry attempts **2**.
- **Destinations → On failure** → SQS `imageguard-process-dlq`.
- **Add trigger → S3**: image bucket, event **PUT**, prefix `uploads/`, suffix `.jpg`.

![Figure 2.5 – Asynchronous invocation: max age 1 hour, 2 retries](../../images/5-workshop/10-1-lambda-async-config.png)
*Figure 2.5 – Asynchronous invocation: max age 1 hour, 2 retries*

![Figure 2.6 – On-failure destination → SQS DLQ](../../images/5-workshop/10-2-lambda-destination.png)
*Figure 2.6 – On-failure destination → SQS DLQ*

![Figure 2.7 – S3 trigger: PUT event, prefix uploads/, suffix .jpg](../../images/5-workshop/11-1-s3-trigger-config.png)
*Figure 2.7 – S3 trigger: PUT event, prefix uploads/, suffix .jpg*

![Figure 2.8 – Function overview: S3 → Lambda → SQS](../../images/5-workshop/11-2-lambda-overview.png)
*Figure 2.8 – Function overview: S3 → Lambda → SQS*

![Figure 2.9 – Resource-based policy with aws:SourceArn and aws:SourceAccount (confused-deputy protection)](../../images/5-workshop/11-3-lambda-resource-policy.png)
*Figure 2.9 – Resource-based policy with aws:SourceArn and aws:SourceAccount (confused-deputy protection)*

### 2.4. Quick check of Step 2 (no website needed)

1. **DynamoDB → Explore items → Create item**: `userId` = `test-user-001`, `imageId` = `img-001`, add a String attribute `status` = `PENDING`. Repeat for `img-002`.
2. **S3** → create the folder `uploads/test-user-001/` → upload a beer image as `img-001.jpg` and the toy gun as `img-002.jpg`.
3. Wait about 10 seconds, then **Explore items → Run**.

![Figure 2.10 – Test items in PENDING state](../../images/5-workshop/12-1-dynamodb-pending.png)
*Figure 2.10 – Test items in PENDING state*

![Figure 2.11 – Test images in uploads/test-user-001/](../../images/5-workshop/13-1-s3-uploaded.png)
*Figure 2.11 – Test images in uploads/test-user-001/*

![Figure 2.12 – Result: img-001 APPROVED, img-002 REJECTED](../../images/5-workshop/14-1-dynamodb-result.png)
*Figure 2.12 – Result: img-001 APPROVED, img-002 REJECTED*

![Figure 2.13 – Approved image: labels](../../images/5-workshop/14-2-item-approved-labels.png)
*Figure 2.13 – Approved image: labels*

![Figure 2.14 – Violating image: blockedCategories = Violence](../../images/5-workshop/14-3-item-rejected.png)
*Figure 2.14 – Violating image: blockedCategories = Violence*

![Figure 2.15 – Alert email received by the administrator](../../images/5-workshop/14-4-sns-alert-email.png)
*Figure 2.15 – Alert email received by the administrator*

![Figure 2.16 – image_processed log line in CloudWatch Logs](../../images/5-workshop/14-5-cloudwatch-log.png)
*Figure 2.16 – image_processed log line in CloudWatch Logs*

### 2.5. DLQ check (intentional failure)

1. Change the `TABLE_NAME` environment variable to a table that does not exist.
2. **Test** tab → Invocation type **Asynchronous** → send a sample S3 event pointing to an existing image.
3. After about 3 minutes (1 run + 2 retries) → **SQS → imageguard-process-dlq → Poll for messages**.
4. Set `TABLE_NAME` back to `imageguard-images`.

![Figure 2.17 – Temporarily changing TABLE_NAME to cause a failure](../../images/5-workshop/15-0-env-table-name-wrong.jpg)
*Figure 2.17 – Temporarily changing TABLE_NAME to cause a failure*

![Figure 2.18 – Asynchronous invocation from the Test tab](../../images/5-workshop/15-1-lambda-async-invoke.jpg)
*Figure 2.18 – Asynchronous invocation from the Test tab*

![Figure 2.19 – The DLQ receives 1 message after retries are exhausted](../../images/5-workshop/15-2a-dlq-messages-list.jpg)
*Figure 2.19 – The DLQ receives 1 message after retries are exhausted*

![Figure 2.20 – TABLE_NAME restored](../../images/5-workshop/15-3-env-restored.jpg)
*Figure 2.20 – TABLE_NAME restored*

The DLQ message body is shown in [section 5.5](../5.5-testing/).


## Step 3 – Cognito, API Gateway, static website

Step 3 can be done in the Console in the order below, or by running [`setup.sh`](https://github.com/Pham-Nhut-An/fcj-workshop/tree/main/static/code/imageguard/scripts/setup.sh) in **CloudShell**, which creates everything with the AWS CLI (about 3 minutes).

![Figure 3.1 – Output of setup.sh in CloudShell](../../images/5-workshop/23-0-cloudshell-setup-output.jpg)
*Figure 3.1 – Output of setup.sh in CloudShell*


### 3.1. Two API Lambdas
Create 2 dedicated roles (least privilege), then 2 Python 3.12 arm64 functions, 128 MB, 10 seconds:

| Lambda | Inline policy permissions | Environment variables |
|---|---|---|
| `imageguard-presign-upload` | `s3:PutObject` (uploads/*), `dynamodb:PutItem`, logs | `BUCKET_NAME`, `TABLE_NAME`, `URL_EXPIRES_SECONDS=300` |
| `imageguard-get-images` | `dynamodb:Query`, `s3:GetObject` (uploads/*), logs | `BUCKET_NAME`, `TABLE_NAME`, `URL_EXPIRES_SECONDS=300`, `MAX_ITEMS=50` |

`presign-upload` reads `userId` from `requestContext.authorizer.jwt.claims.sub`, generates `imageId` (UUID), creates the `PENDING` item, then signs a presigned PUT URL. The URL is signed with the Lambda's own permissions, so the role needs `s3:PutObject`.

### 3.2. Static website + CloudFront
1. Bucket `imageguard-web-<ACCOUNT_ID>` (private, SSE-S3); upload `index.html`, `app.js`, `config.js`.
2. **CloudFront → Create distribution**: S3 web bucket origin with **OAC**, Redirect HTTP to HTTPS, CachingOptimized, response headers **SecurityHeadersPolicy**, default root object `index.html`, WAF off.
3. Bucket policy allows only `cloudfront.amazonaws.com` with `AWS:SourceArn` = the distribution ARN.

> **Why OAC?** The web bucket keeps Block all public access; only this distribution can read it. Users cannot open the S3 URL directly (tested in 5.5: 403). **SecurityHeadersPolicy** adds HSTS, X-Frame-Options and X-Content-Type-Options against clickjacking and MIME sniffing. WAF is not enabled yet because there is no real traffic; it is a future step.

![Figure 3.2 – ImageGuard served through CloudFront](../../images/5-workshop/21-6-web-home-dark.jpg)
*Figure 3.2 – ImageGuard served through CloudFront*


### 3.3. Cognito
User pool `imageguard-users`, **email** sign-in, self sign-up enabled. App client **SPA without a client secret**: Authorization code grant, scopes `openid email`, callback and sign-out URL = `https://<CLOUDFRONT_DOMAIN>/`. Create a domain (Managed login).

> **Why no client secret, and why PKCE?** The web app runs entirely in the browser, so it cannot keep a secret; anyone can read the JavaScript. PKCE replaces the client secret: the browser creates a random `code_verifier`, sends its SHA-256 hash at sign-in and the original when exchanging the `code` for tokens, so an intercepted `code` is useless. The `state` parameter prevents CSRF. Tokens live in `sessionStorage` and disappear when the tab closes.

![Figure 3.3 – Cognito Managed Login page](../../images/5-workshop/26-0-cognito-managed-login.jpg)
*Figure 3.3 – Cognito Managed Login page*


### 3.4. API Gateway HTTP API
- Routes `POST /upload-url` → `presign-upload`, `GET /images` → `get-images`, stage `$default` with auto-deploy.
- **JWT Authorizer** `cognito-jwt`: issuer `https://cognito-idp.us-east-1.amazonaws.com/<USER_POOL_ID>`, audience `<APP_CLIENT_ID>`, attached to both routes.
- **CORS**: only origin `https://<CLOUDFRONT_DOMAIN>`, headers `authorization, content-type`, methods `GET, POST, OPTIONS`.
- **Throttling** on the default route: rate 10, burst 20.

> **Why this setup?** The JWT Authorizer verifies the token signature with the User Pool's public keys, plus issuer and audience, so forged or expired requests are rejected at API Gateway (401) without reaching Lambda or costing money (tests E3, E4 in 5.5). CORS only allows the CloudFront domain, so other websites cannot call the API from a browser. Throttling caps requests per second to protect the Lambdas and the bill.

### 3.5. Wire everything together
- CORS on the image bucket: allow `PUT, GET` from the CloudFront domain.
- Fill in `config.js` (Cognito domain, client ID, redirect URI, API URL), upload it again, create a CloudFront invalidation for `/*`.

![Figure 3.4 – End result: the user signs in, uploads images and sees APPROVED / REJECTED](../../images/5-workshop/26-5-web-dashboard-dark.jpg)
*Figure 3.4 – End result: statistics, multi-image upload, and a library with status filters and label search*

![Figure 3.5 – Image detail dialog](../../images/5-workshop/26-7-web-detail-dark.jpg)
*Figure 3.5 – Image detail dialog: labels, upload / processed time, Image ID*

> **UI features** (status filter, label search, sorting, popular labels, statistics, detail view, multi-image upload, JPEG magic-byte check) all run in the browser on the data returned by `GET /images`; no new API or service is needed, so the architecture is unchanged.


## Step 4 – Monitoring

Run [`step4.sh`](https://github.com/Pham-Nhut-An/fcj-workshop/tree/main/static/code/imageguard/scripts/step4.sh) in CloudShell, or create these in the Console:

| Alarm | Metric | Threshold (5 minutes) |
|---|---|---|
| `imageguard-{process-image,presign-upload,get-images}-errors` | AWS/Lambda Errors | ≥ 1 |
| `imageguard-process-image-throttles` | AWS/Lambda Throttles | ≥ 1 |
| `imageguard-dlq-not-empty` | AWS/SQS ApproximateNumberOfMessagesVisible | ≥ 1 |
| `imageguard-alert-publish-failed` | ImageGuard AlertPublishFailed | ≥ 1 |
| `imageguard-api-5xx` | AWS/ApiGateway 5xx | ≥ 5 |

Every alarm notifies the `imageguard-alerts` SNS topic on both **ALARM** and **OK**. The `imageguard` dashboard shows APPROVED/REJECTED counts, processing time, Lambda, API Gateway, the DLQ and alarm status. Log retention is **14 days** for all 3 Lambdas.

> **Why these alarms?** Each alarm matches one failure mode: Lambda errors (`errors`), quota limits (`throttles`), events that could not be processed (`dlq-not-empty`), alert emails that failed to send (`alert-publish-failed`, a custom metric because an SNS failure does not fail the Lambda), and server-side API errors (`api-5xx`). The threshold is ≥ 1 because at this scale a single error deserves attention; 5xx uses ≥ 5 to avoid alerts for a single stray request. Notifications are also sent on return to **OK** so the administrator knows the issue cleared.
>
> **5 custom metrics (EMF):** `ImagesProcessed`, `ImagesApproved`, `ImagesRejected`, `ProcessingLatency` (ms), `AlertPublishFailed`. The Lambda just prints one JSON line in the right format to the log and CloudWatch creates the metrics, so no `cloudwatch:PutMetricData` permission and no extra API calls are needed.

![Figure 4.1 – 7 alarms and the dashboard created by step4.sh](../../images/5-workshop/28-1-step4-alarms-created.jpg)
*Figure 4.1 – 7 alarms and the dashboard created by step4.sh*

![Figure 4.2 – Alarm states: DLQ in ALARM (test message left), others OK](../../images/5-workshop/28-2-step4-alarm-states.jpg)
*Figure 4.2 – Alarm states: DLQ in ALARM (test message left), others OK*

![Figure 4.3 – Custom metrics (EMF) in the ImageGuard namespace](../../images/5-workshop/14-6-cloudwatch-metrics.png)
*Figure 4.3 – Custom metrics (EMF) in the ImageGuard namespace*

![Figure 4.4 – Log group with 14-day retention](../../images/5-workshop/14-7-log-retention.png)
*Figure 4.4 – Log group with 14-day retention*

![Figure 4.5 – imageguard CloudWatch dashboard](../../images/5-workshop/28-4-dashboard.png)
*Figure 4.5 – imageguard CloudWatch dashboard*

