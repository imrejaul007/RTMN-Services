#!/bin/bash
# Smoke test for billing-apis (4111)
set -e
PORT=${PORT:-4111}
BASE="http://localhost:$PORT"
PASS=0; FAIL=0

check() {
  local desc=$1; local code=$2
  if [ "$code" = "200" ] || [ "$code" = "201" ]; then
    echo "  ✓ $desc ($code)"; PASS=$((PASS+1))
  else
    echo "  ✗ $desc (expected 200/201, got $code)"; FAIL=$((FAIL+1))
  fi
}

echo "=== billing-apis smoke tests ==="

# Health
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/health); check "GET /health" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/); check "GET /" $code

# Plans
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/plans); check "GET /api/plans" $code

# Customers
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/customers); check "GET /api/customers" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"name":"Test Corp","email":"test@x.com","plan":"Pro"}' $BASE/api/customers); check "POST /api/customers" $code

# Usage
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/invoices); check "GET /api/invoices" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/payments); check "GET /api/payments" $code

# Get first customer
CID=$(curl -s $BASE/api/customers | python3 -c "import sys,json; print(json.load(sys.stdin)['customers'][0]['id'])")
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/customers/$CID); check "GET /api/customers/:id" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/customers/$CID/usage); check "GET /api/customers/:id/usage" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/customers/$CID/invoices); check "GET /api/customers/:id/invoices" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/customers/$CID/subscriptions); check "GET /api/customers/:id/subscriptions" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/customers/$CID/billing-portal); check "GET /api/customers/:id/billing-portal" $code

# Record usage
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"customer_id\":\"$CID\",\"metric\":\"api_calls\",\"quantity\":100}" $BASE/api/usage/record); check "POST /api/usage/record" $code

# Get first open invoice and pay it
INV_ID=$(curl -s $BASE/api/invoices | python3 -c "import sys,json; print([i['id'] for i in json.load(sys.stdin)['invoices'] if i['status']=='open'][0])")
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/invoices/$INV_ID/pay); check "POST /api/invoices/:id/pay" $code

# Webhook
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"type":"invoice.paid","data":{"id":"in_123"}}' $BASE/api/webhooks/stripe); check "POST /api/webhooks/stripe" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1