#!/bin/bash
# Trust Intelligence - Smoke Tests (12+ GET checks)
# Usage: bash tests/smoke.sh
set -u

BASE_URL="${BASE_URL:-http://localhost:4882}"
PASS=0
FAIL=0
TOTAL=0
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
  local body_file="${TMPDIR}/_TAL}.json"

  TOTAL=$((TOTAL+1))
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
    echo "        body: $(head -c 300 "$body_file" 2>/dev/null)"
    FAIL=$((FAIL+1))
  fi
}

echo "============================================"
echo "  Trust Intelligence - Smoke Tests"
echo "  Target: $BASE_URL"
echo "============================================"

# 1
run "health check"                GET  "/health"
# 2
run "list trust levels"           GET  "/api/trust/levels"
# 3
run "analytics distribution"      GET  "/api/analytics/distribution"
# 4
run "analytics leaderboard"       GET  "/api/analytics/leaderboard"
# 5
run "top trusted agents"          GET  "/api/agents/top-trusted"
# 6
run "get a-genie trust score"     GET  "/api/agents/a-genie/trust/score"
# 7
run "get a-genie trust history"   GET  "/api/agents/a-genie/trust/history"
# 8
run "get a-genie reputation"      GET  "/api/agents/a-genie/reputation"
# 9
run "get a-genie risk"            GET  "/api/agents/a-genie/risk"
# 10
run "get a-genie trust graph"     GET  "/api/agents/a-genie/trust-graph"
# 11
run "get a-sutar confidence"      GET  "/api/agents/a-sutar/confidence"
# 12
run "get a-new-bot trust decay"   GET  "/api/agents/a-new-bot/trust/decay"
# 13
run "POST trust score for a-new"  POST "/api/agents/a-new/trust/score" '{"source":"observation","score":78,"context":"smoke test"}'
# 14
run "GET transitive trust"        GET  "/api/agents/a-genie/trust-transitive/a-copilot"

echo "============================================"
echo "  Results: $PASS/$TOTAL passed, $FAIL failed"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
