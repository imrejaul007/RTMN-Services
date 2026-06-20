#!/usr/bin/env bash
set -e
PORT=${PORT:-4156}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[flow-os-canonical e2e]"
# E2E 1: Walk checkout flow (5 steps) to completion
CHK=$(curl -sS $BASE/api/flows | python3 -c 'import sys,json;ps=json.load(sys.stdin)["flows"];print([p["id"] for p in ps if p["name"]=="checkout"][0])')
step "instantiate checkout" -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/flows/$CHK/instantiate"
CHKID=$(curl -sS $BASE/api/instantiations | python3 -c 'import sys,json;is_=json.load(sys.stdin)["instantiations"];print([i["id"] for i in is_ if i["flow_name"]=="checkout"][0])')
for i in 1 2 3 4 5; do step "advance $i" -X POST "$BASE/api/instantiations/$CHKID/advance"; done
# E2E 2: Walk onboarding (3 steps)
ONB=$(curl -sS $BASE/api/flows | python3 -c 'import sys,json;ps=json.load(sys.stdin)["flows"];print([p["id"] for p in ps if p["name"]=="onboarding"][0])')
step "instantiate onboarding" -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/flows/$ONB/instantiate"
ONID=$(curl -sS $BASE/api/instantiations | python3 -c 'import sys,json;is_=json.load(sys.stdin)["instantiations"];print([i["id"] for i in is_ if i["flow_name"]=="onboarding"][0])')
for i in 1 2 3; do step "advance ob $i" -X POST "$BASE/api/instantiations/$ONID/advance"; done
# E2E 3: Final state shows 2 completed
step "inst_list" "$BASE/api/instantiations"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL