#!/bin/bash
set -e
PORT=${PORT:-4871}
BASE="http://localhost:$PORT"
PASS=0; FAIL=0

check() {
  local desc=$1; local code=$2
  if [ "$code" = "200" ] || [ "$code" = "201" ]; then
    echo "  ✓ $desc ($code)"; PASS=$((PASS+1))
  else
    echo "  ✗ $desc (expected 200/201, got $code)"; FAIL=$((FAIL+1))
  fi
}

echo "=== federated-learning smoke tests ==="
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/health); check "GET /health" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/); check "GET /" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/jobs); check "GET /api/jobs" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/clients); check "GET /api/clients" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/rounds); check "GET /api/rounds" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/updates); check "GET /api/updates" $code

JID=$(curl -s $BASE/api/jobs | python3 -c "import sys,json; print(json.load(sys.stdin)['jobs'][0]['id'])")
CID=$(curl -s $BASE/api/clients | python3 -c "import sys,json; print(json.load(sys.stdin)['clients'][0]['id'])")

code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/jobs/$JID); check "GET /api/jobs/:id" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/clients/$CID); check "GET /api/clients/:id" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/clients/$CID/heartbeat); check "POST /api/clients/:id/heartbeat" $code

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"name":"smoke","rounds_total":3}' $BASE/api/jobs); check "POST /api/jobs" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"name":"smoke-client"}' $BASE/api/clients); check "POST /api/clients" $code

# Create round + submit updates
RID=$(curl -s -X POST $BASE/api/jobs/$JID/rounds | python3 -c "import sys,json; print(json.load(sys.stdin)['round']['id'])")
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d "{\"job_id\":\"$JID\",\"round_id\":\"$RID\",\"client_id\":\"$CID\",\"gradient\":[0.1,0.2,0.3],\"samples\":100,\"loss\":0.5}" \
  $BASE/api/updates); check "POST /api/updates" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/rounds/$RID/aggregate); check "POST /api/rounds/:id/aggregate" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1