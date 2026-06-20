#!/usr/bin/env bash
set -e
PORT=${PORT:-4160}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
run() { local n="$1" e="$2"; shift 2; local c=$(curl -sS -o /tmp/smoke.json -w '%{http_code}' "$@"); if [[ "$c" == "$e" ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n (got $c, expected $e)"; FAIL=$((FAIL+1)); fi; }
echo "[company-intelligence-risacare smoke]"
run health 200 "$BASE/health"
run templates 200 "$BASE/api/templates"
run protocols 200 "$BASE/api/protocols"
TID=$(curl -sS $BASE/api/templates | python3 -c 'import sys,json;print(json.load(sys.stdin)["templates"][0]["id"])')
run tpl_get 200 "$BASE/api/templates/$TID"
run tpl_run 200 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/templates/$TID/run"
run protocols_filter 200 "$BASE/api/protocols?icd10=E11"
run protocol_create 201 -X POST -H 'Content-Type: application/json' -d '{"name":"e2e","icd10":"E11","steps":["a"]}' "$BASE/api/protocols"
echo "Smoke: $PASS passed, $FAIL failed"; exit $FAIL