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

echo "=== agent-security smoke ==="
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/health); check "GET /health" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/); check "GET /" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/agents); check "GET /api/agents" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/policies); check "GET /api/policies" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/audit); check "GET /api/audit" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/threats); check "GET /api/threats" $code

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"name":"smoke-agent"}' $BASE/api/agents); check "POST /api/agents" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"name":"smoke-policy","rules":{"allow_network":false}}' $BASE/api/policies); check "POST /api/policies" $code

# Create a fresh agent with scopes and issue capability token for it
FRESH=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"name\":\"smoke-token-agent-$(date +%s)\",\"scopes\":[\"read:contacts\",\"write:leads\"]}" $BASE/api/agents)
AID=$(echo $FRESH | python3 -c "import sys,json; print(json.load(sys.stdin)['agent']['id'])")

# Issue capability token (scopes: read:contacts, write:leads)
TOK=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"agent_id\":\"$AID\",\"capabilities\":[\"read:contacts\",\"write:leads\"]}" $BASE/api/capability-tokens)
T_ID=$(echo $TOK | python3 -c "import sys,json; print(json.load(sys.stdin)['token']['id'])")
T_OBJ=$(echo $TOK | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)['token']))")
[ -n "$T_ID" ] && { echo "  ✓ capability token issued"; PASS=$((PASS+1)); } || { echo "  ✗ no token"; FAIL=$((FAIL+1)); }

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d "{\"token\":$T_OBJ,\"required_capability\":\"read:contacts\"}" $BASE/api/capability-tokens/verify); check "POST /verify" $code

# Scan a malicious input
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d "{\"input\":\"DROP TABLE users; --\"}" $BASE/api/scan); check "POST /api/scan" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1