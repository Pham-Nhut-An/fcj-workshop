#!/bin/bash
# ImageGuard - kiem thu kich ban loi (error cases)
API=https://y0bn5zqopj.execute-api.us-east-1.amazonaws.com
F=imageguard-presign-upload
ev(){ printf '{"requestContext":{"authorizer":{"jwt":{"claims":{"sub":"test-error-01"}}}},"body":%s}' "$1"; }
echo "== E1 contentType=image/png (sai dinh dang)"
aws lambda invoke --function-name $F --cli-binary-format raw-in-base64-out --payload "$(ev '"{\"contentType\":\"image/png\"}"')" /tmp/o1.json >/dev/null; cat /tmp/o1.json; echo
echo "== E2 body khong phai JSON"
aws lambda invoke --function-name $F --cli-binary-format raw-in-base64-out --payload "$(ev '"abc"')" /tmp/o2.json >/dev/null; cat /tmp/o2.json; echo
echo "== E3 khong co JWT sub"
aws lambda invoke --function-name $F --cli-binary-format raw-in-base64-out --payload '{"body":"{\"contentType\":\"image/jpeg\"}"}' /tmp/o3.json >/dev/null; cat /tmp/o3.json; echo
echo "== E4 burst 100 request song song GET /images (khong token)"
seq 100 | xargs -P 50 -I{} curl -s -o /dev/null -w "%{http_code}\n" $API/images | sort | uniq -c
echo "== E5 file khong phai anh doi ten thanh .jpg"
T=imageguard-images; B=imageguard-images-125022369745; U=test-error-01; ID=$(python3 -c "import uuid;print(uuid.uuid4())")
echo "day khong phai anh" > /tmp/fake.jpg
aws dynamodb put-item --table-name $T --item "{\"userId\":{\"S\":\"$U\"},\"imageId\":{\"S\":\"$ID\"},\"status\":{\"S\":\"PENDING\"},\"createdAt\":{\"S\":\"$(date -u +%FT%TZ)\"}}"
aws s3 cp /tmp/fake.jpg s3://$B/uploads/$U/$ID.jpg --content-type image/jpeg --only-show-errors
sleep 12
aws dynamodb get-item --table-name $T --key "{\"userId\":{\"S\":\"$U\"},\"imageId\":{\"S\":\"$ID\"}}" --query 'Item.[status.S,reason.S,errorReason.S]' --output text
aws logs filter-log-events --log-group-name /aws/lambda/imageguard-process-image --start-time $(( ($(date +%s)-60)*1000 )) --filter-pattern "$ID" --query 'events[].message' --output text | cut -c1-300 | tail -3
