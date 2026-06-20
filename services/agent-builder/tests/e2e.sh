#!/bin/bash
set -e
PORT=${PORT:-4188}
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

echo "=== agent-builder e2e: template → instantiate → edit → validate → publish → export ==="

# 1. Pick RAG template
curl -s $BASE/api/templates > /tmp/_ab_tpls.json
RAG_ID=$(python3 -c "import json; d=json.load(open('/tmp/_ab_tpls.json')); print([t['id'] for t in d['templates'] if t['name']=='rag'][0])")
[ -n "$RAG_ID" ] && { echo "  ✓ rag template found"; PASS=$((PASS+1)); }

# 2. Instantiate rag template
curl -s -X POST -H "Content-Type: application/json" -d '{"name":"my-bot","owner":"e2e"}' $BASE/api/templates/$RAG_ID/instantiate > /tmp/_ab_inst.json
BID=$(python3 -c "import json; print(json.load(open('/tmp/_ab_inst.json'))['blueprint']['id'])")
[ -n "$BID" ] && { echo "  ✓ blueprint created from template"; PASS=$((PASS+1)); }

# 3. Validate the seeded blueprint (should be valid)
curl -s -X POST $BASE/api/blueprints/$BID/validate > /tmp/_ab_val.json
VALID=$(python3 -c "import json; print(json.load(open('/tmp/_ab_val.json'))['valid'])")
[ "$VALID" = "True" ] && { echo "  ✓ RAG graph validates"; PASS=$((PASS+1)); } || { echo "  ✗ invalid"; FAIL=$((FAIL+1)); }

# 4. Edit blueprint (add a memory node)
NEW_GRAPH='{
  "nodes":[
    {"id":"in","type":"input","config":{}},
    {"id":"retrieve","type":"tool","config":{"tool":"vector-search"}},
    {"id":"mem","type":"memory","config":{"scope":"session"}},
    {"id":"llm","type":"llm","config":{"model":"gpt-4o"}},
    {"id":"out","type":"output","config":{}}
  ],
  "edges":[
    {"from":"in","to":"mem"},
    {"from":"mem","to":"retrieve"},
    {"from":"retrieve","to":"llm"},
    {"from":"llm","to":"out"}
  ]
}'
code=$(curl -s -o /dev/null -w "%{http_code}" -X PUT -H "Content-Type: application/json" -d "$NEW_GRAPH" $BASE/api/blueprints/$BID); check "PUT edit" $code

# 5. Version incremented to 2
curl -s $BASE/api/blueprints/$BID > /tmp/_ab_bp.json
VER=$(python3 -c "import json; print(json.load(open('/tmp/_ab_bp.json'))['blueprint']['version'])")
[ "$VER" = "2" ] && { echo "  ✓ version bumped to 2"; PASS=$((PASS+1)); } || { echo "  ✗ ver=$VER"; FAIL=$((FAIL+1)); }

# 6. Try to PUT invalid graph (no input node) - should be rejected
BAD_PUT='{"nodes":[{"id":"x","type":"output","config":{}}],"edges":[]}'
code=$(curl -s -o /dev/null -w "%{http_code}" -X PUT -H "Content-Type: application/json" -d "$BAD_PUT" $BASE/api/blueprints/$BID)
[ "$code" = "400" ] && { echo "  ✓ invalid graph PUT blocked"; PASS=$((PASS+1)); } || { echo "  ✗ PUT bad: $code"; FAIL=$((FAIL+1)); }

# 7. Publish the good one
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/blueprints/$BID/publish); check "publish valid" $code

# 8. Versions list shows history
curl -s $BASE/api/blueprints/$BID/versions > /tmp/_ab_vs.json
COUNT=$(python3 -c "import json; print(len(json.load(open('/tmp/_ab_vs.json'))['versions']))")
[ "$COUNT" -ge "1" ] && { echo "  ✓ versions tracked ($COUNT)"; PASS=$((PASS+1)); } || { echo "  ✗ versions: $COUNT"; FAIL=$((FAIL+1)); }

# 9. Export to flow-orchestrator format
curl -s -X POST -H "Content-Type: application/json" -d '{"format":"flow-orchestrator"}' $BASE/api/blueprints/$BID/export > /tmp/_ab_exp1.json
STEPS=$(python3 -c "import json; print(len(json.load(open('/tmp/_ab_exp1.json'))['export']['payload']['steps']))")
[ "$STEPS" = "5" ] && { echo "  ✓ exported 5 steps"; PASS=$((PASS+1)); } || { echo "  ✗ steps: $STEPS"; FAIL=$((FAIL+1)); }

# 10. Export to langgraph format
curl -s -X POST -H "Content-Type: application/json" -d '{"format":"langgraph"}' $BASE/api/blueprints/$BID/export > /tmp/_ab_exp2.json
NODES=$(python3 -c "import json; print(len(json.load(open('/tmp/_ab_exp2.json'))['export']['payload']['nodes']))")
[ "$NODES" = "5" ] && { echo "  ✓ exported 5 langgraph nodes"; PASS=$((PASS+1)); } || { echo "  ✗ lg: $NODES"; FAIL=$((FAIL+1)); }

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1