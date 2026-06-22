#!/bin/bash
set -e
PORT=${PORT:-5274}
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

echo "=== ngo-os e2e: org → program → beneficiary → donation → volunteer → campaign → grant → impact → stats ==="

# 1. Org
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"E2E Foundation","mission":"education","cause":"education","ein":"99-1111111"}' \
  $BASE/api/orgs > /tmp/_ng_o.json
O_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ng_o.json'))['org']['id'])")
[ -n "$O_ID" ] && { echo "  ✓ org created"; PASS=$((PASS+1)); }

# 2. Program
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"org_id\":\"$O_ID\",\"name\":\"Reading Program\",\"budget\":20000,\"beneficiaries_target\":100}" \
  $BASE/api/programs > /tmp/_ng_p.json
P_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ng_p.json'))['program']['id'])")
[ -n "$P_ID" ] && { echo "  ✓ program created"; PASS=$((PASS+1)); }

# 3. Beneficiary
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"program_id\":\"$P_ID\",\"name\":\"E2E Student\",\"age\":10,\"location\":\"Kenya\"}" \
  $BASE/api/beneficiaries > /tmp/_ng_b.json
B_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ng_b.json'))['beneficiary']['id'])")
[ -n "$B_ID" ] && { echo "  ✓ beneficiary enrolled"; PASS=$((PASS+1)); }

# 4. Campaign
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"org_id\":\"$O_ID\",\"name\":\"E2E Campaign\",\"goal_usd\":10000,\"end_date\":\"2026-12-31\"}" \
  $BASE/api/campaigns > /tmp/_ng_c.json
C_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ng_c.json'))['campaign']['id'])")
[ -n "$C_ID" ] && { echo "  ✓ campaign created"; PASS=$((PASS+1)); }

# 5. Donation (linked to campaign → raised_usd++)
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"org_id\":\"$O_ID\",\"donor_name\":\"E2E Donor\",\"amount\":500,\"campaign_id\":\"$C_ID\"}" \
  $BASE/api/donations > /tmp/_ng_d.json
D_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ng_d.json'))['donation']['id'])")
curl -s $BASE/api/campaigns/$C_ID > /tmp/_ng_c2.json
RAISED=$(python3 -c "import json; print(json.load(open('/tmp/_ng_c2.json'))['campaign']['raised_usd'])")
[ "$RAISED" = "500" ] && [ -n "$D_ID" ] && { echo "  ✓ donation linked (raised=\$$RAISED)"; PASS=$((PASS+1)); } || { echo "  ✗ raised: $RAISED"; FAIL=$((FAIL+1)); }

# 6. Invalid amount
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d "{\"org_id\":\"$O_ID\",\"donor_name\":\"x\",\"amount\":-100}" $BASE/api/donations)
[ "$code" = "400" ] && { echo "  ✓ negative amount rejected"; PASS=$((PASS+1)); } || { echo "  ✗ amount: $code"; FAIL=$((FAIL+1)); }

# 7. Recurring donation
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"org_id\":\"$O_ID\",\"donor_name\":\"Monthly Donor\",\"amount\":50,\"recurring\":true}" \
  $BASE/api/donations > /tmp/_ng_d2.json
[ -n "$(python3 -c "import json; print(json.load(open('/tmp/_ng_d2.json'))['donation']['id'])")" ] && { echo "  ✓ recurring donation"; PASS=$((PASS+1)); }

# 8. Volunteer
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"org_id\":\"$O_ID\",\"name\":\"E2E Volunteer\",\"email\":\"v@e2e.com\",\"skills\":[\"teaching\"]}" \
  $BASE/api/volunteers > /tmp/_ng_v.json
V_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ng_v.json'))['volunteer']['id'])")
[ -n "$V_ID" ] && { echo "  ✓ volunteer added"; PASS=$((PASS+1)); }

# 9. Log volunteer hours
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"hours_logged":8}' $BASE/api/volunteers/$V_ID); check "log hours" $code

# 10. Grant (then activate)
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"org_id\":\"$O_ID\",\"funder\":\"E2E Funder\",\"amount\":50000,\"period\":\"2026\"}" \
  $BASE/api/grants > /tmp/_ng_g.json
G_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ng_g.json'))['grant']['id'])")
[ -n "$G_ID" ] && { echo "  ✓ grant created"; PASS=$((PASS+1)); }
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"status":"active"}' $BASE/api/grants/$G_ID); check "activate grant" $code

# 11. Impact metric
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"program_id\":\"$P_ID\",\"metric_name\":\"Books distributed\",\"value\":500,\"unit\":\"books\",\"period\":\"Q1 2026\"}" \
  $BASE/api/impact > /tmp/_ng_i.json
I_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ng_i.json'))['impact_record']['id'])")
[ -n "$I_ID" ] && { echo "  ✓ impact metric added"; PASS=$((PASS+1)); }

# 12. Stats
curl -s $BASE/api/stats > /tmp/_ng_s.json
DONATIONS=$(python3 -c "import json; print(json.load(open('/tmp/_ng_s.json'))['stats']['total_donations_usd'])")
[ "$DONATIONS" -ge "550" ] && { echo "  ✓ stats aggregate (donations=\$$DONATIONS)"; PASS=$((PASS+1)); } || { echo "  ✗ stats: $DONATIONS"; FAIL=$((FAIL+1)); }

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
