#!/usr/bin/env bash
set -e
PORT=${PORT:-4156}; BASE="http://localhost:${PORT}"; TOKEN=${INTERNAL_SERVICE_TOKEN:?INTERNAL_SERVICE_TOKEN required}
AUTH=(-H "x-internal-token: ${TOKEN}")
PASS=0; FAIL=0
run() { local n="$1" e="$2"; shift 2; local c=$(curl -sS -o /tmp/smoke.json -w '%{http_code}' "$@"); if [[ "$c" == "$e" ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n (got $c, expected $e)"; FAIL=$((FAIL+1)); fi; }
echo "[flow-os-canonical smoke]"
run health 200 "$BASE/health"
run ready 200 "$BASE/ready"
# Auth gating
run auth_no_token 401 "$BASE/api/flows"
run auth_wrong_token 401 -H "x-internal-token: wrong" "$BASE/api/flows"
# Authenticated
run flows 200 "${AUTH[@]}" "$BASE/api/flows"
run flow_create 201 "${AUTH[@]}" -X POST -H 'Content-Type: application/json' -d '{"name":"e2e-flow","steps":[{"key":"a","service":"x"},{"key":"b","service":"y"}]}' "$BASE/api/flows"
run flow_bad 400 "${AUTH[@]}" -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/flows"
FID=$(curl -sS "${AUTH[@]}" $BASE/api/flows | python3 -c 'import sys,json;print(json.load(sys.stdin)["flows"][0]["id"])')
run flow_get 200 "${AUTH[@]}" "$BASE/api/flows/$FID"
run flow_404 404 "${AUTH[@]}" "$BASE/api/flows/nope"
run instantiate 201 "${AUTH[@]}" -X POST -H 'Content-Type: application/json' -d '{"actor":"u1"}' "$BASE/api/flows/$FID/instantiate"
run inst_list 200 "${AUTH[@]}" "$BASE/api/instantiations"
IID=$(curl -sS "${AUTH[@]}" $BASE/api/instantiations | python3 -c 'import sys,json;print(json.load(sys.stdin)["instantiations"][0]["id"])')
run advance 200 "${AUTH[@]}" -X POST "$BASE/api/instantiations/$IID/advance"
run inst_get 200 "${AUTH[@]}" "$BASE/api/instantiations/$IID"
echo "Smoke: $PASS passed, $FAIL failed"; exit $FAIL
