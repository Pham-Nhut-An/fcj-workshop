---
title: "Blog 3"
date: 2026-11-06
weight: 3
chapter: false
pre: " <b> 3.3. </b> "
---

# Lambda, SQS and EventBridge now support payloads up to 1 MB

**Posted on:** AWS Study Group VN (Facebook) – 06/11/2026 – <https://www.facebook.com/groups/awsstudygroupfcj/posts/2328196167945342/>

In **event-driven** architecture, services exchange data through a **payload** (the data attached to a message or event). The old limit was 256 KB, so large data such as LLM prompts, telemetry or ML output had to be split, compressed or stored in S3.

Since early 2026, AWS has raised the limit to **1 MB** for:

- **AWS Lambda**: **asynchronous** invocations
- **Amazon SQS**: all messages in queues
- **Amazon EventBridge**: all events on event buses

The change applies automatically to existing and new resources, with nothing to enable. If you set the SQS `MaximumMessageSize` attribute yourself, or wrote chunking logic around the 256 KB threshold, you may need to adjust it.

**Important notes from the article:**

- Lambda's 15-minute timeout and memory limits are unchanged. Parsing large JSON can use more memory and time, so load test with realistic payloads
- Logging full payloads to CloudWatch Logs increases cost, so log selectively or sample
- Every consumer must be able to handle the larger payloads
- The **claim check** pattern (store large data in S3 and pass a reference) is still useful when payloads exceed 1 MB, when multiple consumers need the data, or when audit is required

For a document flow such as S3, Lambda, Textract and Bedrock, this change lets you pass more context in one message without workarounds.

**Source:** *More room to build: serverless services now support payloads up to 1 MB* – Anton Aleksandrov, Debasis Rath, AWS Compute Blog (29/01/2026)
<https://aws.amazon.com/blogs/compute/more-room-to-build-serverless-services-now-support-payloads-up-to-1-mb/>
