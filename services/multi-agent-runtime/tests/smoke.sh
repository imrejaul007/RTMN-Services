#!/bin/bash
set -e
PORT=${PORT:-4190}
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

echo "=== multi-agent-runtime smoke ==="
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/health); check "GET /health" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/); check "GET /" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/patterns); check "GET /api/patterns" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/collaborations); check "GET /api/collaborations" $code

PID=$(curl -s $BASE/api/patterns | python3 -c "import sys,json; print([p['id'] for p in json.load(sys.stdin)['patterns'] if p['name']=='sequential'][0])")
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/patterns/$PID); check "GET /api/patterns/:id" $code

# Create collab
RES=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"pattern_id\":\"$PID\",\"agents\":[{\"role\":\"a\"},{\"role\":\"b\"}]}" $BASE/api/collaborations)
CID=$(echo $RES | python3 -c "import sys,json; print(json.load(sys.stdin)['collaboration']['id'])")
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/collaborations/$CID); check "GET /api/collaborations/:id" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"input":{"q":"x"}}' $BASE/api/collaborations/$CID/run); check "POST /api/collaborations/:id/run" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/collaborations/$CID/messages); check "GET messages" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/collaborations/$CID/instances); check "GET instances" $code

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"name":"smoke","type":"parallel","definition":{}}' $BASE/api/patterns); check "POST /api/patterns" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"from_agent":"a","to_agent":"b","content":"hi"}' $BASE/api/collaborations/$CID/messages); check "POST messages" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1