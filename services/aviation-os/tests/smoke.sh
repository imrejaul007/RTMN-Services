#!/bin/bash
set -e
PORT=${PORT:-5273}
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

echo "=== aviation-os smoke ==="
for ep in /health / /api/aircraft /api/flights /api/bookings /api/passengers /api/crews /api/maintenance /api/airports; do
  code=$(curl -s -o /dev/null -w "%{http_code}" $BASE$ep); check "GET $ep" $code
done

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{"name":"Smoke Pax","email":"p@example.com"}' $BASE/api/passengers); check "POST /api/passengers" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
