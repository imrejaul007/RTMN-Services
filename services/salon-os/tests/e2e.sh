#!/bin/bash
set -e
PORT=${PORT:-5271}
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

echo "=== salon-os e2e: location → stylist → service → customer → appointment → product → sale → membership ==="

# 1. Location (use seeded)
curl -s $BASE/api/locations > /tmp/_sa_l.json
LOC_ID=$(python3 -c "import json; print(json.load(open('/tmp/_sa_l.json'))['locations'][0]['id'])")
[ -n "$LOC_ID" ] && { echo "  ✓ location seeded"; PASS=$((PASS+1)); }

# 2. Stylist (use seeded)
curl -s $BASE/api/stylists > /tmp/_sa_s.json
STY_ID=$(python3 -c "import json; print(json.load(open('/tmp/_sa_s.json'))['stylists'][0]['id'])")
[ -n "$STY_ID" ] && { echo "  ✓ stylist seeded"; PASS=$((PASS+1)); }

# 3. Service (use seeded)
curl -s $BASE/api/services > /tmp/_sa_sv.json
SVC_ID=$(python3 -c "import json; print(json.load(open('/tmp/_sa_sv.json'))['services'][0]['id'])")
[ -n "$SVC_ID" ] && { echo "  ✓ service seeded"; PASS=$((PASS+1)); }

# 4. Customer
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"E2E Customer","email":"c@e2e.com","phone":"555-1234","vip":true}' \
  $BASE/api/customers > /tmp/_sa_cu.json
CUS_ID=$(python3 -c "import json; print(json.load(open('/tmp/_sa_cu.json'))['customer']['id'])")
[ -n "$CUS_ID" ] && { echo "  ✓ customer created"; PASS=$((PASS+1)); }

# 5. Appointment
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"location_id\":\"$LOC_ID\",\"stylist_id\":\"$STY_ID\",\"customer_id\":\"$CUS_ID\",\"service_id\":\"$SVC_ID\",\"scheduled_at\":\"2026-07-01T14:00:00Z\"}" \
  $BASE/api/appointments > /tmp/_sa_a.json
APT_ID=$(python3 -c "import json; print(json.load(open('/tmp/_sa_a.json'))['appointment']['id'])")
[ -n "$APT_ID" ] && { echo "  ✓ appointment booked"; PASS=$((PASS+1)); }

# 6. Conflict detection
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d "{\"location_id\":\"$LOC_ID\",\"stylist_id\":\"$STY_ID\",\"customer_id\":\"$CUS_ID\",\"service_id\":\"$SVC_ID\",\"scheduled_at\":\"2026-07-01T14:00:00Z\"}" \
  $BASE/api/appointments)
[ "$code" = "400" ] && { echo "  ✓ conflict detected"; PASS=$((PASS+1)); } || { echo "  ✗ conflict: $code"; FAIL=$((FAIL+1)); }

# 7. Complete appointment → customer total_visits++
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"status":"completed"}' $BASE/api/appointments/$APT_ID); check "complete apt" $code
curl -s $BASE/api/customers/$CUS_ID > /tmp/_sa_cu2.json
# Actually no GET /customers/:id — use list and find
curl -s $BASE/api/customers > /tmp/_sa_cu3.json
VISITS=$(python3 -c "import json; cs=json.load(open('/tmp/_sa_cu3.json'))['customers']; print([c['total_visits'] for c in cs if c['id']=='$CUS_ID'][0])")
[ "$VISITS" -ge "1" ] && { echo "  ✓ customer visits=$VISITS"; PASS=$((PASS+1)); } || { echo "  ✗ visits: $VISITS"; FAIL=$((FAIL+1)); }

# 8. Product
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"Shampoo","sku":"SH-001","price":25,"stock":100}' $BASE/api/products > /tmp/_sa_p.json
PROD_ID=$(python3 -c "import json; print(json.load(open('/tmp/_sa_p.json'))['product']['id'])")
[ -n "$PROD_ID" ] && { echo "  ✓ product created"; PASS=$((PASS+1)); }

# 9. Retail sale → product stock--
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"location_id\":\"$LOC_ID\",\"customer_id\":\"$CUS_ID\",\"items\":[{\"product_id\":\"$PROD_ID\",\"quantity\":2}],\"payment_method\":\"card\"}" \
  $BASE/api/sales > /tmp/_sa_sa.json
SALE_ID=$(python3 -c "import json; print(json.load(open('/tmp/_sa_sa.json'))['sale']['id'])")
[ -n "$SALE_ID" ] && { echo "  ✓ sale recorded"; PASS=$((PASS+1)); }

# Verify product stock decremented
curl -s $BASE/api/products > /tmp/_sa_p2.json
STOCK=$(python3 -c "import json; ps=json.load(open('/tmp/_sa_p2.json'))['products']; print([p['stock'] for p in ps if p['id']=='$PROD_ID'][0])")
[ "$STOCK" = "98" ] && { echo "  ✓ product stock=$STOCK"; PASS=$((PASS+1)); } || { echo "  ✗ stock: $STOCK"; FAIL=$((FAIL+1)); }

# 10. Membership
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"customer_id\":\"$CUS_ID\",\"tier\":\"gold\",\"start_date\":\"2026-07-01\",\"end_date\":\"2027-06-30\",\"visits_total\":24}" \
  $BASE/api/memberships > /tmp/_sa_m.json
MEM_ID=$(python3 -c "import json; print(json.load(open('/tmp/_sa_m.json'))['membership']['id'])")
[ -n "$MEM_ID" ] && { echo "  ✓ membership created"; PASS=$((PASS+1)); }

# 11. Filters
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/appointments?status=completed"); check "filter apts" $code
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/stylists?location_id=$LOC_ID"); check "filter stylists" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
