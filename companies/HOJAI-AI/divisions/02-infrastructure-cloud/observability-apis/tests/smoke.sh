#!/usr/bin/env bash
set -e
PORT=${PORT:-4172}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
run() { local n="$1" e="$2"; shift 2; local c=$(curl -sS -o /tmp/smoke.json -w '%{http_code}' "$@"); if [[ "$c" == "$e" ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n (got $c, expected $e)"; FAIL=$((FAIL+1)); fi; }
echo "[observability-apis smoke]"
run health 200 "$BASE/health"
run queries 200 "$BASE/api/queries"
run dashboards 200 "$BASE/api/dashboards"
QID=$(curl -sS $BASE/api/queries | python3 -c 'import sys,json;ps=json.load(sys.stdin)["queries"];print([q["id"] for q in ps if q["name"]=="requests_per_service"][0])')
run execute 200 -X POST "$BASE/api/queries/$QID/execute"
run query_create 201 -X POST -H 'Content-Type: application/json' -d '{"name":"e2e","query_type":"metrics_aggregate","params":{"name":"x"}}' "$BASE/api/queries"
run query_bad 400 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/queries"
echo "Smoke: $PASS passed, $FAIL failed"; exit $FAIL