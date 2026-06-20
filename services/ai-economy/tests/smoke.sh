#!/usr/bin/env bash
set -e
PORT=${PORT:-4175}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
run() { local n="$1" e="$2"; shift 2; local c=$(curl -sS -o /tmp/smoke.json -w '%{http_code}' "$@"); if [[ "$c" == "$e" ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n (got $c, expected $e)"; FAIL=$((FAIL+1)); fi; }
echo "[ai-economy smoke]"
run health 200 "$BASE/health"
run actors 200 "$BASE/api/actors"
run txs 200 "$BASE/api/transactions"
A1=$(curl -sS $BASE/api/actors | python3 -c 'import sys,json;ps=json.load(sys.stdin)["actors"];print([a["id"] for a in ps if a["balance"]>=1000][0])')
A2=$(curl -sS $BASE/api/actors | python3 -c 'import sys,json;ps=json.load(sys.stdin)["actors"];print([a["id"] for a in ps if a["balance"]<1000][-1])')
run actor_get 200 "$BASE/api/actors/$A1"
run actor_404 404 "$BASE/api/actors/nope"
run actor_create 201 -X POST -H 'Content-Type: application/json' -d '{"name":"e2e-actor","type":"customer"}' "$BASE/api/actors"
run tx 201 -X POST -H 'Content-Type: application/json' -d "{\"from\":\"$A1\",\"to\":\"$A2\",\"amount\":100,\"memo\":\"e2e\"}" "$BASE/api/transactions"
run tx_bad 400 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/transactions"
run tx_overspend 409 -X POST -H 'Content-Type: application/json' -d "{\"from\":\"$A2\",\"to\":\"$A1\",\"amount\":99999}" "$BASE/api/transactions"
echo "Smoke: $PASS passed, $FAIL failed"; exit $FAIL