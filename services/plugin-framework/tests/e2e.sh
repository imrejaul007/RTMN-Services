#!/bin/bash
set -e
PORT=${PORT:-4780}
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

echo "=== plugin-framework e2e: register → activate → fire hook → sandbox → review ==="

# 1. Register plugin
NEW=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"e2e-plugin","version":"1.0.0","author":"tester","capabilities":["do-thing"],"hooks":["on-order-create","pre-request"]}' \
  $BASE/api/plugins)
PID=$(echo $NEW | python3 -c "import sys,json; print(json.load(sys.stdin)['plugin']['id'])")
[ -n "$PID" ] && { echo "  ✓ plugin registered"; PASS=$((PASS+1)); } || { echo "  ✗ register"; FAIL=$((FAIL+1)); }

# 2. Try invalid hook (should fail 400)
RES=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{"name":"bad","hooks":["evil-hook"]}' $BASE/api/plugins)
CODE=$(echo "$RES" | tail -1)
[ "$CODE" = "400" ] && { echo "  ✓ invalid hook rejected"; PASS=$((PASS+1)); } || { echo "  ✗ should reject invalid hook"; FAIL=$((FAIL+1)); }

# 3. Activate plugin
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/plugins/$PID/activate); check "activate plugin" $code

# 4. Verify hooks registered
HOOKS=$(curl -s $BASE/api/plugins/$PID/hooks)
HOOK_COUNT=$(echo $HOOKS | python3 -c "import sys,json; print(len(json.load(sys.stdin)['hooks']))")
[ "$HOOK_COUNT" = "2" ] && { echo "  ✓ 2 hooks registered"; PASS=$((PASS+1)); } || { echo "  ✗ expected 2 hooks, got $HOOK_COUNT"; FAIL=$((FAIL+1)); }

# 5. Fire hook with input
FIRE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"hook_point":"pre-request","input":{"order_id":"o_123"}}' $BASE/api/hooks/fire)
FIRED=$(echo $FIRE | python3 -c "import sys,json; print(json.load(sys.stdin)['fired'])")
[ "$FIRED" -ge "1" ] && { echo "  ✓ hook fired ($FIRED plugins)"; PASS=$((PASS+1)); } || { echo "  ✗ no firings"; FAIL=$((FAIL+1)); }

# 6. Sandbox execution
SBOX=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"plugin_id\":\"$PID\",\"code\":\"return { ok: true, doubled: input.n * 2, source: '$PID' };\",\"input\":{\"n\":21}}" \
  $BASE/api/plugins/$PID/run-sandboxed)
DOUBLED=$(echo $SBOX | python3 -c "import sys,json; print(json.load(sys.stdin)['run']['result']['doubled'])")
[ "$DOUBLED" = "42" ] && { echo "  ✓ sandbox returned 42"; PASS=$((PASS+1)); } || { echo "  ✗ sandbox: $SBOX"; FAIL=$((FAIL+1)); }

# 7. Sandbox timeout
SBT=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"plugin_id\":\"$PID\",\"code\":\"while(true){}\",\"timeout_ms\":50}" \
  $BASE/api/plugins/$PID/run-sandboxed)
TIMED=$(echo $SBT | python3 -c "import sys,json; print(json.load(sys.stdin)['run']['ok'])")
[ "$TIMED" = "False" ] && { echo "  ✓ sandbox timeout caught"; PASS=$((PASS+1)); } || { echo "  ✗ no timeout"; FAIL=$((FAIL+1)); }

# 8. Submit 3 reviews and verify average
for i in 3 4 5; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
    -d "{\"plugin_id\":\"$PID\",\"rating\":$i,\"comment\":\"v$i\"}" $BASE/api/reviews); check "review $i stars" $code
done
AVG=$(curl -s $BASE/api/plugins/$PID/reviews | python3 -c "import sys,json; print(round(json.load(sys.stdin)['avg_rating'],2))")
AVG_INT=$(python3 -c "print(int(float('$AVG')))")
[ "$AVG_INT" = "4" ] && { echo "  ✓ avg rating = 4"; PASS=$((PASS+1)); } || { echo "  ✗ avg = $AVG"; FAIL=$((FAIL+1)); }

# 9. Delete plugin
code=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE $BASE/api/plugins/$PID); check "DELETE plugin" $code

# 10. Verify hooks cleaned up
RES=$(curl -s -w "\n%{http_code}" $BASE/api/plugins/$PID/hooks)
CODE=$(echo "$RES" | tail -1)
[ "$CODE" = "404" ] && { echo "  ✓ hooks cleaned up after delete"; PASS=$((PASS+1)); } || { echo "  ✗ hooks leaked"; FAIL=$((FAIL+1)); }

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1