---
title: "Prerequisites"
date: 2026-11-20
weight: 2
chapter: false
pre: " <b> 5.2. </b> "
---

## Account and permissions

1. An AWS account with an **AWS Budgets** alert when spend exceeds USD 10.
2. **Do not use the root user.** Root is only used to enable MFA and is then put away, with no access keys.
3. Create an IAM user with **MFA** and add it to 2 groups (each group holds at most 10 managed policies):

| Group | Managed policies |
|---|---|
| `imageguard-dev` | `AmazonS3FullAccess`, `AmazonDynamoDBFullAccess`, `AmazonSNSFullAccess`, `AmazonSQSFullAccess`, `AWSLambda_FullAccess`, `IAMFullAccess`, `CloudWatchFullAccessV2`, `AmazonRekognitionReadOnlyAccess`, `AWSCloudShellFullAccess` |
| `imageguard-dev-2` | `AmazonCognitoPowerUser`, `AmazonAPIGatewayAdministrator`, `CloudFrontFullAccess` |

![IAM group with its policies](../../images/5-workshop/0-1-iam-group-policies.png)
*Figure: IAM group with its policies*

{{% notice warning %}}
`IAMFullAccess` allows privilege escalation. It is acceptable in this workshop because the user must create Lambda roles; in production, restrict it with a **permission boundary**.
{{% /notice %}}

## Region and tools

- Region: **US East (N. Virginia) – us-east-1**. Check the top-right corner of the Console before every step.
- A browser and the AWS Console. Steps 3–4 can run in **AWS CloudShell** (AWS CLI pre-installed), nothing to install locally.
- Note your **Account ID** (12 digits, no dashes) and replace `<ACCOUNT_ID>` with it throughout the guide.

## Test images

Prepare 2–3 **JPEG** images under 5 MB:
- A normal image, e.g. a beer bottle (Rekognition labels it *Alcohol*, but the policy still allows it).
- A wooden toy gun (detected as *Violence/Weapons* ~97% → a **false positive** example for testing).

## Quota check

Rekognition needs no quota request at this scale. Quick check in the Console: **Rekognition → Content moderation → Upload** any image; if you get results, the account is ready.
