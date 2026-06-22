#!/usr/bin/env bash
set -e
PORT=${PORT:-4169}; BASE="http://localhost:${PORT}"; PASS=0; FAIL=0
step() { local n="$1"; shift; local r=$(curl -sS -w '\n%{http_code}' "$@"); local c=$(echo "$r"|tail -1); if [[ "$c" =~ ^2 ]]; then echo "  PASS: $n ($c)"; PASS=$((PASS+1)); else echo "  FAIL: $n ($c)"; FAIL=$((FAIL+1)); fi; }
echo "[sdk-python e2e]"
step "files" "$BASE/api/files"
step "pyproject" "$BASE/api/files?name=pyproject.toml"
step "client.py" "$BASE/api/files?name=hojai/client.py"
step "__init__.py" "$BASE/api/files?name=hojai/__init__.py"
step "README" "$BASE/api/files?name=README.md"
echo "E2E: $PASS passed, $FAIL failed"; exit $FAIL