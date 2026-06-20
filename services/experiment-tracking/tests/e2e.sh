#!/bin/bash
set -e
PORT=${PORT:-4781}
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

echo "=== experiment-tracking e2e: project → experiment → 3 runs → metrics → compare ==="

# 1. Project
PROJ=$(curl -s -X POST -H "Content-Type: application/json" -d '{"name":"e2e-proj","description":"test"}' $BASE/api/projects)
PID=$(echo $PROJ | python3 -c "import sys,json; print(json.load(sys.stdin)['project']['id'])")
[ -n "$PID" ] && { echo "  ✓ project created"; PASS=$((PASS+1)); }

# 2. Experiment
EXP=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"project_id\":\"$PID\",\"name\":\"e2e-exp\"}" $BASE/api/experiments)
EID=$(echo $EXP | python3 -c "import sys,json; print(json.load(sys.stdin)['experiment']['id'])")
[ -n "$EID" ] && { echo "  ✓ experiment created"; PASS=$((PASS+1)); }

# 3. Three runs with different hyperparams
RIDS=()
for name in alpha beta gamma; do
  RES=$(curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"experiment_id\":\"$EID\",\"name\":\"$name\",\"hyperparams\":{\"lr\":0.001,\"epochs\":5},\"tags\":[\"variant\"]}" \
    $BASE/api/runs)
  RID=$(echo $RES | python3 -c "import sys,json; print(json.load(sys.stdin)['run']['id'])")
  RIDS+=($RID)
done
[ ${#RIDS[@]} -eq 3 ] && { echo "  ✓ 3 runs created"; PASS=$((PASS+1)); }

# 4. Log metrics across steps for each run
for RID in "${RIDS[@]}"; do
  for step in 0 1 2 3; do
    LOSS=$(python3 -c "print(round(1.5/($step+1) + 0.1, 4))")
    code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
      -d "{\"name\":\"loss\",\"value\":$LOSS,\"step\":$step}" $BASE/api/runs/$RID/log)
    check "log loss step $step for $RID" $code
  done
done

# 5. Verify metric aggregation
M=$(curl -s $BASE/api/runs/${RIDS[0]}/metrics)
TOTAL=$(echo $M | python3 -c "import sys,json; print(json.load(sys.stdin)['total_points'])")
[ "$TOTAL" -ge "4" ] && { echo "  ✓ metrics aggregated ($TOTAL points)"; PASS=$((PASS+1)); } || { echo "  ✗ metrics: $TOTAL"; FAIL=$((FAIL+1)); }

# 6. Add artifacts
for RID in "${RIDS[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
    -d "{\"name\":\"model.bin\",\"type\":\"model\",\"size_bytes\":1048576,\"url\":\"s3://models/$RID\"}" \
    $BASE/api/runs/$RID/artifacts); check "artifact for $RID" $code
done

# 7. Compare runs
COMP=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"run_ids\":[\"${RIDS[0]}\",\"${RIDS[1]}\",\"${RIDS[2]}\"],\"metric\":\"loss\"}" \
  $BASE/api/compare)
COUNT=$(echo $COMP | python3 -c "import sys,json; print(len(json.load(sys.stdin)['comparison']))")
[ "$COUNT" = "3" ] && { echo "  ✓ compared 3 runs"; PASS=$((PASS+1)); } || { echo "  ✗ compare: $COUNT"; FAIL=$((FAIL+1)); }

# 8. Finish all runs
for RID in "${RIDS[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/runs/$RID/finish); check "finish $RID" $code
done

# 9. Filter by experiment
FILTERED=$(curl -s "$BASE/api/runs?experiment_id=$EID&status=completed" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['runs']))")
[ "$FILTERED" = "3" ] && { echo "  ✓ filter by status=completed works"; PASS=$((PASS+1)); } || { echo "  ✗ filter: $FILTERED"; FAIL=$((FAIL+1)); }

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1