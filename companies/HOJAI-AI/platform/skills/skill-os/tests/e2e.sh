#!/bin/bash
# skill-os - Proper end-to-end tests
# Creates a skill, then exercises all the dependent endpoints.
set -u
BASE_URL="${BASE_URL:-http://localhost:4743}"
PASS=0; FAIL=0
TMPDIR="${TMPDIR:-/tmp}"

# Service must be up
if ! curl -s --max-time 1 -o /dev/null "${BASE_URL}/health" 2>/dev/null; then
  echo "  SKIP  Service not running at ${BASE_URL}"
  exit 0
fi

PASS_REQ=()   # accumulated "pass" counter
FAIL_REQ=()   # accumulated "fail" counter

# Strip ANSI color codes from response body
clean() { sed -E 's/\x1b\[[0-9;]*[a-zA-Z]//g'; }

run() {
  local label="$1" method="$2" path="$3" data="${4:-}" expect_code="${5:-200}"
  local body_file="${TMPDIR}/_skill_os_$$_$RANDOM.json"
  if [ -n "$data" ]; then
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "${BASE_URL}${path}")
  else
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" "${BASE_URL}${path}")
  fi
  if [ "$code" = "$expect_code" ]; then
    echo "  PASS  [$code]  $method $path  -- $label"
    PASS=$((PASS+1))
  else
    body=$(cat "$body_file" | clean | head -c 200)
    echo "  FAIL  [$code]  $method $path  -- $label (expected $expect_code)"
    echo "        body: $body"
    FAIL=$((FAIL+1))
  fi
  rm -f "$body_file"
}

# run_ok_any: accept 2xx (200 or 201) — useful for endpoints that may return either
run_ok_any() {
  local label="$1" method="$2" path="$3" data="${4:-}"
  local body_file="${TMPDIR}/_skill_os_$$_$RANDOM.json"
  if [ -n "$data" ]; then
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "${BASE_URL}${path}")
  else
    code=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" "${BASE_URL}${path}")
  fi
  if [ "$code" -ge 200 ] && [ "$code" -lt 300 ]; then
    echo "  PASS  [$code]  $method $path  -- $label"
    PASS=$((PASS+1))
  else
    body=$(cat "$body_file" | clean | head -c 200)
    echo "  FAIL  [$code]  $method $path  -- $label (expected 2xx)"
    echo "        body: $body"
    FAIL=$((FAIL+1))
  fi
  rm -f "$body_file"
}

# Assert body contains string
assert_body() {
  local label="$1" file="$2" needle="$3"
  if grep -qF "$needle" "$file"; then
    echo "  PASS  body contains '$needle'  -- $label"
    PASS=$((PASS+1))
  else
    echo "  FAIL  body does NOT contain '$needle'  -- $label"
    cat "$file" | clean | head -c 200
    echo ""
    FAIL=$((FAIL+1))
  fi
}

echo "============================================"
echo "  skill-os - E2E"
echo "============================================"

# 1. Health
run "GET /health" GET "/health" "" 200

# 2. Categories
run "GET /api/skills/categories" GET "/api/skills/categories" "" 200

# 3. Discover
run "GET /api/skills/discover" GET "/api/skills/discover" "" 200

# 4. Marketplace
run "GET /api/skills/marketplace" GET "/api/skills/marketplace" "" 200

