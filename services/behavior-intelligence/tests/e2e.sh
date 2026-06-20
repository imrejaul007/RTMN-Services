#!/usr/bin/env bash
set -e
PORT=${PORT:-4158}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[behavior-intelligence e2e]"
# E2E: push 5 view_product + 2 add_to_cart for one subject, then check high_intent segment
for i in 1 2 3 4 5; do step "view $i" -X POST -H 'Content-Type: application/json' -d '{"subject_id":"e2e-buyer","type":"view_product"}' "$BASE/api/signals"; done
for i in 1 2; do step "cart $i" -X POST -H 'Content-Type: application/json' -d '{"subject_id":"e2e-buyer","type":"add_to_cart"}' "$BASE/api/signals"; done
step "view pricing" -X POST -H 'Content-Type: application/json' -d '{"subject_id":"e2e-buyer","type":"view_pricing"}' "$BASE/api/signals"
step "profile after" "$BASE/api/profiles/by-subject/e2e-buyer"
step "filter high_intent" "$BASE/api/profiles?segment=high_intent"
step "filter intent ready_to_buy" "$BASE/api/profiles?intent=ready_to_buy"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL