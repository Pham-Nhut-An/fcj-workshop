#!/bin/bash
# ImageGuard batch test: tai anh tu Wikimedia Commons, day qua pipeline that, in bang ket qua
T=imageguard-images; B=imageguard-images-125022369745; U=test-batch-01
UA="ImageGuardTest/1.0 (student workshop test; https://pham-nhut-an.github.io/fcj-workshop/)"
mkdir -p ~/imgtest && cd ~/imgtest && rm -f *.jpg ids.txt
while IFS='|' read -r group expect q; do
  url=$(curl -s -A "$UA" -G "https://commons.wikimedia.org/w/api.php" \
    --data-urlencode "action=query" --data-urlencode "generator=search" --data-urlencode "gsrnamespace=6" \
    --data-urlencode "gsrsearch=$q filetype:bitmap" --data-urlencode "gsrlimit=8" --data-urlencode "prop=imageinfo" \
    --data-urlencode "iiprop=url|mime" --data-urlencode "iiurlwidth=800" --data-urlencode "format=json" \
  | python3 -c "import sys,json;p=json.load(sys.stdin).get('query',{}).get('pages',{});r=[v for v in sorted(p.values(),key=lambda x:x.get('index',99)) if v['imageinfo'][0]['mime']=='image/jpeg'];print(r[0]['imageinfo'][0]['thumburl'] if r else '')")
  [ -z "$url" ] && { echo "SKIP $q"; continue; }
  id=$(python3 -c "import uuid;print(uuid.uuid4())")
  curl -s -L -A "$UA" -o "$id.jpg" "$url" || continue
  python3 -c "import sys;sys.exit(open(sys.argv[1],'rb').read(3)!=b'\xff\xd8\xff')" "$id.jpg" || { echo "NOTJPEG $q"; continue; }
  aws dynamodb put-item --table-name $T --item "{\"userId\":{\"S\":\"$U\"},\"imageId\":{\"S\":\"$id\"},\"status\":{\"S\":\"PENDING\"},\"createdAt\":{\"S\":\"$(date -u +%FT%TZ)\"}}"
  aws s3 cp "$id.jpg" "s3://$B/uploads/$U/$id.jpg" --content-type image/jpeg --only-show-errors
  echo "$id|$group|$expect|$q|$url" >> ids.txt
  sleep 1
done <<'LIST'
Thuong|APPROVED|laptop computer desk
Thuong|APPROVED|bicycle street
Thuong|APPROVED|pizza food
Thuong|APPROVED|cat sitting
Ruou bia|APPROVED|beer bottle glass
Thuoc la|REJECTED|man smoking cigarette
Vu khi|REJECTED|pistol handgun
Vu khi|REJECTED|assault rifle soldier
De nham|?|toy water gun
De nham|?|halloween fake blood makeup
LIST
echo "Waiting 15s..."; sleep 15
printf "%-9s %-9s %-9s %-30s %s\n" NHOM MONG_DOI KET_QUA TRUY_VAN "NHAN / DANH_MUC"
while IFS='|' read -r id group expect q url; do
  aws dynamodb get-item --table-name $T --key "{\"userId\":{\"S\":\"$U\"},\"imageId\":{\"S\":\"$id\"}}" --output json \
  | python3 -c "
import sys,json;i=json.load(sys.stdin).get('Item',{})
s=i.get('status',{}).get('S','?');lb=[x['M']['name']['S'] for x in i.get('labels',{}).get('L',[])];ml=[x['M']['name']['S'] for x in i.get('moderationLabels',{}).get('L',[])];bl=[x['S'] for x in i.get('blockedCategories',{}).get('L',[])]
print('%-9s %-9s %-9s %-30s %s'%('$group','$expect',s,'$q'[:30],(', '.join(bl)+' | '+', '.join(ml[:3])) if bl else (', '.join(lb[:5])+((' | mod: '+', '.join(ml[:2])) if ml else ''))))"
done < ids.txt
