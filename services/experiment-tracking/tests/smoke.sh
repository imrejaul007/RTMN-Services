#!/bin/bash
set -e
PORT=${PORT:-4781}
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

echo "=== experiment-tracking smoke tests ==="
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/health); check "GET /health" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/); check "GET /" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/projects); check "GET /api/projects" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/experiments); check "GET /api/experiments" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/runs); check "GET /api/runs" $code

PID=$(curl -s $BASE/api/projects | python3 -c "import sys,json; print(json.load(sys.stdin)['projects'][0]['id'])")
EID=$(curl -s $BASE/api/experiments | python3 -c "import sys,json; print(json.load(sys.stdin)['experiments'][0]['id'])")
RID=$(curl -s $BASE/api/runs | python3 -c "import sys,json; print(json.load(sys.stdin)['runs'][0]['id'])")

code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/runs/$RID); check "GET /api/runs/:id" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/runs/$RID/metrics); check "GET /api/runs/:id/metrics" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/runs/$RID/artifacts); check "GET /api/runs/:id/artifacts" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"name":"loss","value":0.42,"step":10}' $BASE/api/runs/$RID/log); check "POST /api/runs/:id/log" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/runs/$RID/finish); check "POST /api/runs/:id/finish" $code

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"name":"smoke","description":"x"}' $BASE/api/projects); check "POST /api/projects" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"project_id\":\"$PID\",\"name\":\"smoke\"}" $BASE/api/experiments); check "POST /api/experiments" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"experiment_id\":\"$EID\",\"name\":\"smoke-run\"}" $BASE/api/runs); check "POST /api/runs" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"name\":\"model.bin\",\"type\":\"model\",\"size_bytes\":1024}" $BASE/api/runs/$RID/artifacts); check "POST /api/runs/:id/artifacts" $code

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"run_ids\":[\"$RID\"],\"metric\":\"loss\"}" $BASE/api/compare); check "POST /api/compare" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1