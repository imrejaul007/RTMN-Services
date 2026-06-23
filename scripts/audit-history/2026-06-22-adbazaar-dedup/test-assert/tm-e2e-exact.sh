#!/usr/bin/env bash
# tenant-manager - bash e2e tests
set -euo pipefail

PORT="${TENANT_MANAGER_E2E_PORT:-$((45000 + RANDOM % 5000))}"
export PORT
export TENANT_MANAGER_REQUIRE_AUTH=false
unset NODE_ENV

cd "$(dirname "$0")/.."

node src/index.js &
PID=$!
trap "kill $PID 2>/dev/null || true" EXIT

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

SLUG="e2e-$(date +%s)-$RANDOM"
USER_ID="e2e-user-$(date +%s)-$RANDOM"

# ----- Health -----
assert "GET /health" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/health)" "200"
assert "GET /api/health" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/health)" "200"
assert "GET /ready" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/ready)" "200"

# ----- Tenant validation (400s) -----
assert "POST /api/tenants (no name -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/tenants \
  -H 'Content-Type: application/json' -d "{\"slug\":\"$SLUG\"}")" "400"
assert "POST /api/tenants (no slug -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/tenants \
  -H 'Content-Type: application/json' -d '{"name":"X"}')" "400"
assert "POST /api/tenants (bad plan -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/tenants \
  -H 'Content-Type: application/json' -d "{\"name\":\"X\",\"slug\":\"bad-$RANDOM\",\"plan\":\"galactic\"}")" "400"
assert "POST /api/tenants (bad region -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/tenants \
  -H 'Content-Type: application/json' -d "{\"name\":\"X\",\"slug\":\"bad-$RANDOM\",\"region\":\"mars\"}")" "400"

# ----- Tenant happy path -----
TENANT_BODY=$(curl -s -X POST http://localhost:$PORT/api/tenants \
  -H 'Content-Type: application/json' -d "{\"name\":\"E2E Co\",\"slug\":\"$SLUG\",\"plan\":\"pro\"}")
TENANT_ID=$(echo "$TENANT_BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")
assert "POST /api/tenants (create -> 201)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/tenants \
  -H 'Content-Type: application/json' -d "{\"name\":\"E2E2\",\"slug\":\"dup-$RANDOM\"}")" "201"
assert "POST /api/tenants (dup slug -> 409)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/tenants \
  -H 'Content-Type: application/json' -d "{\"name\":\"Dup\",\"slug\":\"$SLUG\"}")" "409"
assert "GET /api/tenants (list)" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/tenants)" "200"
assert "GET /api/tenants/:id" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/tenants/$TENANT_ID)" "200"
assert "GET /api/tenants/by-slug/:slug" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/tenants/by-slug/$SLUG)" "200"
assert "GET /api/tenants/missing (404)" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/tenants/zzz-missing)" "404"
assert "PUT /api/tenants/:id (plan update)" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT http://localhost:$PORT/api/tenants/$TENANT_ID \
  -H 'Content-Type: application/json' -d '{"plan":"starter"}')" "200"
assert "POST /api/tenants/:id/suspend" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/tenants/$TENANT_ID/suspend)" "200"
assert "POST /api/tenants/:id/activate" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/tenants/$TENANT_ID/activate)" "200"

# ----- Projects -----
PROJECT_BODY=$(curl -s -X POST http://localhost:$PORT/api/tenants/$TENANT_ID/projects \
  -H 'Content-Type: application/json' -d "{\"name\":\"E2E App\",\"slug\":\"e2e-app-$RANDOM\"}")
PROJECT_ID=$(echo "$PROJECT_BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")
assert "POST /api/tenants/:id/projects" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/tenants/$TENANT_ID/projects \
  -H 'Content-Type: application/json' -d "{\"name\":\"P2\",\"slug\":\"e2e-p2-$RANDOM\"}")" "201"
assert "POST project (no name -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/tenants/$TENANT_ID/projects \
  -H 'Content-Type: application/json' -d '{"slug":"x"}')" "400"
assert "GET /api/tenants/:id/projects" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/tenants/$TENANT_ID/projects)" "200"
assert "GET /api/projects/:projectId" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/projects/$PROJECT_ID)" "200"
assert "PUT /api/projects/:projectId" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT http://localhost:$PORT/api/projects/$PROJECT_ID \
  -H 'Content-Type: application/json' -d '{"name":"Renamed"}')" "200"

