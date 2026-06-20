#!/bin/bash
set -e
PORT=${PORT:-5272}
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

echo "=== logistics-os e2e: warehouse → inventory → carrier → shipment → route → track → deliver ==="

# 1. Warehouse (seeded)
curl -s $BASE/api/warehouses > /tmp/_lo_w.json
WH_ID=$(python3 -c "import json; print(json.load(open('/tmp/_lo_w.json'))['warehouses'][0]['id'])")
[ -n "$WH_ID" ] && { echo "  ✓ warehouse seeded"; PASS=$((PASS+1)); }

# 2. Inventory
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"warehouse_id\":\"$WH_ID\",\"sku\":\"WIDGET-001\",\"quantity\":500,\"reorder_level\":50}" \
  $BASE/api/inventory > /tmp/_lo_i.json
INV_ID=$(python3 -c "import json; print(json.load(open('/tmp/_lo_i.json'))['inventory_item']['id'])")
[ -n "$INV_ID" ] && { echo "  ✓ inventory created"; PASS=$((PASS+1)); }

# 3. Carrier (seeded)
curl -s $BASE/api/carriers > /tmp/_lo_c.json
CAR_ID=$(python3 -c "import json; print(json.load(open('/tmp/_lo_c.json'))['carriers'][0]['id'])")
[ -n "$CAR_ID" ] && { echo "  ✓ carrier seeded"; PASS=$((PASS+1)); }

# 4. Shipment
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"origin_warehouse_id\":\"$WH_ID\",\"destination\":\"100 Customer St, NYC\",\"carrier_id\":\"$CAR_ID\",\"weight_kg\":15}" \
  $BASE/api/shipments > /tmp/_lo_s.json
SH_ID=$(python3 -c "import json; print(json.load(open('/tmp/_lo_s.json'))['shipment']['id'])")
COST=$(python3 -c "import json; print(json.load(open('/tmp/_lo_s.json'))['shipment']['cost'])")
[ -n "$SH_ID" ] && [ "$COST" = "37.5" ] && { echo "  ✓ shipment created (cost=\$$COST)"; PASS=$((PASS+1)); } || { echo "  ✗ cost=$COST"; FAIL=$((FAIL+1)); }

# 5. Track event (in-transit)
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"status":"in-transit","location":"Newark Hub","note":"Departed warehouse"}' \
  $BASE/api/shipments/$SH_ID/track > /tmp/_lo_t.json
[ "$(python3 -c "import json; print(json.load(open('/tmp/_lo_t.json'))['shipment']['status'])")" = "in-transit" ] && { echo "  ✓ tracking event recorded"; PASS=$((PASS+1)); } || FAIL=$((FAIL+1))

# 6. Route
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"LA→NYC Express","stops":[{"loc":"LA"},{"loc":"Phoenix"},{"loc":"Albuquerque"},{"loc":"NYC"}],"distance_km":4500,"estimated_hours":48}' \
  $BASE/api/routes > /tmp/_lo_r.json
R_ID=$(python3 -c "import json; print(json.load(open('/tmp/_lo_r.json'))['route']['id'])")
[ -n "$R_ID" ] && { echo "  ✓ route created"; PASS=$((PASS+1)); }

# 7. Delivery
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"shipment_id\":\"$SH_ID\",\"recipient_name\":\"Jane Customer\",\"address\":\"100 Customer St, NYC\"}" \
  $BASE/api/deliveries > /tmp/_lo_d.json
DEL_ID=$(python3 -c "import json; print(json.load(open('/tmp/_lo_d.json'))['delivery']['id'])")
[ -n "$DEL_ID" ] && { echo "  ✓ delivery created"; PASS=$((PASS+1)); }

# 8. Sign for delivery
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"signed_by":"Jane Customer","delivered_at":"2026-06-25T14:30:00Z","proof_url":"https://example.com/proof.jpg"}' \
  $BASE/api/deliveries/$DEL_ID); check "sign delivery" $code

# Verify shipment auto-marked delivered
curl -s $BASE/api/shipments/$SH_ID > /tmp/_lo_s2.json
STATUS=$(python3 -c "import json; print(json.load(open('/tmp/_lo_s2.json'))['shipment']['status'])")
[ "$STATUS" = "delivered" ] && { echo "  ✓ shipment auto-delivered"; PASS=$((PASS+1)); } || { echo "  ✗ status: $STATUS"; FAIL=$((FAIL+1)); }

# 9. Update inventory quantity
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"quantity":485}' $BASE/api/inventory/$INV_ID); check "PATCH inventory" $code

# 10. Filters
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/shipments?status=delivered"); check "filter shipments" $code
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/inventory?warehouse_id=$WH_ID"); check "filter inventory" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
