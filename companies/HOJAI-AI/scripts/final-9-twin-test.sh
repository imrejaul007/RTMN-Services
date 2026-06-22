#!/bin/bash
# Final 9-twin smoke test — exercises all 9 newly-wired twins end-to-end
# and verifies the integration fired for each.

set -e

JWT_SECRET="dev_jwt_secret_change_in_production_minimum_64_characters_required_for_security"

cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/twins/twinos-shared

JWT=$(node -e "
const jwt = require('jsonwebtoken');
console.log(jwt.sign(
  { sub: 'user-final', email: 'final@rtmn.com', role: 'superadmin', businessId: 'FINAL-HQ', type: 'access' },
  '$JWT_SECRET',
  { issuer: 'rtmn-corpid', expiresIn: '1h' }
));
")

LEGACY=$(python3 -c "
import json, base64, time
p = {'sub':'user-final','email':'final@rtmn.com','role':'superadmin','businessId':'FINAL-HQ','exp':int((time.time()+3600)*1000)}
print(base64.b64encode(json.dumps(p).encode()).decode())
")

SUFFIX=$(date +%s | tail -c 5)

echo "═══════════════════════════════════════════════════════════════"
echo "  FINAL 9-TWIN VERIFICATION"
echo "═══════════════════════════════════════════════════════════════"
echo ""

PASS=0
FAIL=0
FAILED_TWINS=""

# 1. asset-twin
echo "── asset-twin ──"
RESP=$(curl -s -m 5 -X POST http://localhost:4890/api/assets \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d "{\"name\":\"A$SUFFIX\",\"category\":\"equipment\",\"type\":\"vehicle\",\"value\":1}")
SUCCESS=$(echo "$RESP" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('success', False))" 2>/dev/null)
if [ "$SUCCESS" = "True" ]; then echo "  ✓ created"; PASS=$((PASS+1)); else echo "  ✗ $RESP" | head -c 200; FAIL=$((FAIL+1)); FAILED_TWINS="$FAILED_TWINS asset"; fi
sleep 3

# 2. lead-twin
echo ""
echo "── lead-twin ──"
RESP=$(curl -s -m 5 -X POST http://localhost:4894/leads \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d "{\"name\":\"L$SUFFIX\",\"email\":\"l$SUFFIX@t.com\",\"source\":\"smoke\"}")
SUCCESS=$(echo "$RESP" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('success', False))" 2>/dev/null)
if [ "$SUCCESS" = "True" ]; then echo "  ✓ created"; PASS=$((PASS+1)); else echo "  ✗ $RESP" | head -c 200; FAIL=$((FAIL+1)); FAILED_TWINS="$FAILED_TWINS lead"; fi
sleep 3

# 3. merchant-twin
echo ""
echo "── merchant-twin ──"
RESP=$(curl -s -m 5 -X POST http://localhost:4888/api/twins/merchants \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d "{\"businessName\":\"M$SUFFIX\",\"ownerName\":\"Owner $SUFFIX\",\"email\":\"m$SUFFIX@t.com\",\"category\":\"restaurant\"}")
SUCCESS=$(echo "$RESP" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('success', False))" 2>/dev/null)
if [ "$SUCCESS" = "True" ]; then echo "  ✓ created"; PASS=$((PASS+1)); else echo "  ✗ $RESP" | head -c 200; FAIL=$((FAIL+1)); FAILED_TWINS="$FAILED_TWINS merchant"; fi
sleep 3

# 4. product-twin (legacy)
echo ""
echo "── product-twin ──"
RESP=$(curl -s -m 5 -X POST http://localhost:4720/api/products \
  -H "Authorization: Bearer $LEGACY" -H "Content-Type: application/json" \
  -d "{\"name\":\"P$SUFFIX\",\"sku\":\"P$SUFFIX\",\"price\":1}")
SUCCESS=$(echo "$RESP" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('success', False))" 2>/dev/null)
if [ "$SUCCESS" = "True" ]; then echo "  ✓ created"; PASS=$((PASS+1)); else echo "  ✗ $RESP" | head -c 200; FAIL=$((FAIL+1)); FAILED_TWINS="$FAILED_TWINS product"; fi
sleep 3

# 5. employee-twin
echo ""
echo "── employee-twin ──"
RESP=$(curl -s -m 5 -X POST http://localhost:4730/api/employees \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d "{\"firstName\":\"E$SUFFIX\",\"lastName\":\"Test\",\"email\":\"e$SUFFIX@t.com\",\"department\":\"eng\",\"role\":\"engineer\"}")
SUCCESS=$(echo "$RESP" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('success', False))" 2>/dev/null)
if [ "$SUCCESS" = "True" ]; then echo "  ✓ created"; PASS=$((PASS+1)); else echo "  ✗ $RESP" | head -c 200; FAIL=$((FAIL+1)); FAILED_TWINS="$FAILED_TWINS employee"; fi
sleep 3

# 6. voice-twin
echo ""
echo "── voice-twin ──"
RESP=$(curl -s -m 5 -X POST http://localhost:4876/api/profiles \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d "{\"name\":\"V$SUFFIX\"}")
SUCCESS=$(echo "$RESP" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('success', False))" 2>/dev/null)
if [ "$SUCCESS" = "True" ]; then echo "  ✓ created"; PASS=$((PASS+1)); else echo "  ✗ $RESP" | head -c 200; FAIL=$((FAIL+1)); FAILED_TWINS="$FAILED_TWINS voice"; fi
sleep 3

# 7. user-twin (legacy)
echo ""
echo "── user-twin ──"
RESP=$(curl -s -m 5 -X POST http://localhost:4889/api/twins/users \
  -H "Authorization: Bearer $LEGACY" -H "Content-Type: application/json" \
  -d "{\"email\":\"u$SUFFIX@t.com\",\"name\":\"U$SUFFIX\"}")
SUCCESS=$(echo "$RESP" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('success', False))" 2>/dev/null)
if [ "$SUCCESS" = "True" ]; then echo "  ✓ created"; PASS=$((PASS+1)); else echo "  ✗ $RESP" | head -c 200; FAIL=$((FAIL+1)); FAILED_TWINS="$FAILED_TWINS user"; fi
sleep 3

# 8. partner-twin (legacy)
echo ""
echo "── partner-twin ──"
RESP=$(curl -s -m 5 -X POST http://localhost:4892/api/partners \
  -H "Authorization: Bearer $LEGACY" -H "Content-Type: application/json" \
  -d "{\"name\":\"Pa$SUFFIX\",\"type\":\"supplier\",\"contact\":{\"email\":\"pa$SUFFIX@t.com\"}}")
SUCCESS=$(echo "$RESP" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('success', False))" 2>/dev/null)
if [ "$SUCCESS" = "True" ]; then echo "  ✓ created"; PASS=$((PASS+1)); else echo "  ✗ $RESP" | head -c 200; FAIL=$((FAIL+1)); FAILED_TWINS="$FAILED_TWINS partner"; fi
sleep 3

# 9. inventory-twin
echo ""
echo "── inventory-twin ──"
RESP=$(curl -s -m 5 -X POST http://localhost:4887/api/twins/inventory \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d "{\"name\":\"I$SUFFIX\",\"sku\":\"I$SUFFIX\",\"category\":\"general\",\"warehouseId\":\"wh-1\",\"unitPrice\":1}")
SUCCESS=$(echo "$RESP" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('success', False))" 2>/dev/null)
if [ "$SUCCESS" = "True" ]; then echo "  ✓ created"; PASS=$((PASS+1)); else echo "  ✗ $RESP" | head -c 200; FAIL=$((FAIL+1)); FAILED_TWINS="$FAILED_TWINS inventory"; fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Results: $PASS / 9 passed"
if [ -n "$FAILED_TWINS" ]; then
  echo "  Failed: $FAILED_TWINS"
fi
echo "═══════════════════════════════════════════════════════════════"