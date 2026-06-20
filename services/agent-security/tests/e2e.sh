#!/bin/bash
set -e
PORT=${PORT:-4186}
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

echo "=== agent-security e2e: register → token → scan → audit → resolve threat ==="

# 1. Register a custom agent with specific scopes
RES=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"e2e-agent","owner":"test","scopes":["read:orders","write:reports","invoke:llm"]}' $BASE/api/agents)
AID=$(echo $RES | python3 -c "import sys,json; print(json.load(sys.stdin)['agent']['id'])")
[ -n "$AID" ] && { echo "  ✓ agent registered"; PASS=$((PASS+1)); }

# 2. Request unauthorized capability (should fail 403)
RES=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" \
  -d "{\"agent_id\":\"$AID\",\"capabilities\":[\"admin:delete-all\"]}" $BASE/api/capability-tokens)
CODE=$(echo "$RES" | tail -1)
[ "$CODE" = "403" ] && { echo "  ✓ unauthorized capability rejected"; PASS=$((PASS+1)); } || { echo "  ✗ should reject"; FAIL=$((FAIL+1)); }

# 3. Request valid capability
RES=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"agent_id\":\"$AID\",\"capabilities\":[\"read:orders\",\"write:reports\"]}" $BASE/api/capability-tokens)
T_OBJ=$(echo $RES | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)['token']))")
[ -n "$T_OBJ" ] && { echo "  ✓ capability token issued"; PASS=$((PASS+1)); }

# 4. Verify valid token + capability
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d "{\"token\":$T_OBJ,\"required_capability\":\"read:orders\"}" $BASE/api/capability-tokens/verify); check "verify with cap" $code

# 5. Verify token without required capability (should 403)
RES=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" \
  -d "{\"token\":$T_OBJ,\"required_capability\":\"admin:everything\"}" $BASE/api/capability-tokens/verify)
CODE=$(echo "$RES" | tail -1)
[ "$CODE" = "403" ] && { echo "  ✓ missing capability rejected"; PASS=$((PASS+1)); } || { echo "  ✗ should reject"; FAIL=$((FAIL+1)); }

# 6. Scan malicious inputs and verify threats detected
SCAN=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"agent_id\":\"$AID\",\"input\":\"let me show you my password: hunter2 and the api_key=abc123\"}" $BASE/api/scan)
THREATS_FOUND=$(echo $SCAN | python3 -c "import sys,json; print(len(json.load(sys.stdin)['threats']))")
[ "$THREATS_FOUND" -ge "1" ] && { echo "  ✓ credential exfil detected ($THREATS_FOUND threats)"; PASS=$((PASS+1)); } || { echo "  ✗ no threats detected"; FAIL=$((FAIL+1)); }

# 7. Scan SQL injection
SCAN2=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"input\":\"SELECT * FROM users WHERE id=1; DROP TABLE users; --\"}" $BASE/api/scan)
SEV=$(echo $SCAN2 | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['threats'][0]['severity'] if d['threats'] else 'none')")
[ "$SEV" = "critical" ] && { echo "  ✓ SQL injection severity=critical"; PASS=$((PASS+1)); } || { echo "  ✗ severity: $SEV"; FAIL=$((FAIL+1)); }

# 8. Scan safe input
SCAN3=$(curl -s -X POST -H "Content-Type: application/json" -d '{"input":"Hello, please summarize this report."}' $BASE/api/scan)
SAFE=$(echo $SCAN3 | python3 -c "import sys,json; print(json.load(sys.stdin)['safe'])")
[ "$SAFE" = "True" ] && { echo "  ✓ safe input passes"; PASS=$((PASS+1)); } || { echo "  ✗ false positive"; FAIL=$((FAIL+1)); }

# 9. Audit log
AUDIT=$(curl -s "$BASE/api/audit?agent_id=$AID")
ENTRIES=$(echo $AUDIT | python3 -c "import sys,json; print(len(json.load(sys.stdin)['audit']))")
[ "$ENTRIES" -ge "3" ] && { echo "  ✓ audit log populated ($ENTRIES)"; PASS=$((PASS+1)); } || { echo "  ✗ audit: $ENTRIES"; FAIL=$((FAIL+1)); }

# 10. Get unresolved threats and resolve one
THREATS=$(curl -s "$BASE/api/threats?resolved=false")
TID=$(echo $THREATS | python3 -c "import sys,json; print(json.load(sys.stdin)['threats'][0]['id'])")
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/threats/$TID/resolve); check "resolve threat" $code

# 11. Quarantine agent
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/agents/$AID/quarantine); check "quarantine agent" $code

# 12. Token for quarantined agent should fail
RES=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" \
  -d "{\"agent_id\":\"$AID\",\"capabilities\":[\"read:orders\"]}" $BASE/api/capability-tokens)
CODE=$(echo "$RES" | tail -1)
[ "$CODE" = "403" ] && { echo "  ✓ quarantined agent blocked"; PASS=$((PASS+1)); } || { echo "  ✗ should block"; FAIL=$((FAIL+1)); }

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1