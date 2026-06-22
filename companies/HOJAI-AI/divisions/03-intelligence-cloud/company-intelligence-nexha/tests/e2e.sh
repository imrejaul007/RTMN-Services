#!/usr/bin/env bash
set -e
PORT=${PORT:-4159}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[company-intelligence-nexha e2e]"
TID=$(curl -sS $BASE/api/templates | python3 -c 'import sys,json;ps=json.load(sys.stdin)["templates"];print([p["id"] for p in ps if "Gold" in p["name"]][0])')
step "gold sync" -X POST -H 'Content-Type: application/json' -d '{"gold_rate_inr":6500,"making_charge_pct":12}' "$BASE/api/templates/$TID/run"
step "create+run new" -X POST -H 'Content-Type: application/json' -d '{"name":"e2e-tpl","kind":"pricing","inputs":["a"],"outputs":["b"]}' "$BASE/api/templates"
NTID=$(curl -sS $BASE/api/templates | python3 -c 'import sys,json;ps=json.load(sys.stdin)["templates"];print([p["id"] for p in ps if p["name"]=="e2e-tpl"][0])')
step "run new" -X POST -H 'Content-Type: application/json' -d '{"a":1}' "$BASE/api/templates/$NTID/run"
step "campaigns" "$BASE/api/campaigns"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL