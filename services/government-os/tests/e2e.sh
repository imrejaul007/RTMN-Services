#!/bin/bash
set -e
PORT=${PORT:-5275}
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

echo "=== government-os e2e: agency → service → citizen → application → approve → permit → case → records ==="

# 1. Agency
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"E2E Bureau","jurisdiction":"E2E County","level":"county","head":"Director X"}' \
  $BASE/api/agencies > /tmp/_go_a.json
A_ID=$(python3 -c "import json; print(json.load(open('/tmp/_go_a.json'))['agency']['id'])")
[ -n "$A_ID" ] && { echo "  ✓ agency created"; PASS=$((PASS+1)); }

# 2. Service
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"agency_id\":\"$A_ID\",\"name\":\"Building Permit\",\"fee\":100,\"processing_days\":30,\"required_docs\":[\"site_plan\",\"proof_of_ownership\"]}" \
  $BASE/api/services > /tmp/_go_s.json
S_ID=$(python3 -c "import json; print(json.load(open('/tmp/_go_s.json'))['service']['id'])")
[ -n "$S_ID" ] && { echo "  ✓ service created"; PASS=$((PASS+1)); }

# 3. Citizen
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"E2E Citizen","national_id":"NAT-001","email":"c@e2e.com"}' \
  $BASE/api/citizens > /tmp/_go_c.json
C_ID=$(python3 -c "import json; print(json.load(open('/tmp/_go_c.json'))['citizen']['id'])")
[ -n "$C_ID" ] && { echo "  ✓ citizen registered"; PASS=$((PASS+1)); }

# 4. Application (missing required docs → 400)
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d "{\"citizen_id\":\"$C_ID\",\"service_id\":\"$S_ID\",\"documents\":[]}" $BASE/api/applications)
[ "$code" = "400" ] && { echo "  ✓ missing docs blocked"; PASS=$((PASS+1)); } || { echo "  ✗ docs: $code"; FAIL=$((FAIL+1)); }

# 5. Application with all docs
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"citizen_id\":\"$C_ID\",\"service_id\":\"$S_ID\",\"documents\":[\"site_plan\",\"proof_of_ownership\"]}" \
  $BASE/api/applications > /tmp/_go_ap.json
APP_ID=$(python3 -c "import json; print(json.load(open('/tmp/_go_ap.json'))['application']['id'])")
[ -n "$APP_ID" ] && { echo "  ✓ application submitted"; PASS=$((PASS+1)); }

# 6. Approve application → auto-issue permit
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"status":"approved","decision_notes":"All requirements met"}' $BASE/api/applications/$APP_ID); check "approve app" $code

# Verify permit auto-issued
curl -s "$BASE/api/permits?application_id=$APP_ID" > /tmp/_go_p.json
PERMITS=$(python3 -c "import json; print(len(json.load(open('/tmp/_go_p.json'))['permits']))")
[ "$PERMITS" -ge "1" ] && { echo "  ✓ permit auto-issued ($PERMITS)"; PASS=$((PASS+1)); } || { echo "  ✗ permits: $PERMITS"; FAIL=$((FAIL+1)); }

# 7. Case
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"agency_id\":\"$A_ID\",\"citizen_id\":\"$C_ID\",\"subject\":\"Zoning complaint\",\"priority\":\"high\"}" \
  $BASE/api/cases > /tmp/_go_cs.json
CASE_ID=$(python3 -c "import json; print(json.load(open('/tmp/_go_cs.json'))['case']['id'])")
[ -n "$CASE_ID" ] && { echo "  ✓ case opened"; PASS=$((PASS+1)); }

# 8. Close case
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"status":"closed"}' $BASE/api/cases/$CASE_ID); check "close case" $code

# 9. Public record
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"agency_id\":\"$A_ID\",\"type\":\"policy\",\"title\":\"Zoning Ordinance 2026-A\",\"content\":\"Updated zoning requirements\",\"classification\":\"public\"}" \
  $BASE/api/records > /tmp/_go_r.json
R_ID=$(python3 -c "import json; print(json.load(open('/tmp/_go_r.json'))['record']['id'])")
[ -n "$R_ID" ] && { echo "  ✓ public record created"; PASS=$((PASS+1)); }

# 10. Invalid classification
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d "{\"agency_id\":\"$A_ID\",\"type\":\"x\",\"title\":\"y\",\"classification\":\"secret\"}" $BASE/api/records)
[ "$code" = "400" ] && { echo "  ✓ invalid classification rejected"; PASS=$((PASS+1)); } || { echo "  ✗ classification: $code"; FAIL=$((FAIL+1)); }

# 11. Filters
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/applications?status=approved"); check "filter apps" $code
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/records?classification=public"); check "filter records" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
