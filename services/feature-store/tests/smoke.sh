#!/usr/bin/env bash
set -e
PORT=${PORT:-4164}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
run() { local n="$1" e="$2"; shift 2; local c=$(curl -sS -o /tmp/smoke.json -w '%{http_code}' "$@"); if [[ "$c" == "$e" ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n (got $c, expected $e)"; FAIL=$((FAIL+1)); fi; }
echo "[feature-store smoke]"
run health 200 "$BASE/health"
run ready 200 "$BASE/ready"
run features 200 "$BASE/api/features"
run features_owner 200 "$BASE/api/features?owner=sales-os"
run features_type 200 "$BASE/api/features?type=float"
FID=$(curl -sS $BASE/api/features | python3 -c 'import sys,json;print(json.load(sys.stdin)["features"][0]["id"])')
run feature_get 200 "$BASE/api/features/$FID"
run feature_404 404 "$BASE/api/features/nope"
run feat_create 201 -X POST -H 'Content-Type: application/json' -d '{"name":"test_feat","type":"float","owner":"e2e"}' "$BASE/api/features"
run feat_bad 400 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/features"
run online_entity 200 "$BASE/api/online/cust-001"
run online_feature 200 "$BASE/api/online/cust-001/customer_lifetime_value"
run online_404 404 "$BASE/api/online/cust-999/nope_feat"
run put_value 200 -X PUT -H 'Content-Type: application/json' -d '{"value":42.5}' "$BASE/api/online/cust-001/customer_lifetime_value"
echo "Smoke: $PASS passed, $FAIL failed"; exit $FAIL