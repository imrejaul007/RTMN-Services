#!/usr/bin/env bash
set -e
PORT=${PORT:-4154}
BASE="http://localhost:${PORT}"
PASS=0; FAIL=0
run() { local n="$1" e="$2"; shift 2; local c=$(curl -sS -o /tmp/smoke.json -w '%{http_code}' "$@"); if [[ "$c" == "$e" ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n (got $c, expected $e)"; FAIL=$((FAIL+1)); fi; }
echo "[planning-engine smoke]"
run health 200 "$BASE/health"
run ready 200 "$BASE/ready"
run plans_list 200 "$BASE/api/plans"
run plan_get 200 "$BASE/api/plans/$(curl -sS $BASE/api/plans | python3 -c 'import sys,json;print(json.load(sys.stdin)["plans"][0]["id"])')"
run critical_path 200 "$BASE/api/plans/$(curl -sS $BASE/api/plans | python3 -c 'import sys,json;print(json.load(sys.stdin)["plans"][0]["id"])')/critical-path"
run validate 200 "$BASE/api/plans/$(curl -sS $BASE/api/plans | python3 -c 'import sys,json;print(json.load(sys.stdin)["plans"][0]["id"])')/validate"
run templates 200 "$BASE/api/step-templates"
run plan_create 201 -X POST -H 'Content-Type: application/json' -d '{"goal":"test","steps":[{"name":"a","order":1,"est_ms":10},{"name":"b","order":2,"depends_on":[1],"est_ms":20}]}' "$BASE/api/plans"
run plan_bad 400 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/plans"
run plan_404 404 "$BASE/api/plans/nonexistent"
echo "Smoke: $PASS passed, $FAIL failed"; exit $FAIL