#!/usr/bin/env bash
# risk-intelligence - bash e2e tests
# Boots the service on a random port, hits it over HTTP, asserts expected status codes.
set -euo pipefail

PORT="${RISK_INTELLIGENCE_E2E_PORT:-$((45000 + RANDOM % 5000))}"
export PORT
export RISK_INTELLIGENCE_REQUIRE_AUTH=false
unset NODE_ENV

cd "$(dirname "$0")/.."

node src/index.js &
PID=$!
trap "kill $PID 2>/dev/null || true" EXIT

# Wait for ready
for i in {1..30}; do
  if curl -fsS "http://localhost:$PORT/api/health" > /dev/null 2>&1; then break; fi
  sleep 0.5
done

PASS=0; FAIL=0
assert() {
  local label="$1"; local actual="$2"; local expected="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "PASS  $label  ($actual)"
    PASS=$((PASS+1))
  else
    echo "FAIL  $label  expected=$expected got=$actual"
    FAIL=$((FAIL+1))
  fi
}

# Health
assert "GET /api/health" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/health)" "200"

# Fraud
assert "POST /api/fraud/score" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/fraud/score \
  -H 'Content-Type: application/json' \
  -d '{"transaction":{"amount":100,"merchantCategory":"grocery"},"context":{"deviceFingerprint":"a","ipRiskScore":0.1,"velocityLast1h":0,"velocityLast24h":0,"accountAge":365,"priorFraudFlags":0}}')" "200"
assert "POST /api/fraud/score/batch" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/fraud/score/batch \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"transaction":{"amount":50}},{"transaction":{"amount":5000}}]}')" "200"
assert "GET /api/fraud/rules" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/fraud/rules)" "200"
assert "PATCH /api/fraud/rules" "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH http://localhost:$PORT/api/fraud/rules \
  -H 'Content-Type: application/json' -d '{"weights":{"amount":0.5}}')" "200"

# Churn
assert "POST /api/churn/score" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/churn/score \
  -H 'Content-Type: application/json' \
  -d '{"customerId":"c-1","features":{"recencyDays":30,"frequency30d":5,"monetary30d":100,"tenureMonths":12,"supportTickets":0,"nps":9}}')" "200"
assert "POST /api/churn/cohort" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/churn/cohort \
  -H 'Content-Type: application/json' \
  -d '{"customerIds":["c1","c2"],"featuresByCustomer":{"c1":{"tenure":6,"lastLoginDays":60,"npsScore":5},"c2":{"tenure":12,"lastLoginDays":5,"npsScore":9}}}')" "200"

# Credit
assert "POST /api/credit/score" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/credit/score \
  -H 'Content-Type: application/json' \
  -d '{"applicant":{"age":30,"income":50000,"debtToIncome":0.2,"creditHistoryYears":5,"recentInquiries":1}}')" "200"
assert "POST /api/credit/simulate" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/credit/simulate \
  -H 'Content-Type: application/json' \
  -d '{"applicant":{"age":30,"income":50000},"scenarios":[{"name":"a","debtToIncome":0.1}]}')" "200"

# Composite
assert "POST /api/risk/composite" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/risk/composite \
  -H 'Content-Type: application/json' \
  -d '{"fraud":30,"churn":0.2,"credit":720}')" "200"
assert "PATCH /api/risk/thresholds" "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH http://localhost:$PORT/api/risk/thresholds \
  -H 'Content-Type: application/json' \
  -d '{"thresholds":{"fraud":{"medium":50}}}')" "200"

# Audit
assert "GET /api/audit" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/audit)" "200"

echo "----"
echo "PASS=$PASS  FAIL=$FAIL"
exit $FAIL