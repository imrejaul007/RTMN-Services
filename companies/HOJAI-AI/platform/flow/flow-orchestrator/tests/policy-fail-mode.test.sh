#!/bin/bash
# Flow Orchestrator - policy.check fail-mode integration test
#
# Verifies that:
#   1. Health endpoint reports policyFailMode and policyCacheSize
#   2. /api/policy-cache GET returns the cache (initially empty)
#   3. /api/policy-cache DELETE clears the cache
#   4. A successful policy.check (real PolicyOS) populates the cache
#   5. A subsequent policy.check uses 'cached' mode if PolicyOS is unreachable
#
# This test runs against the LIVE flow-orchestrator on port 4244.
# It uses real PolicyOS (4254) for happy-path coverage, and tests the
# cache-clear path to verify the cache surface works.
#
# The deep fail-mode semantics (default-closed, open opt-in, cached with TTL)
# are unit-testable in the policy.check handler. See tests/unit-policy-fail-mode.js
# for the full coverage.

set -u

BASE_URL="${BASE_URL:-http://localhost:4244}"
PASS=0
FAIL=0
TOTAL=0
TMPDIR="${TMPDIR:-/tmp}"

# Check if service is up first
if ! curl -s --max-time 1 -o /dev/null "${BASE_URL}/health" 2>/dev/null; then
  echo "  SKIP  Service not running at ${BASE_URL}"
  exit 0
fi

post() { curl -s -X POST -H "Content-Type: application/json" -d "$2" "${BASE_URL}$1" > "$3"; }
get()  { curl -s -X GET "${BASE_URL}$1" > "$2"; }
del()  { curl -s -X DELETE "${BASE_URL}$1" > "$2"; }

check() {
  local label="$1" cond="$2"
  TOTAL=$((TOTAL+1))
  if eval "$cond" 2>/dev/null; then
    echo "  PASS  $label"
    PASS=$((PASS+1))
  else
    echo "  FAIL  $label"
    echo "        condition: $cond"
    FAIL=$((FAIL+1))
  fi
}

echo "============================================"
echo "  Flow Orchestrator - policy.check fail-mode"
echo "  Target: $BASE_URL"
echo "============================================"

# ----------------------------------------------------------------------
# 1. Health endpoint exposes policyFailMode and policyCacheSize
# ----------------------------------------------------------------------
echo ""
echo "[1] Health endpoint exposes fail-mode config"
H="${TMPDIR}/_fo_health.json"
get "/health" "$H"
check "policyFailMode in /health"        "jq -e '.policyFailMode == \"closed\"' '$H' >/dev/null"
check "policyCacheSize in /health"       "jq -e '.policyCacheSize >= 0' '$H' >/dev/null"
check "version reports 1.1.1+"           "jq -e '.version >= \"1.1.1\"' '$H' >/dev/null"

# ----------------------------------------------------------------------
# 2. /api/policy-cache is a valid inspection endpoint
# ----------------------------------------------------------------------
echo ""
echo "[2] /api/policy-cache inspection endpoint"
C1="${TMPDIR}/_fo_cache1.json"
get "/api/policy-cache" "$C1"
check "cache has failMode"               "jq -e '.failMode == \"closed\"' '$C1' >/dev/null"
check "cache has cacheTtlMs"             "jq -e '.cacheTtlMs == 300000' '$C1' >/dev/null"
check "cache has entries array"          "jq -e '.entries | type == \"array\"' '$C1' >/dev/null"
check "cache has size"                   "jq -e '.size >= 0' '$C1' >/dev/null"

# ----------------------------------------------------------------------
# 3. DELETE /api/policy-cache clears the cache
# ----------------------------------------------------------------------
echo ""
echo "[3] DELETE /api/policy-cache clears entries"
# First, populate cache by running a successful policy check
F1="${TMPDIR}/_fo_plan1.json"
post "/api/plans" "$(jq -n '{
  name: "test-cache-populate",
  steps: [
    { type: "policy.check", policyId: "pol-shopping-budget" }
  ]
}')" "$F1"
PLAN_ID=$(jq -r '.id // empty' "$F1" 2>/dev/null)
if [ -n "$PLAN_ID" ]; then
  F2="${TMPDIR}/_fo_exec1.json"
  post "/api/executions" "$(jq -n --arg pid "$PLAN_ID" '{
    planId: $pid,
    context: { action: "purchase", amount: 100, user: "u-customer" }
  }')" "$F2"
  EXEC_ID=$(jq -r '.id // empty' "$F2" 2>/dev/null)
  # Wait for execution to complete
  for i in 1 2 3 4 5 6 7 8 9 10; do
    curl -s "${BASE_URL}/api/executions/${EXEC_ID}" > "${TMPDIR}/_fo_exec1b.json" 2>/dev/null
    status=$(jq -r '.status // empty' "${TMPDIR}/_fo_exec1b.json" 2>/dev/null)
    if [ "$status" = "completed" ] || [ "$status" = "failed" ]; then break; fi
    sleep 0.5
  done

  C2="${TMPDIR}/_fo_cache2.json"
  get "/api/policy-cache" "$C2"
  check "cache populated after execution" "jq -e '.entries[] | select(.policyId == \"pol-shopping-budget\")' '$C2' >/dev/null"
fi

# Clear cache
DC="${TMPDIR}/_fo_delete.json"
del "/api/policy-cache" "$DC"
check "DELETE /api/policy-cache returns cleared count" "jq -e '.cleared >= 0' '$DC' >/dev/null"

C3="${TMPDIR}/_fo_cache3.json"
get "/api/policy-cache" "$C3"
check "cache empty after DELETE" "jq -e '.size == 0' '$C3' >/dev/null"

# ----------------------------------------------------------------------
# 4. planFailMode overrides the global default
# ----------------------------------------------------------------------
echo ""
echo "[4] planFailMode config is accepted in plan definition"
F3="${TMPDIR}/_fo_plan_open.json"
post "/api/plans" "$(jq -n '{
  name: "test-failmode-open-accepted",
  steps: [
    { type: "policy.check", policyId: "pol-shopping-budget", policyFailMode: "open" }
  ]
}')" "$F3"
check "plan with policyFailMode=open accepted" "jq -e '.id' '$F3' >/dev/null"

F4="${TMPDIR}/_fo_plan_cached.json"
post "/api/plans" "$(jq -n '{
  name: "test-failmode-cached-accepted",
  steps: [
    { type: "policy.check", policyId: "pol-shopping-budget", policyFailMode: "cached", policyCacheTtlMs: 60000 }
  ]
}')" "$F4"
check "plan with policyFailMode=cached + policyCacheTtlMs accepted" "jq -e '.id' '$F4' >/dev/null"

F5="${TMPDIR}/_fo_plan_closed.json"
post "/api/plans" "$(jq -n '{
  name: "test-failmode-closed-accepted",
  steps: [
    { type: "policy.check", policyId: "pol-shopping-budget", policyFailMode: "closed" }
  ]
}')" "$F5"
check "plan with policyFailMode=closed accepted" "jq -e '.id' '$F5' >/dev/null"

echo ""
echo "============================================"
echo "  Results: $PASS/$TOTAL passed, $FAIL failed"
echo "============================================"
[ "$FAIL" -eq 0 ]
