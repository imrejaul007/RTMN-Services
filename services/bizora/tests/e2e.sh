#!/bin/bash
set -e
PORT=${PORT:-4261}
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

echo "=== bizora e2e: org → dept → kpi → dashboard → alert → report → summary ==="

# 1. Create org
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"E2E Corp","industry":"saas","size":120}' $BASE/api/orgs > /tmp/_b_o.json
O_ID=$(python3 -c "import json; print(json.load(open('/tmp/_b_o.json'))['org']['id'])")
[ -n "$O_ID" ] && { echo "  ✓ org created"; PASS=$((PASS+1)); }

# 2. Create dept
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"org_id\":\"$O_ID\",\"name\":\"Engineering\",\"headcount\":42,\"budget_usd\":1500000}" $BASE/api/depts > /tmp/_b_d.json
D_ID=$(python3 -c "import json; print(json.load(open('/tmp/_b_d.json'))['department']['id'])")
[ -n "$D_ID" ] && { echo "  ✓ dept created"; PASS=$((PASS+1)); }

# 3. Create KPI
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"org_id\":\"$O_ID\",\"dept_id\":\"$D_ID\",\"name\":\"Deploys/Day\",\"value\":15,\"target\":20,\"unit\":\"count\",\"period\":\"daily\"}" $BASE/api/kpis > /tmp/_b_k.json
K_ID=$(python3 -c "import json; print(json.load(open('/tmp/_b_k.json'))['kpi']['id'])")
[ -n "$K_ID" ] && { echo "  ✓ kpi created"; PASS=$((PASS+1)); }

# 4. PATCH kpi value
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"value":25}' $BASE/api/kpis/$K_ID); check "PATCH kpi" $code

# 5. Create alert
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"org_id\":\"$O_ID\",\"kpi_id\":\"$K_ID\",\"threshold\":10,\"direction\":\"below\",\"severity\":\"high\"}" $BASE/api/alerts > /tmp/_b_a.json
A_ID=$(python3 -c "import json; print(json.load(open('/tmp/_b_a.json'))['alert']['id'])")
[ -n "$A_ID" ] && { echo "  ✓ alert created"; PASS=$((PASS+1)); }

# 6. Update kpi to satisfy threshold → alert should auto-resolve
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"value":30}' $BASE/api/kpis/$K_ID); check "PATCH to resolve" $code
curl -s $BASE/api/alerts/$A_ID > /tmp/_b_a2.json
STATUS=$(python3 -c "import json; print(json.load(open('/tmp/_b_a2.json'))['alert']['status'])")
[ "$STATUS" = "resolved" ] && { echo "  ✓ alert auto-resolved"; PASS=$((PASS+1)); } || { echo "  ✗ alert status: $STATUS"; FAIL=$((FAIL+1)); }

# 7. Create dashboard
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"org_id\":\"$O_ID\",\"name\":\"Eng Ops\",\"widgets\":[{\"kpi\":\"Deploys/Day\",\"type\":\"line\"}]}" $BASE/api/dashboards > /tmp/_b_da.json
DA_ID=$(python3 -c "import json; print(json.load(open('/tmp/_b_da.json'))['dashboard']['id'])")
[ -n "$DA_ID" ] && { echo "  ✓ dashboard created"; PASS=$((PASS+1)); }

# 8. Create report
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"org_id\":\"$O_ID\",\"title\":\"Q2 Review\",\"sections\":[\"KPIs\",\"Risks\",\"Actions\"]}" $BASE/api/reports > /tmp/_b_r.json
R_ID=$(python3 -c "import json; print(json.load(open('/tmp/_b_r.json'))['report']['id'])")
[ -n "$R_ID" ] && { echo "  ✓ report created"; PASS=$((PASS+1)); }

# 9. AI-generated exec summary
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"org_id\":\"$O_ID\",\"period\":\"quarterly\"}" $BASE/api/summaries > /tmp/_b_s.json
S_ID=$(python3 -c "import json; print(json.load(open('/tmp/_b_s.json'))['summary']['id'])")
HIGHLIGHTS=$(python3 -c "import json; print(len(json.load(open('/tmp/_b_s.json'))['summary']['highlights']))")
[ -n "$S_ID" ] && [ "$HIGHLIGHTS" -ge "1" ] && { echo "  ✓ summary generated ($HIGHLIGHTS highlights)"; PASS=$((PASS+1)); } || { echo "  ✗ summary: $HIGHLIGHTS"; FAIL=$((FAIL+1)); }

# 10. Filter KPIs by dept
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/kpis?dept_id=$D_ID"); check "filter kpis" $code
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/depts?org_id=$O_ID"); check "filter depts" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
