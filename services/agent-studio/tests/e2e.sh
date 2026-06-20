#!/bin/bash
set -e
PORT=${PORT:-4189}
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

echo "=== agent-studio e2e: session → 5 traces → breakpoint → replay → comments ==="

# 1. Create session
RES=$(curl -s -X POST -H "Content-Type: application/json" -d '{"agent_id":"e2e-agent"}' $BASE/api/sessions)
SID=$(echo $RES | python3 -c "import sys,json; print(json.load(sys.stdin)['session']['id'])")
[ -n "$SID" ] && { echo "  ✓ session created"; PASS=$((PASS+1)); }

# 2. Add 5 traces
for i in 1 2 3 4 5; do
  RES=$(curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"step_name\":\"step-$i\",\"step_type\":\"llm\",\"input\":{\"q\":\"query $i\"},\"output\":{\"a\":\"answer $i\"},\"tokens\":$((100*i)),\"duration_ms\":$((50*i))}" \
    $BASE/api/sessions/$SID/traces)
done

# 3. Verify aggregate stats
TRACES=$(curl -s $BASE/api/sessions/$SID/traces)
TOTAL_TOKENS=$(echo $TRACES | python3 -c "import sys,json; print(json.load(sys.stdin)['stats']['total_tokens'])")
[ "$TOTAL_TOKENS" = "1500" ] && { echo "  ✓ stats aggregate (1500 tokens)"; PASS=$((PASS+1)); } || { echo "  ✗ tokens: $TOTAL_TOKENS"; FAIL=$((FAIL+1)); }

# 4. Step count
COUNT=$(echo $TRACES | python3 -c "import sys,json; print(json.load(sys.stdin)['stats']['step_count'])")
[ "$COUNT" = "5" ] && { echo "  ✓ step_count = 5"; PASS=$((PASS+1)); } || { echo "  ✗ count: $COUNT"; FAIL=$((FAIL+1)); }

# 5. Session totals match
SESS=$(curl -s $BASE/api/sessions/$SID)
TOTAL=$(echo $SESS | python3 -c "import sys,json; print(json.load(sys.stdin)['session']['total_tokens'])")
[ "$TOTAL" = "1500" ] && { echo "  ✓ session.total_tokens = 1500"; PASS=$((PASS+1)); } || { echo "  ✗ session: $TOTAL"; FAIL=$((FAIL+1)); }

# 6. Add breakpoint + toggle (hit count++)
RES=$(curl -s -X POST -H "Content-Type: application/json" -d '{"condition":"step.tokens > 200"}' $BASE/api/sessions/$SID/breakpoints)
BPID=$(echo $RES | python3 -c "import sys,json; print(json.load(sys.stdin)['breakpoint']['id'])")
[ -n "$BPID" ] && { echo "  ✓ breakpoint added"; PASS=$((PASS+1)); }

for i in 1 2 3; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/breakpoints/$BPID/toggle); check "toggle $i" $code
done

HITS=$(curl -s $BASE/api/sessions/$SID/breakpoints | python3 -c "import sys,json; print(json.load(sys.stdin)['breakpoints'][0]['hit_count'])")
[ "$HITS" = "3" ] && { echo "  ✓ hit count = 3"; PASS=$((PASS+1)); } || { echo "  ✗ hits: $HITS"; FAIL=$((FAIL+1)); }

# 7. Replay creates a new session
RES=$(curl -s -X POST $BASE/api/sessions/$SID/replay)
NEW_SID=$(echo $RES | python3 -c "import sys,json; print(json.load(sys.stdin)['new_session_id'])")
[ -n "$NEW_SID" ] && [ "$NEW_SID" != "$SID" ] && { echo "  ✓ replay session created"; PASS=$((PASS+1)); }

# 8. End the session
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/sessions/$SID/end); check "end session" $code
ENDED=$(curl -s $BASE/api/sessions/$SID | python3 -c "import sys,json; print(json.load(sys.stdin)['session']['status'])")
[ "$ENDED" = "completed" ] && { echo "  ✓ status=completed"; PASS=$((PASS+1)); } || { echo "  ✗ status: $ENDED"; FAIL=$((FAIL+1)); }

# 9. Filter sessions by agent
SESSIONS=$(curl -s "$BASE/api/sessions?agent_id=e2e-agent")
COUNT=$(echo $SESSIONS | python3 -c "import sys,json; print(len(json.load(sys.stdin)['sessions']))")
[ "$COUNT" -ge "2" ] && { echo "  ✓ filter by agent works"; PASS=$((PASS+1)); } || { echo "  ✗ count: $COUNT"; FAIL=$((FAIL+1)); }

# 10. Comment on a trace
TID=$(curl -s $BASE/api/sessions/$SID/traces | python3 -c "import sys,json; print(json.load(sys.stdin)['traces'][0]['id'])")
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{"author":"dev","text":"this step is slow"}' $BASE/api/traces/$TID/comments); check "comment" $code
COMMENTS=$(curl -s $BASE/api/traces/$TID/comments)
CC=$(echo $COMMENTS | python3 -c "import sys,json; print(len(json.load(sys.stdin)['comments']))")
[ "$CC" = "1" ] && { echo "  ✓ comment saved"; PASS=$((PASS+1)); } || { echo "  ✗ comments: $CC"; FAIL=$((FAIL+1)); }

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1