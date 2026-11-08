---
title: "Blog 2"
date: 2026-11-06
weight: 2
chapter: false
pre: " <b> 3.2. </b> "
---

# Which vector store should you pick for Amazon Bedrock Knowledge Bases?

**Posted on:** AWS Study Group VN (Facebook) – 06/11/2026 – <https://www.facebook.com/groups/awsstudygroupfcj/posts/2328194534612172/>

When building **RAG (Retrieval-Augmented Generation)** on Bedrock, the first question is where to store the vectors. The blog compares 3 options:

- **Amazon OpenSearch Service**
- **Amazon Aurora PostgreSQL with pgvector**
- **Amazon S3 Vectors**

Each option is tested on a different use case:

1. **Product search (OpenSearch)**: reducing vector dimensions from 1024 to 512 kept quality almost unchanged while the index shrank by nearly half (5.34 GiB to 2.79 GiB). **Hybrid search** (semantic plus keyword) improved quality by about 6%.
2. **Research agent (S3 Vectors)**: when the number of vectors grew 200 times (from about 5 thousand to about 1 million), p50 latency grew only about 3.5 times (82 ms to 294 ms).
3. **Customer-facing chatbot (Aurora PostgreSQL)**: with 500 thousand chunks, p50 latency was about 32 ms (HNSW), under 50 ms.

The article's suggestions:

| Main need | Suggested store |
|---|---|
| Low latency (under 50 ms) and hybrid search | OpenSearch Service |
| Balanced, with relational data | Aurora PostgreSQL + pgvector |
| Lowest cost at large scale, minimal operations | S3 Vectors |

It also suggests a tiered design: S3 Vectors for the full corpus, and OpenSearch or Aurora for the performance-critical part.

**Notes:** the three tests used different datasets, so they cannot be compared head to head. They only show the shape of each trade-off. The latency numbers also exclude embedding generation time.

My takeaway: this article helps choose technology based on real needs instead of gut feeling.

**Source:** *Selecting a vector store for Amazon Bedrock Knowledge Bases* – Deepak Dalakoti, Rhys Lewis, Petar Avramovic, AWS Machine Learning Blog (17/09/2026)
<https://aws.amazon.com/blogs/machine-learning/selecting-a-vector-store-for-amazon-bedrock-knowledge-bases/>
