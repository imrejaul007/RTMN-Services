#!/bin/bash
# customer-twin - Auto-generated smoke tests
set -u
BASE_URL="${BASE_URL:-http://localhost:4895}"
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
  local body_file="${TMPDIR}/_customer_twin_$$_$RANDOM.json"
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
echo "  customer-twin - Smoke"
echo "============================================"

run "auto GET /health" GET "/health" "" "" "200"
run "auto GET /api/twins/customers" GET "/api/twins/customers" "" "" "200"
run "auto GET /api/twins/customer/test-id" GET "/api/twins/customer/test-id" "" "" "200"
run "auto POST /api/twins/customer" POST "/api/twins/customer" '{"test":true}' "" "201"
run "auto PUT /api/twins/customer/test-id/be" PUT "/api/twins/customer/test-id/behavior" '{"test":true}' "" "200"
run "auto POST /api/twins/customer/test-id/ev" POST "/api/twins/customer/test-id/event" '{"test":true}' "" "201"
run "auto PUT /api/twins/customer/test-id/se" PUT "/api/twins/customer/test-id/segment" '{"test":true}' "" "200"
run "auto GET /api/segments" GET "/api/segments" "" "" "200"
run "auto GET /api/twins/customer/test-id/lt" GET "/api/twins/customer/test-id/ltv" "" "" "200"
run "auto GET /api/twins/customer/test-id/ch" GET "/api/twins/customer/test-id/churn" "" "" "200"
run "auto GET /api/analytics/customers" GET "/api/analytics/customers" "" "" "200"
run "auto POST /api/twins/customer/test-id/fa" POST "/api/twins/customer/test-id/family" '{"test":true}' "" "201"

echo "============================================"
echo "  Smoke Results: $PASS passed, $FAIL failed"
echo "============================================"
exit $FAIL
