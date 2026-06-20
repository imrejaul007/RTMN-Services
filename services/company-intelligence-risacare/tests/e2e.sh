#!/usr/bin/env bash
set -e
PORT=${PORT:-4160}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[company-intelligence-risacare e2e]"
step "diabetes protocol" "$BASE/api/protocols?icd10=E11"
step "hypertension protocol" "$BASE/api/protocols?icd10=I10"
step "all protocols" "$BASE/api/protocols"
step "create+run" -X POST -H 'Content-Type: application/json' -d '{"name":"e2e","kind":"analytics","inputs":["x"],"outputs":["y"]}' "$BASE/api/templates"
NTID=$(curl -sS $BASE/api/templates | python3 -c 'import sys,json;ps=json.load(sys.stdin)["templates"];print([p["id"] for p in ps if p["name"]=="e2e"][0])')
step "run" -X POST -H 'Content-Type: application/json' -d '{"x":1}' "$BASE/api/templates/$NTID/run"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL