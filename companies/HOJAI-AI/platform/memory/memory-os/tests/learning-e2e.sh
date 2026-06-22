#!/usr/bin/env bash
# Learning engine e2e tests for MemoryOS /api/memory/learn
#
# Verifies the REAL learning behavior introduced 2026-06-21:
#   - positive outcome reinforces related memories (↑ confidence)
#   - negative outcome / low score registers contradictions (↓ confidence)
#   - High importance OR high score promotes to long-term
#
# Uses unique twin ids per run so tests are isolated.

set -u
BASE="${BASE:-http://localhost:4703}"
PASS=0
FAIL=0
FAILURES=()

http() {
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -s -o /tmp/_mo_learn_body.json -w "%{http_code}" -X "$method" "$BASE$path" \
      -H 'Content-Type: application/json' -d "$body"
  else
    curl -s -o /tmp/_mo_learn_body.json -w "%{http_code}" -X "$method" "$BASE$path"
  fi
}

jget() {
  python3 -c "import json; d=json.load(open('/tmp/_mo_learn_body.json')); $1"
}

check() {
  local label="$1" got="$2" want="$3"
  if [ "$got" = "$want" ]; then
    echo "  [PASS] $label"
    PASS=$((PASS+1))
  else
    echo "  [FAIL] $label (expected $want got $got)"
    FAIL=$((FAIL+1))
    FAILURES+=("$label")
  fi
}

# Make sure auth is off for these tests
curl -s "$BASE/api/auth/toggle?on=false" >/dev/null

TWIN="learn-test-$(date +%s)-$$"
echo
echo "Using twinId: $TWIN"
echo

# ----------------------------------------------------------------------------
# 1. Seed two related memories on a known twin
# ----------------------------------------------------------------------------
echo "[1] Seed two related memories"
code=$(http POST /api/memory/personal/"$TWIN" '{"content":"User prefers dark mode everywhere","tags":["preference","ui","darkmode"],"importance":"High"}')
check "seed darkmode preference" "$code" "201"
DARK_ID=$(jget "print(d['data']['id'])")

code=$(http POST /api/memory/personal/"$TWIN" '{"content":"User dislikes bright notifications","tags":["preference","ui","notifications"],"importance":"Medium"}')
check "seed notifications preference" "$code" "201"
NOTIF_ID=$(jget "print(d['data']['id'])")

# ----------------------------------------------------------------------------
# 2. Positive learn → should reinforce both, promote self to long-term
# ----------------------------------------------------------------------------
echo
echo "[2] Positive learn (score=0.95, importance=High)"
code=$(http POST /api/memory/learn "{\"twinId\":\"$TWIN\",\"interaction\":\"confirmed dark mode in 3 more apps\",\"outcome\":\"positive\",\"score\":0.95,\"importance\":\"High\",\"tags\":[\"preference\",\"ui\"]}")
check "learn positive returns 200" "$code" "200"
reinforced=$(jget "print(d['learning']['relatedReinforced'])")
check "reinforced == 2" "$reinforced" "2"
promoted=$(jget "print(d['learning']['promotedToLongTerm'])")
check "promoted to long-term == True" "$promoted" "True"

# Verify both seeds had their confidence bumped
code=$(http GET "/api/memories/$DARK_ID")
conf_after=$(jget "print(round(d['data']['confidence'], 2))")
check "darkmode confidence after 1 reinforce == 0.55" "$conf_after" "0.55"

code=$(http GET "/api/memories/$NOTIF_ID")
conf_after=$(jget "print(round(d['data']['confidence'], 2))")
check "notifications confidence after 1 reinforce == 0.55" "$conf_after" "0.55"

# ----------------------------------------------------------------------------
# 3. Negative learn → should contradict the darkmode memory
# ----------------------------------------------------------------------------
echo
echo "[3] Negative learn (score=0.1)"
code=$(http POST /api/memory/learn "{\"twinId\":\"$TWIN\",\"interaction\":\"user switched back to light mode\",\"outcome\":\"negative\",\"score\":0.1,\"importance\":\"Medium\",\"tags\":[\"preference\",\"ui\"]}")
check "learn negative returns 200" "$code" "200"
contradictions=$(jget "print(d['learning']['contradictionsFound'])")
check "contradictionsFound >= 1" "$([ "$contradictions" -ge 1 ] && echo 0 || echo 1)" "0"
promoted=$(jget "print(d['learning']['promotedToLongTerm'])")
check "negative learn NOT promoted" "$promoted" "False"

# ----------------------------------------------------------------------------
# 4. Neutral learn with low score should not contradict
# ----------------------------------------------------------------------------
echo
echo "[4] Neutral learn (score=0.5) should not register contradictions"
code=$(http POST /api/memory/learn "{\"twinId\":\"$TWIN\",\"interaction\":\"user looked at theme options\",\"outcome\":\"neutral\",\"score\":0.5,\"importance\":\"Medium\"}")
check "learn neutral returns 200" "$code" "200"
contradictions=$(jget "print(d['learning']['contradictionsFound'])")
check "neutral contradictionsFound == 0" "$contradictions" "0"

# ----------------------------------------------------------------------------
# 5. Low-importance learn should NOT promote to long-term
# ----------------------------------------------------------------------------
echo
echo "[5] Low-importance learn should NOT promote"
TWIN2="learn-test-low-$(date +%s)-$$"
code=$(http POST /api/memory/learn "{\"twinId\":\"$TWIN2\",\"interaction\":\"user opened app once\",\"outcome\":\"neutral\",\"score\":0.5,\"importance\":\"Low\"}")
check "learn low returns 200" "$code" "200"
promoted=$(jget "print(d['learning']['promotedToLongTerm'])")
check "low importance NOT promoted" "$promoted" "False"

# ----------------------------------------------------------------------------
# 6. Cleanup — forget the seeded memories so we don't accumulate
# ----------------------------------------------------------------------------
echo
echo "[6] Cleanup"
http POST "/api/memories/$DARK_ID/forget" '{"reason":"e2e cleanup","hardDelete":true}' >/dev/null
http POST "/api/memories/$NOTIF_ID/forget" '{"reason":"e2e cleanup","hardDelete":true}' >/dev/null
echo "  cleaned"

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------
echo
echo "=========================================="
echo "PASS: $PASS  FAIL: $FAIL  / $((PASS+FAIL))"
if [ $FAIL -gt 0 ]; then
  echo "FAILURES:"
  for f in "${FAILURES[@]}"; do echo "  - $f"; done
  exit 1
fi
echo "ALL LEARNING TESTS PASSED"