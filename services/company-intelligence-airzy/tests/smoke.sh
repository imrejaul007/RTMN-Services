#!/usr/bin/env bash
set -e
PORT=${PORT:-4162}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
run() { local n="$1" e="$2"; shift 2; local c=$(curl -sS -o /tmp/smoke.json -w '%{http_code}' "$@"); if [[ "$c" == "$e" ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n (got $c, expected $e)"; FAIL=$((FAIL+1)); fi; }
echo "[company-intelligence-airzy smoke]"
run health 200 "$BASE/health"
run templates 200 "$BASE/api/templates"
run itineraries 200 "$BASE/api/itineraries"
TID=$(curl -sS $BASE/api/templates | python3 -c 'import sys,json;print(json.load(sys.stdin)["templates"][0]["id"])')
run tpl_get 200 "$BASE/api/templates/$TID"
run tpl_run 200 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/templates/$TID/run"
run it_create 201 -X POST -H 'Content-Type: application/json' -d '{"destination":"Riyadh","days":3,"travelers":2}' "$BASE/api/itineraries"
run it_bad 400 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/itineraries"
echo "Smoke: $PASS passed, $FAIL failed"; exit $FAIL