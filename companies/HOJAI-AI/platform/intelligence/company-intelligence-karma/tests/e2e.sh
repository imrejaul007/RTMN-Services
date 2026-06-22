#!/usr/bin/env bash
set -e
PORT=${PORT:-4163}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[company-intelligence-karma e2e]"
CO2=$(curl -sS $BASE/api/templates | python3 -c 'import sys,json;ps=json.load(sys.stdin)["templates"];print([p["id"] for p in ps if "Carbon" in p["name"]][0])')
step "carbon calc" -X POST -H 'Content-Type: application/json' -d '{"activity_type":"flight","quantity":1500,"unit":"km"}' "$BASE/api/templates/$CO2/run"
ESG=$(curl -sS $BASE/api/templates | python3 -c 'import sys,json;ps=json.load(sys.stdin)["templates"];print([p["id"] for p in ps if "ESG" in p["name"]][0])')
step "esg score" -X POST -H 'Content-Type: application/json' -d '{"e_score":80,"s_score":75,"g_score":90}' "$BASE/api/templates/$ESG/run"
step "all projects" "$BASE/api/projects"
step "templates" "$BASE/api/templates"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL