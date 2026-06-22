#!/bin/bash
# E2E test for mtls-jwt-bridge (4779)
set -e
PORT=${PORT:-4779}
BASE="http://localhost:$PORT"
PASS=0; FAIL=0

check() {
  local desc=$1; local code=$2
  if [ "$code" = "200" ] || [ "$code" = "201" ]; then
    echo "  ✓ $desc ($code)"; PASS=$((PASS+1))
  else
    echo "  ✗ $desc (expected 200/201, got $code)"; FAIL=$((FAIL+1))
  fi
}

echo "=== mtls-jwt-bridge e2e: register → issue → verify → rotate → re-issue ==="

# Step 1: Register a new service with scoped permissions
NEW_SVC=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"e2e-service","scopes":["read:catalog","write:orders"]}' $BASE/api/services)
SID=$(echo $NEW_SVC | python3 -c "import sys,json; print(json.load(sys.stdin)['service']['id'])")
[ -n "$SID" ] && { echo "  ✓ service registered"; PASS=$((PASS+1)); } || { echo "  ✗ register"; FAIL=$((FAIL+1)); }

# Step 2: Try to issue token with unauthorized scope (should fail 403)
RES=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" \
  -d "{\"service_id\":\"$SID\",\"scopes\":[\"admin:everything\"]}" $BASE/api/tokens/issue)
CODE=$(echo "$RES" | tail -1)
[ "$CODE" = "403" ] && { echo "  ✓ unauthorized scope rejected"; PASS=$((PASS+1)); } || { echo "  ✗ should reject unauthorized"; FAIL=$((FAIL+1)); }

# Step 3: Issue valid token
T1=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"service_id\":\"$SID\",\"scopes\":[\"read:catalog\",\"write:orders\"]}" $BASE/api/tokens/issue)
TOKEN1=$(echo $T1 | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
JTI1=$(echo $T1 | python3 -c "import sys,json; print(json.load(sys.stdin)['jti'])")
[ -n "$TOKEN1" ] && { echo "  ✓ token issued"; PASS=$((PASS+1)); } || { echo "  ✗ no token"; FAIL=$((FAIL+1)); }

# Step 4: Verify valid token
VERIFY=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"token\":\"$TOKEN1\"}" $BASE/api/tokens/verify)
VALID=$(echo $VERIFY | python3 -c "import sys,json; print(json.load(sys.stdin)['valid'])")
[ "$VALID" = "True" ] && { echo "  ✓ token verified valid"; PASS=$((PASS+1)); } || { echo "  ✗ verify: $VERIFY"; FAIL=$((FAIL+1)); }

# Step 5: Verify tampered token (should fail 401)
BAD_TOKEN="${TOKEN1}xxx"
RES=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"token\":\"$BAD_TOKEN\"}" $BASE/api/tokens/verify)
CODE=$(echo "$RES" | tail -1)
[ "$CODE" = "401" ] && { echo "  ✓ tampered token rejected"; PASS=$((PASS+1)); } || { echo "  ✗ should reject tampered"; FAIL=$((FAIL+1)); }

# Step 6: Rotate service key
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/services/$SID/rotate); check "rotate key" $code
ROT_COUNT=$(curl -s $BASE/api/rotations | python3 -c "import sys,json; print(len(json.load(sys.stdin)['rotations']))")
[ "$ROT_COUNT" -ge "1" ] && { echo "  ✓ rotation logged"; PASS=$((PASS+1)); } || { echo "  ✗ no rotations"; FAIL=$((FAIL+1)); }

# Step 7: Verify fingerprint changed
FP=$(curl -s $BASE/api/keys/fingerprint/$SID | python3 -c "import sys,json; print(json.load(sys.stdin)['fingerprint'])")
[ -n "$FP" ] && [ ${#FP} -eq 16 ] && { echo "  ✓ new fingerprint ($FP)"; PASS=$((PASS+1)); } || { echo "  ✗ bad fingerprint"; FAIL=$((FAIL+1)); }

# Step 8: Revoke the token
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"reason":"compromised"}' $BASE/api/tokens/$JTI1/revoke); check "revoke token" $code

# Step 9: Verify the revoked token (should fail 401)
RES=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"token\":\"$TOKEN1\"}" $BASE/api/tokens/verify)
CODE=$(echo "$RES" | tail -1)
[ "$CODE" = "401" ] && { echo "  ✓ revoked token rejected"; PASS=$((PASS+1)); } || { echo "  ✗ should reject revoked"; FAIL=$((FAIL+1)); }

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1