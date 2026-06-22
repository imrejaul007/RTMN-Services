#!/bin/bash
# PolicyOS - Webhook + Analytics Tests
# Verifies the Phase 4 additions: webhook CRUD, delivery, analytics counters.
# Usage: bash tests/webhook-analytics.test.sh
set -u

BASE_URL="${BASE_URL:-http://localhost:4254}"
PASS=0
FAIL=0
TOTAL=0
TMPDIR="${TMPDIR:-/tmp}"

# Pick up the service token from the latest log line
LOG="${LOG:-/tmp/policy-os-phase4.log}"
SERVICE_TOKEN=$(grep "Service token" "$LOG" 2>/dev/null | head -1 | awk '{print $NF}')
if [ -z "$SERVICE_TOKEN" ]; then
  echo "FATAL: cannot find service token in $LOG — start policy-os with: PORT=4254 node src/index.js > $LOG 2>&1 &"
  exit 1
fi
AUTH=( -H "X-Service-Token: $SERVICE_TOKEN" )

run() {
  local label="$1" method="$2" path="$3" data="${4:-}" expect_code="${5:-200}"
  local body_file="${TMPDIR}/_wa_$$_$TOTAL.json"
  TOTAL=$((TOTAL+1))
  if [ -n "$data" ]; then
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" "${AUTH[@]}" -H "Content-Type: application/json" -d "$data" "${BASE_URL}${path}")
  else
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" "${AUTH[@]}" "${BASE_URL}${path}")
  fi
  if [ "$code" = "$expect_code" ]; then
    echo "  PASS  [$code]  $method $path  -- $label"
    PASS=$((PASS+1))
  else
    echo "  FAIL  [$code]  $method $path  -- $label (expected $expect_code)"
    echo "        body: $(head -c 300 "$body_file" 2>/dev/null)"
    FAIL=$((FAIL+1))
  fi
  cat "$body_file" 2>/dev/null
  echo ""
}

run_get() {
  local label="$1" path="$2" expect_code="${3:-200}"
  run "$label" "GET" "$path" "" "$expect_code" > /dev/null
  local body_file="${TMPDIR}/_wa_$$_$((TOTAL-1)).json"
  echo "        body: $(head -c 200 "$body_file" 2>/dev/null)"
}

echo "============================================"
echo "  PolicyOS - Webhook + Analytics Tests"
echo "  Target: $BASE_URL"
echo "============================================"

# --- Webhooks CRUD ---
echo ""
echo "[ Webhooks ]"

echo "  -> Create webhook"
WH_RESP=$(curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d '{"url":"http://127.0.0.1:65500/hook","events":["policy.created","policy.evaluated"]}' \
  "${BASE_URL}/api/webhooks")
echo "    $WH_RESP" | head -c 200
WH_ID=$(echo "$WH_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('webhook',{}).get('id',''))" 2>/dev/null)
if [ -n "$WH_ID" ]; then
  echo "  PASS  create webhook -> $WH_ID"
  PASS=$((PASS+1))
else
  echo "  FAIL  create webhook"
  FAIL=$((FAIL+1))
fi
TOTAL=$((TOTAL+1))

echo "  -> List webhooks"
run "list webhooks" "GET" "/api/webhooks" "" "200" > /dev/null

echo "  -> Get webhook by id"
run "get webhook" "GET" "/api/webhooks/$WH_ID" "" "200" > /dev/null

echo "  -> Test webhook delivery (expected: connection refused, status=failed)"
run "test webhook" "POST" "/api/webhooks/$WH_ID/test" "" "200" > /dev/null

echo "  -> Create webhook with bad payload (expected 400)"
run "bad webhook" "POST" "/api/webhooks" '{"events":["x.created"]}' "400" > /dev/null

# --- Analytics ---
echo ""
echo "[ Analytics ]"

echo "  -> Overview"
run "overview" "GET" "/api/analytics/overview" "" "200" > /dev/null

echo "  -> Top policies"
run "top policies" "GET" "/api/analytics/policies" "" "200" > /dev/null

echo "  -> Denial reasons"
run "denial reasons" "GET" "/api/analytics/denial-reasons" "" "200" > /dev/null

echo "  -> Timeseries"
run "timeseries" "GET" "/api/analytics/timeseries?days=7" "" "200" > /dev/null

echo "  -> Per-policy metrics (non-existent)"
run "per-policy 404" "GET" "/api/analytics/policies/does-not-exist" "" "404" > /dev/null

# Trigger a few evaluations so metrics have content
echo "  -> Run 3 evaluations to populate metrics"
for i in 1 2 3; do
  curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
    -d "{\"action\":\"read\",\"context\":{\"actor\":\"u-test-$i\"}}" \
    "${BASE_URL}/api/policies/evaluate" > /dev/null
done
sleep 1

echo "  -> Overview after 3 evals"
run "overview" "GET" "/api/analytics/overview" "" "200" > /dev/null

# --- Cleanup ---
echo ""
echo "[ Cleanup ]"
run "delete webhook" "DELETE" "/api/webhooks/$WH_ID" "" "200" > /dev/null

# Final delete the test policy
curl -s -X DELETE "${AUTH[@]}" "${BASE_URL}/api/policies/webhook-test?hard=true" > /dev/null 2>&1

echo ""
echo "============================================"
echo "  Result: $PASS / $TOTAL passed, $FAIL failed"
echo "============================================"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
