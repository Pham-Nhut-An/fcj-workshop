#!/usr/bin/env bash
# ImageGuard - Step 4: CloudWatch alarms + dashboard (chi tao tai nguyen CloudWatch, khong dong vao IAM)
set -euo pipefail
export AWS_REGION=us-east-1 AWS_DEFAULT_REGION=us-east-1 AWS_PAGER=""
ACC=$(aws sts get-caller-identity --query Account --output text)
TOPIC="arn:aws:sns:us-east-1:$ACC:imageguard-alerts"
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='imageguard-api'].ApiId | [0]" --output text)

alarm() { # name ns metric stat threshold dims...
  local name=$1 ns=$2 metric=$3 stat=$4 thr=$5; shift 5
  aws cloudwatch put-metric-alarm --alarm-name "$name" \
    --namespace "$ns" --metric-name "$metric" --statistic "$stat" \
    --dimensions "$@" --period 300 --evaluation-periods 1 \
    --threshold "$thr" --comparison-operator GreaterThanOrEqualToThreshold \
    --treat-missing-data notBreaching \
    --alarm-actions "$TOPIC" --ok-actions "$TOPIC"
  echo "OK alarm $name"
}

echo "=== Alarms ==="
for fn in process-image presign-upload get-images; do
  alarm "imageguard-$fn-errors" AWS/Lambda Errors Sum 1 "Name=FunctionName,Value=imageguard-$fn"
done
alarm imageguard-process-image-throttles AWS/Lambda Throttles Sum 1 Name=FunctionName,Value=imageguard-process-image
alarm imageguard-dlq-not-empty AWS/SQS ApproximateNumberOfMessagesVisible Maximum 1 Name=QueueName,Value=imageguard-process-dlq
alarm imageguard-alert-publish-failed ImageGuard AlertPublishFailed Sum 1 Name=Service,Value=process-image
alarm imageguard-api-5xx AWS/ApiGateway 5xx Sum 5 Name=ApiId,Value="$API_ID" Name=Stage,Value='$default'