# 5. Create a skill
SKILL_BODY=$(cat <<'EOF'
{
  "name": "e2e-skill",
  "category": "ai",
  "description": "End-to-end test skill",
  "code": "async function run(input, ctx) { return { ok: true, echoed: input }; }",
  "tags": ["e2e", "test"]
}
EOF
)
CREATE_BODY="${TMPDIR}/_skill_create_$$.json"
code=$(curl -s -o "$CREATE_BODY" -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$SKILL_BODY" "${BASE_URL}/api/skills")
if [ "$code" = "201" ] || [ "$code" = "200" ]; then
  echo "  PASS  [$code]  POST /api/skills  -- create skill (e2e-skill)"
  PASS=$((PASS+1))
else
  echo "  FAIL  [$code]  POST /api/skills  -- create skill"
  cat "$CREATE_BODY" | clean | head -c 300
  FAIL=$((FAIL+1))
fi
SKILL_ID=$(grep -oE '"id":"[^"]+"' "$CREATE_BODY" | head -1 | cut -d'"' -f4)
echo "  (created skill id: $SKILL_ID)"
rm -f "$CREATE_BODY"

if [ -n "$SKILL_ID" ]; then
  # 6. GET that skill
  run "GET /api/skills/$SKILL_ID" GET "/api/skills/$SKILL_ID" "" 200

  # 7. PUT update
  UPDATE_BODY="{\"description\":\"updated\"}"
  run "PUT /api/skills/$SKILL_ID" PUT "/api/skills/$SKILL_ID" "$UPDATE_BODY" 200

  # 8. POST execute
  EXEC_BODY='{"input":{"hello":"world"}}'
  EXEC_OUT="${TMPDIR}/_skill_exec_$$.json"
  code=$(curl -s -o "$EXEC_OUT" -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$EXEC_BODY" "${BASE_URL}/api/skills/$SKILL_ID/execute")
  if [ "$code" = "200" ] || [ "$code" = "201" ]; then
    echo "  PASS  [$code]  POST /api/skills/$SKILL_ID/execute  -- run skill"
    PASS=$((PASS+1))
  else
    echo "  FAIL  [$code]  POST /api/skills/$SKILL_ID/execute"
    cat "$EXEC_OUT" | clean | head -c 300
    FAIL=$((FAIL+1))
  fi
  rm -f "$EXEC_OUT"

  # 9. POST learn
  LEARN_BODY='{"sample":"training-data","metric":0.95}'
  run "POST /api/skills/$SKILL_ID/learn" POST "/api/skills/$SKILL_ID/learn" "$LEARN_BODY" 200

  # 10. POST version
  VER_BODY='{"version":"1.1.0","code":"async function run(input,ctx){return {ok:true,v:1.1}}","notes":"updated"}'
  run_ok_any "POST /api/skills/$SKILL_ID/versions" POST "/api/skills/$SKILL_ID/versions" "$VER_BODY"

  # 11. POST permissions
  PERM_BODY='{"principal":"e2e-user","action":"read"}'
  run_ok_any "POST /api/skills/$SKILL_ID/permissions" POST "/api/skills/$SKILL_ID/permissions" "$PERM_BODY"

  # 12. GET versions
  run "GET /api/skills/$SKILL_ID/versions" GET "/api/skills/$SKILL_ID/versions" "" 200

  # 13. GET permissions
  run "GET /api/skills/$SKILL_ID/permissions" GET "/api/skills/$SKILL_ID/permissions" "" 200

  # 14. GET analytics
  run "GET /api/skills/$SKILL_ID/analytics" GET "/api/skills/$SKILL_ID/analytics" "" 200

  # 15. POST compose - use the actual skill id we created (compose needs
  # at least one real skill; sending fake ids will get STEP_FAILED)
  COMP_BODY="{\"steps\":[{\"skillId\":\"$SKILL_ID\",\"input\":{}}],\"mode\":\"sequential\"}"
  run_ok_any "POST /api/skills/compose" POST "/api/skills/compose" "$COMP_BODY"

  # 16. POST template
  TPL_BODY='{"name":"e2e-tpl","category":"ai","code":"async function run(){return {ok:true}}"}'
  TPL_OUT="${TMPDIR}/_skill_tpl_$$.json"
  code=$(curl -s -o "$TPL_OUT" -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$TPL_BODY" "${BASE_URL}/api/skill-templates")
  if [ "$code" = "201" ] || [ "$code" = "200" ]; then
    echo "  PASS  [$code]  POST /api/skill-templates  -- create template"
    PASS=$((PASS+1))
  else
    echo "  FAIL  [$code]  POST /api/skill-templates"
    cat "$TPL_OUT" | clean | head -c 300
    FAIL=$((FAIL+1))
  fi
  TPL_ID=$(grep -oE '"id":"[^"]+"' "$TPL_OUT" | head -1 | cut -d'"' -f4)
  echo "  (created template id: $TPL_ID)"
  rm -f "$TPL_OUT"

  if [ -n "$TPL_ID" ]; then
    INST_OUT="${TMPDIR}/_skill_inst_$$.json"
    code=$(curl -s -o "$INST_OUT" -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{}' "${BASE_URL}/api/skill-templates/$TPL_ID/instantiate")
    # The handler returns 200 with success envelope; accept 200 or 201
    if [ "$code" = "200" ] || [ "$code" = "201" ]; then
      echo "  PASS  [$code]  POST /api/skill-templates/$TPL_ID/instantiate  -- instantiate template"
      PASS=$((PASS+1))
    else
      echo "  FAIL  [$code]  POST /api/skill-templates/$TPL_ID/instantiate"
      cat "$INST_OUT" | clean | head -c 200
      FAIL=$((FAIL+1))
    fi
    rm -f "$INST_OUT"
  fi

  # 17. Cleanup - delete the test skill
  run "DELETE /api/skills/$SKILL_ID" DELETE "/api/skills/$SKILL_ID" "" 200
else
  echo "  SKIP  dependent tests — could not create skill"
  FAIL=$((FAIL+1))
fi

echo "============================================"
echo "  E2E Results: $PASS passed, $FAIL failed"
echo "============================================"
exit $FAIL
