---
title: "Week 11 Worklog"
date: 2026-09-14
weight: 11
chapter: false
pre: " <b> 1.11. </b> "
---

### Week 11 Objectives:

* Finish testing and documentation according to the FCAJ submission guide.
* Prepare the team submission files (summary `.md`, architecture `.xml`) and complete the personal report.

### Tasks to be carried out this week:
| Day | Task | Start Date | Completion Date | Reference Material |
| --- | --- | --- | --- | --- |
| 4 | - Read the submission rules, grading rubric and workshop standards on FCAJ Rules. <br> - Wrote the summary `.md` (Problem Statement, Proposed Solution, End-to-End Workflow, Additional, Cost) and exported the architecture diagram to `.xml`; fixed the IAM icon to the official AWS icon. <br> - Extra security tests: direct image Object URL → 403; HTTP → 301 redirect to HTTPS; expired presigned URL → 403 "Request has expired". <br> - Reviewed and updated the worklog, wrote the Self-Assessment and Sharing & Feedback (AI helped with wording). <br> - Removed the "search by label" promise from the Proposal to match the deployed system; added a success-criteria table to section 5.5. <br> - Enabled DynamoDB Point-in-time recovery on the `imageguard-images` table. | 25/11/2026 | 25/11/2026 | <https://hcm-rules.awsfcaj.com/> <br> <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.html> |
| 5 | - Batch-tested 10 Wikimedia Commons images through the live pipeline (`batch_test.sh`): 8/10 as expected; a smoking image was missed (Smoking 27% < 60% threshold). Added the results to section 5.5. <br> - Redesigned the web UI (drop zone, counters, label chips, responsive) and deployed it to S3 with a CloudFront invalidation (AI assisted). | 26/11/2026 | 26/11/2026 | <https://docs.aws.amazon.com/rekognition/latest/dg/moderation.html> <br> <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html> |
| 6 | - Record the demo video, take screenshots of the new UI and push the website. <br> - Find and attend Community Event #3. | 27/11/2026 | Ongoing | - |

### Week 11 Achievements:

* Team submission files ready (summary `.md` and architecture `.xml`).
* All security tests in section 5.5 verified on the live system.
* Measured block and false-positive rates on 12 images and identified improvements (per-category thresholds, admin review of blocked images).
* Enabled DynamoDB PITR and deployed the new web UI.
* Ongoing: demo video, Event 3.
