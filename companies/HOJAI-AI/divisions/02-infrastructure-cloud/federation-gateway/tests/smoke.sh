#!/usr/bin/env bash
set -e
PORT=${PORT:-4174}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
run() { local n="$1" e="$2"; shift 2; local c=$(curl -sS -o /tmp/smoke.json -w '%{http_code}' "$@"); if [[ "$c" == "$e" ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n (got $c, expected $e)"; FAIL=$((FAIL+1)); fi; }
echo "[federation-gateway smoke]"
run health 200 "$BASE/health"
run regions 200 "$BASE/api/regions"
run queries 200 "$BASE/api/queries"
run region_create 201 -X POST -H 'Content-Type: application/json' -d '{"name":"e2e-region","base_url":"http://e2e.hojai.ai"}' "$BASE/api/regions"
run region_bad 400 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/regions"
run query 201 -X POST -H 'Content-Type: application/json' -d '{"query":"hello"}' "$BASE/api/query"
run query_bad 400 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/query"
QID=$(curl -sS $BASE/api/queries | python3 -c 'import sys,json;print(json.load(sys.stdin)["queries"][-1]["id"])')
run query_get 200 "$BASE/api/queries/$QID"
run query_404 404 "$BASE/api/queries/nope"
echo "Smoke: $PASS passed, $FAIL failed"; exit $FAIL