#!/bin/bash
# PolicyOS - End-to-End Workflow Tests
# Usage: bash tests/e2e.sh
set -u

BASE_URL="${BASE_URL:-http://localhost:4254}"
PASS=0
FAIL=0
TOTAL=0
TMPDIR="${TMPDIR:-/tmp}"

# Helpers
post()   { curl -s -X POST -H "Content-Type: application/json" -d "$2" "${BASE_URL}$1" > "$3"; }
get()    { curl -s -X GET "${BASE_URL}$1" > "$2"; }
patch()  { curl -s -X PATCH -H "Content-Type: application/json" -d "$2" "${BASE_URL}$1" > "$3"; }
delete() { curl -s -X DELETE -H "Content-Type: application/json" -d "$2" "${BASE_URL}$1" > "$3"; }

# json_get KEY FILE
json_get() {
  python3 -c "
import json, sys
try:
  data = json.load(open(sys.argv[1]))
  keys = sys.argv[2].split('.')
  cur = data
  for k in keys:
    if isinstance(cur, list):
      cur = cur[int(k)]
    else:
      cur = cur[k]
  if isinstance(cur, (dict, list)):
    print(json.dumps(cur))
  else:
    print(cur)
except Exception as e:
  print('ERR:', e, file=sys.stderr)
  sys.exit(1)
" "$2" "$1"
}

# json_len KEY FILE
json_len() {
  python3 -c "
import json, sys
try:
  data = json.load(open(sys.argv[1]))
  keys = sys.argv[2].split('.')
  cur = data
  for k in keys:
    if isinstance(cur, list):
      cur = cur[int(k)]
    else:
      cur = cur[k]
  if isinstance(cur, list):
    print(len(cur))
  else:
    print(0)
except Exception as e:
  print(0)
" "$2" "$1"
}

check() {
  local label="$1"
  local cond="$2"
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

echo "============================================"
echo "  PolicyOS - E2E Tests"
echo "  Target: $BASE_URL"
echo "============================================"

# Clean up any stale test data from previous runs.
# The e2e test uses fixed ids; without cleanup it would fail on re-runs.
# We use the hard-delete (DELETE with ?hard=true) so the in-memory map
# is actually cleared, not just retired.
for stale_id in pol-e2e-test pol-lifecycle-test; do
  curl -s -X DELETE "${BASE_URL}/api/policies/${stale_id}?hard=true" > /dev/null 2>&1 || true
done

# 1. Create policy
echo ""
echo "[1] Create policy with conditions + rules + approval strategy"
F1="${TMPDIR}/_po_e2e_1.json"
post "/api/policies" '{
  "id": "pol-e2e-test",
  "name": "E2E Test Policy",
  "description": "Workflow test policy",
  "category": "financial",
  "priority": 50,
  "conditions": { "context.action": { "equals": "purchase" } },
  "rules": [
    { "if": { "context.amount": { "lte": 1000 } }, "then": { "allow": true, "action": "auto_allow_small" } },
    { "if": { "context.amount": { "gt": 1000 } }, "then": { "allow": false, "action": "deny_large" } }
  ],
  "approvals": { "strategy": "sequential", "requiredApprovers": ["u-manager", "u-admin"] },
  "owner": "u-admin",
  "status": "published"
}' "$F1"
check "policy created with id pol-e2e-test" "[ \"\$(json_get id $F1)\" = 'pol-e2e-test' ]"
check "policy version is 1"                "[ \"\$(json_get version $F1)\" = '1' ]"

# 2. Evaluate allowed case
echo ""
echo "[2] Evaluate allowed case (amount=500)"
F2="${TMPDIR}/_po_e2e_2.json"
post "/api/policies/evaluate" '{
  "policyId": "pol-e2e-test",
  "context": { "action": "purchase", "amount": 500, "user": { "id": "u-customer", "trustScore": 85 } }
}' "$F2"
check "allowed=true"                "[ \"\$(json_get allowed $F2)\" = 'True' ]"
check "reasons is empty list"       "[ \"\$(json_len reasons $F2)\" = '0' ]"
check "policyUsed=pol-e2e-test"     "[ \"\$(json_get policyUsed $F2)\" = 'pol-e2e-test' ]"

# 3. Evaluate denied case (amount too high)
echo ""
echo "[3] Evaluate denied case (amount=5000)"
F3="${TMPDIR}/_po_e2e_3.json"
post "/api/policies/evaluate" '{
  "policyId": "pol-e2e-test",
  "context": { "action": "purchase", "amount": 5000, "user": { "id": "u-customer", "trustScore": 85 } }
}' "$F3"
check "allowed=false"               "[ \"\$(json_get allowed $F3)\" = 'False' ]"
check "suggestions >= 2"            "[ \"\$(json_len suggestions $F3)\" -ge '2' ]"
check "reasons has at least 1"      "[ \"\$(json_len reasons $F3)\" -ge '1' ]"

# 4. Create approval request
echo ""
echo "[4] Create approval request"
F4="${TMPDIR}/_po_e2e_4.json"
post "/api/approvals" '{
  "policyId": "pol-e2e-test",
  "requesterId": "u-customer",
  "resource": "purchase-12345",
  "amount": 5000,
  "strategy": "sequential"
}' "$F4"
APR_ID=$(json_get id "$F4")
check "approval created with id"    "[ -n \"$APR_ID\" ]"
check "approval status=pending"     "[ \"\$(json_get status $F4)\" = 'pending' ]"
check "strategy=sequential"         "[ \"\$(json_get strategy $F4)\" = 'sequential' ]"

# 5. Sequential approver A approves
echo ""
echo "[5] Sequential approver A (u-manager) approves"
F5="${TMPDIR}/_po_e2e_5.json"
post "/api/approvals/${APR_ID}/decide" '{
  "approverId": "u-manager",
  "decision": "approve",
  "comment": "Looks reasonable"
}' "$F5"
check "still pending after first approve" "[ \"\$(json_get status $F5)\" = 'pending' ]"

# 6. Sequential approver B approves
echo ""
echo "[6] Sequential approver B (u-admin) approves"
F6="${TMPDIR}/_po_e2e_6.json"
post "/api/approvals/${APR_ID}/decide" '{
  "approverId": "u-admin",
  "decision": "approve",
  "comment": "Final approval"
}' "$F6"
check "status=approved after second" "[ \"\$(json_get status $F6)\" = 'approved' ]"
check "timeline has 3 events"        "[ \"\$(json_len timeline $F6)\" -ge '3' ]"

# 7. Re-evaluate after approval - using new policy
echo ""
echo "[7] Create new policy with proper approval conditions and evaluate"
F7A="${TMPDIR}/_po_e2e_7a.json"
post "/api/policies" '{
  "id": "pol-approval-gated",
  "name": "Approval Gated Policy",
  "category": "financial",
  "conditions": { "context.action": { "equals": "purchase" } },
  "rules": [
    { "if": { "context.approved": { "equals": true } }, "then": { "allow": true, "action": "allow_with_approval" } },
    { "if": { "context.amount": { "lte": 1000 } }, "then": { "allow": true, "action": "auto_allow_small" } },
    { "if": {}, "then": { "allow": false, "action": "deny_default" } }
  ],
  "approvals": { "strategy": "single", "requiredApprovers": ["u-admin"] },
  "owner": "u-admin",
  "status": "published"
}' "$F7A"

F7="${TMPDIR}/_po_e2e_7.json"
post "/api/policies/evaluate" '{
  "policyId": "pol-approval-gated",
  "context": { "action": "purchase", "amount": 9999, "approved": true, "user": { "id": "u-customer", "trustScore": 85 } }
}' "$F7"
check "allowed=true with approval flag" "[ \"\$(json_get allowed $F7)\" = 'True' ]"

F7B="${TMPDIR}/_po_e2e_7b.json"
post "/api/policies/evaluate" '{
  "policyId": "pol-approval-gated",
  "context": { "action": "purchase", "amount": 9999, "approved": false, "user": { "id": "u-customer", "trustScore": 85 } }
}' "$F7B"
check "allowed=false without approval"  "[ \"\$(json_get allowed $F7B)\" = 'False' ]"

# 8. RBAC: customer without admin role tries to access admin route
echo ""
echo "[8] RBAC: customer without admin role"
F8A="${TMPDIR}/_po_e2e_8a.json"
post "/api/check/role" '{
  "userId": "u-customer",
  "requiredPermission": "policies:write"
}' "$F8A"
check "customer cannot policies:write"   "[ \"\$(json_get allowed $F8A)\" = 'False' ]"

F8B="${TMPDIR}/_po_e2e_8b.json"
post "/api/check/role" '{
  "userId": "u-admin",
  "requiredPermission": "policies:write"
}' "$F8B"
check "admin can do anything (*)"       "[ \"\$(json_get allowed $F8B)\" = 'True' ]"

F8C="${TMPDIR}/_po_e2e_8c.json"
post "/api/check/role" '{
  "userId": "u-manager",
  "requiredPermission": "policies:write"
}' "$F8C"
check "manager can policies:write"       "[ \"\$(json_get allowed $F8C)\" = 'True' ]"

