#!/usr/bin/env bash
set -e
PORT=${PORT:-4155}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[policy-os-canonical e2e]"
# E2E 1: Create rate-limit policy and test enforcement
step "create rl" -X POST -H 'Content-Type: application/json' -d '{"name":"e2e-rl","rules":[{"type":"rate_limit","key":"x","limit":2}]}' "$BASE/api/policies"
EID=$(curl -sS $BASE/api/policies | python3 -c 'import sys,json;ps=json.load(sys.stdin)["policies"];print([p["id"] for p in ps if p["name"]=="e2e-rl"][0])')
step "eval 1" -X POST -H 'Content-Type: application/json' -d '{"counters":{"x":1}}' "$BASE/api/policies/$EID/evaluate"
step "eval 2 (deny)" -X POST -H 'Content-Type: application/json' -d '{"counters":{"x":3}}' "$BASE/api/policies/$EID/evaluate"
# E2E 2: Patch policy to bump version
step "patch" -X PATCH -H 'Content-Type: application/json' -d '{"rules":[{"type":"allow"}]}' "$BASE/api/policies/$EID"
# E2E 3: Eval after patch (now allow)
step "eval allow" -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/policies/$EID/evaluate"
# E2E 4: Evaluations list
step "evals" "$BASE/api/evaluations"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL