#!/bin/bash
set -e
PORT=${PORT:-4187}
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

echo "=== agent-sdk smoke ==="
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/health); check "GET /health" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/); check "GET /" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/sdks); check "GET /api/sdks" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/releases); check "GET /api/releases" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/downloads); check "GET /api/downloads" $code

SID=$(curl -s $BASE/api/sdks | python3 -c "import sys,json; print(json.load(sys.stdin)['sdks'][0]['id'])")
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/sdks/$SID); check "GET /api/sdks/:id" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/sdks/$SID/files); check "GET /api/sdks/:id/files" $code

# Fetch a source file
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/files?path=typescript/src/client.ts"); check "GET /api/files (TS)" $code
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/files?path=python/hojai_agent/__init__.py"); check "GET /api/files (Python)" $code

# Path traversal blocked
RES=$(curl -s -w "\n%{http_code}" "$BASE/api/files?path=../../../etc/passwd")
CODE=$(echo "$RES" | tail -1)
[ "$CODE" = "404" ] && { echo "  ✓ path traversal blocked"; PASS=$((PASS+1)); } || { echo "  ✗ traversal: $CODE"; FAIL=$((FAIL+1)); }

# Record a download
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"sdk_id\":\"$SID\"}" $BASE/api/downloads); check "POST /api/downloads" $code

# Publish a release
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"sdk_id\":\"$SID\",\"version\":\"1.1.0\",\"changelog\":\"new feature\"}" $BASE/api/releases); check "POST /api/releases" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1