#!/usr/bin/env bash
# E2E test for GoalOS extended features
# Assumes the service is already running on $PORT (default 4242)

set -u

PORT="${PORT:-4242}"
BASE="http://localhost:${PORT}/api/goals"
PASS=0
FAIL=0
TEST_NUM=0

# Helpers ----------------------------------------------------------
fail_count=0

note()  { printf "\n\033[1;36m== %s ==\033[0m\n" "$*"; }
ok()    { printf "  \033[1;32m[PASS]\033[0m %s\n" "$*"; PASS=$((PASS+1)); }
bad()   { printf "  \033[1;31m[FAIL]\033[0m %s\n" "$*"; FAIL=$((FAIL+1)); }

assert_eq() {
  local label="$1"; local expected="$2"; local actual="$3"
  if [ "$expected" = "$actual" ]; then
    ok "$label  (expected=$expected, got=$actual)"
  else
    bad "$label  (expected=$expected, got=$actual)"
  fi
}

assert_ge() {
  local label="$1"; local min="$2"; local actual="$3"
  if [ "$actual" -ge "$min" ] 2>/dev/null; then
    ok "$label  (min=$min, got=$actual)"
  else
    bad "$label  (min=$min, got=$actual)"
  fi
}

# JSON field extraction -> writes value to /tmp/_go_<name>.txt
jget() {
  # $1 = file, $2 = python expression
  python3 -c "
import json, sys
try:
  with open('$1') as f:
    d = json.load(f)
  v = $2
  if isinstance(v, (dict, list)):
    print(json.dumps(v))
  elif v is None:
    print('null')
  elif isinstance(v, bool):
    print('true' if v else 'false')
  else:
    print(v)
except Exception as e:
  print('ERR:'+str(e))
  sys.exit(1)
" > "/tmp/_go_$3.txt" 2>&1
  cat "/tmp/_go_$3.txt"
}

cleanup_tmp() {
  rm -f /tmp/_go_*.json /tmp/_go_*.txt 2>/dev/null
}
cleanup_tmp

note "Health check"
curl -s "http://localhost:${PORT}/health" > /tmp/_go_health.json
jget /tmp/_go_health.json "d.get('status')" health_status
assert_eq "service is healthy" "healthy" "$(cat /tmp/_go_health_status.txt)"

# Test 1 -----------------------------------------------------------
note "Test 1: POST goal with level=objective, category=business"
NOW_PLUS_30=$(python3 -c "import datetime; print((datetime.datetime.utcnow()+datetime.timedelta(days=30)).isoformat()+'Z')")
curl -s -X POST "$BASE/" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Launch RTMN Expansion\",
    \"description\": \"Expand to 3 new industry verticals\",
    \"ownerCorpId\": \"corp_test_001\",
    \"level\": \"objective\",
    \"category\": \"business\",
    \"priority\": 2,
    \"deadline\": \"$NOW_PLUS_30\"
  }" > /tmp/_go_t1.json

jget /tmp/_go_t1.json "d.get('id')" t1_id
jget /tmp/_go_t1.json "d.get('level')" t1_level
jget /tmp/_go_t1.json "d.get('category')" t1_category
jget /tmp/_go_t1.json "d.get('ownerCorpId')" t1_owner

T1_ID=$(cat /tmp/_go_t1_id.txt)
assert_eq "t1: level is objective" "objective" "$(cat /tmp/_go_t1_level.txt)"
assert_eq "t1: category is business" "business" "$(cat /tmp/_go_t1_category.txt)"
assert_eq "t1: ownerCorpId matches" "corp_test_001" "$(cat /tmp/_go_t1_owner.txt)"

# Test 2 -----------------------------------------------------------
note "Test 2: POST /plan on objective -> create 3-5 milestones"
curl -s -X POST "$BASE/${T1_ID}/plan" > /tmp/_go_t2.json
jget /tmp/_go_t2.json "d.get('count')" t2_count
jget /tmp/_go_t2.json "d.get('childLevel')" t2_childLevel
jget /tmp/_go_t2.json "len(d.get('subGoals', []))" t2_subLen

T2_COUNT=$(cat /tmp/_go_t2_count.txt)
T2_CHILD=$(cat /tmp/_go_t2_childLevel.txt)
T2_SUBLEN=$(cat /tmp/_go_t2_subLen.txt)

assert_eq "t2: childLevel is milestone" "milestone" "$T2_CHILD"
assert_ge "t2: 3+ milestones created" 3 "$T2_COUNT"
assert_ge "t2: count <= 5 milestones" 3 "$T2_COUNT"   # loose lower bound (already checked)
[ "$T2_COUNT" -le 5 ] && ok "t2: count <= 5 milestones (got $T2_COUNT)" || bad "t2: count <= 5 (got $T2_COUNT)"
assert_eq "t2: subGoals length matches count" "$T2_COUNT" "$T2_SUBLEN"

# Capture first milestone id
python3 -c "
import json
with open('/tmp/_go_t2.json') as f: d=json.load(f)
print(d['subGoals'][0]['id'])
" > /tmp/_go_t2_m1_id.txt
T2_M1=$(cat /tmp/_go_t2_m1_id.txt)

# Verify parent updated
curl -s "$BASE/${T1_ID}" > /tmp/_go_t2_parent.json
jget /tmp/_go_t2_parent.json "len(d.get('children', []))" t2_children
T2_CHILDREN=$(cat /tmp/_go_t2_children.txt)
assert_eq "t2: parent has children list with same count" "$T2_COUNT" "$T2_CHILDREN"

# Test 3 -----------------------------------------------------------
note "Test 3: POST /plan on milestone -> create 3-7 tasks"
# Update milestone to have a near deadline to test priority
NOW_PLUS_10=$(python3 -c "import datetime; print((datetime.datetime.utcnow()+datetime.timedelta(days=10)).isoformat()+'Z')")
curl -s -X PATCH "$BASE/${T2_M1}" \
  -H "Content-Type: application/json" \
  -d "{\"deadline\": \"$NOW_PLUS_10\"}" > /tmp/_go_t3a.json

curl -s -X POST "$BASE/${T2_M1}/plan" > /tmp/_go_t3.json
jget /tmp/_go_t3.json "d.get('count')" t3_count
jget /tmp/_go_t3.json "d.get('childLevel')" t3_childLevel
jget /tmp/_go_t3.json "d.get('subGoals')[0].get('priority')" t3_priority

T3_COUNT=$(cat /tmp/_go_t3_count.txt)
T3_CHILD=$(cat /tmp/_go_t3_childLevel.txt)
T3_PRI=$(cat /tmp/_go_t3_priority.txt)

assert_eq "t3: childLevel is task" "task" "$T3_CHILD"
assert_ge "t3: 3+ tasks created" 3 "$T3_COUNT"
[ "$T3_COUNT" -le 7 ] && ok "t3: count <= 7 tasks (got $T3_COUNT)" || bad "t3: count <= 7 (got $T3_COUNT)"
# Near deadline should yield CRITICAL=1 or HIGH=2
if [ "$T3_PRI" = "1" ] || [ "$T3_PRI" = "2" ]; then
  ok "t3: auto-priority is HIGH/CRITICAL given near deadline (got $T3_PRI)"
else
  bad "t3: auto-priority should be HIGH/CRITICAL, got $T3_PRI"
fi

# Capture first task under milestone
python3 -c "
import json
with open('/tmp/_go_t3.json') as f: d=json.load(f)
print(d['subGoals'][0]['id'])
" > /tmp/_go_t3_t1.txt
T3_T1=$(cat /tmp/_go_t3_t1.txt)

# Test 4 -----------------------------------------------------------
note "Test 4: Add dependencies (no cycle)"
# Create a second task and make T3_T1 depend on it
curl -s -X POST "$BASE/" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Prereq Task\",
    \"ownerCorpId\": \"corp_test_001\",
    \"level\": \"task\",
    \"category\": \"business\",
    \"parentGoalId\": \"$T2_M1\"
  }" > /tmp/_go_t4_prereq.json
