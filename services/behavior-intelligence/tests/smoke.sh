#!/usr/bin/env bash
set -e
PORT=${PORT:-4158}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
run() { local n="$1" e="$2"; shift 2; local c=$(curl -sS -o /tmp/smoke.json -w '%{http_code}' "$@"); if [[ "$c" == "$e" ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n (got $c, expected $e)"; FAIL=$((FAIL+1)); fi; }
echo "[behavior-intelligence smoke]"
run health 200 "$BASE/health"
run ready 200 "$BASE/ready"
run signals 200 "$BASE/api/signals"
run profiles 200 "$BASE/api/profiles"
run segments 200 "$BASE/api/segments"
run signal_create 201 -X POST -H 'Content-Type: application/json' -d '{"subject_id":"e2e-cust","type":"view_product","weight":1}' "$BASE/api/signals"
run signal_bad 400 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/signals"
run signal_filter_subj 200 "$BASE/api/signals?subject_id=e2e-cust"
run signal_filter_type 200 "$BASE/api/signals?type=view_product"
SID=$(curl -sS $BASE/api/profiles | python3 -c 'import sys,json;ps=json.load(sys.stdin)["profiles"];print([p["id"] for p in ps if p["subject_id"]=="e2e-cust"][0])')
run prof_get 200 "$BASE/api/profiles/$SID"
run prof_by_subj 200 "$BASE/api/profiles/by-subject/e2e-cust"
run prof_refresh 200 -X POST "$BASE/api/profiles/$SID/refresh"
echo "Smoke: $PASS passed, $FAIL failed"; exit $FAIL