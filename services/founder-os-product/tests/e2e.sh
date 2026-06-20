#!/bin/bash
set -e
PORT=${PORT:-4266}
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

echo "=== founder-os-product e2e: founder → goal → okr → todo → journal → advisor → decision → retro ==="

# 1. Founder
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"E2E Founder","email":"e2e@founder.example","company":"E2E Inc","stage":"seed"}' \
  $BASE/api/founders > /tmp/_fo_f.json
F_ID=$(python3 -c "import json; print(json.load(open('/tmp/_fo_f.json'))['founder']['id'])")
[ -n "$F_ID" ] && { echo "  ✓ founder created"; PASS=$((PASS+1)); }

# 2. Goal
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"founder_id\":\"$F_ID\",\"title\":\"Hire founding team\",\"timeframe\":\"Q3 2026\",\"status\":\"in-progress\"}" \
  $BASE/api/goals > /tmp/_fo_g.json
G_ID=$(python3 -c "import json; print(json.load(open('/tmp/_fo_g.json'))['goal']['id'])")
[ -n "$G_ID" ] && { echo "  ✓ goal created"; PASS=$((PASS+1)); }

# 3. OKR with 3 KRs
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"goal_id\":\"$G_ID\",\"objective\":\"Build A-team\",\"key_results\":[{\"text\":\"Hire CTO\",\"progress\":0},{\"text\":\"Hire VP Eng\",\"progress\":50},{\"text\":\"Hire 3 engineers\",\"progress\":100}]}" \
  $BASE/api/okrs > /tmp/_fo_o.json
PROG=$(python3 -c "import json; print(json.load(open('/tmp/_fo_o.json'))['okr']['progress_pct'])")
[ "$PROG" = "50" ] && { echo "  ✓ OKR progress calculated ($PROG%)"; PASS=$((PASS+1)); } || { echo "  ✗ progress=$PROG"; FAIL=$((FAIL+1)); }

# 4. Todo linked to goal
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"founder_id\":\"$F_ID\",\"title\":\"Post CTO job\",\"priority\":\"high\",\"related_goal_id\":\"$G_ID\"}" \
  $BASE/api/todos > /tmp/_fo_t.json
T_ID=$(python3 -c "import json; print(json.load(open('/tmp/_fo_t.json'))['todo']['id'])")
[ -n "$T_ID" ] && { echo "  ✓ todo created"; PASS=$((PASS+1)); }

# 5. Complete todo
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"status":"done"}' $BASE/api/todos/$T_ID); check "complete todo" $code

# 6. Journal entry
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"founder_id\":\"$F_ID\",\"title\":\"Day 1\",\"body\":\"Started hiring sprint\",\"mood\":\"excited\"}" \
  $BASE/api/journals > /tmp/_fo_j.json
J_ID=$(python3 -c "import json; print(json.load(open('/tmp/_fo_j.json'))['journal']['id'])")
[ -n "$J_ID" ] && { echo "  ✓ journal entry"; PASS=$((PASS+1)); }

# 7. Advisor
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"founder_id\":\"$F_ID\",\"name\":\"Pat Advisor\",\"expertise\":\"hiring\",\"contact\":\"pat@example.com\"}" \
  $BASE/api/advisors > /tmp/_fo_a.json
A_ID=$(python3 -c "import json; print(json.load(open('/tmp/_fo_a.json'))['advisor']['id'])")
[ -n "$A_ID" ] && { echo "  ✓ advisor added"; PASS=$((PASS+1)); }

# 8. Decision log
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"founder_id\":\"$F_ID\",\"title\":\"Hire remote-first\",\"context\":\"Need wider talent pool\",\"decision\":\"Yes, remote-first\",\"reasoning\":\"Larger candidate pool + cost savings\"}" \
  $BASE/api/decisions > /tmp/_fo_d.json
D_ID=$(python3 -c "import json; print(json.load(open('/tmp/_fo_d.json'))['decision']['id'])")
[ -n "$D_ID" ] && { echo "  ✓ decision logged"; PASS=$((PASS+1)); }

# 9. Retrospective
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"founder_id\":\"$F_ID\",\"period\":\"Q2 2026\",\"went_well\":[\"Shipped v1\"],\"to_improve\":[\"Speed\"],\"learnings\":[\"Users want X\"]}" \
  $BASE/api/retros > /tmp/_fo_r.json
R_ID=$(python3 -c "import json; print(json.load(open('/tmp/_fo_r.json'))['retro']['id'])")
[ -n "$R_ID" ] && { echo "  ✓ retro recorded"; PASS=$((PASS+1)); }

# 10. Filters
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/goals?founder_id=$F_ID"); check "filter goals" $code
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/okrs?goal_id=$G_ID"); check "filter okrs" $code
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/decisions?founder_id=$F_ID"); check "filter decisions" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
