#!/usr/bin/env bash
set -e
PORT=${PORT:-4173}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
run() { local n="$1" e="$2"; shift 2; local c=$(curl -sS -o /tmp/smoke.json -w '%{http_code}' "$@"); if [[ "$c" == "$e" ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n (got $c, expected $e)"; FAIL=$((FAIL+1)); fi; }
echo "[knowledge-network smoke]"
run health 200 "$BASE/health"
run packs 200 "$BASE/api/packs"
run contributors 200 "$BASE/api/contributors"
run subscriptions 200 "$BASE/api/subscriptions"
run packs_domain 200 "$BASE/api/packs?domain=legal"
PID=$(curl -sS $BASE/api/packs | python3 -c 'import sys,json;print(json.load(sys.stdin)["packs"][0]["id"])')
run pack_get 200 "$BASE/api/packs/$PID"
run pack_404 404 "$BASE/api/packs/nope"
CID=$(curl -sS $BASE/api/contributors | python3 -c 'import sys,json;print(json.load(sys.stdin)["contributors"][0]["id"])')
run pack_create 201 -X POST -H 'Content-Type: application/json' -d "{\"name\":\"e2e\",\"domain\":\"legal\",\"contributor_id\":\"$CID\"}" "$BASE/api/packs"
run contrib_create 201 -X POST -H 'Content-Type: application/json' -d '{"name":"e2e-c"}' "$BASE/api/contributors"
run sub_create 201 -X POST -H 'Content-Type: application/json' -d "{\"pack_id\":\"$PID\",\"subscriber\":\"e2e-sub\"}" "$BASE/api/subscriptions"
run sub_bad 400 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/subscriptions"
echo "Smoke: $PASS passed, $FAIL failed"; exit $FAIL