jget /tmp/_go_t4_prereq.json "d.get('id')" t4_prereq_id
T4_PREREQ=$(cat /tmp/_go_t4_prereq_id.txt)

curl -s -X POST "$BASE/${T3_T1}/dependencies" \
  -H "Content-Type: application/json" \
  -d "{\"dependsOnIds\": [\"$T4_PREREQ\"]}" > /tmp/_go_t4.json
jget /tmp/_go_t4.json "d.get('goalId')" t4_goal
jget /tmp/_go_t4.json "len(d.get('dependsOn', []))" t4_depLen
T4_GOAL=$(cat /tmp/_go_t4_goal.txt)
T4_DEPLEN=$(cat /tmp/_go_t4_depLen.txt)
assert_eq "t4: response goalId matches" "$T3_T1" "$T4_GOAL"
assert_ge "t4: dependency added (len>=1)" 1 "$T4_DEPLEN"

# Check no cycle on the new dep
curl -s -X POST "$BASE/${T3_T1}/dependencies/check-cycle" > /tmp/_go_t4_check.json
jget /tmp/_go_t4_check.json "d.get('hasCycle')" t4_cycle
assert_eq "t4: no cycle in simple dependency" "False" "$(cat /tmp/_go_t4_cycle.txt)"

# Test 5 -----------------------------------------------------------
note "Test 5: Add cycle -> check detects cycle"
# Make T4_PREREQ depend on T3_T1 (creates cycle)
curl -s -X POST "$BASE/${T4_PREREQ}/dependencies" \
  -H "Content-Type: application/json" \
  -d "{\"dependsOnIds\": [\"$T3_T1\"]}" > /tmp/_go_t5_resp.json
jget /tmp/_go_t5_resp.json "d.get('error', '')" t5_err
T5_ERR=$(cat /tmp/_go_t5_err.txt)
if echo "$T5_ERR" | grep -q "cycle" 2>/dev/null; then
  ok "t5: cycle creation rejected with cycle-related error"
else
  # If it didn't reject, the cycle check endpoint should still detect
  curl -s -X POST "$BASE/${T3_T1}/dependencies/check-cycle" > /tmp/_go_t5_check.json
  jget /tmp/_go_t5_check.json "d.get('hasCycle')" t5_check_cycle
  if [ "$(cat /tmp/_go_t5_check_cycle.txt)" = "true" ]; then
    ok "t5: cycle detected by /check-cycle"
  else
    bad "t5: expected cycle to be detected, got error='$T5_ERR'"
  fi
fi

# Test 6 -----------------------------------------------------------
note "Test 6: POST /predict-completion returns prediction"
curl -s -X POST "$BASE/${T1_ID}/predict-completion" > /tmp/_go_t6.json
jget /tmp/_go_t6.json "'yes' if 'predictedCompletion' in d else 'no'" t6_has_pred
jget /tmp/_go_t6.json "'yes' if 'confidence' in d else 'no'" t6_has_conf
jget /tmp/_go_t6.json "'yes' if 'daysFromDeadline' in d else 'no'" t6_has_dfd
jget /tmp/_go_t6.json "'yes' if 'riskLevel' in d else 'no'" t6_has_risk
jget /tmp/_go_t6.json "d.get('riskLevel')" t6_risk

T6_PRED=$(cat /tmp/_go_t6_has_pred.txt)
T6_CONF=$(cat /tmp/_go_t6_has_conf.txt)
T6_DFD=$(cat /tmp/_go_t6_has_dfd.txt)
T6_RISK=$(cat /tmp/_go_t6_has_risk.txt)
T6_RISKV=$(cat /tmp/_go_t6_risk.txt)

assert_eq "t6: predictedCompletion present" "yes" "$T6_PRED"
assert_eq "t6: confidence present" "yes" "$T6_CONF"
assert_eq "t6: daysFromDeadline present" "yes" "$T6_DFD"
assert_eq "t6: riskLevel present" "yes" "$T6_RISK"
if [ -n "$T6_RISKV" ] && [ "$T6_RISKV" != "null" ]; then
  ok "t6: riskLevel value is non-empty ($T6_RISKV)"
else
  bad "t6: riskLevel value is empty"
fi

# Test 7 -----------------------------------------------------------
note "Test 7: POST /optimize returns ordered tasks"
curl -s -X POST "$BASE/${T1_ID}/optimize" > /tmp/_go_t7.json
jget /tmp/_go_t7.json "len(d.get('orderedTasks', []))" t7_ordered
jget /tmp/_go_t7.json "d.get('totalTasks')" t7_total
jget /tmp/_go_t7.json "d.get('hasCycle')" t7_cycle

T7_ORDERED=$(cat /tmp/_go_t7_ordered.txt)
T7_TOTAL=$(cat /tmp/_go_t7_total.txt)
T7_CYCLE=$(cat /tmp/_go_t7_cycle.txt)

assert_ge "t7: orderedTasks has items" 1 "$T7_ORDERED"
assert_eq "t7: totalTasks >= orderedTasks" "True" "$([ "$T7_TOTAL" -ge "$T7_ORDERED" ] && echo True || echo False)"

# Verify sequential ordering: first item order=1, last has order == N
python3 -c "
import json
with open('/tmp/_go_t7.json') as f: d=json.load(f)
o = d.get('orderedTasks', [])
if o and o[0].get('order') == 1 and o[-1].get('order') == len(o):
    print('yes')
else:
    print('no:'+str([(x.get('order')) for x in o[:3]]))
" > /tmp/_go_t7_seq.txt
T7_SEQ=$(cat /tmp/_go_t7_seq.txt)
assert_eq "t7: tasks are sequentially ordered 1..N" "yes" "$T7_SEQ"

# Test 8 -----------------------------------------------------------
note "Test 8: POST /recommend returns 3+ suggestions"
curl -s -X POST "$BASE/recommend" \
  -H "Content-Type: application/json" \
  -d "{
    \"ownerCorpId\": \"corp_test_001\",
    \"context\": {
      \"recentFailures\": [{\"title\": \"Onboarding flow drop-off\"}],
      \"recentSuccesses\": [{\"title\": \"Loyalty program engagement\"}],
      \"businessArea\": \"sales\"
    }
  }" > /tmp/_go_t8.json
jget /tmp/_go_t8.json "len(d.get('recommendations', []))" t8_count
jget /tmp/_go_t8.json "'yes' if all('reasoning' in r for r in d.get('recommendations', [])) else 'no'" t8_reasoning

T8_COUNT=$(cat /tmp/_go_t8_count.txt)
T8_REASON=$(cat /tmp/_go_t8_reasoning.txt)

assert_ge "t8: 3+ recommendations" 3 "$T8_COUNT"
[ "$T8_COUNT" -le 5 ] && ok "t8: count <= 5 (got $T8_COUNT)" || bad "t8: count > 5 (got $T8_COUNT)"
assert_eq "t8: each recommendation has reasoning" "yes" "$T8_REASON"

# Test 9 -----------------------------------------------------------
note "Test 9: GET analytics endpoints return counts"
curl -s "$BASE/analytics/completion-rate?ownerCorpId=corp_test_001" > /tmp/_go_t9a.json
jget /tmp/_go_t9a.json "d.get('total')" t9a_total
jget /tmp/_go_t9a.json "'yes' if 'rate' in d else 'no'" t9a_has_rate
T9A_TOTAL=$(cat /tmp/_go_t9a_total.txt)
assert_ge "t9a: completion-rate total >= 1" 1 "$T9A_TOTAL"
assert_eq "t9a: completion-rate has rate field" "yes" "$(cat /tmp/_go_t9a_has_rate.txt)"

curl -s "$BASE/analytics/by-category?ownerCorpId=corp_test_001" > /tmp/_go_t9b.json
jget /tmp/_go_t9b.json "d.get('counts', {}).get('business', 0)" t9b_business
jget /tmp/_go_t9b.json "d.get('total')" t9b_total
T9B_BIZ=$(cat /tmp/_go_t9b_business.txt)
T9B_TOT=$(cat /tmp/_go_t9b_total.txt)
assert_ge "t9b: business count >= 1" 1 "$T9B_BIZ"
assert_ge "t9b: total >= 1" 1 "$T9B_TOT"

curl -s "$BASE/analytics/at-risk?ownerCorpId=corp_test_001" > /tmp/_go_t9c.json
jget /tmp/_go_t9c.json "d.get('count')" t9c_count
jget /tmp/_go_t9c.json "'yes' if 'atRisk' in d else 'no'" t9c_has
assert_eq "t9c: at-risk has atRisk field" "yes" "$(cat /tmp/_go_t9c_has.txt)"
# T2_M1 has deadline in 10 days, progress 0 -> should be at risk
[ "$(cat /tmp/_go_t9c_count.txt)" -ge 1 ] && ok "t9c: at-risk count >= 1 (got $(cat /tmp/_go_t9c_count.txt))" || bad "t9c: at-risk count should be >= 1 (got $(cat /tmp/_go_t9c_count.txt))"

# Test 10 ----------------------------------------------------------
note "Test 10: GET /:goalId/descendants returns tree"
curl -s "$BASE/${T1_ID}/descendants" > /tmp/_go_t10.json
jget /tmp/_go_t10.json "d.get('rootId')" t10_root
jget /tmp/_go_t10.json "d.get('totalNodes')" t10_total
jget /tmp/_go_t10.json "len(d.get('tree', {}).get('children', []))" t10_rootKids
T10_ROOT=$(cat /tmp/_go_t10_root.txt)
T10_TOTAL=$(cat /tmp/_go_t10_total.txt)
T10_KIDS=$(cat /tmp/_go_t10_rootKids.txt)
assert_eq "t10: rootId matches" "$T1_ID" "$T10_ROOT"
assert_ge "t10: totalNodes >= 4 (1 obj + 3+ milestones + 3+ tasks)" 4 "$T10_TOTAL"
assert_ge "t10: root has children" 1 "$T10_KIDS"

# Test 11 (bonus) --------------------------------------------------
note "Test 11 (bonus): GET /:goalId/ancestors returns chain"
curl -s "$BASE/${T3_T1}/ancestors" > /tmp/_go_t11.json
jget /tmp/_go_t11.json "d.get('depth')" t11_depth
T11_DEPTH=$(cat /tmp/_go_t11_depth.txt)
assert_ge "t11: ancestors depth >= 3 (task -> milestone -> objective)" 3 "$T11_DEPTH"

# Test 12 (bonus) --------------------------------------------------
note "Test 12 (bonus): GET /:goalId/blocked-by returns blocking goals"
curl -s "$BASE/${T3_T1}/blocked-by" > /tmp/_go_t12.json
jget /tmp/_go_t12.json "len(d.get('allDependencies', []))" t12_all
T12_ALL=$(cat /tmp/_go_t12_all.txt)
assert_ge "t12: blocked-by has at least 1 dependency listed" 1 "$T12_ALL"

# Test 13 (default values) -----------------------------------------
note "Test 13: defaults applied (level=goal, category=personal)"
curl -s -X POST "$BASE/" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Plain goal no level\",
    \"ownerCorpId\": \"corp_test_002\"
  }" > /tmp/_go_t13.json
jget /tmp/_go_t13.json "d.get('level')" t13_level
jget /tmp/_go_t13.json "d.get('category')" t13_cat
assert_eq "t13: default level=goal" "goal" "$(cat /tmp/_go_t13_level.txt)"
assert_eq "t13: default category=personal" "personal" "$(cat /tmp/_go_t13_cat.txt)"

# Summary ----------------------------------------------------------
echo ""
echo "=========================================="
printf "\033[1;32mPASS: %d\033[0m  |  \033[1;31mFAIL: %d\033[0m\n" "$PASS" "$FAIL"
echo "=========================================="

cleanup_tmp
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
