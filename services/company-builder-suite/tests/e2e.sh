#!/bin/bash
set -e
PORT=${PORT:-4268}
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

echo "=== company-builder-suite e2e: entity → EIN → bank → reg → equity → payroll → compliance → build-summary ==="

# 1. Entity
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"E2E Inc","type":"c-corp","state":"DE"}' $BASE/api/entities > /tmp/_cb_e.json
E_ID=$(python3 -c "import json; print(json.load(open('/tmp/_cb_e.json'))['entity']['id'])")
[ -n "$E_ID" ] && { echo "  ✓ entity created"; PASS=$((PASS+1)); }

# 2. EIN
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"entity_id\":\"$E_ID\",\"ein\":\"98-7654321\"}" $BASE/api/eins > /tmp/_cb_ein.json
EIN_ID=$(python3 -c "import json; print(json.load(open('/tmp/_cb_ein.json'))['ein_record']['id'])")
[ -n "$EIN_ID" ] && { echo "  ✓ EIN issued"; PASS=$((PASS+1)); }

# 3. Verify entity ein was set
curl -s $BASE/api/entities/$E_ID > /tmp/_cb_e2.json
ENTITY_EIN=$(python3 -c "import json; print(json.load(open('/tmp/_cb_e2.json'))['entity']['ein'])")
[ "$ENTITY_EIN" = "98-7654321" ] && { echo "  ✓ entity.ein updated"; PASS=$((PASS+1)); } || { echo "  ✗ ein=$ENTITY_EIN"; FAIL=$((FAIL+1)); }

# 4. Bank account
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"entity_id\":\"$E_ID\",\"bank_name\":\"Mercury\",\"account_last4\":\"9999\",\"routing_last4\":\"5678\"}" \
  $BASE/api/bank-accounts > /tmp/_cb_ba.json
BA_ID=$(python3 -c "import json; print(json.load(open('/tmp/_cb_ba.json'))['bank_account']['id'])")
[ -n "$BA_ID" ] && { echo "  ✓ bank account opened"; PASS=$((PASS+1)); }

# 5. State registration
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"entity_id\":\"$E_ID\",\"type\":\"Certificate of Incorporation\",\"agency\":\"DE Secretary of State\"}" \
  $BASE/api/registrations > /tmp/_cb_r.json
R_ID=$(python3 -c "import json; print(json.load(open('/tmp/_cb_r.json'))['registration']['id'])")
[ -n "$R_ID" ] && { echo "  ✓ registration filed"; PASS=$((PASS+1)); }

# 6. Approve registration
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"status":"approved"}' $BASE/api/registrations/$R_ID); check "approve reg" $code

# 7. Equity issuance (founders)
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"entity_id\":\"$E_ID\",\"holder\":\"Founder 1\",\"shares\":6000000,\"class\":\"common\"}" \
  $BASE/api/equity > /tmp/_cb_eq.json
EQ_ID=$(python3 -c "import json; print(json.load(open('/tmp/_cb_eq.json'))['equity_issuance']['id'])")
[ -n "$EQ_ID" ] && { echo "  ✓ equity issued"; PASS=$((PASS+1)); }

# 8. Payroll run
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"entity_id\":\"$E_ID\",\"employee\":\"emp-1\",\"amount\":5000,\"period\":\"2026-06\"}" \
  $BASE/api/payroll > /tmp/_cb_p.json
P_ID=$(python3 -c "import json; print(json.load(open('/tmp/_cb_p.json'))['payroll_run']['id'])")
[ -n "$P_ID" ] && { echo "  ✓ payroll run created"; PASS=$((PASS+1)); }

# 9. Pay run
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"status":"paid"}' $BASE/api/payroll/$P_ID); check "pay run" $code

# 10. Compliance item
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"entity_id\":\"$E_ID\",\"type\":\"Annual Report\",\"jurisdiction\":\"DE\",\"due_date\":\"2027-03-01\"}" \
  $BASE/api/compliance > /tmp/_cb_c.json
C_ID=$(python3 -c "import json; print(json.load(open('/tmp/_cb_c.json'))['compliance_item']['id'])")
[ -n "$C_ID" ] && { echo "  ✓ compliance item added"; PASS=$((PASS+1)); }

# 11. Mark entity as active
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"status":"active"}' $BASE/api/entities/$E_ID); check "activate entity" $code

# 12. Build summary — should show 5/5 complete
curl -s $BASE/api/entities/$E_ID/build-summary > /tmp/_cb_bs.json
COMP=$(python3 -c "import json; print(json.load(open('/tmp/_cb_bs.json'))['completion_pct'])")
[ "$COMP" = "100.0" ] || [ "$COMP" = "100" ] && { echo "  ✓ build summary 100% complete"; PASS=$((PASS+1)); } || { echo "  ✗ completion: $COMP"; FAIL=$((FAIL+1)); }

# 13. Filters
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/eins?entity_id=$E_ID"); check "filter eins" $code
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/payroll?entity_id=$E_ID"); check "filter payroll" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
