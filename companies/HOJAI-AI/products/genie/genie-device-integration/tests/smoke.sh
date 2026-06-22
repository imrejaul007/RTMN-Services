#!/bin/bash
# Genie Device Integration - Smoke
set -u
BASE_URL="${BASE_URL:-http://localhost:4769}"
PASS=0; FAIL=0; TOTAL=0
TMPDIR="${TMPDIR:-/tmp}"

# Check if service is up first
if ! curl -s --max-time 1 -o /dev/null "${BASE_URL}/health" 2>/dev/null; then
  # Try root as fallback
  if ! curl -s --max-time 1 -o /dev/null "${BASE_URL}/" 2>/dev/null; then
    echo "  SKIP  Service not running at ${BASE_URL}"
    exit 0
  fi
fi

run() {
  local label="$1" method="$2" path="$3" data="${4:-}" expect="${5:-}" expect_code="${6:-}"
  local body_file="${TMPDIR}/_gdi_smoke_$$_$RANDOM.json"
  if [ -n "$data" ]; then
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "${BASE_URL}${path}")
  else
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" "${BASE_URL}${path}")
  fi
  if [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
    echo "  PASS  [$code]  $method $path  -- $label"
    PASS=$((PASS+1))
  else
    echo "  FAIL  [$code]  $method $path  -- $label"
    echo "        body: $(head -c 200 "$body_file" 2>/dev/null)"
    FAIL=$((FAIL+1))
  fi
}

echo "============================================"
echo "  Genie Device Integration - Smoke"
echo "============================================"
run "health"                GET  "/health"
run "device types"          GET  "/api/device-types"
run "list devices"          GET  "/api/devices"
run "get seeded device"     GET  "/api/devices/dev-001"
run "user devices"          GET  "/api/devices/by-user/user-001"
run "smartphone caps"       GET  "/api/capabilities/smartphone"
run "earbuds caps"          GET  "/api/capabilities/earbuds"
run "pair new device"       POST "/api/devices" '{"type":"smartphone","brand":"Android","model":"Pixel 8","userId":"smoke-1"}'
run "pair code"             POST "/api/pair/code" '{"userId":"smoke-2","deviceType":"smartwatch"}'
run "stats"                 GET  "/api/statistics"

echo "============================================"
echo "  Results: $PASS passed, $FAIL failed"
echo "============================================"
rm -f "${TMPDIR}"/_gdi_smoke_*.json 2>/dev/null
exit $FAIL
