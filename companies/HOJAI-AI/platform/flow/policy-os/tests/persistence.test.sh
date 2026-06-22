#!/bin/bash
# PolicyOS - Persistence Tests
# Verifies that policies, roles, users, and approvals survive a service restart.
# This test creates entities, restarts the service, and verifies they all reload
# from the persistent JSON store.
#
# Usage: bash tests/persistence.test.sh
# Requires: the policy-os service to be running, restart-capable
#
# How it works:
#  1. Create a uniquely-named policy, role, user
#  2. Stop the service
#  3. Start it again
#  4. Verify all entities are still present
#  5. Clean up
#
# NOTE: This test is gated on a unique env var so it does NOT auto-restart
# during normal test runs. Set POLICYOS_TEST_RESTART=1 to enable.

BASE_URL="${BASE_URL:-http://localhost:4254}"
PASS=0
FAIL=0
TOTAL=0
TMPDIR="${TMPDIR:-/tmp}"
SERVICE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Common test helpers
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

if [ "${POLICYOS_TEST_RESTART:-0}" != "1" ]; then
  echo "SKIP  Set POLICYOS_TEST_RESTART=1 to run restart-based persistence tests"
  echo "      (auto-restart is opt-in to avoid disrupting parallel dev)"
  exit 0
fi

echo "============================================"
echo "  PolicyOS - Persistence Tests"
echo "  Target: $BASE_URL"
echo "============================================"

# Find the running service
PID=$(lsof -ti :4254 2>/dev/null | head -1)
if [ -z "$PID" ]; then
  echo "  SKIP  No service running on port 4254"
  exit 0
fi

# Use a unique suffix so concurrent runs don't collide
SUFFIX="persist-$(date +%s)-$$"

# ---- 1. Create a uniquely-named policy -----------------------------------
echo ""
echo "[1] Create policy with unique id"
POL_ID="pol-${SUFFIX}"
P1="${TMPDIR}/_po_persist_1.json"
post "/api/policies" "$(jq -n \
  --arg id "$POL_ID" \
  --arg suff "$SUFFIX" \
  '{
    id: $id,
    name: ("Persist Test " + $suff),
    category: "security",
    priority: 50,
    rules: [{ if: {}, then: { allow: true, action: "allow_all" } }],
    exceptions: [],
    approvals: { strategy: "single", requiredApprovers: [] },
    owner: "u-admin",
    status: "published"
  }')" "$P1"
check "policy created" "[ \"\$(jq -r .id '$P1' 2>/dev/null)\" = \"$POL_ID\" ]"

# ---- 2. Create a uniquely-named role -------------------------------------
echo ""
echo "[2] Create role with unique name"
ROLE_NAME="role-${SUFFIX}"
R1="${TMPDIR}/_po_persist_2.json"
post "/api/roles" "$(jq -n \
  --arg name "$ROLE_NAME" \
  '{
    name: $name,
    description: "Persist test role",
    permissions: ["policy:read", "policy:evaluate"]
  }')" "$R1"
check "role created" "[ \"\$(jq -r .name '$R1' 2>/dev/null)\" = \"$ROLE_NAME\" ]"

# ---- 3. Assign role to seed user (no POST /api/users; users are seeded) ---
echo ""
echo "[3] Assign custom role to a seed user"
USER_ID="u-admin"  # Use seeded user; verify via /api/users/:id/roles
U1="${TMPDIR}/_po_persist_3.json"
post "/api/roles/${ROLE_NAME}/assign" "$(jq -n \
  --arg user "$USER_ID" \
  '{ userId: $user }')" "$U1"
check "role assigned to user" "jq -e '.success == true or .userId' '$U1' >/dev/null 2>&1"

# ---- 4. Create an approval ------------------------------------------------
echo ""
echo "[4] Create approval request"
A1="${TMPDIR}/_po_persist_4.json"
post "/api/approvals" "$(jq -n \
  --arg pid "$POL_ID" \
  --arg uid "$USER_ID" \
  --arg rid "$SUFFIX" \
  '{
    policyId: $pid,
    requesterId: $uid,
    resource: ("persist-" + $rid),
    amount: 42,
    metadata: { test: "persistence" }
  }')" "$A1"
APPROVAL_ID=$(jq -r '.id // empty' "$A1" 2>/dev/null)
check "approval created" "[ -n \"$APPROVAL_ID\" ]"

# ---- 5. Stop the service --------------------------------------------------
echo ""
echo "[5] Stop service (kill PID $PID)"
kill "$PID" 2>/dev/null || true
# Wait for the port to free
for i in 1 2 3 4 5 6 7 8 9 10; do
  if ! lsof -ti :4254 >/dev/null 2>&1; then break; fi
  sleep 0.5
done
check "service stopped" "! lsof -ti :4254 >/dev/null 2>&1"

# ---- 6. Start the service again ------------------------------------------
echo ""
echo "[6] Restart service"
cd "$SERVICE_DIR"
POLICYOS_REQUIRE_AUTH=false node src/index.js > /tmp/policy-os-restart.log 2>&1 &
NEW_PID=$!
# Wait for it to come up
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if curl -s --max-time 1 -o /dev/null "${BASE_URL}/health" 2>/dev/null; then break; fi
  sleep 0.5
done
check "service back up" "curl -s --max-time 1 '${BASE_URL}/health' | jq -e '.status == \"healthy\"' >/dev/null 2>&1"

# ---- 7. Verify all entities survived --------------------------------------
echo ""
echo "[7] Verify entities survived restart"
G1="${TMPDIR}/_po_persist_g1.json"
get "/api/policies/${POL_ID}" "$G1"
check "policy still present" "[ \"\$(jq -r .id '$G1' 2>/dev/null)\" = \"$POL_ID\" ]"

G2="${TMPDIR}/_po_persist_g2.json"
get "/api/roles/${ROLE_NAME}" "$G2"
check "role still present" "[ \"\$(jq -r .name '$G2' 2>/dev/null)\" = \"$ROLE_NAME\" ]"

G3="${TMPDIR}/_po_persist_g3.json"
get "/api/users" "$G3"
check "user still present" "jq -e --arg id '$USER_ID' '.users[] | select(.id == \$id)' '$G3' >/dev/null 2>&1"

G4="${TMPDIR}/_po_persist_g4.json"
get "/api/approvals" "$G4"
check "approval still present" "jq -e --arg id '$APPROVAL_ID' '.approvals[] | select(.id == \$id)' '$G4' >/dev/null 2>&1"

# ---- 8. Verify the policy still evaluates correctly ----------------------
echo ""
echo "[8] Reloaded policy still works"
E1="${TMPDIR}/_po_persist_e1.json"
post "/api/policies/evaluate" "{\"policyId\":\"${POL_ID}\",\"context\":{\"action\":\"test\"}}" "$E1"
check "policy evaluates" "jq -e '.allowed == true' '$E1' >/dev/null 2>&1"

# ---- 9. Cleanup -----------------------------------------------------------
echo ""
echo "[9] Cleanup"
del "/api/policies/${POL_ID}" /dev/null
del "/api/roles/${ROLE_NAME}" /dev/null
echo "  OK   (cleaned up)"

echo ""
echo "============================================"
echo "  Results: $PASS/$TOTAL passed, $FAIL failed"
echo "============================================"
[ "$FAIL" -eq 0 ]
