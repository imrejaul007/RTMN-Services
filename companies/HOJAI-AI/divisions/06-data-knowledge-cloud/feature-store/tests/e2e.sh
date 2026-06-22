#!/usr/bin/env bash
set -e
PORT=${PORT:-4164}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[feature-store e2e]"
# E2E: create feature, set values for 3 entities, then aggregate
step "create feat" -X POST -H 'Content-Type: application/json' -d '{"name":"e2e_ltv","type":"float","owner":"e2e"}' "$BASE/api/features"
for eid in e1 e2 e3; do step "put $eid" -X PUT -H 'Content-Type: application/json' -d "{\"value\":$((RANDOM % 1000))}" "$BASE/api/online/$eid/e2e_ltv"; done
step "get entity 1" "$BASE/api/online/e1"
step "get feature" "$BASE/api/online/e2/e2e_ltv"
step "filter by owner" "$BASE/api/features?owner=e2e"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL