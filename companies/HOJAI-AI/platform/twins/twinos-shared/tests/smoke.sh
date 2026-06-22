#!/usr/bin/env bash
#
# smoke.sh - Verify every public export from @rtmn/twinos-shared is callable
# and has the expected shape. Does not start any servers.
#
# macOS-safe test pattern:
#   - capture output via eval + $()
#   - strip trailing newline with sed '$d' (NOT head -n -1, which is GNU-only)
#   - write temp files manually rather than mktemp

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LIB="$ROOT/src/index.js"

PASS=0
FAIL=0
LOG_FILE="$ROOT/tests/smoke.log"
: > "$LOG_FILE"

color() {
  # ANSI colors; disabled when stdout is not a TTY
  if [ -t 1 ]; then printf "\033[%sm%s\033[0m" "$1" "$2"; else printf "%s" "$2"; fi
}
ok()   { PASS=$((PASS + 1)); printf "  %s %s\n" "$(color '32' '[PASS]')" "$1"; echo "PASS $1" >> "$LOG_FILE"; }
bad()  { FAIL=$((FAIL + 1)); printf "  %s %s\n" "$(color '31' '[FAIL]')" "$1"; echo "FAIL $1" >> "$LOG_FILE"; }

# Helper: run a node one-liner, capture stdout+stderr, and trim a single
# trailing newline (added by node's console.log) via sed '$d'. macOS's BSD
# sed accepts '$d' (head -n -1 is GNU-only).
run_node() {
  local code="$1"
  local out
  out="$(node --input-type=module -e "$code" 2>&1)"
  # Only strip a trailing newline if one is actually present, so single-line
  # outputs like "LOADED" still come through intact.
  case "$out" in
    *$'\n') printf "%s" "${out%$'\n'}" ;;
    *) printf "%s" "$out" ;;
  esac
}

# Check that a given named export exists and matches a shape predicate.
# Usage: expect_export "requireAuth" "function"
expect_export() {
  local name="$1"
  local expected_kind="$2"
  local extra_check="${3:-}"
  local code="import('$LIB').then(m => { const v = m['$name']; if (v === undefined) { console.log('MISSING'); } else if (typeof v === 'function') { console.log('function'); } else if (typeof v === 'object' && v !== null) { console.log('object'); } else { console.log(typeof v); } })"
  local result
  result="$(run_node "$code")"
  case "$expected_kind" in
    function)
      if [ "$result" = "function" ]; then ok "$name is a function"; else bad "$name expected function, got '$result'"; fi ;;
    object)
      if [ "$result" = "object" ]; then ok "$name is an object"; else bad "$name expected object, got '$result'"; fi ;;
    *)
      if [ "$result" = "$expected_kind" ]; then ok "$name is $expected_kind"; else bad "$name expected $expected_kind, got '$result'"; fi ;;
  esac
  if [ -n "$extra_check" ]; then
    local extra_result
    extra_result="$(run_node "$extra_check")"
    if [ -n "$extra_result" ]; then ok "$name extra check ($extra_result)"; else bad "$name extra check failed"; fi
  fi
}

echo "=== @rtmn/twinos-shared smoke test ==="
echo "lib: $LIB"
echo

# 1. Module loads at all
load_code="import('$LIB').then(() => console.log('LOADED')).catch(e => console.error('ERR', e.message))"
if [ "$(run_node "$load_code")" = "LOADED" ]; then
  ok "module loads without throwing"
else
  bad "module failed to load"
fi

# 2. Each required export is present and of the right kind
echo
echo "Exports:"
expect_export "requireAuth"               "function"
expect_export "preventPrototypePollution" "function"
expect_export "errorHandler"              "function"
expect_export "defaultLimiter"            "function"
expect_export "strictLimiter"             "function"
expect_export "logger"                    "object"
expect_export "validateInput"             "function"
expect_export "corsOptions"               "object"
expect_export "helmetConfig"              "function"
expect_export "VERSION"                   "string"
expect_export "SERVICE_NAME"              "string"

