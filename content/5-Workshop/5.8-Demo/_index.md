---
title: "Demo Video"
date: 2026-11-20
weight: 8
chapter: false
pre: " <b> 5.8. </b> "
---

**Demo video:** `[paste the YouTube / Google Drive link after recording]`

## Video script (5–7 minutes)

| Time | Content |
|---|---|
| 0:00 | The problem and the architecture diagram (section 5.3) |
| 1:00 | Open the site via CloudFront → sign in / sign up with Cognito |
| 2:00 | Upload a beer image → **APPROVED** within seconds, labels shown |
| 2:45 | Upload the toy gun → **REJECTED**, open the alert email (mention the false positive) |
| 3:30 | DynamoDB: the item has `userId` = `sub`, `moderationLabels`, `labels` |
| 4:00 | CloudWatch dashboard: APPROVED/REJECTED counts, processing time, alarms |
| 4:45 | Security: API without a token → 401; direct S3 access → AccessDenied |
| 5:30 | Cost: AWS Pricing Calculator, USD 8.37/month |
| 6:00 | Summary and next steps (admin review of REJECTED images, AWS WAF, presigned POST with a size limit) |
