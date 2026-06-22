#!/bin/bash
# fine-tuning-pipeline - Auto-generated smoke tests
set -u
BASE_URL="${BASE_URL:-http://localhost:4776}"
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
  local body_file="${TMPDIR}/_fine_tuning_pipeline_$$_$RANDOM.json"
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
echo "  fine-tuning-pipeline - Smoke"
echo "============================================"

run "auto GET /health" GET "/health" "" "" "200"
run "auto GET /api/health" GET "/api/health" "" "" "200"
run "auto POST /api/datasets" POST "/api/datasets" '{"test":true}' "" "201"
run "auto GET /api/datasets/test-id" GET "/api/datasets/test-id" "" "" "200"
run "auto POST /api/jobs" POST "/api/jobs" '{"test":true}' "" "201"
run "auto GET /api/jobs/test-id" GET "/api/jobs/test-id" "" "" "200"
run "auto POST /api/jobs/test-id/cancel" POST "/api/jobs/test-id/cancel" '{"test":true}' "" "201"
run "auto GET /api/queue" GET "/api/queue" "" "" "200"
run "auto GET /api/checkpoints" GET "/api/checkpoints" "" "" "200"
run "auto GET /api/checkpoints/test-id" GET "/api/checkpoints/test-id" "" "" "200"
run "auto GET /api/methods" GET "/api/methods" "" "" "200"
run "auto GET /api/base-models" GET "/api/base-models" "" "" "200"

echo "============================================"
echo "  Smoke Results: $PASS passed, $FAIL failed"
echo "============================================"
exit $FAIL
