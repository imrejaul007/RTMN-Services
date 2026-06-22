#!/bin/bash
# Smoke test for mtls-jwt-bridge (4779)
set -e
PORT=${PORT:-4779}
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

echo "=== mtls-jwt-bridge smoke tests ==="

code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/health); check "GET /health" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/); check "GET /" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/services); check "GET /api/services" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/revocations); check "GET /api/revocations" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/rotations); check "GET /api/rotations" $code

# Get first service
SID=$(curl -s $BASE/api/services | python3 -c "import sys,json; print(json.load(sys.stdin)['services'][0]['id'])")
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/services/$SID); check "GET /api/services/:id" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/keys/fingerprint/$SID); check "GET /api/keys/fingerprint/:id" $code

# Issue token
TOKEN_RES=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"service_id\":\"$SID\"}" $BASE/api/tokens/issue)
TOKEN=$(echo $TOKEN_RES | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
JTI=$(echo $TOKEN_RES | python3 -c "import sys,json; print(json.load(sys.stdin)['jti'])")
[ -n "$TOKEN" ] && { echo "  ✓ token issued"; PASS=$((PASS+1)); } || { echo "  ✗ no token"; FAIL=$((FAIL+1)); }

# Verify token
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"token\":\"$TOKEN\"}" $BASE/api/tokens/verify); check "POST /api/tokens/verify" $code

# Rotate key
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/services/$SID/rotate); check "POST /api/services/:id/rotate" $code

# Revoke token
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"reason":"test"}' $BASE/api/tokens/$JTI/revoke); check "POST /api/tokens/:jti/revoke" $code

# Register new service
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"name":"test-svc","scopes":["read:test"]}' $BASE/api/services); check "POST /api/services" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1