# ----- Members -----
assert "POST member (no userId -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/tenants/$TENANT_ID/members \
  -H 'Content-Type: application/json' -d '{"email":"a@b.com"}')" "400"
assert "POST member (bad role -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/tenants/$TENANT_ID/members \
  -H 'Content-Type: application/json' -d "{\"userId\":\"u$RANDOM\",\"email\":\"a@b.com\",\"role\":\"god\"}")" "400"
assert "POST /api/tenants/:id/members" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/tenants/$TENANT_ID/members \
  -H 'Content-Type: application/json' -d "{\"userId\":\"$USER_ID\",\"email\":\"u$RANDOM@e2e.com\",\"role\":\"admin\"}")" "201"
assert "GET /api/tenants/:id/members" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/tenants/$TENANT_ID/members)" "200"
assert "PUT /api/tenants/:id/members/:userId" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT http://localhost:$PORT/api/tenants/$TENANT_ID/members/$USER_ID \
  -H 'Content-Type: application/json' -d '{"role":"viewer"}')" "200"

# ----- API Keys -----
KEY_BODY=$(curl -s -X POST http://localhost:$PORT/api/tenants/$TENANT_ID/keys \
  -H 'Content-Type: application/json' -d '{"name":"e2e key","scopes":["read"]}')
KEY_ID=$(echo "$KEY_BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")
KEY_PLAIN=$(echo "$KEY_BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).key))")
assert "POST key (no name -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/tenants/$TENANT_ID/keys \
  -H 'Content-Type: application/json' -d '{}')" "400"
assert "POST /api/tenants/:id/keys" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/tenants/$TENANT_ID/keys \
  -H 'Content-Type: application/json' -d '{"name":"e2e2","scopes":["read"]}')" "201"
assert "GET /api/tenants/:id/keys" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/tenants/$TENANT_ID/keys)" "200"
assert "POST /api/keys/validate (valid)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/keys/validate \
  -H 'Content-Type: application/json' -d "{\"key\":\"$KEY_PLAIN\"}")" "200"
assert "POST /api/keys/validate (missing -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/keys/validate \
  -H 'Content-Type: application/json' -d '{}')" "400"
assert "POST /api/keys/validate (unknown -> 404)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/keys/validate \
  -H 'Content-Type: application/json' -d '{"key":"wrong-key-zzz"}')" "404"
assert "DELETE /api/tenants/:id/keys/:keyId" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE http://localhost:$PORT/api/tenants/$TENANT_ID/keys/$KEY_ID)" "200"
assert "POST /api/keys/validate (revoked -> 401)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/keys/validate \
  -H 'Content-Type: application/json' -d "{\"key\":\"$KEY_PLAIN\"}")" "401"

# ----- Usage -----
assert "POST usage (no metric -> 400)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/tenants/$TENANT_ID/usage \
  -H 'Content-Type: application/json' -d '{"quantity":1}')" "400"
assert "POST /api/tenants/:id/usage" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:$PORT/api/tenants/$TENANT_ID/usage \
  -H 'Content-Type: application/json' -d '{"metric":"calls","quantity":7}')" "201"
assert "GET /api/tenants/:id/usage" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/tenants/$TENANT_ID/usage)" "200"
assert "GET /api/tenants/:id/usage/aggregate" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/tenants/$TENANT_ID/usage/aggregate)" "200"

# ----- Audit -----
assert "GET /api/tenants/:id/audit" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/tenants/$TENANT_ID/audit)" "200"
assert "GET /api/audit (global)" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/api/audit)" "200"

# ----- Soft delete -----
assert "DELETE member" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE http://localhost:$PORT/api/tenants/$TENANT_ID/members/$USER_ID)" "200"
assert "DELETE /api/projects/:projectId" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE http://localhost:$PORT/api/projects/$PROJECT_ID)" "200"
assert "DELETE /api/tenants/:id (soft)" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE http://localhost:$PORT/api/tenants/$TENANT_ID)" "200"

echo "----"
echo "PASS=$PASS  FAIL=$FAIL"
exit $FAIL