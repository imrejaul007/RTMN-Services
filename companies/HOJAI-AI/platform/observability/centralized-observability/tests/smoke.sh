#!/usr/bin/env bash
set -e
PORT=${PORT:-4153}
BASE="http://localhost:${PORT}"
PASS=0
FAIL=0

run() {
  local name="$1" expected="$2"; shift 2
  local body
  body=$(curl -sS -o /tmp/smoke.json -w '%{http_code}' "$@")
  if [[ "$body" == "$expected" ]]; then
    echo "  PASS: $name ($body)"
    PASS=$((PASS+1))
  else
    echo "  FAIL: $name (got $body, expected $expected)"
    cat /tmp/smoke.json; echo
    FAIL=$((FAIL+1))
  fi
}

echo "[centralized-observability smoke]"

# Health & ready
run "health"  200 "$BASE/health"
run "ready"   200 "$BASE/ready"

# Metrics — seed + create + list + filter + aggregate
run "metrics list"          200 "$BASE/api/metrics"
run "metrics filter name"   200 "$BASE/api/metrics?name=http_requests_total"
run "metrics filter svc"    200 "$BASE/api/metrics?service=ai-intelligence"
run "metrics aggregate"     200 "$BASE/api/metrics/aggregate?name=ai_inference_seconds"
run "metrics aggregate p95" 200 "$BASE/api/metrics/aggregate?name=ai_inference_seconds&service=ai-intelligence"
run "metrics aggregate 404" 200 "$BASE/api/metrics/aggregate?name=does_not_exist"

run "metrics create"        201 -X POST -H 'Content-Type: application/json' \
  -d '{"name":"custom_metric","type":"counter","value":42,"service":"test-svc"}' "$BASE/api/metrics"
run "metrics missing body"  400 -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/metrics"

# Traces
run "traces list"           200 "$BASE/api/traces"
run "traces filter svc"     200 "$BASE/api/traces?service=order-twin"
run "traces min dur"        200 "$BASE/api/traces?min_duration=200"
run "traces create"         201 -X POST -H 'Content-Type: application/json' \
  -d '{"name":"GET /api/test","service":"test-svc","duration_ms":50,"spans":[]}' "$BASE/api/traces"
run "traces 404"            404 "$BASE/api/traces/nonexistent"

# Logs
run "logs list"             200 "$BASE/api/logs"
run "logs create"           201 -X POST -H 'Content-Type: application/json' \
  -d '{"level":"info","service":"test-svc","message":"hello"}' "$BASE/api/logs"
run "logs filter level"     200 "$BASE/api/logs?level=info"
run "logs search"           200 "$BASE/api/logs?q=hello"

# Alerts
run "alerts list"           200 "$BASE/api/alerts"
run "alerts create"         201 -X POST -H 'Content-Type: application/json' \
  -d '{"name":"new alert","condition":"x>1","severity":"warning"}' "$BASE/api/alerts"

# Dashboards
run "dashboards list"       200 "$BASE/api/dashboards"
run "dashboards create"     201 -X POST -H 'Content-Type: application/json' \
  -d '{"name":"My Dash","panels":["p1","p2"]}' "$BASE/api/dashboards"

# Stats
run "stats"                 200 "$BASE/api/stats"

echo "Smoke: $PASS passed, $FAIL failed"
exit $FAIL