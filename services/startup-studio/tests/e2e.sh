#!/bin/bash
set -e
PORT=${PORT:-4267}
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

echo "=== startup-studio e2e: studio → cohort → company → program → milestone → mentor → application ==="

# 1. Studio
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"E2E Studio","thesis":"vertical SaaS","partner_count":3}' \
  $BASE/api/studios > /tmp/_ss_s.json
S_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ss_s.json'))['studio']['id'])")
[ -n "$S_ID" ] && { echo "  ✓ studio created"; PASS=$((PASS+1)); }

# 2. Cohort
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"studio_id\":\"$S_ID\",\"name\":\"E2E Cohort 2026Q3\",\"start_date\":\"2026-07-01\",\"end_date\":\"2026-09-30\"}" \
  $BASE/api/cohorts > /tmp/_ss_c.json
C_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ss_c.json'))['cohort']['id'])")
[ -n "$C_ID" ] && { echo "  ✓ cohort created"; PASS=$((PASS+1)); }

# 3. Company
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"cohort_id\":\"$C_ID\",\"name\":\"StudioCo\",\"domain\":\"legaltech\",\"founder_ids\":[\"f1\"],\"stage\":\"idea\"}" \
  $BASE/api/companies > /tmp/_ss_co.json
CO_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ss_co.json'))['company']['id'])")
[ -n "$CO_ID" ] && { echo "  ✓ company created"; PASS=$((PASS+1)); }

# 4. Update company stage → growth
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"stage":"mvp","valuation":1500000}' $BASE/api/companies/$CO_ID); check "PATCH company" $code

# 5. Program
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"studio_id\":\"$S_ID\",\"name\":\"E2E Accelerator\",\"duration_weeks\":12,\"curriculum\":[\"Week 1: Vision\",\"Week 2: Product\"]}" \
  $BASE/api/programs > /tmp/_ss_p.json
P_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ss_p.json'))['program']['id'])")
[ -n "$P_ID" ] && { echo "  ✓ program created"; PASS=$((PASS+1)); }

# 6. Milestone
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"company_id\":\"$CO_ID\",\"name\":\"First paying customer\",\"due_date\":\"2026-08-01\"}" \
  $BASE/api/milestones > /tmp/_ss_m.json
M_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ss_m.json'))['milestone']['id'])")
[ -n "$M_ID" ] && { echo "  ✓ milestone created"; PASS=$((PASS+1)); }

# 7. Complete milestone
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"status":"completed"}' $BASE/api/milestones/$M_ID); check "complete milestone" $code
curl -s $BASE/api/milestones/$M_ID > /tmp/_ss_m2.json
COMPLETED=$(python3 -c "import json; print(json.load(open('/tmp/_ss_m2.json'))['milestone'].get('completed_at'))")
[ -n "$COMPLETED" ] && [ "$COMPLETED" != "None" ] && { echo "  ✓ completed_at stamped"; PASS=$((PASS+1)); } || { echo "  ✗ completed_at=$COMPLETED"; FAIL=$((FAIL+1)); }

# 8. Mentor
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"Jane Mentor","expertise":"fundraising","bio":"Raised $50M","contact":"jane@example.com"}' \
  $BASE/api/mentors > /tmp/_ss_mt.json
MT_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ss_mt.json'))['mentor']['id'])")
[ -n "$MT_ID" ] && { echo "  ✓ mentor added"; PASS=$((PASS+1)); }

# 9. Application
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"cohort_id\":\"$C_ID\",\"founder_name\":\"Alice\",\"email\":\"alice@example.com\",\"pitch\":\"AI for X\",\"score\":85}" \
  $BASE/api/applications > /tmp/_ss_a.json
A_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ss_a.json'))['application']['id'])")
[ -n "$A_ID" ] && { echo "  ✓ application submitted"; PASS=$((PASS+1)); }

# 10. Accept application
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"status":"accepted"}' $BASE/api/applications/$A_ID); check "accept app" $code

# 11. Filters
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/companies?cohort_id=$C_ID"); check "filter companies" $code
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/applications?cohort_id=$C_ID&status=accepted"); check "filter apps" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
