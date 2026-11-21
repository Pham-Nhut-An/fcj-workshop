// Dien gia tri that sau khi tao xong Cognito, API Gateway va CloudFront.
// File nay chi chua thong tin CONG KHAI (khong co secret): app client SPA khong co client secret.
window.IMAGEGUARD_CONFIG = {
  cognitoDomain: "https://<COGNITO_DOMAIN_PREFIX>.auth.us-east-1.amazoncognito.com",
  clientId: "<APP_CLIENT_ID>",
  redirectUri: "https://<CLOUDFRONT_DOMAIN>/",
  apiUrl: "https://<API_ID>.execute-api.us-east-1.amazonaws.com",
};
