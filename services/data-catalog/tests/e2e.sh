#!/usr/bin/env bash
set -e
PORT=${PORT:-4165}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[data-catalog e2e]"
step "create e2e" -X POST -H 'Content-Type: application/json' -d '{"name":"e2e_hotel_orders","industry":"hotel","owner":"hotel-os"}' "$BASE/api/datasets"
step "filter hotel" "$BASE/api/datasets?industry=hotel"
step "search orders" "$BASE/api/datasets?q=orders"
step "tag hotel" "$BASE/api/datasets?tag=hotel"
step "industries list" "$BASE/api/industries"
step "tags list" "$BASE/api/tags"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL