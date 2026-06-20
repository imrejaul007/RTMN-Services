#!/bin/bash
set -e
PORT=${PORT:-4265}
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

echo "=== investor-copilot e2e: investor → round → allocate → comm → update → metric → cap-table ==="

# 1. Investor
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"E2E Ventures","type":"vc","email":"e2e@example.com"}' $BASE/api/investors > /tmp/_ic_i.json
I_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ic_i.json'))['investor']['id'])")
[ -n "$I_ID" ] && { echo "  ✓ investor created"; PASS=$((PASS+1)); }

# 2. Round
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"E2E Series B","target_usd":10000000,"share_price":12.50}' \
  $BASE/api/rounds > /tmp/_ic_r.json
R_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ic_r.json'))['round']['id'])")
[ -n "$R_ID" ] && { echo "  ✓ round created"; PASS=$((PASS+1)); }

# 3. Allocate to round
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"investor_id\":\"$I_ID\",\"amount_usd\":2500000}" $BASE/api/rounds/$R_ID/allocate > /tmp/_ic_a.json
SHARES=$(python3 -c "import json; print(json.load(open('/tmp/_ic_a.json'))['allocation']['shares'])")
RAISED=$(python3 -c "import json; print(json.load(open('/tmp/_ic_a.json'))['round']['raised_usd'])")
[ "$SHARES" = "200000" ] && [ "$RAISED" = "2500000" ] && { echo "  ✓ allocation: $SHARES shares, raised=\$$RAISED"; PASS=$((PASS+1)); } || { echo "  ✗ shares=$SHARES raised=$RAISED"; FAIL=$((FAIL+1)); }

# 4. Communication
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"subject\":\"Series B Closing\",\"body\":\"Round closing soon\",\"recipients\":[\"$I_ID\"],\"type\":\"announcement\"}" \
  $BASE/api/communications > /tmp/_ic_c.json
C_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ic_c.json'))['communication']['id'])")
[ -n "$C_ID" ] && { echo "  ✓ communication sent"; PASS=$((PASS+1)); }

# 5. Investor update
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"title":"Q2 Update","body":"Strong growth","period":"Q2 2026","metrics":{"mrr":140000},"publish":true}' \
  $BASE/api/updates > /tmp/_ic_u.json
U_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ic_u.json'))['update']['id'])")
[ -n "$U_ID" ] && { echo "  ✓ update published"; PASS=$((PASS+1)); }

# 6. Publish toggle
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"published":false}' $BASE/api/updates/$U_ID); check "PATCH update" $code

# 7. Metric
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"Runway","value":18,"unit":"months","trend":"flat"}' $BASE/api/metrics > /tmp/_ic_m.json
M_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ic_m.json'))['metric']['id'])")
[ -n "$M_ID" ] && { echo "  ✓ metric added"; PASS=$((PASS+1)); }

# 8. Cap table
curl -s $BASE/api/cap-table > /tmp/_ic_ct.json
ROWS=$(python3 -c "import json; print(len(json.load(open('/tmp/_ic_ct.json'))['cap_table']))")
[ "$ROWS" -ge "1" ] && { echo "  ✓ cap table has $ROWS entries"; PASS=$((PASS+1)); } || { echo "  ✗ cap table: $ROWS"; FAIL=$((FAIL+1)); }

# 9. Close round
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"status":"closed"}' $BASE/api/rounds/$R_ID); check "close round" $code

# 10. Filters
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/investors?type=vc"); check "filter investors" $code
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/allocations?round_id=$R_ID"); check "filter allocations" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