echo "=== Dashboard ==="
cat > /tmp/dashboard.json <<EOF
{
  "widgets": [
    {"type":"text","x":0,"y":0,"width":24,"height":2,
     "properties":{"markdown":"# ImageGuard – kiểm duyệt ảnh tự động\nS3 → Lambda process-image → Rekognition → DynamoDB · SNS khi REJECTED · DLQ khi lỗi"}},
    {"type":"metric","x":0,"y":2,"width":12,"height":6,
     "properties":{"title":"Ảnh xử lý (EMF)","region":"us-east-1","view":"timeSeries","stacked":false,"stat":"Sum","period":300,
       "metrics":[["ImageGuard","ImagesApproved","Service","process-image",{"label":"APPROVED","color":"#0e7a3e"}],
                  ["ImageGuard","ImagesRejected","Service","process-image",{"label":"REJECTED","color":"#b42318"}],
                  ["ImageGuard","ImagesProcessed","Service","process-image",{"label":"Tổng","color":"#667085"}]]}},
    {"type":"metric","x":12,"y":2,"width":12,"height":6,
     "properties":{"title":"Thời gian xử lý 1 ảnh (ms)","region":"us-east-1","view":"timeSeries","period":300,
       "metrics":[["ImageGuard","ProcessingLatency","Service","process-image",{"stat":"Average","label":"Trung bình"}],
                  ["ImageGuard","ProcessingLatency","Service","process-image",{"stat":"Maximum","label":"Lớn nhất"}]]}},
    {"type":"metric","x":0,"y":8,"width":8,"height":6,
     "properties":{"title":"Lambda – số lần gọi","region":"us-east-1","view":"timeSeries","stat":"Sum","period":300,
       "metrics":[["AWS/Lambda","Invocations","FunctionName","imageguard-process-image"],
                  ["AWS/Lambda","Invocations","FunctionName","imageguard-presign-upload"],
                  ["AWS/Lambda","Invocations","FunctionName","imageguard-get-images"]]}},
    {"type":"metric","x":8,"y":8,"width":8,"height":6,
     "properties":{"title":"Lambda – lỗi & throttle","region":"us-east-1","view":"timeSeries","stat":"Sum","period":300,
       "metrics":[["AWS/Lambda","Errors","FunctionName","imageguard-process-image"],
                  ["AWS/Lambda","Errors","FunctionName","imageguard-presign-upload"],
                  ["AWS/Lambda","Errors","FunctionName","imageguard-get-images"],
                  ["AWS/Lambda","Throttles","FunctionName","imageguard-process-image"]]}},
    {"type":"metric","x":16,"y":8,"width":8,"height":6,
     "properties":{"title":"Lambda – thời gian chạy (ms)","region":"us-east-1","view":"timeSeries","stat":"Average","period":300,
       "metrics":[["AWS/Lambda","Duration","FunctionName","imageguard-process-image"],
                  ["AWS/Lambda","Duration","FunctionName","imageguard-presign-upload"],
                  ["AWS/Lambda","Duration","FunctionName","imageguard-get-images"]]}},
    {"type":"metric","x":0,"y":14,"width":8,"height":6,
     "properties":{"title":"API Gateway – request & lỗi","region":"us-east-1","view":"timeSeries","stat":"Sum","period":300,
       "metrics":[["AWS/ApiGateway","Count","ApiId","$API_ID","Stage","\$default"],
                  ["AWS/ApiGateway","4xx","ApiId","$API_ID","Stage","\$default"],
                  ["AWS/ApiGateway","5xx","ApiId","$API_ID","Stage","\$default"]]}},
    {"type":"metric","x":8,"y":14,"width":8,"height":6,
     "properties":{"title":"API Gateway – độ trễ (ms)","region":"us-east-1","view":"timeSeries","period":300,
       "metrics":[["AWS/ApiGateway","Latency","ApiId","$API_ID","Stage","\$default",{"stat":"p90","label":"p90"}],
                  ["AWS/ApiGateway","Latency","ApiId","$API_ID","Stage","\$default",{"stat":"Average","label":"Trung bình"}]]}},
    {"type":"metric","x":16,"y":14,"width":8,"height":6,
     "properties":{"title":"DLQ – sự kiện lỗi đang chờ","region":"us-east-1","view":"singleValue","stat":"Maximum","period":300,
       "metrics":[["AWS/SQS","ApproximateNumberOfMessagesVisible","QueueName","imageguard-process-dlq"]]}},
    {"type":"alarm","x":0,"y":20,"width":24,"height":4,
     "properties":{"title":"Trạng thái alarm","alarms":[
       "arn:aws:cloudwatch:us-east-1:$ACC:alarm:imageguard-process-image-errors",
       "arn:aws:cloudwatch:us-east-1:$ACC:alarm:imageguard-presign-upload-errors",
       "arn:aws:cloudwatch:us-east-1:$ACC:alarm:imageguard-get-images-errors",
       "arn:aws:cloudwatch:us-east-1:$ACC:alarm:imageguard-process-image-throttles",
       "arn:aws:cloudwatch:us-east-1:$ACC:alarm:imageguard-dlq-not-empty",
       "arn:aws:cloudwatch:us-east-1:$ACC:alarm:imageguard-alert-publish-failed",
       "arn:aws:cloudwatch:us-east-1:$ACC:alarm:imageguard-api-5xx"]}}
  ]
}
EOF
python3 -m json.tool /tmp/dashboard.json >/dev/null
aws cloudwatch put-dashboard --dashboard-name imageguard --dashboard-body file:///tmp/dashboard.json --query DashboardValidationMessages
echo "OK dashboard imageguard"

echo "=== Trang thai alarm ==="
sleep 10
aws cloudwatch describe-alarms --alarm-name-prefix imageguard --query 'MetricAlarms[].[AlarmName,StateValue]' --output table
echo "Dashboard: https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards/dashboard/imageguard"
