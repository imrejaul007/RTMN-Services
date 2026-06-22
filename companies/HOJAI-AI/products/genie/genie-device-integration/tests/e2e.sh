#!/bin/bash
# Genie Device Integration - E2E
set -u
BASE_URL="${BASE_URL:-http://localhost:4769}"
PASS=0; FAIL=0; TOTAL=0
TMPDIR="${TMPDIR:-/tmp}"

run() {
  local label="$1" method="$2" path="$3" data="${4:-}" expect="${5:-}"
  TOTAL=$((TOTAL+1))
  local body_file="${TMPDIR}/_gdi_e2e_${TOTAL}.json"
  if [ -n "$data" ]; then
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "${BASE_URL}${path}")
  else
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" "${BASE_URL}${path}")
  fi
  local body=$(cat "$body_file" 2>/dev/null)
  if [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
    if [ -z "$expect" ] || [[ "$body" == *"$expect"* ]]; then
      echo "  PASS  [$code]  $method $path  -- $label"
      PASS=$((PASS+1))
    else
      echo "  FAIL  [$code]  $method $path  -- $label (expected '$expect')"
      FAIL=$((FAIL+1))
    fi
  else
    echo "  FAIL  [$code]  $method $path  -- $label"
    FAIL=$((FAIL+1))
  fi
}

echo "============================================"
echo "  Genie Device Integration - E2E"
echo "============================================"

echo "--- Pair new device ---"
run "pair smartphone"       POST "/api/devices" '{"type":"smartphone","brand":"iOS","model":"iPhone 16","userId":"e2e-1"}' "iPhone 16"
# Extract id by skipping the first "id" field (which is the seeded one) - use a known user marker
DEVICE_ID=$(cat "${TMPDIR}/_gdi_e2e_1.json" 2>/dev/null | tr ',' '\n' | grep '"id":"dev-' | head -1 | sed 's/.*"id":"dev-//;s/"//')
echo "  Paired device: dev-$DEVICE_ID"

echo "--- Handoff session ---"
run "handoff to new device" POST "/api/devices/dev-${DEVICE_ID}/handoff" '{"fromDeviceId":"dev-001","sessionId":"sess-e2e"}' "completed"

echo "--- Pairing code flow ---"
run "generate pair code"    POST "/api/pair/code" '{"userId":"e2e-2","deviceType":"earbuds"}' ""
PAIR_CODE=$(cat "${TMPDIR}/_gdi_e2e_3.json" 2>/dev/null | grep -oE '"code":"[A-Z0-9]+"' | head -1 | sed 's/"code":"//;s/"//')
echo "  Pairing code: $PAIR_CODE"
run "redeem pair code"      POST "/api/pair/redeem" "{\"code\":\"$PAIR_CODE\",\"brand\":\"Sony\"}" "Sony"

echo "--- Unpair ---"
run "unpair device"         DELETE "/api/devices/dev-${DEVICE_ID}" "" "deleted"

echo "============================================"
echo "  E2E Results: $PASS passed, $FAIL failed (of $TOTAL)"
echo "============================================"
rm -f "${TMPDIR}"/_gdi_e2e_*.json 2>/dev/null
exit $FAIL