# 9. ABAC: trust-based access
echo ""
echo "[9] ABAC: trust score checks"
F9A="${TMPDIR}/_po_e2e_9a.json"
post "/api/check/abac" '{
  "userId": "u-low-trust",
  "action": "payment.make",
  "resource": "wallet-001",
  "attributes": { "amount": 100, "userTrust": 25 }
}' "$F9A"
check "trust<50 -> denied"  "[ \"\$(json_get allowed $F9A)\" = 'False' ]"

F9B="${TMPDIR}/_po_e2e_9b.json"
post "/api/check/abac" '{
  "userId": "u-customer",
  "action": "payment.make",
  "resource": "wallet-001",
  "attributes": { "amount": 100 }
}' "$F9B"
check "trust>=50 -> allowed" "[ \"\$(json_get allowed $F9B)\" = 'True' ]"

# 10. Audit log
echo ""
echo "[10] Audit log shows actions with timestamps"
F10="${TMPDIR}/_po_e2e_10.json"
get "/api/audit" "$F10"
check "audit has entries"           "[ \"\$(json_get count $F10)\" -gt '0' ]"
check "first entry has timestamp"   "python3 -c \"import json; d=json.load(open('$F10')); assert 'timestamp' in d['entries'][0]; print('ok')\" >/dev/null 2>&1"
check "has policy.created type"     "python3 -c \"import json; d=json.load(open('$F10')); assert any(e['type']=='policy.created' for e in d['entries']); print('ok')\" >/dev/null 2>&1"
check "has policy.evaluated type"   "python3 -c \"import json; d=json.load(open('$F10')); assert any(e['type']=='policy.evaluated' for e in d['entries']); print('ok')\" >/dev/null 2>&1"
check "has approval.created type"   "python3 -c \"import json; d=json.load(open('$F10')); assert any(e['type']=='approval.created' for e in d['entries']); print('ok')\" >/dev/null 2>&1"
check "has approval.decided type"   "python3 -c \"import json; d=json.load(open('$F10')); assert any(e['type']=='approval.decided' for e in d['entries']); print('ok')\" >/dev/null 2>&1"

# 11. Lifecycle: create -> submit -> approve -> archive
echo ""
echo "[11] Policy lifecycle"
F11A="${TMPDIR}/_po_e2e_11a.json"
post "/api/policies" '{
  "id": "pol-lifecycle-test",
  "name": "Lifecycle Test",
  "category": "business",
  "rules": [{ "if": {}, "then": { "allow": true, "action": "allow_all" } }],
  "status": "draft",
  "owner": "u-admin"
}' "$F11A"
check "created in draft"             "[ \"\$(json_get status $F11A)\" = 'draft' ]"

F11B="${TMPDIR}/_po_e2e_11b.json"
post "/api/policies/pol-lifecycle-test/submit" '{"actor":"u-admin"}' "$F11B"
check "submitted -> review"          "[ \"\$(json_get status $F11B)\" = 'review' ]"

F11C="${TMPDIR}/_po_e2e_11c.json"
post "/api/policies/pol-lifecycle-test/approve" '{"actor":"u-admin"}' "$F11C"
check "approved -> published"        "[ \"\$(json_get status $F11C)\" = 'published' ]"
check "version still 1"              "[ \"\$(json_get version $F11C)\" = '1' ]"

F11D="${TMPDIR}/_po_e2e_11d.json"
post "/api/policies/pol-lifecycle-test/archive" '{"actor":"u-admin"}' "$F11D"
check "archived"                     "[ \"\$(json_get status $F11D)\" = 'archived' ]"

# 12. Simulation does not write audit
echo ""
echo "[12] Simulation does not mutate state"
F12PRE="${TMPDIR}/_po_e2e_12pre.json"
get "/api/audit" "$F12PRE"
AUDIT_BEFORE=$(json_get count "$F12PRE")
F12="${TMPDIR}/_po_e2e_12.json"
post "/api/policies/simulate" '{
  "policyId": "pol-e2e-test",
  "context": { "action": "purchase", "amount": 5000 }
}' "$F12"
check "simulation returns allowed=false" "[ \"\$(json_get allowed $F12)\" = 'False' ]"
F12B="${TMPDIR}/_po_e2e_12b.json"
get "/api/audit" "$F12B"
AUDIT_AFTER=$(json_get count "$F12B")
check "audit count did not change after simulate" "[ \"$AUDIT_BEFORE\" = \"$AUDIT_AFTER\" ]"

echo ""
echo "============================================"
echo "  Results: $PASS/$TOTAL passed, $FAIL failed"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
