#!/bin/bash
# Genie Listening Modes - Smoke Tests
set -u
BASE_URL="${BASE_URL:-http://localhost:4768}"
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
  local body_file="${TMPDIR}/_glm_smoke_$$_$RANDOM.json"
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
echo "  Genie Listening Modes - Smoke"
echo "============================================"
run "health"                GET  "/health"
run "list modes"            GET  "/api/modes"
run "get manual mode"       GET  "/api/modes/manual"
run "get continuous mode"   GET  "/api/modes/continuous"
run "get passive mode"      GET  "/api/modes/passive"
run "get smart mode"        GET  "/api/modes/smart"
run "current mode"          GET  "/api/current"
run "switch to passive"     POST "/api/switch" '{"deviceId":"smoke-1","mode":"passive"}'
run "switch to continuous"  POST "/api/switch" '{"deviceId":"smoke-1","mode":"continuous"}'
run "history"               GET  "/api/history"
run "config manual"         GET  "/api/config/manual"
run "update config"         POST "/api/config" '{"mode":"manual","sensitivity":0.8}'
run "stats"                 GET  "/api/stats"
run "auto suggest"          POST "/api/auto" '{"deviceId":"smoke-1","context":{"time":"evening","location":"home"}}'

echo "============================================"
echo "  Results: $PASS passed, $FAIL failed"
echo "============================================"
rm -f "${TMPDIR}"/_glm_smoke_*.json 2>/dev/null
exit $FAIL
