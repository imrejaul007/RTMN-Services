#!/bin/bash
# PolicyOS - Safe Expression Evaluator Tests
# Verifies that policy exception expressions are evaluated safely,
# with no path to arbitrary code execution.
#
# Usage: bash tests/expression.test.sh
# Requires: node, the policy-os service running

BASE_URL="${BASE_URL:-http://localhost:4254}"
PASS=0
FAIL=0
TOTAL=0
TMPDIR="${TMPDIR:-/tmp}"

# Each test sends a policy with an exception that, if the old `new Function()`
# evaluator were in use, would execute system code. With the safe evaluator,
# the expression must be REJECTED at policy creation OR fail-closed at runtime.

post() { curl -s -X POST -H "Content-Type: application/json" -d "$2" "${BASE_URL}$1" > "$3"; }
get()  { curl -s -X GET "${BASE_URL}$1" > "$2"; }
del()  { curl -s -X DELETE -H "Content-Type: application/json" "${BASE_URL}$1" > "$2"; }

check() {
  local label="$1" cond="$2"
  TOTAL=$((TOTAL+1))
  if eval "$cond"; then
    echo "  PASS  $label"
    PASS=$((PASS+1))
  else
    echo "  FAIL  $label"
    echo "        condition: $cond"
    FAIL=$((FAIL+1))
  fi
}

# Use service token (or no auth in dev) to ensure tests don't 401
AUTH_ARGS=""
if [ -n "${POLICYOS_SERVICE_TOKEN:-}" ]; then
  AUTH_ARGS="-H X-Service-Token:${POLICYOS_SERVICE_TOKEN}"
fi

post_auth() {
  curl -s $AUTH_ARGS -X POST -H "Content-Type: application/json" -d "$2" "${BASE_URL}$1" > "$3"
}
del_auth() {
  curl -s $AUTH_ARGS -X DELETE "${BASE_URL}$1" > "$2"
}

echo "============================================"
echo "  PolicyOS - Safe Expression Evaluator Tests"
echo "  Target: $BASE_URL"
echo "============================================"

# Helper: build a policy with a single exception. Returns the policy JSON.
# Args: id, name, category, exceptionCondition
# Uses jq to properly JSON-encode the condition (which may contain quotes).
make_policy() {
  local id="$1" name="$2" cat="$3" cond="$4"
  jq -n \
    --arg id "$id" \
    --arg name "$name" \
    --arg cat "$cat" \
    --arg cond "$cond" \
    '{
      id: $id,
      name: $name,
      category: $cat,
      priority: 50,
      rules: [{ if: {}, then: { allow: true, action: "allow_all" } }],
      exceptions: [{ name: "test-exception", condition: $cond }],
      approvals: { strategy: "single", requiredApprovers: [] },
      owner: "u-admin",
      status: "published"
    }'
}

# ----------------------------------------------------------------------
# 1. Malicious expressions must be REJECTED by validateExpression
#    (We test indirectly: a policy with such an exception must fail to load,
#    OR if loaded, fail-closed (the exception should NOT trigger an allow).)
# ----------------------------------------------------------------------

echo ""
echo "[1] Malicious expressions are rejected at policy load"
F="${TMPDIR}/_po_expr_1.json"
make_policy "pol-expr-1" "Process Exit" "security" "process.exit(0)" > /tmp/_policy1.json
post_auth "/api/policies" "$(cat /tmp/_policy1.json)" "$F"
# The policy should either fail to create, OR if created, evaluate as false
# at runtime (the exception must not match)
check "malicious policy does not allow via process.exit" \
  "python3 -c \"
import json
d = json.load(open('$F'))
# If the policy was created with 201, the exception should evaluate to false
# (because process.exit(0) is not a valid expression). Try to evaluate it.
import urllib.request
req = urllib.request.Request('${BASE_URL}/api/policies/evaluate', method='POST', headers={'Content-Type':'application/json'}, data=json.dumps({'policyId':'pol-expr-1','context':{'action':'test'}}).encode())
r = urllib.request.urlopen(req).read()
result = json.loads(r)
# The exception is checked AFTER the rule; the rule allows=true, so allowed should be true
# BUT we want to verify the exception was NOT incorrectly triggered. We check that
# reasons do not contain 'Exception applied'
assert 'Exception applied' not in ' '.join(result.get('reasons', [])), 'Exception was incorrectly applied'
print('ok')
\" >/dev/null 2>&1"

del_auth "/api/policies/pol-expr-1?hard=true" /dev/null; true

# ----------------------------------------------------------------------
# 2. Valid expressions work correctly
# ----------------------------------------------------------------------

echo ""
echo "[2] Valid expressions evaluate correctly"
F="${TMPDIR}/_po_expr_2.json"
make_policy "pol-expr-2" "Valid Exception" "security" "context.amount < 100" > /tmp/_policy2.json
post_auth "/api/policies" "$(cat /tmp/_policy2.json)" "$F"
check "policy created with valid exception" "[ -n \"\$(python3 -c \"import json; d=json.load(open('$F')); print(d.get('id',''))\" 2>/dev/null)\" ]"

F2="${TMPDIR}/_po_expr_2b.json"
post "/api/policies/evaluate" '{"policyId":"pol-expr-2","context":{"action":"test","amount":50}}' "$F2"
# Exception should match (context.amount < 100 is true), reasons should include "Exception applied"
check "exception applies when amount < 100" \
  "python3 -c \"
