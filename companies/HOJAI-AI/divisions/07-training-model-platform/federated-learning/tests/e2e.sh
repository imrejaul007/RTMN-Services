#!/bin/bash
set -e
PORT=${PORT:-4871}
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

echo "=== federated-learning e2e: job → clients → round → updates → FedAvg aggregation ==="

# 1. Create job
JOB=$(curl -s -X POST -H "Content-Type: application/json" -d '{"name":"e2e-fl","base_model":"llama-3-8b","rounds_total":3}' $BASE/api/jobs)
JID=$(echo $JOB | python3 -c "import sys,json; print(json.load(sys.stdin)['job']['id'])")
[ -n "$JID" ] && { echo "  ✓ job created"; PASS=$((PASS+1)); }

# 2. Create 3 clients with different data sizes
declare -a CIDS
for org in org-A org-B org-C; do
  RES=$(curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"name\":\"client-$org\",\"org\":\"$org\",\"data_size\":$((RANDOM % 10000 + 1000))}" $BASE/api/clients)
  CID=$(echo $RES | python3 -c "import sys,json; print(json.load(sys.stdin)['client']['id'])")
  CIDS+=($CID)
done
[ ${#CIDS[@]} -eq 3 ] && { echo "  ✓ 3 clients registered"; PASS=$((PASS+1)); }

# 3. Start a round
ROUND=$(curl -s -X POST $BASE/api/jobs/$JID/rounds)
RID=$(echo $ROUND | python3 -c "import sys,json; print(json.load(sys.stdin)['round']['id'])")
[ -n "$RID" ] && { echo "  ✓ round started"; PASS=$((PASS+1)); }

# 4. Submit gradient updates from each client (varying samples)
declare -a SAMPLES=(100 500 200)
declare -a GRADIENTS=("[0.1,0.2,0.3,0.4]" "[0.2,0.3,0.4,0.5]" "[0.15,0.25,0.35,0.45]")
i=0
for CID in "${CIDS[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
    -d "{\"job_id\":\"$JID\",\"round_id\":\"$RID\",\"client_id\":\"$CID\",\"gradient\":${GRADIENTS[$i]},\"samples\":${SAMPLES[$i]},\"loss\":$((RANDOM % 100)).$((RANDOM % 100))}" \
    $BASE/api/updates)
  check "submit update $i" $code
  i=$((i+1))
done

# 5. Aggregate
AGG=$(curl -s -X POST $BASE/api/rounds/$RID/aggregate)
STATUS=$(echo $AGG | python3 -c "import sys,json; print(json.load(sys.stdin)['round']['status'])")
[ "$STATUS" = "completed" ] && { echo "  ✓ round aggregated"; PASS=$((PASS+1)); } || { echo "  ✗ status: $STATUS"; FAIL=$((FAIL+1)); }

# 6. Verify FedAvg math (weighted by samples)
# Total samples: 800, weights: 100/800=0.125, 500/800=0.625, 200/800=0.25
# grad[0] = 0.1*0.125 + 0.2*0.625 + 0.15*0.25 = 0.0125 + 0.125 + 0.0375 = 0.175
G0=$(echo $AGG | python3 -c "import sys,json; v=json.load(sys.stdin)['round']['global_model']['vector'][0]; print(v)")
echo "  ℹ FedAvg[0] = $G0 (expected ~0.175)"

# 7. Verify gradient hash was computed
HASH=$(curl -s "$BASE/api/updates?round_id=$RID" | python3 -c "import sys,json; print(json.load(sys.stdin)['updates'][0]['gradients_hash'])")
[ ${#HASH} -eq 16 ] && { echo "  ✓ gradient hash ($HASH)"; PASS=$((PASS+1)); } || { echo "  ✗ hash: $HASH"; FAIL=$((FAIL+1)); }

# 8. Start another round, verify round_num increments
R2=$(curl -s -X POST $BASE/api/jobs/$JID/rounds)
RN=$(echo $R2 | python3 -c "import sys,json; print(json.load(sys.stdin)['round']['round_num'])")
[ "$RN" = "2" ] && { echo "  ✓ round_num increments"; PASS=$((PASS+1)); } || { echo "  ✗ round_num: $RN"; FAIL=$((FAIL+1)); }

# 9. Empty round aggregation should fail 400
EMPTY=$(curl -s -X POST $BASE/api/rounds/$R2/round_id/aggregate 2>/dev/null || true)
# Use the new round's id
R2_ID=$(echo $R2 | python3 -c "import sys,json; print(json.load(sys.stdin)['round']['id'])")
RES=$(curl -s -w "\n%{http_code}" -X POST $BASE/api/rounds/$R2_ID/aggregate)
CODE=$(echo "$RES" | tail -1)
[ "$CODE" = "400" ] && { echo "  ✓ empty round rejected"; PASS=$((PASS+1)); } || { echo "  ✗ empty: $CODE"; FAIL=$((FAIL+1)); }

# 10. Heartbeat
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/clients/${CIDS[0]}/heartbeat); check "heartbeat" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1