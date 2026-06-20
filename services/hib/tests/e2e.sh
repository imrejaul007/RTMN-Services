#!/bin/bash
set -e
PORT=${PORT:-4262}
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

echo "=== hib e2e: reviewer → task → approve/reject → escalate → audit ==="

# 1. Create reviewer
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"dave","email":"dave@example.com","skills":["legal"],"sla_hours":12}' \
  $BASE/api/reviewers > /tmp/_h_r.json
R_ID=$(python3 -c "import json; print(json.load(open('/tmp/_h_r.json'))['reviewer']['id'])")
[ -n "$R_ID" ] && { echo "  ✓ reviewer created"; PASS=$((PASS+1)); }

# 2. Create task assigned to dave
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"title\":\"E2E task\",\"priority\":\"high\",\"reviewer_id\":\"$R_ID\",\"payload\":{\"amount\":500}}" \
  $BASE/api/tasks > /tmp/_h_t.json
T_ID=$(python3 -c "import json; print(json.load(open('/tmp/_h_t.json'))['task']['id'])")
[ -n "$T_ID" ] && { echo "  ✓ task created"; PASS=$((PASS+1)); }

# 3. Auto-assign (no reviewer_id)
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"title":"Auto-assigned"}' $BASE/api/tasks > /tmp/_h_t2.json
T2_ID=$(python3 -c "import json; print(json.load(open('/tmp/_h_t2.json'))['task']['id'])")
[ -n "$T2_ID" ] && { echo "  ✓ auto-assigned task"; PASS=$((PASS+1)); }

# 4. Approve the task
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"rationale":"Looks good"}' $BASE/api/tasks/$T_ID/approve > /tmp/_h_ap.json
STATUS=$(python3 -c "import json; print(json.load(open('/tmp/_h_ap.json'))['task']['status'])")
[ "$STATUS" = "approved" ] && { echo "  ✓ task approved"; PASS=$((PASS+1)); } || { echo "  ✗ status: $STATUS"; FAIL=$((FAIL+1)); }

# 5. Reject another task
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"title\":\"To reject\",\"reviewer_id\":\"$R_ID\"}" $BASE/api/tasks > /tmp/_h_t3.json
T3_ID=$(python3 -c "import json; print(json.load(open('/tmp/_h_t3.json'))['task']['id'])")
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"rationale":"Not approved"}' $BASE/api/tasks/$T3_ID/reject > /tmp/_h_rj.json
STATUS=$(python3 -c "import json; print(json.load(open('/tmp/_h_rj.json'))['task']['status'])")
[ "$STATUS" = "rejected" ] && { echo "  ✓ task rejected"; PASS=$((PASS+1)); } || { echo "  ✗ status: $STATUS"; FAIL=$((FAIL+1)); }

# 6. Try to approve an already-decided task → should fail with 400
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{}' $BASE/api/tasks/$T_ID/approve)
[ "$code" = "400" ] && { echo "  ✓ double-decision blocked"; PASS=$((PASS+1)); } || { echo "  ✗ double-decision: $code"; FAIL=$((FAIL+1)); }

# 7. Escalate the auto-assigned task
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"reason":"too complex for junior"}' $BASE/api/tasks/$T2_ID/escalate > /tmp/_h_e.json
ESC=$(python3 -c "import json; print(json.load(open('/tmp/_h_e.json'))['task']['escalated'])")
[ "$ESC" = "True" ] && { echo "  ✓ task escalated"; PASS=$((PASS+1)); } || { echo "  ✗ escalated: $ESC"; FAIL=$((FAIL+1)); }

# 8. Audit log
curl -s "$BASE/api/audit?task_id=$T_ID" > /tmp/_h_au.json
COUNT=$(python3 -c "import json; print(len(json.load(open('/tmp/_h_au.json'))['audit']))")
[ "$COUNT" -ge "2" ] && { echo "  ✓ audit has $COUNT entries"; PASS=$((PASS+1)); } || { echo "  ✗ audit: $COUNT"; FAIL=$((FAIL+1)); }

# 9. Stats
curl -s $BASE/api/stats > /tmp/_h_s.json
APPROVED=$(python3 -c "import json; print(json.load(open('/tmp/_h_s.json'))['stats']['approved'])")
[ "$APPROVED" -ge "1" ] && { echo "  ✓ stats reflect $APPROVED approvals"; PASS=$((PASS+1)); } || { echo "  ✗ stats: $APPROVED"; FAIL=$((FAIL+1)); }

# 10. Create queue
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"name\":\"legal-queue\",\"reviewer_ids\":[\"$R_ID\"]}" $BASE/api/queues > /tmp/_h_q.json
Q_ID=$(python3 -c "import json; print(json.load(open('/tmp/_h_q.json'))['queue']['id'])")
[ -n "$Q_ID" ] && { echo "  ✓ queue created"; PASS=$((PASS+1)); }

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
