#!/bin/bash
# predictive-intelligence - e2e tests (port 4754)
set -u
BASE_URL="${BASE_URL:-http://localhost:4754}"
PASS=0; FAIL=0
TMPDIR="${TMPDIR:-/tmp}"

if ! curl -s --max-time 1 -o /dev/null "${BASE_URL}/api/health" 2>/dev/null; then
  echo "  SKIP  Service not running at ${BASE_URL}"
  exit 0
fi

run() {
  local label="$1" method="$2" path="$3" data="${4:-}" expect="${5:-}" expect_code="${6:-}"
  local body_file="${TMPDIR}/_predict_e2e_$$_$RANDOM.json"
  if [ -n "$data" ]; then
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "${BASE_URL}${path}")
  else
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" "${BASE_URL}${path}")
  fi
  local body=$(cat "$body_file" 2>/dev/null)
  if [ -n "$expect_code" ]; then
    if [ "$code" = "$expect_code" ]; then
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
echo "  predictive-intelligence - e2e (port 4754)"
echo "============================================"

run "GET /api/health" GET "/api/health" "" "" "200"
run "GET /api/methods" GET "/api/methods" "" "" "200"
run "GET /api/forecasts" GET "/api/forecasts" "" "" "200"
run "GET /api/stats" GET "/api/stats" "" "" "200"
run "GET /api/audit" GET "/api/audit" "" "" "200"

# Create a forecast via the API
SERIES='[{"t":"2026-01-01","v":100},{"t":"2026-01-02","v":102},{"t":"2026-01-03","v":104},{"t":"2026-01-04","v":106},{"t":"2026-01-05","v":108}]'
run "POST /api/forecast" POST "/api/forecast" "{\"series\":$SERIES,\"method\":\"moving-average\",\"horizon\":3}" "" "201"

# Anomaly detection
run "POST /api/anomaly/detect" POST "/api/anomaly/detect" "{\"series\":$SERIES,\"threshold\":3}" "" "200"

# Trend
run "POST /api/trend" POST "/api/trend" "{\"series\":$SERIES}" "" "200"

# Demand
run "POST /api/demand/predict" POST "/api/demand/predict" "{\"historicalDemand\":$SERIES,\"leadTimeDays\":7,\"currentStock\":100}" "" "200"

# Evaluate
run "POST /api/evaluate" POST "/api/evaluate" "{\"series\":$SERIES,\"method\":\"moving-average\",\"testSplit\":0.2}" "" "200"

# 404
run "GET /api/no-such-route (404)" GET "/api/no-such-route" "" "" "404"

echo "============================================"
echo "  e2e Results: $PASS passed, $FAIL failed"
echo "============================================"
exit $FAIL
