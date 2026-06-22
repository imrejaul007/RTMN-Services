#!/usr/bin/env bash
set -e
PORT=${PORT:-4165}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
run() { local n="$1" e="$2"; shift 2; local c=$(curl -sS -o /tmp/smoke.json -w '%{http_code}' "$@"); if [[ "$c" == "$e" ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n (got $c, expected $e)"; FAIL=$((FAIL+1)); fi; }
echo "[data-catalog smoke]"
run health 200 "$BASE/health"
run datasets 200 "$BASE/api/datasets"
run datasets_industry 200 "$BASE/api/datasets?industry=restaurant"
run datasets_search 200 "$BASE/api/datasets?q=customer"
run datasets_tag 200 "$BASE/api/datasets?tag=hotel"
run tags 200 "$BASE/api/tags"
run industries 200 "$BASE/api/industries"
DID=$(curl -sS "$BASE/api/datasets" | python3 -c 'import sys,json;print(json.load(sys.stdin)["datasets"][0]["id"])')
run ds_get 200 "$BASE/api/datasets/$DID"
run ds_404 404 "$BASE/api/datasets/nope"
run ds_create 201 -X POST -H 'Content-Type: application/json' -d '{"name":"e2e_ds","industry":"retail","owner":"e2e"}' "$BASE/api/datasets"
echo "Smoke: $PASS passed, $FAIL failed"; exit $FAIL