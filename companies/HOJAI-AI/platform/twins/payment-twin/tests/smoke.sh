#!/bin/bash
# payment-twin - Auto-generated smoke tests
set -u
BASE_URL="${BASE_URL:-http://localhost:4886}"
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
  local body_file="${TMPDIR}/_payment_twin_$$_$RANDOM.json"
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
echo "  payment-twin - Smoke"
echo "============================================"

run "auto GET /health" GET "/health" "" "" "200"
run "auto GET /api/twins/payments" GET "/api/twins/payments" "" "" "200"
run "auto GET /api/twins/payment/test-id" GET "/api/twins/payment/test-id" "" "" "200"
run "auto POST /api/twins/payment/test-id/cap" POST "/api/twins/payment/test-id/capture" '{"test":true}' "" "201"
run "auto POST /api/twins/payment/test-id/can" POST "/api/twins/payment/test-id/cancel" '{"test":true}' "" "201"
run "auto POST /api/twins/payment/test-id/ref" POST "/api/twins/payment/test-id/refund" '{"test":true}' "" "201"
run "auto GET /api/twins/chargebacks" GET "/api/twins/chargebacks" "" "" "200"
run "auto POST /api/twins/chargeback" POST "/api/twins/chargeback" '{"test":true}' "" "201"
run "auto PUT /api/twins/chargeback/test-id/" PUT "/api/twins/chargeback/test-id/evidence" '{"test":true}' "" "200"
run "auto PUT /api/twins/chargeback/test-id/" PUT "/api/twins/chargeback/test-id/resolve" '{"test":true}' "" "200"
run "auto GET /api/twins/payouts" GET "/api/twins/payouts" "" "" "200"
run "auto POST /api/twins/payout" POST "/api/twins/payout" '{"test":true}' "" "201"

echo "============================================"
echo "  Smoke Results: $PASS passed, $FAIL failed"
echo "============================================"
exit $FAIL
