#!/usr/bin/env bash
set -e
PORT=${PORT:-4168}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[sdk-typescript e2e]"
step "files list" "$BASE/api/files"
step "package" "$BASE/api/package.json"
step "client.ts" "$BASE/api/files?name=src/client.ts"
step "types.ts" "$BASE/api/files?name=src/types.ts"
step "tsconfig" "$BASE/api/files?name=tsconfig.json"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL