#!/usr/bin/env bash
set -e
PORT=${PORT:-4172}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[observability-apis e2e]"
# E2E: Execute a few saved queries
for n in requests_per_service p99_latency firing_alerts; do
  QID=$(curl -sS $BASE/api/queries | python3 -c "import sys,json;ps=json.load(sys.stdin)['queries'];print([q['id'] for q in ps if q['name']=='$n'][0])")
  step "exec $n" -X POST "$BASE/api/queries/$QID/execute"
done
step "all queries" "$BASE/api/queries"
step "all dashboards" "$BASE/api/dashboards"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL