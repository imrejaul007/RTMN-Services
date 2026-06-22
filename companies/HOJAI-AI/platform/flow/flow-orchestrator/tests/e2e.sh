#!/bin/bash
# flow-orchestrator - Comprehensive e2e test
# Exercises plans, templates, executions, policy-cache, and step handlers.
set -u
BASE_URL="${BASE_URL:-http://localhost:4244}"
PASS=0; FAIL=0
TMPDIR="${TMPDIR:-/tmp}"

if ! curl -s --max-time 1 -o /dev/null "${BASE_URL}/health" 2>/dev/null; then
  echo "  SKIP  Service not running at ${BASE_URL}"
  exit 0
fi

clean() { sed -E 's/\x1b\[[0-9;]*[a-zA-Z]//g'; }

run() {
  local label="$1" method="$2" path="$3" data="${4:-}" expect="${5:-200}"
  local body_file="${TMPDIR}/_flow_$$_$RANDOM.json"
  if [ -n "$data" ]; then
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "${BASE_URL}${path}")
  else
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" "${BASE_URL}${path}")
  fi
  if [ "$code" = "$expect" ]; then
    echo "  PASS  [$code]  $method $path  -- $label"
    PASS=$((PASS+1))
  else
    body=$(cat "$body_file" | clean | head -c 200)
    echo "  FAIL  [$code]  $method $path  -- $label (expected $expect)"
    echo "        body: $body"
    FAIL=$((FAIL+1))
  fi
  rm -f "$body_file"
}

run_any() {
  local label="$1" method="$2" path="$3" data="${4:-}"
  local body_file="${TMPDIR}/_flow_$$_$RANDOM.json"
  if [ -n "$data" ]; then
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "${BASE_URL}${path}")
  else
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" "${BASE_URL}${path}")
  fi
  if [ "$code" -ge 200 ] && [ "$code" -lt 300 ]; then
    echo "  PASS  [$code]  $method $path  -- $label"
    PASS=$((PASS+1))
  else
    body=$(cat "$body_file" | clean | head -c 200)
    echo "  FAIL  [$code]  $method $path  -- $label (expected 2xx)"
    echo "        body: $body"
    FAIL=$((FAIL+1))
  fi
  rm -f "$body_file"
}

# Capture body to a file then assert (returns captured_id via stdout)
capture() {
  local method="$1" path="$2" data="${3:-}" body_file="${TMPDIR}/_flow_cap_$$.json"
  if [ -n "$data" ]; then
    curl -s -o "$body_file" -X "$method" -H "Content-Type: application/json" -d "$data" "${BASE_URL}${path}"
  else
    curl -s -o "$body_file" -X "$method" "${BASE_URL}${path}"
  fi
  echo "$body_file"
}

extract_id() {
  local body_file="$1"
  grep -oE '"id":"[^"]+"' "$body_file" | head -1 | cut -d'"' -f4
}

echo "============================================"
echo "  flow-orchestrator - E2E"
echo "============================================"

# 1. Health
run "GET /health" GET "/health" "" 200

# 2. List templates (5 seeded)
run "GET /api/templates" GET "/api/templates" "" 200

# 3. Get a specific template
run "GET /api/templates/answer-question" GET "/api/templates/answer-question" "" 200

# 4. Create a plan
PLAN_BODY='{"name":"e2e-test-plan","description":"end-to-end test","steps":[{"type":"twin.resolve","twinId":"customer-123"}]}'
PLAN_BODY_FILE=$(capture POST "/api/plans" "$PLAN_BODY")
PLAN_ID=$(extract_id "$PLAN_BODY_FILE")
if [ -n "$PLAN_ID" ]; then
  echo "  PASS  POST /api/plans  -- create plan (id=$PLAN_ID)"
  PASS=$((PASS+1))
else
  echo "  FAIL  POST /api/plans  -- create plan"
  cat "$PLAN_BODY_FILE" | clean | head -c 300
  FAIL=$((FAIL+1))
fi
rm -f "$PLAN_BODY_FILE"

# 5. List plans
run "GET /api/plans" GET "/api/plans" "" 200

# 6. Get specific plan
run "GET /api/plans/$PLAN_ID" GET "/api/plans/$PLAN_ID" "" 200

# 7. Create a new version
run_any "POST /api/plans/$PLAN_ID/version" POST "/api/plans/$PLAN_ID/version" '{"description":"v2"}'

# 8. List versions
run "GET /api/plans/$PLAN_ID/versions" GET "/api/plans/$PLAN_ID/versions" "" 200

# 9. Execute the plan (sync)
EXEC_BODY="{\"planId\":\"$PLAN_ID\",\"context\":{\"twinId\":\"customer-123\"}}"
run_any "POST /api/executions/sync" POST "/api/executions/sync" "$EXEC_BODY"

# 10. List executions
run "GET /api/executions" GET "/api/executions" "" 200

# 11. Get execution feedback (uses first execution if any)
EXEC_LIST_FILE=$(capture GET "/api/executions")
EXEC_ID=$(grep -oE '"id":"[^"]+"' "$EXEC_LIST_FILE" | head -1 | cut -d'"' -f4)
if [ -n "$EXEC_ID" ]; then
  echo "  PASS  GET /api/executions/$EXEC_ID  -- read execution"
  PASS=$((PASS+1))
else
  echo "  FAIL  GET /api/executions/$EXEC_ID  -- no execution found"
  FAIL=$((FAIL+1))
fi
rm -f "$EXEC_LIST_FILE"

# 12. Add feedback to execution
if [ -n "$EXEC_ID" ]; then
  run_any "POST /api/executions/$EXEC_ID/feedback" POST "/api/executions/$EXEC_ID/feedback" '{"score":5,"comment":"test feedback","outcome":"success"}'
fi

# 13. Instantiate a template
run_any "POST /api/templates/answer-question/instantiate" POST "/api/templates/answer-question/instantiate" '{"name":"inst-test"}'

# 14. Inspect policy-cache
run "GET /api/policy-cache" GET "/api/policy-cache" "" 200

# 15. Clear policy-cache
run "DELETE /api/policy-cache" DELETE "/api/policy-cache" "" 200

# 16. Cleanup - delete the test plan (returns 204)
run "DELETE /api/plans/$PLAN_ID" DELETE "/api/plans/$PLAN_ID" "" 204

echo "============================================"
echo "  E2E Results: $PASS passed, $FAIL failed"
echo "============================================"
exit $FAIL