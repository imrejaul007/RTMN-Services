#!/bin/bash
# intent-bus - Auto-generated smoke tests
set -u
BASE_URL="${BASE_URL:-http://localhost:4154}"
PASS=0; FAIL=0
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
  local body_file="${TMPDIR}/_intent_bus_$$_$RANDOM.json"
  if [ -n "$data" ]; then
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "${BASE_URL}${path}")
  else
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" "${BASE_URL}${path}")
  fi
  local body=$(cat "$body_file" 2>/dev/null)
  if [ -n "$expect_code" ]; then
    if [ "$expect_code" = "any" ]; then
      echo "  PASS  [$code]  $method $path  -- $label (any)"
      PASS=$((PASS+1))
    elif [[ "$expect_code" == "4xx" && "$code" -ge 400 && "$code" -lt 500 ]] || [[ "$expect_code" == "5xx" && "$code" -ge 500 && "$code" -lt 600 ]] || [ "$code" = "$expect_code" ]; then
      echo "  PASS  [$code]  $method $path  -- $label"
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
  rm -f "$body_file"
}

echo "============================================"
echo "  intent-bus - Smoke"
echo "============================================"

run "auto GET /health" GET "/health" "" "" "200"
run "auto POST /api/intents/publish" POST "/api/intents/publish" '{"test":true}' "" "201"
run "auto GET /api/intents" GET "/api/intents" "" "" "200"
run "auto GET /api/intents/test-id" GET "/api/intents/test-id" "" "" "200"
run "auto POST /api/intents/test-id/claim" POST "/api/intents/test-id/claim" '{"test":true}' "" "201"
run "auto POST /api/intents/test-id/resolve" POST "/api/intents/test-id/resolve" '{"test":true}' "" "201"
run "auto POST /api/intents/test-id/cancel" POST "/api/intents/test-id/cancel" '{"test":true}' "" "201"
run "auto POST /api/subscriptions" POST "/api/subscriptions" '{"test":true}' "" "201"
run "auto DELETE /api/subscriptions/test-id" DELETE "/api/subscriptions/test-id" "" "" "200"
run "auto GET /api/subscriptions/test-id/pol" GET "/api/subscriptions/test-id/poll" "" "" "200"
run "auto GET /api/topics" GET "/api/topics" "" "" "200"
run "auto GET /api/stats" GET "/api/stats" "" "" "200"

echo "============================================"
echo "  Smoke Results: $PASS passed, $FAIL failed"
echo "============================================"
exit $FAIL
