#!/usr/bin/env bash
set -e
PORT=${PORT:-4155}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
run() { local n="$1" e="$2"; shift 2; local c=$(curl -sS -o /tmp/smoke.json -w '%{http_code}' "$@"); if [[ "$c" == "$e" ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n (got $c, expected $e)"; FAIL=$((FAIL+1)); fi; }
echo "[policy-os-canonical smoke]"
run health 200 "$BASE/health"
run ready 200 "$BASE/ready"
run policies 200 "$BASE/api/policies"
run policy_create 201 -X POST -H 'Content-Type: application/json' -d '{"name":"test-pol","rules":[{"type":"allow"}]}' "$BASE/api/policies"
run policy_bad 400 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/policies"
PID=$(curl -sS $BASE/api/policies | python3 -c 'import sys,json;print(json.load(sys.stdin)["policies"][0]["id"])')
run policy_get 200 "$BASE/api/policies/$PID"
run policy_patch 200 -X PATCH -H 'Content-Type: application/json' -d '{"status":"active"}' "$BASE/api/policies/$PID"
run eval 200 -X POST -H 'Content-Type: application/json' -d '{"role":"admin"}' "$BASE/api/policies/$PID/evaluate"
run eval_404 404 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/policies/nope/evaluate"
run evals 200 "$BASE/api/evaluations"
echo "Smoke: $PASS passed, $FAIL failed"; exit $FAIL