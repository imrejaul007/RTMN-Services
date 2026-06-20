#!/bin/bash
set -e
PORT=${PORT:-5276}
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

echo "=== realestate-os-product smoke ==="
for ep in /health / /api/properties /api/listings /api/agents /api/showings /api/buyers /api/offers /api/contracts /api/closings; do
  code=$(curl -s -o /dev/null -w "%{http_code}" $BASE$ep); check "GET $ep" $code
done

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{"address":"100 Test St","city":"Test"}' $BASE/api/properties); check "POST /api/properties" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
