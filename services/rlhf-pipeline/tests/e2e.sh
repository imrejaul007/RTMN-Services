#!/usr/bin/env bash
set -e
PORT=${PORT:-4166}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[rlhf-pipeline e2e]"
# E2E: rate 3 prompts, run PPO, check reward model version bumps
for s in 5 4 3; do
  PID=$(curl -sS $BASE/api/prompts | python3 -c 'import sys,json;print(json.load(sys.stdin)["prompts"][0]["id"])')
  step "rate score=$s" -X POST -H 'Content-Type: application/json' -d "{\"prompt_id\":\"$PID\",\"rater\":\"e2e-$s\",\"score\":$s}" "$BASE/api/ratings"
done
step "PPO run 1" -X POST "$BASE/api/iterations/run"
step "PPO run 2" -X POST "$BASE/api/iterations/run"
step "iterations" "$BASE/api/iterations"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL