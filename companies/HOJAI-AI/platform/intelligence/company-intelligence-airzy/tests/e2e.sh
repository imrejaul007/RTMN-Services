#!/usr/bin/env bash
set -e
PORT=${PORT:-4162}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[company-intelligence-airzy e2e]"
VISA=$(curl -sS $BASE/api/templates | python3 -c 'import sys,json;ps=json.load(sys.stdin)["templates"];print([p["id"] for p in ps if "Visa" in p["name"]][0])')
step "visa lookup" -X POST -H 'Content-Type: application/json' -d '{"passport_country":"IN","destination":"AE"}' "$BASE/api/templates/$VISA/run"
step "all itins" "$BASE/api/itineraries"
step "create" -X POST -H 'Content-Type: application/json' -d '{"destination":"Doha","days":2,"travelers":1}' "$BASE/api/itineraries"
step "templates" "$BASE/api/templates"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL