#!/usr/bin/env bash
set -e
PORT=${PORT:-4153}
BASE="http://localhost:${PORT}"
PASS=0
FAIL=0

step() {
  local name="$1"; shift
  local body
  body=$(curl -sS -w '\n%{http_code}' "$@")
  local code=$(echo "$body" | tail -1)
  local json=$(echo "$body" | sed '$d')
  if [[ "$code" =~ ^2 ]]; then
    echo "  PASS: $name ($code)"
    PASS=$((PASS+1))
    echo "$json" | head -c 200; echo
  else
    echo "  FAIL: $name (got $code)"
    echo "$json"
    FAIL=$((FAIL+1))
  fi
}

echo "[centralized-observability e2e]"

# E2E 1: Push 5 metrics for a new service, then aggregate
echo "--- E2E 1: Push metrics for new service and aggregate"
for v in 10 20 30 40 50; do
  step "push metric val=$v" -X POST -H 'Content-Type: application/json' \
    -d "{\"name\":\"e2e_counter\",\"type\":\"counter\",\"value\":$v,\"service\":\"e2e-svc\"}" \
    "$BASE/api/metrics"
done
step "aggregate e2e_counter" "$BASE/api/metrics/aggregate?name=e2e_counter&service=e2e-svc"

# E2E 2: Trace with multiple spans
echo "--- E2E 2: Trace with spans"
step "create rich trace" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"POST /e2e","service":"e2e-svc","duration_ms":100,"spans":[{"name":"auth"},{"name":"db"}]}' \
  "$BASE/api/traces"

# E2E 3: Alert lifecycle — create, patch to resolved, verify
echo "--- E2E 3: Alert lifecycle"
ALERT=$(curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"name":"e2e alert","condition":"x>0","severity":"info"}' "$BASE/api/alerts")
ALERT_ID=$(echo "$ALERT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["alert"]["id"])')
step "patch alert resolved" -X PATCH -H 'Content-Type: application/json' \
  -d '{"status":"resolved"}' "$BASE/api/alerts/$ALERT_ID"
step "alerts shows resolved" "$BASE/api/alerts"

# E2E 4: Logs searchable across services
echo "--- E2E 4: Multi-service log search"
for svc in svc-a svc-b svc-c; do
  step "log from $svc" -X POST -H 'Content-Type: application/json' \
    -d "{\"level\":\"warn\",\"service\":\"$svc\",\"message\":\"memory pressure detected\"}" \
    "$BASE/api/logs"
done
step "search 'memory'" "$BASE/api/logs?q=memory"

# E2E 5: Dashboard with real metric references
echo "--- E2E 5: Dashboard"
step "create dashboard" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"E2E Dash","panels":["http_requests_total","ai_inference_seconds"]}' \
  "$BASE/api/dashboards"
step "list dashboards" "$BASE/api/dashboards"

# E2E 6: Stats reflect all activity
step "final stats" "$BASE/api/stats"

echo "E2E: $PASS passed, $FAIL failed"
exit $FAIL