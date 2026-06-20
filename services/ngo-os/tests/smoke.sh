#!/bin/bash
set -e
PORT=${PORT:-5274}
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

echo "=== ngo-os smoke ==="
for ep in /health / /api/orgs /api/programs /api/beneficiaries /api/donations /api/volunteers /api/campaigns /api/grants /api/impact /api/stats; do
  code=$(curl -s -o /dev/null -w "%{http_code}" $BASE$ep); check "GET $ep" $code
done

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{"name":"smoke org"}' $BASE/api/orgs); check "POST /api/orgs" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
