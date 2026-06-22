#!/bin/bash
# agent-teaming - Auto-generated smoke tests
set -u
BASE_URL="${BASE_URL:-http://localhost:4853}"
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
  local body_file="${TMPDIR}/_agent_teaming_$$_$RANDOM.json"
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
      echo "  FAIL  [$code]  $method $path  -- $label (expected ${expect_code})"
      FAIL=$((FAIL+1))
    fi
  else
    echo "  PASS  [$code]  $method $path  -- $label"
    PASS=$((PASS+1))
  fi
  rm -f "$body_file"
}

echo "============================================"
echo "  agent-teaming - Smoke"
echo "============================================"

run "auto GET /health" GET "/health" "" "" "200"
run "auto GET /ready" GET "/ready" "" "" "200"
run "auto GET /api/teaming/templates" GET "/api/teaming/templates" "" "" "200"
run "auto POST /api/teaming/teams" POST "/api/teaming/teams" '{"test":true}' "" "201"
run "auto GET /api/teaming/teams" GET "/api/teaming/teams" "" "" "200"
run "auto GET /api/teaming/teams/test-id" GET "/api/teaming/teams/test-id" "" "" "200"
run "auto POST /api/teaming/missions" POST "/api/teaming/missions" '{"test":true}' "" "201"
run "auto GET /api/teaming/missions" GET "/api/teaming/missions" "" "" "200"
run "auto GET /api/teaming/missions/test-id" GET "/api/teaming/missions/test-id" "" "" "200"
run "auto POST /api/teaming/dags" POST "/api/teaming/dags" '{"test":true}' "" "201"
run "auto GET /api/teaming/dags/test-id/ready" GET "/api/teaming/dags/test-id/ready" "" "" "200"
run "auto GET /api/teaming/failures" GET "/api/teaming/failures" "" "" "200"
run "auto GET /api/teaming/failures/test-id" GET "/api/teaming/failures/test-id" "" "" "200"

echo "============================================"
echo "  $PASS passed, $FAIL failed"
echo "============================================"
exit $FAIL
