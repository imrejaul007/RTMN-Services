#!/usr/bin/env bash
set -e
PORT=${PORT:-4154}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[planning-engine e2e]"
# E2E 1: Create a 4-step plan with deps, validate DAG
step "create plan" -X POST -H 'Content-Type: application/json' -d '{"goal":"e2e1","steps":[{"name":"auth","order":1,"est_ms":5},{"name":"fetch","order":2,"depends_on":[1],"est_ms":12},{"name":"charge","order":3,"depends_on":[2],"est_ms":200},{"name":"notify","order":4,"depends_on":[3],"est_ms":40}],"constraints":{"max_total_ms":400}}' "$BASE/api/plans"
# E2E 2: Critical path on hotel-booking seed
HID=$(curl -sS $BASE/api/plans | python3 -c 'import sys,json;ps=json.load(sys.stdin)["plans"];print([p["id"] for p in ps if "hotel" in p["goal"]][0])')
step "critical path" "$BASE/api/plans/$HID/critical-path"
# E2E 3: Validate DAG on cycle
step "validate cycle" -X POST -H 'Content-Type: application/json' -d '{"goal":"cyc","steps":[{"name":"a","order":1,"depends_on":[2],"est_ms":1},{"name":"b","order":2,"depends_on":[1],"est_ms":1}]}' "$BASE/api/plans"
LAST=$(curl -sS $BASE/api/plans | python3 -c 'import sys,json;print(json.load(sys.stdin)["plans"][-1]["id"])')
step "validate cycle path" "$BASE/api/plans/$LAST/validate"
# E2E 4: Templates list
step "templates" "$BASE/api/step-templates"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL