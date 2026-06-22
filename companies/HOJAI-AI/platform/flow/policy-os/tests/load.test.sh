#!/bin/bash
# PolicyOS - Load Test
#
# Verifies the service can handle sustained concurrent traffic.
# Uses a temporary "loadtest" policy and a mix of:
#   - Concurrent policy evaluations (the hot path)
#   - Policy lookups
#   - Health checks
#   - Light creation/deletion
#
# Run with:
#   bash tests/load.test.sh [duration_seconds] [concurrency]
#
# Defaults: 30 seconds, 10 concurrent workers.

set -u

BASE_URL="${BASE_URL:-http://localhost:4254}"
DURATION="${1:-30}"
CONCURRENCY="${2:-10}"
TMPDIR="${TMPDIR:-/tmp}"

# Check if service is up
if ! curl -s --max-time 1 -o /dev/null "${BASE_URL}/health" 2>/dev/null; then
  echo "  SKIP  Service not running at ${BASE_URL}"
  exit 0
fi

# Create a loadtest policy that always allows (to test the happy path)
LOAD_POLICY_ID="pol-loadtest-$$"
LOAD_POLICY_BODY=$(jq -n \
  --arg id "$LOAD_POLICY_ID" \
  '{
    id: $id,
    name: "Load Test Policy",
    category: "security",
    priority: 1,
    rules: [{ if: {}, then: { allow: true, action: "loadtest_allow" } }],
    exceptions: [],
    approvals: { strategy: "single", requiredApprovers: [] },
    owner: "u-admin",
    status: "published"
  }')

curl -s -X POST -H "Content-Type: application/json" -d "$LOAD_POLICY_BODY" "${BASE_URL}/api/policies" > /dev/null

# Verify it was created
HEALTH=$(curl -s "${BASE_URL}/api/policies/${LOAD_POLICY_ID}" | jq -r '.id // empty' 2>/dev/null)
if [ "$HEALTH" != "$LOAD_POLICY_ID" ]; then
  echo "  FAIL  Could not create loadtest policy"
  exit 1
fi

echo "============================================"
echo "  PolicyOS - Load Test"
echo "  Duration: ${DURATION}s, Concurrency: ${CONCURRENCY}"
echo "  Target: $BASE_URL"
echo "============================================"

# Counters (file-based to avoid subshell issues with global vars)
COUNTER_DIR="${TMPDIR}/loadtest-$$"
mkdir -p "$COUNTER_DIR"
echo 0 > "$COUNTER_DIR/total"
echo 0 > "$COUNTER_DIR/success"
echo 0 > "$COUNTER_DIR/fail"
echo 0 > "$COUNTER_DIR/latency_sum_ms"

# Worker function — one job does a random mix of requests
worker() {
  local worker_id="$1"
  local end_time=$(( $(date +%s) + DURATION ))
  local local_total=0
  local local_success=0
  local local_fail=0
  local local_latency_sum=0

  while [ $(date +%s) -lt $end_time ]; do
    # Pick a random endpoint to hit
    local r=$((RANDOM % 4))
    local start=$(python3 -c 'import time; print(int(time.time()*1000))')
    local code=0
    case $r in
      0)  # policy.evaluate (hot path)
        code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
          -d "{\"policyId\":\"${LOAD_POLICY_ID}\",\"context\":{\"action\":\"test\",\"amount\":$((RANDOM % 1000))}}" \
          "${BASE_URL}/api/policies/evaluate")
        ;;
      1)  # policy list
        code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/policies")
        ;;
      2)  # health check
        code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/health")
        ;;
      3)  # specific policy lookup
        code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/policies/${LOAD_POLICY_ID}")
        ;;
    esac
    local end=$(python3 -c 'import time; print(int(time.time()*1000))')
    local latency=$((end - start))
    local_total=$((local_total + 1))
    local_latency_sum=$((local_latency_sum + latency))
    if [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
      local_success=$((local_success + 1))
    else
      local_fail=$((local_fail + 1))
    fi
  done

  # Persist worker results
  echo "$local_total" > "$COUNTER_DIR/w${worker_id}_total"
  echo "$local_success" > "$COUNTER_DIR/w${worker_id}_success"
  echo "$local_fail" > "$COUNTER_DIR/w${worker_id}_fail"
  echo "$local_latency_sum" > "$COUNTER_DIR/w${worker_id}_latency"
}

echo ""
echo "Starting $CONCURRENCY workers for ${DURATION}s..."
START_TIME=$(date +%s)

# Spawn workers in background
for i in $(seq 1 $CONCURRENCY); do
  worker "$i" &
done

# Wait for all workers
wait
END_TIME=$(date +%s)
ACTUAL_DURATION=$((END_TIME - START_TIME))

# Aggregate results
TOTAL=0
SUCCESS=0
FAIL=0
LATENCY_SUM=0
for i in $(seq 1 $CONCURRENCY); do
  t=$(cat "$COUNTER_DIR/w${i}_total" 2>/dev/null || echo 0)
  s=$(cat "$COUNTER_DIR/w${i}_success" 2>/dev/null || echo 0)
  f=$(cat "$COUNTER_DIR/w${i}_fail" 2>/dev/null || echo 0)
  l=$(cat "$COUNTER_DIR/w${i}_latency" 2>/dev/null || echo 0)
  TOTAL=$((TOTAL + t))
  SUCCESS=$((SUCCESS + s))
  FAIL=$((FAIL + f))
  LATENCY_SUM=$((LATENCY_SUM + l))
done

# Compute stats
RPS=$((TOTAL / (ACTUAL_DURATION > 0 ? ACTUAL_DURATION : 1)))
AVG_LATENCY=$((LATENCY_SUM / (TOTAL > 0 ? TOTAL : 1)))
SUCCESS_PCT=$(awk -v s="$SUCCESS" -v t="$TOTAL" 'BEGIN { if (t > 0) printf "%.1f", (s*100.0/t); else print "0.0" }')

echo ""
echo "=== Results ==="
echo "  Duration:         ${ACTUAL_DURATION}s"
echo "  Total requests:   $TOTAL"
echo "  Successful:       $SUCCESS (${SUCCESS_PCT}%)"
echo "  Failed:           $FAIL"
echo "  Requests/sec:     $RPS"
echo "  Avg latency:      ${AVG_LATENCY}ms"
echo ""

# Pass/fail thresholds
#   - success rate >= 99%
#   - avg latency < 500ms
#   - rps >= 5 (very conservative; this is a bash+curl test, not a real load
#     framework, so single-digit RPS is the realistic floor. For real load
#     testing, use k6, wrk, or autocannon.)
PASS=0
FAIL_C=0
if awk -v v="$SUCCESS_PCT" 'BEGIN { exit (v >= 99.0 ? 0 : 1) }'; then
  echo "  PASS  success rate >= 99% (${SUCCESS_PCT}%)"
  PASS=$((PASS+1))
else
  echo "  FAIL  success rate < 99% (${SUCCESS_PCT}%)"
  FAIL_C=$((FAIL_C+1))
fi
if [ "$AVG_LATENCY" -lt 500 ]; then
  echo "  PASS  avg latency < 500ms (${AVG_LATENCY}ms)"
  PASS=$((PASS+1))
else
  echo "  FAIL  avg latency >= 500ms (${AVG_LATENCY}ms)"
  FAIL_C=$((FAIL_C+1))
fi
if [ "$RPS" -ge 5 ]; then
  echo "  PASS  rps >= 5 ($RPS)"
  PASS=$((PASS+1))
else
  echo "  FAIL  rps < 5 ($RPS)"
  FAIL_C=$((FAIL_C+1))
fi

# Cleanup
rm -rf "$COUNTER_DIR"
curl -s -X DELETE "${BASE_URL}/api/policies/${LOAD_POLICY_ID}?hard=true" > /dev/null

echo ""
echo "============================================"
echo "  Results: $PASS/3 passed, $FAIL_C failed"
echo "============================================"
[ "$FAIL_C" -eq 0 ]
