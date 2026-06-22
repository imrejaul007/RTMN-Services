#!/usr/bin/env bash
set -e
PORT=${PORT:-4175}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[ai-economy e2e]"
# E2E: Create 2 actors, do 3 transfers, check balances
step "create a1" -X POST -H 'Content-Type: application/json' -d '{"name":"e2e-a1","type":"agent"}' "$BASE/api/actors"
step "create a2" -X POST -H 'Content-Type: application/json' -d '{"name":"e2e-a2","type":"service"}' "$BASE/api/actors"
A1=$(curl -sS $BASE/api/actors | python3 -c 'import sys,json;ps=json.load(sys.stdin)["actors"];print([a["id"] for a in ps if a["name"]=="e2e-a1"][0])')
A2=$(curl -sS $BASE/api/actors | python3 -c 'import sys,json;ps=json.load(sys.stdin)["actors"];print([a["id"] for a in ps if a["name"]=="e2e-a2"][0])')
# Manually fund a1 by creating tx from a seeded actor
SEED=$(curl -sS $BASE/api/actors | python3 -c 'import sys,json;ps=json.load(sys.stdin)["actors"];print([a["id"] for a in ps if a["name"]=="sales-copilot"][0])')
step "fund a1" -X POST -H 'Content-Type: application/json' -d "{\"from\":\"$SEED\",\"to\":\"$A1\",\"amount\":500}" "$BASE/api/transactions"
step "a1->a2 100" -X POST -H 'Content-Type: application/json' -d "{\"from\":\"$A1\",\"to\":\"$A2\",\"amount\":100}" "$BASE/api/transactions"
step "a1->a2 50" -X POST -H 'Content-Type: application/json' -d "{\"from\":\"$A1\",\"to\":\"$A2\",\"amount\":50}" "$BASE/api/transactions"
step "a2->a1 25" -X POST -H 'Content-Type: application/json' -d "{\"from\":\"$A2\",\"to\":\"$A1\",\"amount\":25}" "$BASE/api/transactions"
step "a1 balance" "$BASE/api/actors/$A1"
step "a2 balance" "$BASE/api/actors/$A2"
step "txs by a1" "$BASE/api/transactions?actor=$A1"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL