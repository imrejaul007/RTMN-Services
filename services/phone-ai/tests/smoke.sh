#!/bin/bash
set -e
PORT=${PORT:-4869}
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

echo "=== phone-ai smoke ==="
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/health); check "GET /health" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/); check "GET /" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/agents); check "GET /api/agents" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/numbers); check "GET /api/numbers" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/calls); check "GET /api/calls" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/ivrs); check "GET /api/ivrs" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/transcripts); check "GET /api/transcripts" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/recordings); check "GET /api/recordings" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/analytics); check "GET /api/analytics" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/analytics/today); check "GET /api/analytics/today" $code

# Create agent + number
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{"name":"smoke-agent","persona":"smoke test agent"}' $BASE/api/agents); check "POST /api/agents" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
