#!/bin/bash
set -e
PORT=${PORT:-5273}
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

echo "=== aviation-os e2e: aircraft → flight → passenger → booking → crew → maintenance ==="

# 1. Aircraft (seeded)
curl -s $BASE/api/aircraft > /tmp/_av_a.json
AC_ID=$(python3 -c "import json; print(json.load(open('/tmp/_av_a.json'))['aircraft'][0]['id'])")
[ -n "$AC_ID" ] && { echo "  ✓ aircraft seeded"; PASS=$((PASS+1)); }

# 2. Airports (seeded)
curl -s $BASE/api/airports > /tmp/_av_ap.json
LAX_ID=$(python3 -c "import json; aps=json.load(open('/tmp/_av_ap.json'))['airports']; print([a['id'] for a in aps if a['iata']=='LAX'][0])")
JFK_ID=$(python3 -c "import json; aps=json.load(open('/tmp/_av_ap.json'))['airports']; print([a['id'] for a in aps if a['iata']=='JFK'][0])")
[ -n "$LAX_ID" ] && [ -n "$JFK_ID" ] && { echo "  ✓ airports seeded"; PASS=$((PASS+1)); }

# 3. Flight
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"flight_number\":\"AA200\",\"aircraft_id\":\"$AC_ID\",\"origin\":\"$LAX_ID\",\"destination\":\"$JFK_ID\",\"departure_at\":\"2026-08-01T10:00:00Z\",\"arrival_at\":\"2026-08-01T18:00:00Z\",\"base_price\":400}" \
  $BASE/api/flights > /tmp/_av_f.json
FL_ID=$(python3 -c "import json; print(json.load(open('/tmp/_av_f.json'))['flight']['id'])")
[ -n "$FL_ID" ] && { echo "  ✓ flight created"; PASS=$((PASS+1)); }

# 4. Passenger
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"E2E Pax","email":"pax@e2e.com","passport":"P12345","loyalty_tier":"gold"}' \
  $BASE/api/passengers > /tmp/_av_p.json
P_ID=$(python3 -c "import json; print(json.load(open('/tmp/_av_p.json'))['passenger']['id'])")
[ -n "$P_ID" ] && { echo "  ✓ passenger created"; PASS=$((PASS+1)); }

# 5. Booking (economy)
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"flight_id\":\"$FL_ID\",\"passenger_id\":\"$P_ID\",\"seat\":\"12A\",\"class\":\"economy\"}" \
  $BASE/api/bookings > /tmp/_av_b.json
PRICE=$(python3 -c "import json; print(json.load(open('/tmp/_av_b.json'))['booking']['price'])")
PNR=$(python3 -c "import json; print(json.load(open('/tmp/_av_b.json'))['booking']['pnr'])")
[ "$PRICE" = "400" ] && [ -n "$PNR" ] && { echo "  ✓ booking (price=\$$PRICE, pnr=$PNR)"; PASS=$((PASS+1)); } || { echo "  ✗ price=$PRICE"; FAIL=$((FAIL+1)); }

# 6. Seat conflict
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d "{\"flight_id\":\"$FL_ID\",\"passenger_id\":\"$P_ID\",\"seat\":\"12A\"}" \
  $BASE/api/bookings)
[ "$code" = "400" ] && { echo "  ✓ seat conflict blocked"; PASS=$((PASS+1)); } || { echo "  ✗ seat: $code"; FAIL=$((FAIL+1)); }

# 7. Booking (business class — should be 2.5x)
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"flight_id\":\"$FL_ID\",\"passenger_id\":\"$P_ID\",\"seat\":\"1A\",\"class\":\"business\"}" \
  $BASE/api/bookings > /tmp/_av_b2.json
B_PRICE=$(python3 -c "import json; print(json.load(open('/tmp/_av_b2.json'))['booking']['price'])")
[ "$B_PRICE" = "1000" ] && { echo "  ✓ business class price=\$$B_PRICE (2.5x)"; PASS=$((PASS+1)); } || { echo "  ✗ business: $B_PRICE"; FAIL=$((FAIL+1)); }

# 8. Miles awarded
curl -s $BASE/api/passengers > /tmp/_av_p2.json
MILES=$(python3 -c "import json; ps=json.load(open('/tmp/_av_p2.json'))['passengers']; print([p['miles'] for p in ps if p['id']=='$P_ID'][0])")
[ "$MILES" -ge "140" ] && { echo "  ✓ miles awarded=$MILES"; PASS=$((PASS+1)); } || { echo "  ✗ miles: $MILES"; FAIL=$((FAIL+1)); }

# 9. Crew
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"name\":\"Capt Smith\",\"role\":\"captain\",\"certifications\":[\"ATP\",\"B737\"],\"assigned_flight_id\":\"$FL_ID\"}" \
  $BASE/api/crews > /tmp/_av_c.json
C_ID=$(python3 -c "import json; print(json.load(open('/tmp/_av_c.json'))['crew']['id'])")
[ -n "$C_ID" ] && { echo "  ✓ crew assigned"; PASS=$((PASS+1)); }

# 10. Maintenance log
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"aircraft_id\":\"$AC_ID\",\"type\":\"A-Check\",\"hours\":12,\"technician\":\"tech-1\",\"notes\":\"Routine\",\"next_due_hours\":12600}" \
  $BASE/api/maintenance > /tmp/_av_m.json
M_ID=$(python3 -c "import json; print(json.load(open('/tmp/_av_m.json'))['maintenance_log']['id'])")
[ -n "$M_ID" ] && { echo "  ✓ maintenance logged"; PASS=$((PASS+1)); }

# Verify aircraft hours updated
curl -s $BASE/api/aircraft > /tmp/_av_a2.json
HOURS=$(python3 -c "import json; acs=json.load(open('/tmp/_av_a2.json'))['aircraft']; print([a['hours_flown'] for a in acs if a['id']=='$AC_ID'][0])")
[ "$HOURS" = "12512" ] && { echo "  ✓ aircraft hours=$HOURS"; PASS=$((PASS+1)); } || { echo "  ✗ hours: $HOURS"; FAIL=$((FAIL+1)); }

# 11. Update flight status
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"status":"boarding"}' $BASE/api/flights/$FL_ID); check "flight boarding" $code

# 12. Filters
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/bookings?flight_id=$FL_ID"); check "filter bookings" $code
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/maintenance?aircraft_id=$AC_ID"); check "filter maint" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
