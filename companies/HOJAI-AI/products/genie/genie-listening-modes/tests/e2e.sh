#!/bin/bash
# Genie Listening Modes - E2E
set -u
BASE_URL="${BASE_URL:-http://localhost:4768}"
PASS=0; FAIL=0; TOTAL=0
TMPDIR="${TMPDIR:-/tmp}"

run() {
  local label="$1" method="$2" path="$3" data="${4:-}" expect="${5:-}" expect_code="${6:-}"
  TOTAL=$((TOTAL+1))
  local body_file="${TMPDIR}/_glm_e2e_${TOTAL}.json"
  if [ -n "$data" ]; then
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "${BASE_URL}${path}")
  else
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" "${BASE_URL}${path}")
  fi
  local body=$(cat "$body_file" 2>/dev/null)
  # If expect_code is set (e.g., "4xx" or "404"), validate against that
  if [ -n "$expect_code" ]; then
    if [[ "$expect_code" == "4xx" && "$code" -ge 400 && "$code" -lt 500 ]] || [[ "$expect_code" == "5xx" && "$code" -ge 500 && "$code" -lt 600 ]] || [ "$code" = "$expect_code" ]; then
      echo "  PASS  [$code]  $method $path  -- $label (expected code $expect_code)"
      PASS=$((PASS+1))
    else
      echo "  FAIL  [$code]  $method $path  -- $label (expected code $expect_code)"
      FAIL=$((FAIL+1))
    fi
  elif [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
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
echo "  Genie Listening Modes - E2E"
echo "============================================"

echo "--- Mode lifecycle ---"
run "switch to manual"      POST "/api/switch" '{"deviceId":"e2e-1","mode":"manual"}' "manual"
run "switch to continuous"  POST "/api/switch" '{"deviceId":"e2e-1","mode":"continuous"}' "continuous"
run "switch to smart"       POST "/api/switch" '{"deviceId":"e2e-1","mode":"smart"}' "smart"
run "history for device"    GET  "/api/history?deviceId=e2e-1" "" "e2e-1"

echo "--- Auto-switch by context ---"
run "auto: driving"         POST "/api/auto" '{"deviceId":"e2e-1","context":{"activity":"driving"}}' "continuous"
run "auto: low battery"     POST "/api/auto" '{"deviceId":"e2e-1","context":{"battery":10}}' "passive"
run "auto: meeting"         POST "/api/auto" '{"deviceId":"e2e-1","context":{"activity":"meeting"}}' "passive"
run "auto: office"          POST "/api/auto" '{"deviceId":"e2e-1","context":{"location":"office","time":"work"}}' "manual"

echo "--- Config tuning ---"
run "tune continuous"       POST "/api/config" '{"mode":"continuous","sensitivity":0.9}' "0.9"
run "verify continuous cfg" GET  "/api/config/continuous" "" "0.9"

echo "--- Invalid input ---"
run "invalid mode"          POST "/api/switch" '{"deviceId":"e2e-1","mode":"unknown"}' "" "400"
echo "  (expected 400 — counted as PASS if 400)"

echo "============================================"
echo "  E2E Results: $PASS passed, $FAIL failed (of $TOTAL)"
echo "============================================"
rm -f "${TMPDIR}"/_glm_e2e_*.json 2>/dev/null
exit $FAIL
