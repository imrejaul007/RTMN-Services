#!/bin/bash
set -e
PORT=${PORT:-4189}
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

echo "=== agent-studio smoke ==="
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/health); check "GET /health" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/); check "GET /" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/sessions); check "GET /api/sessions" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/replays); check "GET /api/replays" $code

SID=$(curl -s $BASE/api/sessions | python3 -c "import sys,json; print(json.load(sys.stdin)['sessions'][0]['id'])")
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/sessions/$SID); check "GET /api/sessions/:id" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/sessions/$SID/traces); check "GET /api/sessions/:id/traces" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/sessions/$SID/breakpoints); check "GET /api/sessions/:id/breakpoints" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/sessions/$SID/end); check "POST /api/sessions/:id/end" $code

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"agent_id":"smoke-agent"}' $BASE/api/sessions); check "POST /api/sessions" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"step_name":"smoke-step","step_type":"llm","input":{"q":"x"},"output":{"a":"y"},"tokens":10,"duration_ms":100}' $BASE/api/sessions/$SID/traces); check "POST traces" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"condition":"step.tokens > 100"}' $BASE/api/sessions/$SID/breakpoints); check "POST breakpoints" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/sessions/$SID/replay); check "POST replay" $code

TID=$(curl -s $BASE/api/sessions/$SID/traces | python3 -c "import sys,json; print(json.load(sys.stdin)['traces'][0]['id'])")
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"author":"x","text":"y"}' $BASE/api/traces/$TID/comments); check "POST comments" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/traces/$TID/comments); check "GET comments" $code

BPID=$(curl -s $BASE/api/sessions/$SID/breakpoints | python3 -c "import sys,json; print(json.load(sys.stdin)['breakpoints'][0]['id'])")
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/breakpoints/$BPID/toggle); check "POST breakpoint toggle" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1