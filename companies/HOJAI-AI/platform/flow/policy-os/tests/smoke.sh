#!/bin/bash
# PolicyOS - Smoke Tests (12+ GET checks)
# Usage: bash tests/smoke.sh
set -u

BASE_URL="${BASE_URL:-http://localhost:4254}"
PASS=0
FAIL=0
TOTAL=0

# Use /tmp for body capture (macOS-compatible)
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
echo "  PolicyOS - Smoke Tests"
echo "  Target: $BASE_URL"
echo "============================================"

# 1
run "service root"            GET  "/"
# 2
run "health check"            GET  "/health"
# 3
run "list policies"           GET  "/api/policies"
# 4
run "list roles"              GET  "/api/roles"
# 5
run "list users"              GET  "/api/users"
# 6
run "audit log"               GET  "/api/audit"
# 7
run "policy registry"         GET  "/api/policies/registry"
# 8
run "list approvals"          GET  "/api/approvals"
# 9
run "get seeded policy"       GET  "/api/policies/pol-shopping-budget"
# 10
run "get role admin"          GET  "/api/roles/admin"
# 11
run "get user roles"          GET  "/api/users/u-admin/roles"
# 12
run "create policy (POST)"    POST "/api/policies" '{"name":"smoke-test-policy","category":"security","rules":[{"if":{},"then":{"allow":true,"action":"smoke"}}]}'

echo "============================================"
echo "  Results: $PASS/$TOTAL passed, $FAIL failed"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
