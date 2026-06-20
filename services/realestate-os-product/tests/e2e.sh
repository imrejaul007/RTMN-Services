#!/bin/bash
set -e
PORT=${PORT:-5276}
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

echo "=== realestate-os-product e2e: property → agent → listing → buyer → showing → offer → accept → contract → close ==="

# 1. Property (seeded)
curl -s $BASE/api/properties > /tmp/_re_p.json
P_ID=$(python3 -c "import json; print(json.load(open('/tmp/_re_p.json'))['properties'][0]['id'])")
[ -n "$P_ID" ] && { echo "  ✓ property seeded"; PASS=$((PASS+1)); }

# 2. Agent (seeded)
curl -s $BASE/api/agents > /tmp/_re_a.json
A_ID=$(python3 -c "import json; print(json.load(open('/tmp/_re_a.json'))['agents'][0]['id'])")
[ -n "$A_ID" ] && { echo "  ✓ agent seeded"; PASS=$((PASS+1)); }

# 3. Listing (create new)
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"property_id\":\"$P_ID\",\"agent_id\":\"$A_ID\",\"price\":1500000}" \
  $BASE/api/listings > /tmp/_re_l.json
L_ID=$(python3 -c "import json; print(json.load(open('/tmp/_re_l.json'))['listing']['id'])")
[ -n "$L_ID" ] && { echo "  ✓ listing created"; PASS=$((PASS+1)); }

# 4. Buyer
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"name\":\"E2E Buyer\",\"email\":\"b@e2e.com\",\"pre_approved\":true,\"max_budget\":1600000,\"agent_id\":\"$A_ID\"}" \
  $BASE/api/buyers > /tmp/_re_b.json
B_ID=$(python3 -c "import json; print(json.load(open('/tmp/_re_b.json'))['buyer']['id'])")
[ -n "$B_ID" ] && { echo "  ✓ buyer created"; PASS=$((PASS+1)); }

# 5. Showing
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"listing_id\":\"$L_ID\",\"buyer_id\":\"$B_ID\",\"scheduled_at\":\"2026-07-15T15:00:00Z\"}" \
  $BASE/api/showings > /tmp/_re_s.json
S_ID=$(python3 -c "import json; print(json.load(open('/tmp/_re_s.json'))['showing']['id'])")
[ -n "$S_ID" ] && { echo "  ✓ showing scheduled"; PASS=$((PASS+1)); }

# 6. Conflict detection
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d "{\"listing_id\":\"$L_ID\",\"buyer_id\":\"$B_ID\",\"scheduled_at\":\"2026-07-15T15:00:00Z\"}" \
  $BASE/api/showings)
[ "$code" = "400" ] && { echo "  ✓ showing conflict blocked"; PASS=$((PASS+1)); } || { echo "  ✗ conflict: $code"; FAIL=$((FAIL+1)); }

# 7. Offer
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"listing_id\":\"$L_ID\",\"buyer_id\":\"$B_ID\",\"amount\":1480000,\"contingencies\":[\"inspection\",\"financing\"]}" \
  $BASE/api/offers > /tmp/_re_o.json
O_ID=$(python3 -c "import json; print(json.load(open('/tmp/_re_o.json'))['offer']['id'])")
[ -n "$O_ID" ] && { echo "  ✓ offer submitted"; PASS=$((PASS+1)); }

# 8. Accept offer → contract created
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"closing_date":"2026-09-01"}' $BASE/api/offers/$O_ID/accept > /tmp/_re_c.json
C_ID=$(python3 -c "import json; print(json.load(open('/tmp/_re_c.json'))['contract']['id'])")
[ -n "$C_ID" ] && { echo "  ✓ contract created"; PASS=$((PASS+1)); }

# 9. Sign contract (both parties)
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"signed_by_seller":true}' $BASE/api/contracts/$C_ID); check "seller sign" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"signed_by_buyer":true}' $BASE/api/contracts/$C_ID); check "buyer sign" $code

# Verify contract fully signed
curl -s $BASE/api/contracts/$C_ID > /tmp/_re_c2.json
STATUS=$(python3 -c "import json; print(json.load(open('/tmp/_re_c2.json'))['contract']['status'])")
[ "$STATUS" = "fully-signed" ] && { echo "  ✓ contract fully-signed"; PASS=$((PASS+1)); } || { echo "  ✗ status: $STATUS"; FAIL=$((FAIL+1)); }

# 10. Close → sale_price + commission
curl -s -X POST $BASE/api/contracts/$C_ID/close > /tmp/_re_cl.json
COMMISSION=$(python3 -c "import json; print(json.load(open('/tmp/_re_cl.json'))['closing']['commission'])")
SALE_PRICE=$(python3 -c "import json; print(json.load(open('/tmp/_re_cl.json'))['closing']['sale_price'])")
[ "$COMMISSION" = "37000" ] && [ "$SALE_PRICE" = "1480000" ] && { echo "  ✓ closed: \$$SALE_PRICE, commission=\$$COMMISSION"; PASS=$((PASS+1)); } || { echo "  ✗ sale=$SALE_PRICE comm=$COMMISSION"; FAIL=$((FAIL+1)); }

# Verify listing & property marked sold
curl -s "$BASE/api/listings?status=sold" > /tmp/_re_l2.json
SOLD=$(python3 -c "import json; print(len(json.load(open('/tmp/_re_l2.json'))['listings']))")
[ "$SOLD" -ge "1" ] && { echo "  ✓ listing marked sold"; PASS=$((PASS+1)); } || { echo "  ✗ sold: $SOLD"; FAIL=$((FAIL+1)); }

# 11. Filters
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/properties?city=San%20Francisco"); check "filter properties" $code
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/offers?buyer_id=$B_ID"); check "filter offers" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
