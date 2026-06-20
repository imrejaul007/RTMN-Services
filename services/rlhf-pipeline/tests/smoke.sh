#!/usr/bin/env bash
set -e
PORT=${PORT:-4166}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
run() { local n="$1" e="$2"; shift 2; local c=$(curl -sS -o /tmp/smoke.json -w '%{http_code}' "$@"); if [[ "$c" == "$e" ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n (got $c, expected $e)"; FAIL=$((FAIL+1)); fi; }
echo "[rlhf-pipeline smoke]"
run health 200 "$BASE/health"
run prompts 200 "$BASE/api/prompts"
run ratings 200 "$BASE/api/ratings"
run iterations 200 "$BASE/api/iterations"
run prompt_create 201 -X POST -H 'Content-Type: application/json' -d '{"prompt":"test","response":"resp","model":"gpt-4"}' "$BASE/api/prompts"
run prompt_bad 400 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/prompts"
PID=$(curl -sS $BASE/api/prompts | python3 -c 'import sys,json;ps=json.load(sys.stdin)["prompts"];print([p["id"] for p in ps if p["prompt"]=="test"][0])')
run prompt_get 200 "$BASE/api/prompts/$PID"
run rating_create 201 -X POST -H 'Content-Type: application/json' -d "{\"prompt_id\":\"$PID\",\"rater\":\"e2e\",\"score\":4,\"comment\":\"good\"}" "$BASE/api/ratings"
run rating_filter 200 "$BASE/api/ratings?prompt_id=$PID"
run run_400 201 -X POST "$BASE/api/iterations/run"
echo "Smoke: $PASS passed, $FAIL failed"; exit $FAIL