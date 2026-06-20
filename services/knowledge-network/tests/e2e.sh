#!/usr/bin/env bash
set -e
PORT=${PORT:-4173}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[knowledge-network e2e]"
# Create pack, subscribe to it, verify subscribers count
CID=$(curl -sS $BASE/api/contributors | python3 -c 'import sys,json;print(json.load(sys.stdin)["contributors"][0]["id"])')
step "create pack" -X POST -H 'Content-Type: application/json' -d "{\"name\":\"e2e-pack\",\"domain\":\"e2e\",\"contributor_id\":\"$CID\",\"facts\":10}" "$BASE/api/packs"
PID=$(curl -sS $BASE/api/packs | python3 -c 'import sys,json;ps=json.load(sys.stdin)["packs"];print([p["id"] for p in ps if p["name"]=="e2e-pack"][0])')
step "subscribe 1" -X POST -H 'Content-Type: application/json' -d "{\"pack_id\":\"$PID\",\"subscriber\":\"s1\"}" "$BASE/api/subscriptions"
step "subscribe 2" -X POST -H 'Content-Type: application/json' -d "{\"pack_id\":\"$PID\",\"subscriber\":\"s2\"}" "$BASE/api/subscriptions"
step "pack now" "$BASE/api/packs/$PID"
step "filter by domain" "$BASE/api/packs?domain=e2e"
step "subscriptions" "$BASE/api/subscriptions"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL