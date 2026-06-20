#!/bin/bash
set -e
PORT=${PORT:-4263}
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

echo "=== ai-workspace e2e: workspace → member → doc → thread → comments → mentions → share → presence ==="

# 1. Workspace
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"E2E Workspace","description":"test","owner_id":"u-e2e"}' \
  $BASE/api/workspaces > /tmp/_ws_w.json
W_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ws_w.json'))['workspace']['id'])")
[ -n "$W_ID" ] && { echo "  ✓ workspace created"; PASS=$((PASS+1)); }

# 2. Add member
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"workspace_id\":\"$W_ID\",\"user_id\":\"u-bob\",\"role\":\"editor\"}" \
  $BASE/api/members > /tmp/_ws_m.json
[ "$(python3 -c "import json; print(json.load(open('/tmp/_ws_m.json'))['member']['role'])")" = "editor" ] && { echo "  ✓ member added"; PASS=$((PASS+1)); } || FAIL=$((FAIL+1))

# 3. Create document
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"workspace_id\":\"$W_ID\",\"title\":\"Design Doc\",\"content\":\"# Design\\n\\nIntro.\",\"author_id\":\"u-e2e\"}" \
  $BASE/api/documents > /tmp/_ws_d.json
D_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ws_d.json'))['document']['id'])")
[ -n "$D_ID" ] && { echo "  ✓ document created"; PASS=$((PASS+1)); }

# 4. Update document (should bump version)
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"content":"# Design\\n\\nIntro.\\n## Section 1"}' $BASE/api/documents/$D_ID); check "PATCH doc" $code
curl -s $BASE/api/documents/$D_ID > /tmp/_ws_d2.json
V=$(python3 -c "import json; print(json.load(open('/tmp/_ws_d2.json'))['document']['version'])")
[ "$V" = "2" ] && { echo "  ✓ version bumped to 2"; PASS=$((PASS+1)); } || { echo "  ✗ version=$V"; FAIL=$((FAIL+1)); }

# 5. Create thread
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"document_id\":\"$D_ID\",\"title\":\"Discussion\",\"created_by\":\"u-bob\"}" \
  $BASE/api/threads > /tmp/_ws_t.json
T_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ws_t.json'))['thread']['id'])")
[ -n "$T_ID" ] && { echo "  ✓ thread created"; PASS=$((PASS+1)); }

# 6. Comment with @mention
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"thread_id\":\"$T_ID\",\"author_id\":\"u-bob\",\"body\":\"Hey @u-e2e what do you think?\"}" \
  $BASE/api/comments > /tmp/_ws_c.json
MENTIONS=$(python3 -c "import json; print(json.load(open('/tmp/_ws_c.json'))['comment']['mentions'])")
echo "$MENTIONS" | grep -q "u-e2e" && { echo "  ✓ @mention detected"; PASS=$((PASS+1)); } || { echo "  ✗ mentions: $MENTIONS"; FAIL=$((FAIL+1)); }

# 7. Resolve thread
curl -s -X PATCH -H "Content-Type: application/json" \
  -d '{"status":"resolved"}' $BASE/api/threads/$T_ID > /tmp/_ws_t2.json
STATUS=$(python3 -c "import json; print(json.load(open('/tmp/_ws_t2.json'))['thread']['status'])")
[ "$STATUS" = "resolved" ] && { echo "  ✓ thread resolved"; PASS=$((PASS+1)); } || FAIL=$((FAIL+1))

# 8. Share
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"workspace_id\":\"$W_ID\",\"document_id\":\"$D_ID\",\"share_with\":\"u-external\",\"permission\":\"view\"}" \
  $BASE/api/shares > /tmp/_ws_s.json
SH_ID=$(python3 -c "import json; print(json.load(open('/tmp/_ws_s.json'))['share']['id'])")
[ -n "$SH_ID" ] && { echo "  ✓ share created"; PASS=$((PASS+1)); }

# 9. Presence
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"user_id\":\"u-e2e\",\"workspace_id\":\"$W_ID\",\"status\":\"online\",\"current_document_id\":\"$D_ID\"}" \
  $BASE/api/presence > /tmp/_ws_p.json
[ "$(python3 -c "import json; print(json.load(open('/tmp/_ws_p.json'))['presence']['status'])")" = "online" ] && { echo "  ✓ presence set"; PASS=$((PASS+1)); } || FAIL=$((FAIL+1))

# 10. Filter by workspace
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/members?workspace_id=$W_ID"); check "filter members" $code
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/documents?workspace_id=$W_ID"); check "filter docs" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
