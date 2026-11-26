---
title: "Blogs Posted"
date: 2026-09-14
weight: 3
chapter: false
pre: " <b> 3. </b> "
---

This section lists the 3 blogs I posted to the [AWS Study Group](https://www.facebook.com/groups/awsstudygroupfcj) community on 06/11/2026.

### [Blog 1 - Self-improving document processing with Amazon Bedrock AgentCore](3.1-blog1/)
This blog introduces a sample solution that uses AI agents on Amazon Bedrock AgentCore to process documents (invoices, forms) without writing a template for each type. It combines Amazon Textract, Strands Agents and S3 Vectors to remember past corrections and improve over time.

### [Blog 2 - Which vector store for Amazon Bedrock Knowledge Bases?](3.2-blog2/)
This blog compares three vector stores for RAG on Bedrock: Amazon OpenSearch Service, Aurora PostgreSQL with pgvector and Amazon S3 Vectors, each tested on a different use case, with latency and index-size figures to help pick the right service.

### [Blog 3 - Lambda, SQS and EventBridge now support payloads up to 1 MB](3.3-blog3/)
This blog summarizes AWS raising the payload limit from 256 KB to 1 MB for Lambda (asynchronous invocations), SQS and EventBridge, its impact on event-driven architectures, and points to watch such as memory, timeouts and load testing.
