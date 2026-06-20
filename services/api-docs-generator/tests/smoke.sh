#!/usr/bin/env bash
set -e
PORT=${PORT:-4171}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
run() { local n="$1" e="$2"; shift 2; local c=$(curl -sS -o /tmp/smoke.json -w '%{http_code}' "$@"); if [[ "$c" == "$e" ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n (got $c, expected $e)"; FAIL=$((FAIL+1)); fi; }
echo "[api-docs-generator smoke]"
run health 200 "$BASE/health"
run services 200 "$BASE/api/services"
run docs 200 "$BASE/api/docs"
SID=$(curl -sS $BASE/api/services | python3 -c 'import sys,json;print(json.load(sys.stdin)["services"][0]["id"])')
run generate 201 -X POST "$BASE/api/services/$SID/generate"
run service_create 201 -X POST -H 'Content-Type: application/json' -d '{"name":"e2e","base_url":"http://x","endpoints":["/api/test"]}' "$BASE/api/services"
run service_bad 400 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/services"
DID=$(curl -sS $BASE/api/docs | python3 -c 'import sys,json;print(json.load(sys.stdin)["docs"][0]["id"])')
run doc_get 200 "$BASE/api/docs/$DID"
run doc_404 404 "$BASE/api/docs/nope"
echo "Smoke: $PASS passed, $FAIL failed"; exit $FAIL