#!/bin/bash
set -e
PORT=${PORT:-4264}
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

echo "=== board-intelligence e2e: board → member → meeting → agenda → minutes → resolution → vote → action ==="

# 1. Board
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"E2E Board","company":"E2E Corp"}' $BASE/api/boards > /tmp/_bi_b.json
B_ID=$(python3 -c "import json; print(json.load(open('/tmp/_bi_b.json'))['board']['id'])")
[ -n "$B_ID" ] && { echo "  ✓ board created"; PASS=$((PASS+1)); }

# 2. Member
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"board_id\":\"$B_ID\",\"name\":\"alice\",\"role\":\"CEO\",\"email\":\"alice@e2e.example\"}" \
  $BASE/api/board-members > /tmp/_bi_m.json
M_ID=$(python3 -c "import json; print(json.load(open('/tmp/_bi_m.json'))['board_member']['id'])")
[ -n "$M_ID" ] && { echo "  ✓ member created"; PASS=$((PASS+1)); }

# 3. Meeting
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"board_id\":\"$B_ID\",\"title\":\"Q3 Meeting\",\"scheduled_at\":\"2026-07-15T10:00:00Z\",\"attendee_ids\":[\"$M_ID\"]}" \
  $BASE/api/meetings > /tmp/_bi_me.json
ME_ID=$(python3 -c "import json; print(json.load(open('/tmp/_bi_me.json'))['meeting']['id'])")
[ -n "$ME_ID" ] && { echo "  ✓ meeting created"; PASS=$((PASS+1)); }

# 4. Agenda + add item
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"meeting_id\":\"$ME_ID\",\"items\":[]}" $BASE/api/agendas > /tmp/_bi_ag.json
AG_ID=$(python3 -c "import json; print(json.load(open('/tmp/_bi_ag.json'))['agenda']['id'])")
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{"title":"Q3 Results","duration_min":30,"presenter":"CFO"}' \
  $BASE/api/agendas/$AG_ID/items); check "POST agenda item" $code

# 5. Minutes → meeting auto-completes
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"meeting_id\":\"$ME_ID\",\"content\":\"Q3 results discussed.\",\"attendees\":[\"$M_ID\"],\"recorded_by\":\"alice\"}" \
  $BASE/api/minutes > /tmp/_bi_mi.json
MIN_ID=$(python3 -c "import json; print(json.load(open('/tmp/_bi_mi.json'))['minute']['id'])")
[ -n "$MIN_ID" ] && { echo "  ✓ minutes recorded"; PASS=$((PASS+1)); }

# Verify meeting now completed
curl -s $BASE/api/meetings/$ME_ID > /tmp/_bi_me2.json
STATUS=$(python3 -c "import json; print(json.load(open('/tmp/_bi_me2.json'))['meeting']['status'])")
[ "$STATUS" = "completed" ] && { echo "  ✓ meeting auto-completed"; PASS=$((PASS+1)); } || { echo "  ✗ meeting: $STATUS"; FAIL=$((FAIL+1)); }

# 6. Approve minutes
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"approved":true}' $BASE/api/minutes/$MIN_ID); check "approve minutes" $code

# 7. Resolution
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"board_id\":\"$B_ID\",\"meeting_id\":\"$ME_ID\",\"title\":\"Approve Budget\",\"body\":\"$5M budget\",\"proposed_by\":\"$M_ID\"}" \
  $BASE/api/resolutions > /tmp/_bi_r.json
R_ID=$(python3 -c "import json; print(json.load(open('/tmp/_bi_r.json'))['resolution']['id'])")
[ -n "$R_ID" ] && { echo "  ✓ resolution proposed"; PASS=$((PASS+1)); }

# 8. Vote yes
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"voter_id\":\"$M_ID\",\"choice\":\"yes\"}" $BASE/api/resolutions/$R_ID/vote > /tmp/_bi_v.json
TALLY_YES=$(python3 -c "import json; print(json.load(open('/tmp/_bi_v.json'))['tally']['yes'])")
[ "$TALLY_YES" = "1" ] && { echo "  ✓ vote recorded (tally yes=$TALLY_YES)"; PASS=$((PASS+1)); } || { echo "  ✗ tally: $TALLY_YES"; FAIL=$((FAIL+1)); }

# 9. Vote no (different voter)
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"voter_id\":\"bob\",\"choice\":\"no\"}" $BASE/api/resolutions/$R_ID/vote > /tmp/_bi_v2.json
TALLY_NO=$(python3 -c "import json; print(json.load(open('/tmp/_bi_v2.json'))['tally']['no'])")
[ "$TALLY_NO" = "1" ] && { echo "  ✓ no vote counted"; PASS=$((PASS+1)); } || { echo "  ✗ no: $TALLY_NO"; FAIL=$((FAIL+1)); }

# 10. Invalid vote choice
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d "{\"voter_id\":\"x\",\"choice\":\"maybe\"}" $BASE/api/resolutions/$R_ID/vote)
[ "$code" = "400" ] && { echo "  ✓ invalid choice rejected"; PASS=$((PASS+1)); } || { echo "  ✗ invalid: $code"; FAIL=$((FAIL+1)); }

# 11. Action item
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"meeting_id\":\"$ME_ID\",\"description\":\"Send budget to CFO\",\"assignee_id\":\"$M_ID\",\"due_date\":\"2026-08-01\"}" \
  $BASE/api/action-items > /tmp/_bi_ai.json
AI_ID=$(python3 -c "import json; print(json.load(open('/tmp/_bi_ai.json'))['action_item']['id'])")
[ -n "$AI_ID" ] && { echo "  ✓ action item created"; PASS=$((PASS+1)); }

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
