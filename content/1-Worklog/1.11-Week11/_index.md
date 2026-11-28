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
| 5 | - Batch-tested 10 Wikimedia Commons images through the live pipeline (`batch_test.sh`): 8/10 as expected; a smoking image was missed (Smoking 27% < 60% threshold). Added the results to section 5.5. <br> - Redesigned the web UI (drop zone, counters, label chips, responsive) and deployed it to S3 with a CloudFront invalidation (AI assisted). <br> - Added "Target users" and "Future Work" to the Proposal. <br> - Checked the architecture against the live AWS resources (S3 event, routes + JWT Authorizer, IAM roles, OAC, SNS, alarms); added the us-east-1 Region rationale to section 5.3. <br> - Reworked the architecture diagram (flow numbers matching the table, new 10c viewing flow, no line jumps) and re-exported the `.xml`. <br> - Aligned the report site with the sample: class on the home page, blog list, 12-criteria Self-Assessment table, Sharing & Feedback page. | 26/11/2026 | 26/11/2026 | <https://docs.aws.amazon.com/rekognition/latest/dg/moderation.html> <br> <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html> |
| 6 | - Reviewed the UI a teammate rebuilt from the ImageGuard code and compared the changes with the original. <br> - Read the FCAJ Rules Project page (report content, requirements, standards) and checked the work against it. | 27/11/2026 | 27/11/2026 | <https://hcm-rules.awsfcaj.com/project> |
| 7 | - Rebuilt the web UI with a dark theme and browser-side features (multi-image upload, JPEG magic-byte check, statistics, label filter/search/sort, detail view, status-change notifications) plus a VI/EN language switch, with no architecture change; deployed to S3 + CloudFront (AI assisted). <br> - Ran 5 error-case tests E1–E5 (`error_test.sh`): PNG file, non-JSON body, missing token, 100-request burst, fake `.jpg` file; retook the UI screenshots. <br> - Read the FCAJ scoring rubric; added written explanations to section 5 (flow table matching the diagram, why each service, DynamoDB data model, Well-Architected pillar mapping, design decisions, cost at higher volumes). <br> - Recorded a 2-minute demo video (sign-up, approved image, blocked image, alert email), blurred the unsubscribe link in the email, compressed the video and embedded it in section 5.8. <br> - Fixed the Proposal timeline to the actual dates and updated the worklog. | 28/11/2026 | 28/11/2026 | <https://hcm-rules.awsfcaj.com/scoring> <br> <https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html> |

### Week 11 Achievements:

* Team submission files ready (summary `.md` and architecture `.xml`).
* All security tests in section 5.5 verified on the live system.
* Measured block and false-positive rates on 12 images and identified improvements (per-category thresholds, admin review of blocked images).
* Enabled DynamoDB PITR; the new web UI (dark theme, VI/EN switch) is live on CloudFront.
* The system handles all 5 error cases correctly (returns 400/401 or marks the image `REJECTED`, without stalling the pipeline).
* Section 5-Workshop now explains everything in writing (there is no oral presentation).
* The demo video is on the website (section 5.8).
* Community Event #3 not attended yet.