# 3. logger sub-methods
echo
echo "Logger surface:"
for method in error warn info debug child; do
  code="import('$LIB').then(m => console.log(typeof m.logger['$method']))"
  result="$(run_node "$code")"
  if [ "$result" = "function" ]; then ok "logger.$method is a function"; else bad "logger.$method expected function, got '$result'"; fi
done

# 4. requireAuth actually returns a function (middleware factory)
echo
echo "Middleware factory behavior:"
code="import('$LIB').then(m => { const mw = m.requireAuth({ secret: 'x' }); console.log(typeof mw === 'function' ? 'factory-ok' : 'factory-bad'); })"
result="$(run_node "$code")"
if [ "$result" = "factory-ok" ]; then ok "requireAuth is a middleware factory"; else bad "requireAuth factory failed: $result"; fi

# 5. validateInput factory
code="import('$LIB').then(m => { const mw = m.validateInput({ body: { x: { type: 'string' } } }); console.log(typeof mw === 'function' ? 'factory-ok' : 'factory-bad'); })"
result="$(run_node "$code")"
if [ "$result" = "factory-ok" ]; then ok "validateInput is a middleware factory"; else bad "validateInput factory failed: $result"; fi

# 6. preventPrototypePollution strips __proto__ from a nested object
code="import('$LIB').then(m => { const mw = m.preventPrototypePollution; const req = { body: { a: 1, __proto__: { polluted: 1 }, b: { c: 2, constructor: { prototype: {} } } } }; let nextCalled = false; mw(req, {}, () => { nextCalled = true; }); const bodyKeys = Object.keys(req.body); const bKeys = Object.keys(req.body.b); const ok1 = nextCalled === true; const ok2 = req.body.a === 1; const ok3 = !bodyKeys.includes('__proto__'); const ok4 = req.body.b.c === 2; const ok5 = !bKeys.includes('constructor'); console.log(ok1 && ok2 && ok3 && ok4 && ok5 ? 'cleanup-ok' : 'cleanup-bad'); })"
result="$(run_node "$code")"
if [ "$result" = "cleanup-ok" ]; then ok "preventPrototypePollution strips dangerous keys"; else bad "preventPrototypePollution failed: $result"; fi

# 7. validateInput rule engine sanity (unit-style, no express)
code="import('$LIB').then(m => { const err1 = m.validateInput({ body: { email: { type: 'string', format: 'email', required: true } } }); const good = { body: { email: 'a@b.co' } }; const bad2 = { body: { email: 'nope' } }; let goodPass = false, badBlock = false; err1(good, { status: () => ({ json: () => {} }) }, () => { goodPass = true; }); err1(bad2, { status: () => ({ json: (p) => { if (p.error.code === 'VALIDATION_ERROR') badBlock = true; } }) }, () => {}); console.log(goodPass && badBlock ? 'validator-ok' : 'validator-bad'); })"
result="$(run_node "$code")"
if [ "$result" = "validator-ok" ]; then ok "validateInput accepts valid, rejects invalid"; else bad "validateInput rule engine failed: $result"; fi

# 8. default export includes the same surface
code="import('$LIB').then(m => { const d = m.default; const names = ['requireAuth','preventPrototypePollution','errorHandler','defaultLimiter','strictLimiter','logger','validateInput','corsOptions','helmetConfig']; const missing = names.filter(n => d[n] === undefined); console.log(missing.length === 0 ? 'default-ok' : 'default-bad:' + missing.join(',')); })"
result="$(run_node "$code")"
if [ "$result" = "default-ok" ]; then ok "default export exposes all 9 utilities"; else bad "default export incomplete: $result"; fi

# Summary
echo
echo "=== Summary ==="
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo "Log:    $LOG_FILE"

rm -f "$LOG_FILE"

[ "$FAIL" -eq 0 ] && exit 0 || exit 1