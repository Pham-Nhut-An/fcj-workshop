---
title: "Blog 2"
date: 2026-11-06
weight: 2
chapter: false
pre: " <b> 3.2. </b> "
---

# Chọn vector store nào cho Amazon Bedrock Knowledge Bases?

**Đăng trên:** AWS Study Group VN (Facebook) – 06/11/2026 – <https://www.facebook.com/groups/awsstudygroupfcj/posts/2328194534612172/>

Khi xây **RAG (Retrieval-Augmented Generation – sinh câu trả lời có tăng cường truy xuất)** trên Bedrock, câu hỏi đầu tiên là lưu vector ở đâu. Bài blog so sánh 3 lựa chọn:

- **Amazon OpenSearch Service**
- **Amazon Aurora PostgreSQL với pgvector**
- **Amazon S3 Vectors**

Mỗi lựa chọn được thử trên một bài toán khác nhau:

1. **Tìm kiếm sản phẩm (OpenSearch)**: giảm số chiều vector từ 1024 xuống 512 gần như không đổi chất lượng mà index nhỏ gần một nửa (5,34 GiB còn 2,79 GiB). **Hybrid search (tìm kiếm kết hợp ngữ nghĩa và từ khóa)** cải thiện chất lượng khoảng 6%.
2. **Agent nghiên cứu (S3 Vectors)**: khi số vector tăng 200 lần (từ khoảng 5 nghìn lên khoảng 1 triệu), độ trễ p50 chỉ tăng khoảng 3,5 lần (82 ms lên 294 ms).
3. **Chatbot cho khách hàng (Aurora PostgreSQL)**: với 500 nghìn chunk, độ trễ p50 khoảng 32 ms (HNSW), dưới 50 ms.

Gợi ý chọn của bài viết:

| Nhu cầu chính | Nên chọn |
|---|---|
| Độ trễ thấp (dưới 50 ms) và cần hybrid search | OpenSearch Service |
| Cân bằng, cần kết hợp dữ liệu quan hệ | Aurora PostgreSQL + pgvector |
| Chi phí thấp ở quy mô lớn, ít phải vận hành | S3 Vectors |

Bài còn gợi ý thiết kế nhiều tầng: dùng S3 Vectors cho toàn bộ dữ liệu, và OpenSearch hoặc Aurora cho phần cần hiệu năng cao.

**Lưu ý:** ba thử nghiệm dùng dữ liệu khác nhau nên không thể so sánh ngang hàng trực tiếp, chỉ cho thấy xu hướng đánh đổi của từng lựa chọn. Con số độ trễ cũng chưa tính thời gian tạo embedding.

Mình thấy bài này hữu ích vì nó giúp chọn công nghệ dựa trên nhu cầu thực tế, thay vì chọn theo cảm tính.

**Nguồn:** *Selecting a vector store for Amazon Bedrock Knowledge Bases* – Deepak Dalakoti, Rhys Lewis, Petar Avramovic, AWS Machine Learning Blog (17/09/2026)
<https://aws.amazon.com/blogs/machine-learning/selecting-a-vector-store-for-amazon-bedrock-knowledge-bases/>
