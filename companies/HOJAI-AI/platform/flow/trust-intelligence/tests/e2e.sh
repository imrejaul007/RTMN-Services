#!/bin/bash
# Trust Intelligence - End-to-End Workflow Tests
# Usage: bash tests/e2e.sh
set -u

BASE_URL="${BASE_URL:-http://localhost:4882}"
PASS=0
FAIL=0
TOTAL=0
TMPDIR="${TMPDIR:-/tmp}"

# Helpers
post()   { curl -s -X POST -H "Content-Type: application/json" -d "$2" "${BASE_URL}$1" > "$3"; }
get()    { curl -s -X GET "${BASE_URL}$1" > "$2"; }
patch()  { curl -s -X PATCH -H "Content-Type: application/json" -d "$2" "${BASE_URL}$1" > "$3"; }
delete() { curl -s -X DELETE -H "Content-Type: application/json" -d "$2" "${BASE_URL}$1" > "$3"; }

# json_get KEY FILE  (supports dot-notation; uses python json; on macOS sed '$d' instead of head -n -1)
json_get() {
  python3 -c "
import json, sys
try:
  data = json.load(open(sys.argv[1]))
  keys = sys.argv[2].split('.')
  cur = data
  for k in keys:
    if isinstance(cur, list):
      cur = cur[int(k)]
    else:
      cur = cur[k]
  if isinstance(cur, (dict, list)):
    print(json.dumps(cur))
  else:
    print(cur)
except Exception as e:
  print('ERR:', e, file=sys.stderr)
  sys.exit(1)
" "$2" "$1"
}

# json_len KEY FILE
json_len() {
  python3 -c "
import json, sys
try:
  data = json.load(open(sys.argv[1]))
  keys = sys.argv[2].split('.')
  cur = data
  for k in keys:
    if isinstance(cur, list):
      cur = cur[int(k)]
    else:
      cur = cur[k]
  if isinstance(cur, list):
    print(len(cur))
  else:
    print(0)
except Exception as e:
  print(0)
" "$2" "$1"
}

check() {
  local label="$1"
  local cond="$2"
  TOTAL=$((TOTAL+1))
  if eval "$cond"; then
    echo "  PASS  $label"
    PASS=$((PASS+1))
  else
    echo "  FAIL  $label"
    echo "        condition: $cond"
    FAIL=$((FAIL+1))
  fi
}

echo "============================================"
echo "  Trust Intelligence - E2E Tests"
echo "  Target: $BASE_URL"
echo "============================================"

# 1. Verify seed agents present
echo ""
echo "[1] Verify seed agents present"
F1A="${TMPDIR}/_ti_e2e_1a.json"
get "/api/agents/a-genie/trust/score" "$F1A"
check "a-genie has Platinum level"  "[ \"$(json_get level $F1A)\" = 'Platinum' ]"

F1B="${TMPDIR}/_ti_e2e_1b.json"
get "/api/agents/a-sutar/trust/score" "$F1B"
check "a-sutar has Gold level"      "[ \"$(json_get level $F1B)\" = 'Gold' ]"

F1C="${TMPDIR}/_ti_e2e_1c.json"
get "/api/agents/a-new-bot/trust/score" "$F1C"
check "a-new-bot has Iron level"    "[ \"$(json_get level $F1C)\" = 'Iron' ]"

# 2. POST trust score for a-new-bot -> verify score increases
echo ""
echo "[2] POST trust score for a-new-bot"
F2A="${TMPDIR}/_ti_e2e_2a.json"
get "/api/agents/a-new-bot/trust/score" "$F2A"
SCORE_BEFORE=$(json_get effectiveTrust "$F2A")

F2B="${TMPDIR}/_ti_e2e_2b.json"
post "/api/agents/a-new-bot/trust/score" '{"source":"endorsement","score":85,"context":"good early performance","evidence":"10 positive reviews"}' "$F2B"
SCORE_AFTER=$(json_get effectiveTrust "$F2B")
check "score returned"            "[ -n \"$SCORE_AFTER\" ]"
check "score increased"           "python3 -c \"print(float('$SCORE_AFTER') >= float('$SCORE_BEFORE'))\" | grep -q True"

# 3. POST risk flag (severity 8) -> verify score decreases
echo ""
echo "[3] POST risk flag severity 8"
F3A="${TMPDIR}/_ti_e2e_3a.json"
get "/api/agents/a-restaurant-bot/trust/score" "$F3A"
SCORE_BEFORE_RISK=$(json_get effectiveTrust "$F3A")

F3B="${TMPDIR}/_ti_e2e_3b.json"
post "/api/agents/a-restaurant-bot/risk/flag" '{"severity":8,"reason":"Major SLA breach","evidence":"3 late deliveries in 1 hour"}' "$F3B"
SCORE_AFTER_RISK=$(json_get effectiveTrust "$F3B")
check "score decreased after flag"  "python3 -c \"print(float('$SCORE_AFTER_RISK') < float('$SCORE_BEFORE_RISK'))\" | grep -q True"
check "flag status is active"      "[ \"$(json_get flag.status $F3B)\" = 'active' ]"

# 4. POST reputation event -> verify aggregation
echo ""
echo "[4] POST reputation event"
F4A="${TMPDIR}/_ti_e2e_4a.json"
get "/api/agents/a-copilot/reputation" "$F4A"
POS_BEFORE=$(json_get positive "$F4A")

F4B="${TMPDIR}/_ti_e2e_4b.json"
post "/api/agents/a-copilot/reputation" '{"type":"positive","weight":3,"source":"customer-feedback"}' "$F4B"
POS_AFTER=$(json_get aggregate.positive "$F4B")
check "positive count increased"  "python3 -c \"print(int('$POS_AFTER') > int('$POS_BEFORE'))\" | grep -q True"
check "reputation aggregate has events" "[ \"$(json_get aggregate.total $F4B)\" -gt '0' ]"

# 5. GET trust-transitive between two agents -> verify propagation
echo ""
echo "[5] GET transitive trust a-genie -> a-copilot"
F5="${TMPDIR}/_ti_e2e_5.json"
get "/api/agents/a-genie/trust-transitive/a-copilot" "$F5"
TRANSITIVE_SCORE=$(json_get transitiveScore "$F5")
check "transitive score > 0"      "python3 -c \"print(float('$TRANSITIVE_SCORE') > 0)\" | grep -q True"
check "transitive path includes genie" "[ \"$(json_get path.0 $F5)\" = 'a-genie' ]"

# 6. Verify level bucketing
echo ""
echo "[6] Verify level bucketing"
F6A="${TMPDIR}/_ti_e2e_6a.json"
get "/api/agents/a-genie/trust/score" "$F6A"
check "a-genie = Platinum"   "[ \"$(json_get level $F6A)\" = 'Platinum' ]"

F6B="${TMPDIR}/_ti_e2e_6b.json"
get "/api/agents/a-new-bot/trust/score" "$F6B"
check "a-new-bot = Iron"    "[ \"$(json_get level $F6B)\" = 'Iron' ]"

F6C="${TMPDIR}/_ti_e2e_6c.json"
get "/api/agents/a-copilot/trust/score" "$F6C"
check "a-copilot = Gold"    "[ \"$(json_get level $F6C)\" = 'Gold' ]"

F6D="${TMPDIR}/_ti_e2e_6d.json"
get "/api/agents/a-restaurant-bot/trust/score" "$F6D"
check "a-restaurant-bot level defined" "[ -n \"$(json_get level $F6D)\" ]"

# 7. POST confidence record with correct=true -> verify reliability increases
echo ""
echo "[7] POST confidence records"
F7A="${TMPDIR}/_ti_e2e_7a.json"
get "/api/agents/a-genie/confidence" "$F7A"
TOTAL_BEFORE=$(json_get total "$F7A")
CORRECT_BEFORE=$(json_get correct "$F7A")

post "/api/agents/a-genie/confidence" '{"decisionId":"d-1","confidence":0.9,"correct":true}'  "${TMPDIR}/_ti_e2e_7b.json"
post "/api/agents/a-genie/confidence" '{"decisionId":"d-2","confidence":0.85,"correct":true}' "${TMPDIR}/_ti_e2e_7c.json"
post "/api/agents/a-genie/confidence" '{"decisionId":"d-3","confidence":0.8,"correct":true}'  "${TMPDIR}/_ti_e2e_7d.json"

F7E="${TMPDIR}/_ti_e2e_7e.json"
get "/api/agents/a-genie/confidence" "$F7E"
TOTAL_AFTER=$(json_get total "$F7E")
CORRECT_AFTER=$(json_get correct "$F7E")
check "total increased"        "python3 -c \"print(int('$TOTAL_AFTER') > int('$TOTAL_BEFORE'))\" | grep -q True"
check "correct increased"      "python3 -c \"print(int('$CORRECT_AFTER') > int('$CORRECT_BEFORE'))\" | grep -q True"
check "reliability is numeric" "[ -n \"$(json_get reliability $F7E)\" ]"

# 8. Sync from CorpID mock -> verify cache populated
echo ""
echo "[8] Sync from CorpID"
F8="${TMPDIR}/_ti_e2e_8.json"
post "/api/sync-from-corpid" '{}' "$F8"
check "corpid sync cached >= 5" "python3 -c \"print(int('$(json_get cached $F8)') >= 5)\" | grep -q True"
check "corpid source endpoint" "[ \"$(json_get source $F8)\" = 'corpid' ]"

# 9. Analytics distribution shows 5+ agents
echo ""
echo "[9] Analytics distribution"
F9="${TMPDIR}/_ti_e2e_9.json"
get "/api/analytics/distribution" "$F9"
TOTAL_AGENTS=$(json_get totalAgents "$F9")
check "distribution totalAgents >= 5" "python3 -c \"print(int('$TOTAL_AGENTS') >= 5)\" | grep -q True"
# byLevel is a dict of 6 level-name keys (Platinum, Gold, Silver, Bronze, Iron, Restricted)
LEVEL_KEYS=$(python3 -c "import json; d=json.load(open('$F9')); print(len(d.get('byLevel', {})))")
check "distribution has 6 buckets"    "[ \"$LEVEL_KEYS\" = '6' ]"

# 10. Top-trusted leaderboard returns array sorted descending
echo ""
echo "[10] Top-trusted leaderboard"
F10="${TMPDIR}/_ti_e2e_10.json"
get "/api/agents/top-trusted" "$F10"
LB_COUNT=$(json_get count "$F10")
check "leaderboard has 5+ entries" "python3 -c \"print(int('$LB_COUNT') >= 5)\" | grep -q True"

# Verify sorted descending
SORTED_OK=$(python3 -c "
import json
d = json.load(open('$F10'))
scores = [a['score'] for a in d['agents']]
print('yes' if scores == sorted(scores, reverse=True) else 'no')
")
check "leaderboard sorted descending" "[ \"$SORTED_OK\" = 'yes' ]"

# Verify a-genie is at top (highest base trust)
TOP_AGENT=$(json_get agents.0.agentId "$F10")
check "top agent is a-genie" "[ \"$TOP_AGENT\" = 'a-genie' ]"

# 11. Risk clear
echo ""
echo "[11] Clear risk flag"
F11A="${TMPDIR}/_ti_e2e_11a.json"
get "/api/agents/a-new-bot/risk" "$F11A"
ACTIVE_BEFORE=$(json_get activeCount "$F11A")

F11B="${TMPDIR}/_ti_e2e_11b.json"
post "/api/agents/a-new-bot/risk/clear" '{}' "$F11B"
check "clear returned cleared >= 1" "python3 -c \"print(int('$(json_get cleared $F11B)') >= 1)\" | grep -q True"

F11C="${TMPDIR}/_ti_e2e_11c.json"
get "/api/agents/a-new-bot/risk" "$F11C"
ACTIVE_AFTER=$(json_get activeCount "$F11C")
check "active count decreased" "python3 -c \"print(int('$ACTIVE_AFTER') < int('$ACTIVE_BEFORE'))\" | grep -q True"

# 12. Trust edge + graph
echo ""
echo "[12] Create trust edge and verify graph"
F12="${TMPDIR}/_ti_e2e_12.json"
post "/api/trust/edges" '{"trusterId":"a-copilot","trusteeId":"a-new-bot","weight":0.6}' "$F12"
EDGE_ID=$(json_get edge.id "$F12")
check "edge created" "[ -n \"$EDGE_ID\" ]"

F12B="${TMPDIR}/_ti_e2e_12b.json"
get "/api/agents/a-new-bot/trust-graph" "$F12B"
INCOMING_COUNT=$(json_len incoming "$F12B")
check "incoming edges include new" "python3 -c \"print(int('$INCOMING_COUNT') >= 1)\" | grep -q True"

echo ""
echo "============================================"
echo "  Results: $PASS/$TOTAL passed, $FAIL failed"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
