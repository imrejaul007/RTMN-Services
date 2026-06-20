#!/usr/bin/env bash
set -e
PORT=${PORT:-4157}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
run() { local n="$1" e="$2"; shift 2; local c=$(curl -sS -o /tmp/smoke.json -w '%{http_code}' "$@"); if [[ "$c" == "$e" ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n (got $c, expected $e)"; FAIL=$((FAIL+1)); fi; }
echo "[goal-os-canonical smoke]"
run health 200 "$BASE/health"
run ready 200 "$BASE/ready"
run templates 200 "$BASE/api/templates"
run goals 200 "$BASE/api/goals"
TID=$(curl -sS $BASE/api/templates | python3 -c 'import sys,json;print(json.load(sys.stdin)["templates"][0]["id"])')
run tpl_get 200 "$BASE/api/templates/$TID"
run tpl_404 404 "$BASE/api/templates/nope"
run goal_create 201 -X POST -H 'Content-Type: application/json' -d "{\"template_id\":\"$TID\",\"owner\":\"e2e-svc\",\"current\":10}" "$BASE/api/goals"
run goal_bad 404 -X POST -H 'Content-Type: application/json' -d '{"template_id":"nope","owner":"x"}' "$BASE/api/goals"
GID=$(curl -sS $BASE/api/goals | python3 -c 'import sys,json;print(json.load(sys.stdin)["goals"][0]["id"])')
run goal_get 200 "$BASE/api/goals/$GID"
run goal_patch 200 -X PATCH -H 'Content-Type: application/json' -d '{"current":50}' "$BASE/api/goals/$GID"
echo "Smoke: $PASS passed, $FAIL failed"; exit $FAIL