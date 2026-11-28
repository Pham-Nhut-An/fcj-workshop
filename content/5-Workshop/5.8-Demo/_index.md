---
title: "Demo Video"
date: 2026-11-20
weight: 8
chapter: false
pre: " <b> 5.8. </b> "
---

**Live production:** <https://d2tm9q0ah83pvf.cloudfront.net/>

**Demo video (2 minutes):** <https://pham-nhut-an.github.io/fcj-workshop/videos/imageguard-demo.mp4>

<video controls preload="metadata" width="100%" style="max-width:960px;border-radius:8px">
  <source src="https://pham-nhut-an.github.io/fcj-workshop/videos/imageguard-demo.mp4" type="video/mp4">
  Your browser cannot play the video; open the link above.
</video>

## Video content

| Time | Content |
|---|---|
| 0:00 | ImageGuard home page via CloudFront (English UI) |
| 0:04 | Redirect to Cognito Managed Login and sign up with an email; the password must meet the strength rules |
| 0:40 | Enter the confirmation code Cognito emailed; the account is activated |
| 0:52 | Signed in, back on the site with statistics, the upload box and an empty library |
| 1:00 | Pick the motorbike image `xe.jpg` and upload it to S3 with a presigned URL |
| 1:20 | A few seconds later the image is **APPROVED** with the labels Machine, Wheel, Motorcycle, Transportation, Vehicle, Scooter and a toast notification |
| 1:28 | Pick the knife image `dao.jpg` and upload it; the library shows "Moderating…" |
| 1:40 | The image becomes **REJECTED** with the **Violence** category; the blocked image is not displayed |
| 1:44 | Open Gmail: the administrator received the SNS alert with `userId`, `imageId`, `s3Key`, `blockedCategories` |
| 1:52 | Back on the site: 2 images, 1 approved, 1 blocked, average completion time about 3 seconds |

The SNS unsubscribe link in the email is blurred, because anyone with that link could cancel the administrator's alert emails.

Everything not shown in the video is covered in writing and screenshots in the other sections: architecture and design rationale (5.3), configuration of each service (5.4), DynamoDB data, CloudWatch, security and error-case tests (5.5), cost (5.6) and clean-up (5.7).
