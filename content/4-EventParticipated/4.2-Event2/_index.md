---
title: "Event 2"
date: 2026-10-31
weight: 2
chapter: false
pre: " <b> 4.2. </b> "
---

# Summary Report: "FCAJ Community Day"

### Event Information

- **Event name:** FCAJ Community Day
- **Date & time:** Saturday, 31/10/2026, 09:00 – 12:00
- **Location:** AWS Vietnam office, Bitexco Financial Tower, 2 Hai Trieu Street, Sai Gon Ward, Ho Chi Minh City
- **Role:** Attendee
- **Event page:** <https://luma.com/1izeyind>

### Event Objectives

- Share real experience from building software and using AWS services in practice
- Help students understand what the cloud industry expects and how to prepare
- Introduce new ways of building serverless and asynchronous systems on AWS
- Encourage interns to contribute to open source and learn from the community

### Agenda

| Time | Session |
| --- | --- |
| 09:00 – 09:25 | Lessons Learned from Building Software Factories |
| 09:30 – 09:55 | Education |
| 10:00 – 10:25 | AWS Lambda Web Functions: Rethinking Serverless Web Architecture |
| 10:30 – 11:00 | Amazon SQS: Building Asynchronous Systems |
| 11:00 – 11:25 | My 3-Month AWS Internship Journey |
| 11:30 – 12:00 | Start & Maintain Consistency with Open Source Contributing |

### Key Highlights

#### Lessons Learned from Building Software Factories
- A **software factory** is a standard, repeatable way for a team to build, test and release software.
- The speakers shared common mistakes to avoid and what actually worked when they built it at scale.

#### Education
- An educator's view on preparing the next generation of cloud engineers.
- What students should prepare before joining the industry, and how to close the gap between university and real work.

#### AWS Lambda Web Functions: Rethinking Serverless Web Architecture
- Lambda can now serve web requests over **native HTTP** and handle **up to 128 requests at the same time** in one function, which changes how we think about serverless web apps.
- No adapter layer is needed, and **Active CPU Billing** (paying only for the time the CPU is actually working) helps reduce cost.
- The session compared serverless with **Docker on EC2/ECS** using real performance benchmarks.

#### Amazon SQS: Building Asynchronous Systems
- Modern systems need **asynchronous processing** (work is put in a queue and handled later) so that one slow part does not block the whole system.
- **Amazon SQS** (a managed message queue) helps **decouple** (separate) components and scale each part independently.
- Practical design patterns and tips, for example using a **Dead-Letter Queue (DLQ)** to keep messages that keep failing.

#### My 3-Month AWS Internship Journey
- A former intern shared how they applied AWS services to a real project during 3 months.
- Lessons and advice for interns who are just starting.

#### Start & Maintain Consistency with Open Source Contributing
- How to make a first open source contribution from zero.
- How to build a habit of contributing regularly and stay motivated, and how this helps skills and career.

### Key Takeaways

- Serverless is not only for small functions anymore; it can be a real option for web applications, but the choice should be based on **cost and performance data**, not habit.
- Using a **queue (SQS)** between steps makes a system more reliable: if one step fails, messages wait in the queue instead of being lost.
- An internship is short. Learning steadily every day and building a real project matters more than reading a lot of theory.

### Applying to My Work

- Consider adding **Amazon SQS** between the upload step and the processing step (Lambda) in our team's capstone workshop, with a DLQ for failed jobs.
- When choosing between Lambda and containers for the workshop, compare cost with the **AWS Pricing Calculator** before deciding.
- Follow the advice from the internship session: update my worklog honestly every week and practice labs instead of only reading.

### Event Experience

This event was very close to my situation as an intern. The session from a former intern showed me what a 3-month internship can realistically achieve, and the Lambda and SQS sessions connected directly to services our team may use in the workshop. I also learned that contributing to open source is something I can start small with.

#### Check-in photo

![FCAJ Community Day check-in](../../images/4-Event/event2-checkin.jpg)

*I am in the red box.*
