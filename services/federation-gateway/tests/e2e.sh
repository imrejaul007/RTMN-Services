#!/usr/bin/env bash
set -e
PORT=${PORT:-4174}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[federation-gateway e2e]"
# Run 3 cross-region queries
step "q1" -X POST -H 'Content-Type: application/json' -d '{"query":"select * from customers limit 10"}' "$BASE/api/query"
step "q2" -X POST -H 'Content-Type: application/json' -d '{"query":"get dashboard sales"}' "$BASE/api/query"
step "q3" -X POST -H 'Content-Type: application/json' -d '{"query":"inference"}' "$BASE/api/query"
step "all queries" "$BASE/api/queries"
step "regions" "$BASE/api/regions"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL