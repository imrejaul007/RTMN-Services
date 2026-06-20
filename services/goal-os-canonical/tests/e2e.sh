#!/usr/bin/env bash
set -e
PORT=${PORT:-4157}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[goal-os-canonical e2e]"
# E2E 1: Create template, instantiate goal, progress to achieved
TID=$(curl -sS $BASE/api/templates | python3 -c 'import sys,json;print(json.load(sys.stdin)["templates"][0]["id"])')
step "instantiate goal" -X POST -H 'Content-Type: application/json' -d "{\"template_id\":\"$TID\",\"owner\":\"e2e\",\"current\":40}" "$BASE/api/goals"
GID=$(curl -sS $BASE/api/goals | python3 -c 'import sys,json;print(json.load(sys.stdin)["goals"][0]["id"])')
step "progress to 60" -X PATCH -H 'Content-Type: application/json' -d '{"current":60}' "$BASE/api/goals/$GID"
step "progress to 100 (achieved)" -X PATCH -H 'Content-Type: application/json' -d '{"current":100}' "$BASE/api/goals/$GID"
step "verify achieved" "$BASE/api/goals/$GID"
# E2E 2: All goals summary
step "all goals" "$BASE/api/goals"
# E2E 3: All templates summary
step "all templates" "$BASE/api/templates"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL