#!/usr/bin/env bash
set -e
PORT=${PORT:-4171}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[api-docs-generator e2e]"
# Create a service, generate docs, fetch both OpenAPI and markdown
step "create" -X POST -H 'Content-Type: application/json' -d '{"name":"e2e-svc","base_url":"http://localhost:9999","endpoints":["/api/foo","/api/bar","/api/baz"]}' "$BASE/api/services"
SID=$(curl -sS $BASE/api/services | python3 -c 'import sys,json;ps=json.load(sys.stdin)["services"];print([s["id"] for s in ps if s["name"]=="e2e-svc"][0])')
step "generate" -X POST "$BASE/api/services/$SID/generate"
DID=$(curl -sS $BASE/api/docs | python3 -c 'import sys,json;ps=json.load(sys.stdin)["docs"];print([d["id"] for d in ps if d["service"]=="e2e-svc"][0])')
step "fetch doc" "$BASE/api/docs/$DID"
step "list docs" "$BASE/api/docs"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL