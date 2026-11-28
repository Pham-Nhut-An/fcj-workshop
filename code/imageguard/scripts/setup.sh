#!/usr/bin/env bash
# ImageGuard - Step 3 setup bang AWS CLI (chay trong CloudShell us-east-1)
set -euo pipefail
export AWS_REGION=us-east-1 AWS_DEFAULT_REGION=us-east-1 AWS_PAGER=""
ACC=$(aws sts get-caller-identity --query Account --output text)
IMG_BUCKET="imageguard-images-$ACC"
WEB_BUCKET="imageguard-web-$ACC"
TABLE="imageguard-images"
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HOME/imageguard-outputs.txt"
log() { echo -e "\n=== $* ==="; }

# ---------- 0. Quyen cho IAM user (group thu 2) ----------
log "0. IAM group imageguard-dev-2"
ME=$(aws sts get-caller-identity --query Arn --output text | awk -F/ '{print $NF}')
aws iam create-group --group-name imageguard-dev-2 >/dev/null 2>&1 || true
for p in AmazonCognitoPowerUser AmazonAPIGatewayAdministrator CloudFrontFullAccess; do
  aws iam attach-group-policy --group-name imageguard-dev-2 --policy-arn "arn:aws:iam::aws:policy/$p"
done
aws iam add-user-to-group --group-name imageguard-dev-2 --user-name "$ME" || true
echo "Gan xong cho user $ME, doi 15s de quyen co hieu luc"; sleep 15

# ---------- 1. IAM roles cho 2 Lambda ----------
log "1. IAM roles"
cat > /tmp/trust.json <<'EOF'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}
EOF
logs_res() { echo "\"arn:aws:logs:us-east-1:$ACC:log-group:/aws/lambda/$1\",\"arn:aws:logs:us-east-1:$ACC:log-group:/aws/lambda/$1:*\""; }

cat > /tmp/presign-policy.json <<EOF
{"Version":"2012-10-17","Statement":[
 {"Sid":"PutUploadsOnly","Effect":"Allow","Action":"s3:PutObject","Resource":"arn:aws:s3:::$IMG_BUCKET/uploads/*"},
 {"Sid":"CreatePendingItem","Effect":"Allow","Action":"dynamodb:PutItem","Resource":"arn:aws:dynamodb:us-east-1:$ACC:table/$TABLE"},
 {"Sid":"WriteOwnLogsOnly","Effect":"Allow","Action":["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],"Resource":[$(logs_res imageguard-presign-upload)]}]}
EOF
cat > /tmp/getimages-policy.json <<EOF
{"Version":"2012-10-17","Statement":[
 {"Sid":"QueryOwnTable","Effect":"Allow","Action":"dynamodb:Query","Resource":"arn:aws:dynamodb:us-east-1:$ACC:table/$TABLE"},
 {"Sid":"PresignViewApprovedImages","Effect":"Allow","Action":"s3:GetObject","Resource":"arn:aws:s3:::$IMG_BUCKET/uploads/*"},
 {"Sid":"WriteOwnLogsOnly","Effect":"Allow","Action":["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],"Resource":[$(logs_res imageguard-get-images)]}]}
EOF
for r in presign-upload get-images; do
  aws iam create-role --role-name "imageguard-$r-role" --assume-role-policy-document file:///tmp/trust.json >/dev/null 2>&1 || echo "role imageguard-$r-role da ton tai"
done
aws iam put-role-policy --role-name imageguard-presign-upload-role --policy-name imageguard-presign-upload-policy --policy-document file:///tmp/presign-policy.json
aws iam put-role-policy --role-name imageguard-get-images-role --policy-name imageguard-get-images-policy --policy-document file:///tmp/getimages-policy.json
echo "Doi 15s cho role san sang"; sleep 15

# ---------- 2. Lambda ----------
log "2. Lambda functions"
deploy_fn() { # $1=ten ngan  $2=thu muc code  $3=env
  local name="imageguard-$1" zip="/tmp/$1.zip"
  (cd "$HERE/$2" && rm -f "$zip" && zip -q "$zip" lambda_function.py)
  aws logs create-log-group --log-group-name "/aws/lambda/$name" 2>/dev/null || true
  aws logs put-retention-policy --log-group-name "/aws/lambda/$name" --retention-in-days 14
  if aws lambda get-function --function-name "$name" >/dev/null 2>&1; then
    aws lambda update-function-code --function-name "$name" --zip-file "fileb://$zip" >/dev/null
  else
    aws lambda create-function --function-name "$name" --runtime python3.12 --architectures arm64 \
      --handler lambda_function.lambda_handler --role "arn:aws:iam::$ACC:role/$name-role" \
      --zip-file "fileb://$zip" --memory-size 128 --timeout 10 \
      --environment "Variables={$3}" >/dev/null
  fi
  aws lambda wait function-active-v2 --function-name "$name"
  echo "OK $name"
}
deploy_fn presign-upload presign_upload "BUCKET_NAME=$IMG_BUCKET,TABLE_NAME=$TABLE,URL_EXPIRES_SECONDS=300"
deploy_fn get-images get_images "BUCKET_NAME=$IMG_BUCKET,TABLE_NAME=$TABLE,URL_EXPIRES_SECONDS=300,MAX_ITEMS=50"
# Log retention cho process-image (Buoc 14.7)
aws logs put-retention-policy --log-group-name /aws/lambda/imageguard-process-image --retention-in-days 14 || true

# ---------- 3. Bucket web ----------
log "3. S3 bucket web"
aws s3api create-bucket --bucket "$WEB_BUCKET" >/dev/null 2>&1 || echo "bucket $WEB_BUCKET da ton tai"
aws s3api put-public-access-block --bucket "$WEB_BUCKET" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-ownership-controls --bucket "$WEB_BUCKET" --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'
aws s3api put-bucket-encryption --bucket "$WEB_BUCKET" --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# ---------- 4. CloudFront + OAC ----------
log "4. CloudFront"
DIST_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='imageguard-web'].Id | [0]" --output text)
if [ "$DIST_ID" = "None" ] || [ -z "$DIST_ID" ]; then
  OAC_ID=$(aws cloudfront list-origin-access-controls --query "OriginAccessControlList.Items[?Name=='imageguard-web-oac'].Id | [0]" --output text)
  if [ "$OAC_ID" = "None" ] || [ -z "$OAC_ID" ]; then
    OAC_ID=$(aws cloudfront create-origin-access-control --origin-access-control-config \
      "Name=imageguard-web-oac,Description=ImageGuard web,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
      --query OriginAccessControl.Id --output text)
  fi
  cat > /tmp/dist.json <<EOF
{
  "CallerReference": "imageguard-$(date +%s)",
  "Comment": "imageguard-web",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "PriceClass": "PriceClass_200",
  "HttpVersion": "http2and3",
  "Origins": {"Quantity": 1, "Items": [{
    "Id": "s3-web",
    "DomainName": "$WEB_BUCKET.s3.us-east-1.amazonaws.com",
    "OriginAccessControlId": "$OAC_ID",
    "S3OriginConfig": {"OriginAccessIdentity": ""}
  }]},
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-web",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "ResponseHeadersPolicyId": "67f7725c-6f97-4210-82d7-5512b31e9d03",
    "Compress": true,
    "AllowedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"]}
  }
}
EOF
  DIST_ID=$(aws cloudfront create-distribution --distribution-config file:///tmp/dist.json --query Distribution.Id --output text)
fi
CF_DOMAIN=$(aws cloudfront get-distribution --id "$DIST_ID" --query Distribution.DomainName --output text)
cat > /tmp/web-policy.json <<EOF
{"Version":"2012-10-17","Statement":[{"Sid":"AllowCloudFrontOAC","Effect":"Allow",
 "Principal":{"Service":"cloudfront.amazonaws.com"},"Action":"s3:GetObject",
 "Resource":"arn:aws:s3:::$WEB_BUCKET/*",
 "Condition":{"StringEquals":{"AWS:SourceArn":"arn:aws:cloudfront::$ACC:distribution/$DIST_ID"}}},
 {"Sid":"DenyInsecureTransport","Effect":"Deny","Principal":"*","Action":"s3:*",
 "Resource":["arn:aws:s3:::$WEB_BUCKET","arn:aws:s3:::$WEB_BUCKET/*"],
 "Condition":{"Bool":{"aws:SecureTransport":"false"}}}]}
EOF
aws s3api put-bucket-policy --bucket "$WEB_BUCKET" --policy file:///tmp/web-policy.json
echo "CloudFront: $DIST_ID  https://$CF_DOMAIN"

# ---------- 5. Cognito ----------
log "5. Cognito"
POOL_ID=$(aws cognito-idp list-user-pools --max-results 60 --query "UserPools[?Name=='imageguard-users'].Id | [0]" --output text)
if [ "$POOL_ID" = "None" ] || [ -z "$POOL_ID" ]; then
  POOL_ID=$(aws cognito-idp create-user-pool --pool-name imageguard-users \
    --username-attributes email --auto-verified-attributes email \
    --policies 'PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}' \
    --account-recovery-setting 'RecoveryMechanisms=[{Priority=1,Name=verified_email}]' \
    --admin-create-user-config AllowAdminCreateUserOnly=false \
    --query UserPool.Id --output text)
fi
CLIENT_ID=$(aws cognito-idp list-user-pool-clients --user-pool-id "$POOL_ID" --query "UserPoolClients[?ClientName=='imageguard-web'].ClientId | [0]" --output text)
if [ "$CLIENT_ID" = "None" ] || [ -z "$CLIENT_ID" ]; then
  CLIENT_ID=$(aws cognito-idp create-user-pool-client --user-pool-id "$POOL_ID" --client-name imageguard-web \
    --no-generate-secret \
    --allowed-o-auth-flows code --allowed-o-auth-scopes openid email --allowed-o-auth-flows-user-pool-client \
    --supported-identity-providers COGNITO \
    --callback-urls "https://$CF_DOMAIN/" --logout-urls "https://$CF_DOMAIN/" \
    --explicit-auth-flows ALLOW_REFRESH_TOKEN_AUTH \
    --prevent-user-existence-errors ENABLED \
    --access-token-validity 60 --id-token-validity 60 --refresh-token-validity 1 \
    --token-validity-units AccessToken=minutes,IdToken=minutes,RefreshToken=days \
    --query UserPoolClient.ClientId --output text)
fi
DOMAIN_PREFIX="imageguard-$ACC"
if ! aws cognito-idp describe-user-pool-domain --domain "$DOMAIN_PREFIX" --query DomainDescription.UserPoolId --output text | grep -q "$POOL_ID"; then
  aws cognito-idp create-user-pool-domain --user-pool-id "$POOL_ID" --domain "$DOMAIN_PREFIX" --managed-login-version 2 >/dev/null
fi
aws cognito-idp create-managed-login-branding --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" \
  --use-cognito-provided-values >/dev/null 2>&1 || echo "(managed login branding da co hoac bo qua)"
COGNITO_DOMAIN="https://$DOMAIN_PREFIX.auth.us-east-1.amazoncognito.com"

# ---------- 6. API Gateway HTTP API ----------
log "6. API Gateway"
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='imageguard-api'].ApiId | [0]" --output text)
if [ "$API_ID" = "None" ] || [ -z "$API_ID" ]; then
  API_ID=$(aws apigatewayv2 create-api --name imageguard-api --protocol-type HTTP \
    --cors-configuration "{\"AllowOrigins\":[\"https://$CF_DOMAIN\"],\"AllowHeaders\":[\"authorization\",\"content-type\"],\"AllowMethods\":[\"GET\",\"POST\",\"OPTIONS\"],\"MaxAge\":300}" \
    --query ApiId --output text)
  AUTH_ID=$(aws apigatewayv2 create-authorizer --api-id "$API_ID" --name cognito-jwt --authorizer-type JWT \
    --identity-source '$request.header.Authorization' \
    --jwt-configuration "Audience=$CLIENT_ID,Issuer=https://cognito-idp.us-east-1.amazonaws.com/$POOL_ID" \
    --query AuthorizerId --output text)
  add_route() { # $1=route key  $2=function  $3=path
    local fn_arn="arn:aws:lambda:us-east-1:$ACC:function:$2"
    local integ
    integ=$(aws apigatewayv2 create-integration --api-id "$API_ID" --integration-type AWS_PROXY \
      --integration-uri "$fn_arn" --payload-format-version 2.0 --query IntegrationId --output text)
    aws apigatewayv2 create-route --api-id "$API_ID" --route-key "$1" --target "integrations/$integ" \
      --authorization-type JWT --authorizer-id "$AUTH_ID" >/dev/null
    aws lambda add-permission --function-name "$2" --statement-id "apigw-$(echo "$3" | tr -d /)" \
      --action lambda:InvokeFunction --principal apigateway.amazonaws.com \
      --source-arn "arn:aws:execute-api:us-east-1:$ACC:$API_ID/*/*$3" \
      --source-account "$ACC" >/dev/null
  }
  add_route "POST /upload-url" imageguard-presign-upload /upload-url
  add_route "GET /images" imageguard-get-images /images
  aws apigatewayv2 create-stage --api-id "$API_ID" --stage-name '$default' --auto-deploy \
    --default-route-settings ThrottlingBurstLimit=20,ThrottlingRateLimit=10 >/dev/null
fi
API_URL="https://$API_ID.execute-api.us-east-1.amazonaws.com"

# ---------- 7. CORS cho bucket anh ----------
log "7. CORS bucket anh"
aws s3api put-bucket-cors --bucket "$IMG_BUCKET" --cors-configuration \
  "{\"CORSRules\":[{\"AllowedOrigins\":[\"https://$CF_DOMAIN\"],\"AllowedMethods\":[\"PUT\",\"GET\"],\"AllowedHeaders\":[\"content-type\"],\"MaxAgeSeconds\":3000}]}"

# ---------- 8. Upload web ----------
log "8. Upload web"
cat > "$HERE/web/config.js" <<EOF
// Thong tin CONG KHAI (app client SPA khong co secret)
window.IMAGEGUARD_CONFIG = {
  cognitoDomain: "$COGNITO_DOMAIN",
  clientId: "$CLIENT_ID",
  redirectUri: "https://$CF_DOMAIN/",
  apiUrl: "$API_URL",
};
EOF
aws s3 cp "$HERE/web/index.html" "s3://$WEB_BUCKET/index.html" --content-type "text/html; charset=utf-8"
aws s3 cp "$HERE/web/app.js" "s3://$WEB_BUCKET/app.js" --content-type "application/javascript; charset=utf-8"
aws s3 cp "$HERE/web/config.js" "s3://$WEB_BUCKET/config.js" --content-type "application/javascript; charset=utf-8" --cache-control "no-cache"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" >/dev/null || true

# ---------- Ket qua ----------
cat > "$OUT" <<EOF
CLOUDFRONT_DOMAIN = $CF_DOMAIN
DISTRIBUTION_ID   = $DIST_ID
USER_POOL_ID      = $POOL_ID
APP_CLIENT_ID     = $CLIENT_ID
COGNITO_DOMAIN    = $COGNITO_DOMAIN
API_URL           = $API_URL
WEB_URL           = https://$CF_DOMAIN/
EOF
log "XONG STEP 3"
cat "$OUT"
echo "CloudFront can ~5 phut de chuyen sang Deployed."
