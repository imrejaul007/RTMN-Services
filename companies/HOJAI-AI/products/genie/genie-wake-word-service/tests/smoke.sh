#!/bin/bash
# Genie Wake Word Service - Smoke Tests
set -u
BASE_URL="${BASE_URL:-http://localhost:4767}"
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
  local body_file="${TMPDIR}/_gww_smoke_$$_$RANDOM.json"
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
echo "  Genie Wake Word - Smoke Tests"
echo "  Target: $BASE_URL"
echo "============================================"
run "service health"        GET  "/health"
run "list wake words"       GET  "/api/wake-words"
run "list models"           GET  "/api/models"
run "list detections"       GET  "/api/detections"
run "get sensitivity"       GET  "/api/sensitivity"
run "get statistics"        GET  "/api/statistics"
run "list clients"          GET  "/api/clients"
run "detect (positive)"     POST "/api/detect" '{"text":"hey genie please","language":"english"}'
run "detect (negative)"     POST "/api/detect" '{"text":"hello there","language":"english"}'
run "batch detect"          POST "/api/detect/batch" '{"items":[{"text":"hey genie","language":"english"},{"text":"hello","language":"english"}]}'
run "start listen"          POST "/api/listen/start" '{"clientId":"smoke-1","language":"english"}'
run "stop listen"           POST "/api/listen/stop" '{"clientId":"smoke-1"}'
run "submit feedback"       POST "/api/feedback" '{"type":"false_positive","note":"smoke test"}'
run "list feedback"         GET  "/api/feedback"

echo "============================================"
echo "  Results: $PASS passed, $FAIL failed (of $TOTAL)"
echo "============================================"
rm -f "${TMPDIR}"/_gww_smoke_*.json 2>/dev/null
exit $FAIL
