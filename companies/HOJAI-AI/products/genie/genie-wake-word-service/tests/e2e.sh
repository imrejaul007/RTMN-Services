#!/bin/bash
# Genie Wake Word Service - E2E Tests
set -u
BASE_URL="${BASE_URL:-http://localhost:4767}"
PASS=0; FAIL=0; TOTAL=0
TMPDIR="${TMPDIR:-/tmp}"

run() {
  local label="$1" method="$2" path="$3" data="${4:-}" expect="${5:-}" expect_code="${6:-}"
  TOTAL=$((TOTAL+1))
  local body_file="${TMPDIR}/_gww_e2e_${TOTAL}.json"
  if [ -n "$data" ]; then
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "${BASE_URL}${path}")
  else
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" "${BASE_URL}${path}")
  fi
  local body=$(cat "$body_file" 2>/dev/null)
  if [ -n "$expect_code" ]; then
    if [[ "$expect_code" == "4xx" && "$code" -ge 400 && "$code" -lt 500 ]] || [[ "$expect_code" == "5xx" && "$code" -ge 500 && "$code" -lt 600 ]] || [ "$code" = "$expect_code" ]; then
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
      echo "        body: $(head -c 200 "$body_file" 2>/dev/null)"
      FAIL=$((FAIL+1))
    fi
  else
    echo "  FAIL  [$code]  $method $path  -- $label"
    FAIL=$((FAIL+1))
  fi
}

echo "============================================"
echo "  Genie Wake Word - E2E Tests"
echo "============================================"

# 1. Train a custom model
echo "--- Custom model training ---"
run "train custom model"     POST "/api/models/train" '{"name":"smoke-custom","language":"english","phrases":["yo genie","hey g"]}' ""
MODEL_ID=$(cat "${TMPDIR}/_gww_e2e_1.json" 2>/dev/null | grep -oE '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
echo "  Trained model: $MODEL_ID"

# 2. Update sensitivity
echo "--- Sensitivity tuning ---"
run "set sensitivity"        POST "/api/sensitivity" '{"language":"english","value":0.85}' "english"
run "verify sensitivity"     GET  "/api/sensitivity" "" "0.85"

# 3. Listen session lifecycle
echo "--- Listen session ---"
run "start listen session"  POST "/api/listen/start" '{"clientId":"e2e-session","language":"hindi"}' "e2e-session"
run "stop listen session"   POST "/api/listen/stop" '{"clientId":"e2e-session"}' "stopped"

# 4. Multi-language detection
echo "--- Multi-language detection ---"
run "detect english"        POST "/api/detect" '{"text":"hey genie what is the weather","language":"english"}' "detected"
run "detect hindi"          POST "/api/detect" '{"text":"हे जिनी मौसम बताओ","language":"hindi"}' "detected"
run "detect spanish"        POST "/api/detect" '{"text":"oye genie","language":"spanish"}' "detected"

# 5. Feedback loop
echo "--- Feedback loop ---"
run "false positive report" POST "/api/feedback" '{"type":"false_positive","note":"e2e test"}' "false_positive"
run "list feedback"         GET  "/api/feedback" "" "false_positive"

# 6. Statistics reflect activity
echo "--- Statistics ---"
run "get statistics"        GET  "/api/statistics" "" "totalDetections"

echo "============================================"
echo "  E2E Results: $PASS passed, $FAIL failed (of $TOTAL)"
echo "============================================"
rm -f "${TMPDIR}"/_gww_e2e_*.json 2>/dev/null
exit $FAIL
