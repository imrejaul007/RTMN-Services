#!/bin/bash
set -e
PORT=${PORT:-4188}
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

echo "=== agent-builder smoke ==="
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/health); check "GET /health" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/); check "GET /" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/templates); check "GET /api/templates" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/blueprints); check "GET /api/blueprints" $code

TID=$(curl -s $BASE/api/templates | python3 -c "import sys,json; print(json.load(sys.stdin)['templates'][0]['id'])")
BID=$(curl -s $BASE/api/blueprints | python3 -c "import sys,json; print(json.load(sys.stdin)['blueprints'][0]['id'])")

code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/templates/$TID); check "GET /api/templates/:id" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/blueprints/$BID); check "GET /api/blueprints/:id" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/blueprints/$BID/validate); check "POST /api/blueprints/:id/validate" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/blueprints/$BID/publish); check "POST /api/blueprints/:id/publish" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/blueprints/$BID/versions); check "GET /api/blueprints/:id/versions" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"format":"json"}' $BASE/api/blueprints/$BID/export); check "POST /api/blueprints/:id/export" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"name\":\"smoke-bot\"}" $BASE/api/templates/$TID/instantiate); check "POST /api/templates/:id/instantiate" $code

# Invalid graph should fail
RES=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{"name":"bad","nodes":[],"edges":[]}' $BASE/api/blueprints)
CODE=$(echo "$RES" | tail -1)
[ "$CODE" = "400" ] && { echo "  ✓ invalid graph rejected"; PASS=$((PASS+1)); } || { echo "  ✗ should reject"; FAIL=$((FAIL+1)); }

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1