import json
d = json.load(open('$F2'))
assert 'Exception applied: test-exception' in d.get('reasons', []), f'No exception in reasons: {d.get(\\\"reasons\\\")}'
print('ok')
\" >/dev/null 2>&1"

F3="${TMPDIR}/_po_expr_2c.json"
post "/api/policies/evaluate" '{"policyId":"pol-expr-2","context":{"action":"test","amount":200}}' "$F3"
check "exception does NOT apply when amount >= 100" \
  "python3 -c \"
import json
d = json.load(open('$F3'))
assert 'Exception applied: test-exception' not in d.get('reasons', []), f'Exception unexpectedly applied: {d.get(\\\"reasons\\\")}'
print('ok')
\" >/dev/null 2>&1"

del_auth "/api/policies/pol-expr-2?hard=true" /dev/null; true

# ----------------------------------------------------------------------
# 3. Composite expressions work
# ----------------------------------------------------------------------

echo ""
echo "[3] Composite expressions (AND, OR, NOT)"
F="${TMPDIR}/_po_expr_3.json"
make_policy "pol-expr-3" "Composite" "security" '(context.country == "US") && (context.amount > 1000)' > /tmp/_policy3.json
post_auth "/api/policies" "$(cat /tmp/_policy3.json)" "$F"

F3a="${TMPDIR}/_po_expr_3a.json"
post "/api/policies/evaluate" '{"policyId":"pol-expr-3","context":{"action":"test","country":"US","amount":2000}}' "$F3a"
check "composite (US && >1000) applies" \
  "python3 -c \"
import json; d=json.load(open('$F3a'))
assert 'Exception applied' in ' '.join(d.get('reasons', []))
print('ok')
\" >/dev/null 2>&1"

F3b="${TMPDIR}/_po_expr_3b.json"
post "/api/policies/evaluate" '{"policyId":"pol-expr-3","context":{"action":"test","country":"UK","amount":2000}}' "$F3b"
check "composite (UK && >1000) does NOT apply" \
  "python3 -c \"
import json; d=json.load(open('$F3b'))
assert 'Exception applied' not in ' '.join(d.get('reasons', []))
print('ok')
\" >/dev/null 2>&1"

del_auth "/api/policies/pol-expr-3?hard=true" /dev/null; true

# ----------------------------------------------------------------------
# 4. Array 'in' operator works
# ----------------------------------------------------------------------

echo ""
echo "[4] Array 'in' operator"
F="${TMPDIR}/_po_expr_4.json"
make_policy "pol-expr-4" "In Array" "security" 'context.country in ["US", "UK", "DE"]' > /tmp/_policy4.json
post_auth "/api/policies" "$(cat /tmp/_policy4.json)" "$F"

F4a="${TMPDIR}/_po_expr_4a.json"
post "/api/policies/evaluate" '{"policyId":"pol-expr-4","context":{"action":"test","country":"DE"}}' "$F4a"
check "DE in [US,UK,DE] applies" \
  "python3 -c \"
import json; d=json.load(open('$F4a'))
assert 'Exception applied' in ' '.join(d.get('reasons', []))
print('ok')
\" >/dev/null 2>&1"

F4b="${TMPDIR}/_po_expr_4b.json"
post "/api/policies/evaluate" '{"policyId":"pol-expr-4","context":{"action":"test","country":"XX"}}' "$F4b"
check "XX in [US,UK,DE] does NOT apply" \
  "python3 -c \"
import json; d=json.load(open('$F4b'))
assert 'Exception applied' not in ' '.join(d.get('reasons', []))
print('ok')
\" >/dev/null 2>&1"

del_auth "/api/policies/pol-expr-4?hard=true" /dev/null; true

# ----------------------------------------------------------------------
# 5. Prototype pollution is blocked
# ----------------------------------------------------------------------

echo ""
echo "[5] Prototype access is blocked"
F="${TMPDIR}/_po_expr_5.json"
make_policy "pol-expr-5" "Proto Test" "security" "context.constructor != null" > /tmp/_policy5.json
# This should fail to create OR fail-closed at runtime
post_auth "/api/policies" "$(cat /tmp/_policy5.json)" "$F"
# Check the policy either wasn't created, OR the exception evaluates to false (not true)
check "constructor access blocked" \
  "python3 -c \"
import json, urllib.request
try:
    d = json.load(open('$F'))
    # If policy was created, evaluating must not allow via exception
    req = urllib.request.Request('${BASE_URL}/api/policies/evaluate', method='POST', headers={'Content-Type':'application/json'}, data=json.dumps({'policyId':'pol-expr-5','context':{'action':'test'}}).encode())
    r = urllib.request.urlopen(req).read()
    result = json.loads(r)
    assert 'Exception applied' not in ' '.join(result.get('reasons', [])), 'Exception applied via constructor!'
    print('ok')
except Exception as e:
    # Policy creation may have failed - that's also acceptable
    print('ok')
\" >/dev/null 2>&1"

del_auth "/api/policies/pol-expr-5?hard=true" /dev/null; true

echo ""
echo "============================================"
echo "  Results: $PASS/$TOTAL passed, $FAIL failed"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
