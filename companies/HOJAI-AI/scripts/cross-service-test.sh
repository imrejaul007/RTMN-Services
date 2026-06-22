#!/bin/bash
# Cross-Service Integration Test
# Exercises the platform-client wiring by creating an org, customer, etc.
# and verifying that:
#   1. event-bus (4510) received the event
#   2. twin-memory-bridge (4704) created a partition binding
#   3. MemoryOS (4703) recorded a memory
#
# Rate-limit safe: ~12 requests over ~30s.

set -e

# Two tokens: twins use both kinds of auth
# - Base64-JSON token for twins using @rtmn/shared/auth (organization, customer,
#   payment, wallet, order, twinos-hub)
# - Real JWT for twins using @rtmn/twinos-shared (asset, employee, inventory,
#   lead, merchant, partner, product, user, voice)
JWT_SECRET="dev_jwt_secret_change_in_production_minimum_64_characters_required_for_security"

USER_TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
console.log(jwt.sign(
  { sub: 'user-test', email: 'test@rtmn.com', role: 'superadmin', businessId: 'RTMN-HQ', type: 'access' },
  '$JWT_SECRET',
  { issuer: 'rtmn-corpid', expiresIn: '1h' }
));
" 2>/dev/null || python3 -c "
import json, base64, time
p = {'sub':'user-test','email':'test@rtmn.com','role':'superadmin','businessId':'RTMN-HQ','exp':int((time.time()+3600)*1000)}
print(base64.b64encode(json.dumps(p).encode()).decode())
")

# Base64 token — only needed for the legacy @rtmn/shared/auth path
LEGACY_TOKEN=$(python3 -c "
import json, base64, time
p = {'sub':'user-test','email':'test@rtmn.com','role':'superadmin','businessId':'RTMN-HQ','exp':int((time.time()+3600)*1000)}
print(base64.b64encode(json.dumps(p).encode()).decode())
")

SUFFIX=$(date +%s | tail -c 6)
ORG_ID=""

echo "═══════════════════════════════════════════════════════════════"
echo "  Cross-Service Integration Test"
echo "═══════════════════════════════════════════════════════════════"

# 1. Create org via organization-twin
echo ""
echo "── Test 1: Organization creation ──"
RESP=$(curl -s -m 10 -X POST http://localhost:4710/api/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LEGACY_TOKEN" \
  -d "{\"name\":\"SmokeTest-$SUFFIX\",\"industry\":\"Technology\",\"size\":\"small\"}")
ORG_ID=$(echo "$RESP" | python3 -c "import json,sys; print(json.loads(sys.stdin.read()).get('twin',{}).get('id',''))")
echo "  Created org: $ORG_ID"
[ -n "$ORG_ID" ] || { echo "  ✗ FAIL: org not created"; exit 1; }
sleep 3

# 2. Verify event-bus
echo ""
echo "── Test 2: Event-bus publication ──"
EVT_COUNT=$(curl -s -m 5 "http://localhost:4510/api/events?limit=100" | python3 -c "
import json, sys
d = json.loads(sys.stdin.read())
evs = [e for e in d.get('events', []) if '$ORG_ID' in str(e.get('payload',{}))]
print(len(evs))
")
echo "  Event-bus events for $ORG_ID: $EVT_COUNT"
[ "$EVT_COUNT" -ge 1 ] || { echo "  ✗ FAIL: no event published"; exit 1; }
sleep 3

# 3. Verify bridge binding
echo ""
echo "── Test 3: Twin-memory-bridge binding ──"
BIND_COUNT=$(curl -s -m 5 "http://localhost:4704/api/bindings?limit=100" | python3 -c "
import json, sys
d = json.loads(sys.stdin.read())
bs = d.get('bindings', d.get('data', []))
matches = [b for b in bs if '$ORG_ID' in str(b)]
print(len(matches))
")
echo "  Bridge bindings for $ORG_ID: $BIND_COUNT"
[ "$BIND_COUNT" -ge 1 ] || { echo "  ✗ FAIL: no binding created"; exit 1; }
sleep 3

# 4. Verify MemoryOS memory
echo ""
echo "── Test 4: MemoryOS episodic memory ──"
MEM_COUNT=$(curl -s -m 5 "http://localhost:4703/api/memories?twinId=$ORG_ID&limit=10" | python3 -c "
import json, sys
d = json.loads(sys.stdin.read())
ms = d.get('memories', [])
print(len([m for m in ms if m.get('twinId') == '$ORG_ID']))
")
echo "  MemoryOS memories for $ORG_ID: $MEM_COUNT"
[ "$MEM_COUNT" -ge 1 ] || { echo "  ✗ FAIL: no memory recorded"; exit 1; }

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✓ ALL CHECKS PASSED"
echo "═══════════════════════════════════════════════════════════════"