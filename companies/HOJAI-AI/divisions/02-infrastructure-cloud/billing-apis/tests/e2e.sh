#!/bin/bash
# E2E test for billing-apis (4111)
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

echo "=== billing-apis e2e: customer signup → usage → invoice → pay ==="

# Step 1: Create new customer
NEW_C=$(curl -s -X POST -H "Content-Type: application/json" -d '{"name":"E2E Co","email":"e2e@x.com","plan":"Pro"}' $BASE/api/customers)
CID=$(echo $NEW_C | python3 -c "import sys,json; print(json.load(sys.stdin)['customer']['id'])")
[ -n "$CID" ] && { echo "  ✓ customer created"; PASS=$((PASS+1)); } || { echo "  ✗ customer creation"; FAIL=$((FAIL+1)); }

# Step 2: Record multiple usage events
for metric in api_calls ai_tokens storage_gb; do
  qty=$((RANDOM % 10000 + 1))
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
    -d "{\"customer_id\":\"$CID\",\"metric\":\"$metric\",\"quantity\":$qty}" $BASE/api/usage/record)
  check "record $metric usage" $code
done

# Step 3: Check aggregated usage
USAGE=$(curl -s $BASE/api/customers/$CID/usage)
TOTAL_METRICS=$(echo $USAGE | python3 -c "import sys,json; print(len(json.load(sys.stdin)['by_metric']))")
[ "$TOTAL_METRICS" = "3" ] && { echo "  ✓ 3 metric categories aggregated"; PASS=$((PASS+1)); } || { echo "  ✗ expected 3 metrics, got $TOTAL_METRICS"; FAIL=$((FAIL+1)); }

# Step 4: Generate invoice
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/customers/$CID/invoices/generate)
check "generate invoice" $code

# Step 5: List customer invoices
INV_LIST=$(curl -s $BASE/api/customers/$CID/invoices)
INV_COUNT=$(echo $INV_LIST | python3 -c "import sys,json; print(len(json.load(sys.stdin)['invoices']))")
[ "$INV_COUNT" -ge "1" ] && { echo "  ✓ invoice list has entries"; PASS=$((PASS+1)); } || { echo "  ✗ no invoices"; FAIL=$((FAIL+1)); }

# Step 6: Pay invoice
INV_ID=$(echo $INV_LIST | python3 -c "import sys,json; d=json.load(sys.stdin); print([i['id'] for i in d['invoices'] if i['status']=='open'][0])")
[ -n "$INV_ID" ] && { echo "  ✓ open invoice found"; PASS=$((PASS+1)); } || { echo "  ✗ no open invoice"; FAIL=$((FAIL+1)); }

PAY_RES=$(curl -s -X POST $BASE/api/invoices/$INV_ID/pay)
PAY_STATUS=$(echo $PAY_RES | python3 -c "import sys,json; print(json.load(sys.stdin)['invoice']['status'])")
[ "$PAY_STATUS" = "paid" ] && { echo "  ✓ invoice marked paid"; PASS=$((PASS+1)); } || { echo "  ✗ invoice status: $PAY_STATUS"; FAIL=$((FAIL+1)); }

# Step 7: Verify payment recorded
PAYMENTS=$(curl -s $BASE/api/payments)
PAY_COUNT=$(echo $PAYMENTS | python3 -c "import sys,json; print(len(json.load(sys.stdin)['payments']))")
[ "$PAY_COUNT" -ge "1" ] && { echo "  ✓ payment recorded"; PASS=$((PASS+1)); } || { echo "  ✗ no payments"; FAIL=$((FAIL+1)); }

# Step 8: Billing portal link
PORTAL=$(curl -s $BASE/api/customers/$CID/billing-portal)
PORTAL_URL=$(echo $PORTAL | python3 -c "import sys,json; print(json.load(sys.stdin)['portal_url'])")
[[ "$PORTAL_URL" == *"hojai"* ]] && { echo "  ✓ portal URL valid"; PASS=$((PASS+1)); } || { echo "  ✗ bad portal URL"; FAIL=$((FAIL+1)); }

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1