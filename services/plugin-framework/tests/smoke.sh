#!/bin/bash
set -e
PORT=${PORT:-4780}
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

echo "=== plugin-framework smoke tests ==="
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/health); check "GET /health" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/); check "GET /" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/plugins); check "GET /api/plugins" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/hooks); check "GET /api/hooks" $code

PID=$(curl -s $BASE/api/plugins | python3 -c "import sys,json; print(json.load(sys.stdin)['plugins'][0]['id'])")
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/plugins/$PID); check "GET /api/plugins/:id" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/plugins/$PID/hooks); check "GET /api/plugins/:id/hooks" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/plugins/$PID/reviews); check "GET /api/plugins/:id/reviews" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/plugins/$PID/activate); check "POST /api/plugins/:id/activate" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/plugins/$PID/deactivate); check "POST /api/plugins/:id/deactivate" $code

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{"name":"smoke-test","hooks":["pre-request"],"capabilities":["x"]}' $BASE/api/plugins); check "POST /api/plugins" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{"hook_point":"pre-request","input":{"a":1}}' $BASE/api/hooks/fire); check "POST /api/hooks/fire" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d "{\"plugin_id\":\"$PID\",\"code\":\"return {ok: true, value: input.x * 2};\",\"input\":{\"x\":5}}" \
  $BASE/api/plugins/$PID/run-sandboxed); check "POST /api/plugins/:id/run-sandboxed" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d "{\"plugin_id\":\"$PID\",\"rating\":5,\"comment\":\"great\"}" $BASE/api/reviews); check "POST /api/reviews" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1