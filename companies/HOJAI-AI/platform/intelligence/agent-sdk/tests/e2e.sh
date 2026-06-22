#!/bin/bash
set -e
PORT=${PORT:-4187}
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

echo "=== agent-sdk e2e: list SDKs → fetch source → publish release ==="

# 1. List SDKs - expect both TS and Python
SDKS=$(curl -s $BASE/api/sdks)
TS_SDK=$(echo $SDKS | python3 -c "import sys,json; d=json.load(sys.stdin); print([s['id'] for s in d['sdks'] if s['language']=='typescript'][0])")
PY_SDK=$(echo $SDKS | python3 -c "import sys,json; d=json.load(sys.stdin); print([s['id'] for s in d['sdks'] if s['language']=='python'][0])")
[ -n "$TS_SDK" ] && [ -n "$PY_SDK" ] && { echo "  ✓ both TS + Python SDKs registered"; PASS=$((PASS+1)); }

# 2. Verify TypeScript SDK has key files
TS_FILES=$(curl -s $BASE/api/sdks/$TS_SDK/files)
HAS_CLIENT=$(echo $TS_FILES | python3 -c "import sys,json; d=json.load(sys.stdin); print('typescript/src/client.ts' in d['files'])")
[ "$HAS_CLIENT" = "True" ] && { echo "  ✓ TS client.ts present"; PASS=$((PASS+1)); } || { echo "  ✗ TS client missing"; FAIL=$((FAIL+1)); }

# 3. Fetch the TS client source and verify it has the class
TS_SRC=$(curl -s "$BASE/api/files?path=typescript/src/client.ts")
HAS_CLASS=$(echo $TS_SRC | python3 -c "import sys,json; print('HojaiAgentClient' in json.load(sys.stdin)['content'])")
[ "$HAS_CLASS" = "True" ] && { echo "  ✓ TS source has HojaiAgentClient class"; PASS=$((PASS+1)); } || { echo "  ✗ no class"; FAIL=$((FAIL+1)); }

# 4. Fetch Python __init__.py and verify
PY_SRC=$(curl -s "$BASE/api/files?path=python/hojai_agent/__init__.py")
HAS_CLASS=$(echo $PY_SRC | python3 -c "import sys,json; print('HojaiAgentClient' in json.load(sys.stdin)['content'])")
[ "$HAS_CLASS" = "True" ] && { echo "  ✓ Python source has HojaiAgentClient class"; PASS=$((PASS+1)); } || { echo "  ✗ no class"; FAIL=$((FAIL+1)); }

# 5. Verify the Python SDK has the pyproject.toml
PY_FILES=$(curl -s $BASE/api/sdks/$PY_SDK/files)
HAS_PYPROJECT=$(echo $PY_FILES | python3 -c "import sys,json; d=json.load(sys.stdin); print(any('pyproject.toml' in f for f in d['files']))")
[ "$HAS_PYPROJECT" = "True" ] && { echo "  ✓ Python has pyproject.toml"; PASS=$((PASS+1)); } || { echo "  ✗ no pyproject"; FAIL=$((FAIL+1)); }

# 6. Path traversal attempts
RES=$(curl -s -w "\n%{http_code}" "$BASE/api/files?path=../../../../../../etc/passwd")
CODE=$(echo "$RES" | tail -1)
[ "$CODE" = "404" ] && { echo "  ✓ unix traversal blocked"; PASS=$((PASS+1)); } || { echo "  ✗ should block"; FAIL=$((FAIL+1)); }

# 7. Directory access blocked
RES=$(curl -s -w "\n%{http_code}" "$BASE/api/files?path=typescript")
CODE=$(echo "$RES" | tail -1)
[ "$CODE" = "400" ] && { echo "  ✓ directory listing blocked"; PASS=$((PASS+1)); } || { echo "  ✗ directory: $CODE"; FAIL=$((FAIL+1)); }

# 8. Publish a new release
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d "{\"sdk_id\":\"$TS_SDK\",\"version\":\"1.2.0\",\"changelog\":\"add telemetry\"}" $BASE/api/releases); check "publish release" $code

# 9. Verify release shows up
RELS=$(curl -s $BASE/api/releases)
LATEST=$(echo $RELS | python3 -c "import sys,json; print([r for r in json.load(sys.stdin)['releases'] if r['version']=='1.2.0'][0]['sdk_id'])")
[ "$LATEST" = "$TS_SDK" ] && { echo "  ✓ release published"; PASS=$((PASS+1)); } || { echo "  ✗ release not found"; FAIL=$((FAIL+1)); }

# 10. Record downloads
for sdk in $TS_SDK $PY_SDK; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
    -d "{\"sdk_id\":\"$sdk\"}" $BASE/api/downloads); check "download $sdk" $code
done

# 11. Install commands exist
TS_INFO=$(curl -s $BASE/api/sdks/$TS_SDK)
INSTALL=$(echo $TS_INFO | python3 -c "import sys,json; print(json.load(sys.stdin)['sdk']['install_cmd'])")
[[ "$INSTALL" == *"npm install"* ]] && { echo "  ✓ TS install cmd valid"; PASS=$((PASS+1)); } || { echo "  ✗ install: $INSTALL"; FAIL=$((FAIL+1)); }

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1