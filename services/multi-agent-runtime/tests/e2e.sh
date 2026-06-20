#!/bin/bash
set -e
PORT=${PORT:-4190}
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

echo "=== multi-agent-runtime e2e: all 8 patterns ==="

# 1. Verify all pattern types registered
TYPES=$(curl -s $BASE/ | python3 -c "import sys,json; d=json.load(sys.stdin); print(','.join(sorted(d['pattern_types'])))")
[ "$TYPES" = "conditional,debate,fan-in,fan-out,parallel,pipeline,sequential,voting" ] && { echo "  ✓ all 8 pattern types"; PASS=$((PASS+1)); } || { echo "  ✗ types: $TYPES"; FAIL=$((FAIL+1)); }

# 2. Try invalid type
RES=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d '{"name":"bad","type":"chaos"}' $BASE/api/patterns)
CODE=$(echo "$RES" | tail -1)
[ "$CODE" = "400" ] && { echo "  ✓ invalid type rejected"; PASS=$((PASS+1)); } || { echo "  ✗ invalid: $CODE"; FAIL=$((FAIL+1)); }

# 3. Run each pattern type
for type in sequential parallel pipeline fan-out fan-in conditional debate voting; do
  RES=$(curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"name\":\"e2e-$type\",\"type\":\"$type\",\"definition\":{\"agents\":[{\"role\":\"a\"},{\"role\":\"b\"}],\"dispatcher\":{\"role\":\"d\"},\"workers\":[{\"role\":\"w1\"},{\"role\":\"w2\"}]}}" \
    $BASE/api/patterns)
  PID=$(echo $RES | python3 -c "import sys,json; print(json.load(sys.stdin)['pattern']['id'])")

  # Create collaboration
  RES=$(curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"pattern_id\":\"$PID\",\"agents\":[{\"role\":\"a\"},{\"role\":\"b\"},{\"role\":\"c\"}]}" \
    $BASE/api/collaborations)
  CID=$(echo $RES | python3 -c "import sys,json; print(json.load(sys.stdin)['collaboration']['id'])")

  # Run
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
    -d '{"input":{"q":"test"}}' $BASE/api/collaborations/$CID/run)
  check "run $type" $code

  # Verify status
  STATUS=$(curl -s $BASE/api/collaborations/$CID | python3 -c "import sys,json; print(json.load(sys.stdin)['collaboration']['status'])")
  [ "$STATUS" = "completed" ] && { echo "  ✓ $type completed"; PASS=$((PASS+1)); } || { echo "  ✗ $type status: $STATUS"; FAIL=$((FAIL+1)); }
done

# 4. Verify instances created for fan-out (should have dispatcher + 2 workers)
PATTERNS=$(curl -s $BASE/api/patterns)
FO_PID=$(echo $PATTERNS | python3 -c "import sys,json; print([p['id'] for p in json.load(sys.stdin)['patterns'] if p['type']=='fan-out'][0])")
RES=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"pattern_id\":\"$FO_PID\",\"agents\":[]}" $BASE/api/collaborations)
CID=$(echo $RES | python3 -c "import sys,json; print(json.load(sys.stdin)['collaboration']['id'])")
curl -s -X POST -H "Content-Type: application/json" -d '{}' $BASE/api/collaborations/$CID/run > /dev/null
INSTANCES=$(curl -s $BASE/api/collaborations/$CID/instances)
IC=$(echo $INSTANCES | python3 -c "import sys,json; print(len(json.load(sys.stdin)['instances']))")
[ "$IC" -ge "3" ] && { echo "  ✓ fan-out produced $IC instances (dispatcher + workers)"; PASS=$((PASS+1)); } || { echo "  ✗ instances: $IC"; FAIL=$((FAIL+1)); }

# 5. Send messages
RES=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"from_agent\":\"alice\",\"to_agent\":\"bob\",\"content\":\"hello\"}" $BASE/api/collaborations/$CID/messages)
MSG_ID=$(echo $RES | python3 -c "import sys,json; print(json.load(sys.stdin)['message']['id'])")
[ -n "$MSG_ID" ] && { echo "  ✓ message sent"; PASS=$((PASS+1)); }

MSGS=$(curl -s $BASE/api/collaborations/$CID/messages)
MC=$(echo $MSGS | python3 -c "import sys,json; print(len(json.load(sys.stdin)['messages']))")
[ "$MC" -ge "2" ] && { echo "  ✓ message log populated"; PASS=$((PASS+1)); } || { echo "  ✗ messages: $MC"; FAIL=$((FAIL+1)); }

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1