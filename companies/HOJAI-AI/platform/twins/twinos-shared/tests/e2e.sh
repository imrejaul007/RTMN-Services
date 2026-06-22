#!/usr/bin/env bash
#
# e2e.sh - End-to-end test: starts a real Express app that uses every
# middleware from @rtmn/twinos-shared and verifies behavior over HTTP.
#
# macOS-safe pattern:
#   - capture output via $() (NOT head -n -1, which is GNU-only)
#   - strip a trailing newline with sed '$d' or shell parameter expansion
#   - write/delete temp files manually rather than mktemp

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LIB="$ROOT/src/index.js"

# Pick a free-ish port. macOS lacks python; use a node one-liner.
pick_port() {
  node -e "const net=require('net'); const s=net.createServer(); s.listen(0,()=>{console.log(s.address().port);s.close();});"
}

APP_FILE="$ROOT/tests/.e2e-app.js"
LOG_FILE="$ROOT/tests/e2e.log"
RESP_FILE="$ROOT/tests/.e2e-response.json"
: > "$LOG_FILE"

PASS=0
FAIL=0

color() {
  if [ -t 1 ]; then printf "\033[%sm%s\033[0m" "$1" "$2"; else printf "%s" "$2"; fi
}
ok()  { PASS=$((PASS + 1)); printf "  %s %s\n" "$(color '32' '[PASS]')" "$1"; echo "PASS $1" >> "$LOG_FILE"; }
bad() { FAIL=$((FAIL + 1)); printf "  %s %s\n" "$(color '31' '[FAIL]')" "$1"; echo "FAIL $1" >> "$LOG_FILE"; }

cleanup() {
  if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -f "$APP_FILE" "$RESP_FILE" "$ROOT/tests/.e2e-stderr.log"
}
trap cleanup EXIT

# Trim a trailing newline if present (BSD sed '$d' is fine; this avoids it).
trim() {
  case "$1" in
    *$'\n') printf "%s" "${1%$'\n'}" ;;
    *) printf "%s" "$1" ;;
  esac
}

# http_get URL [extra curl args...]
# Writes the response body to $RESP_FILE and returns "<status>\n<body>" trimmed.
http_get() {
  local url="$1"; shift
  : > "$RESP_FILE"
  local status
  status="$(curl -s -o "$RESP_FILE" -w '%{http_code}' "$@" "$url")"
  local body
  body="$(cat "$RESP_FILE")"
  printf "%s\n%s" "$status" "$body"
}

# Build the test Express app that uses every middleware from the library.
cat > "$APP_FILE" <<EOF
import express from 'express';
import jwt from 'jsonwebtoken';
import {
  requireAuth,
  preventPrototypePollution,
  errorHandler,
  defaultLimiter,
  strictLimiter,
  logger,
  validateInput,
  corsOptions,
  helmetConfig
} from '$LIB';

const app = express();
app.use(express.json());
app.use(preventPrototypePollution);
app.use(helmetConfig);
app.use((req, _res, next) => { corsOptions; next(); });

// Use a SECRET shared with the test script
app.use((req, _res, next) => {
  req._secret = 'test-secret';
  next();
});

// Routes
app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/public', defaultLimiter, (_req, res) => res.json({ scope: 'public' }));

app.get('/protected', requireAuth({ secret: 'test-secret' }), (req, res) =>
  res.json({ user: req.user })
);

app.get('/limited', strictLimiter, (_req, res) => res.json({ ok: true }));

app.post(
  '/validate',
  validateInput({
    body: {
      email:   { type: 'string', format: 'email', required: true },
      age:     { type: 'integer', min: 0, max: 150, required: true },
      role:    { type: 'enum', values: ['admin','user','guest'] }
    }
  }),
  (req, res) => res.json({ received: req.body })
);

app.get('/boom', (_req, _res, next) => {
  next(new Error('kaboom'));
});

app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '0', 10);
app.listen(PORT, '127.0.0.1', () => {
  console.log('READY ' + (PORT || 'dynamic'));
  // Generate a valid token for tests
  const token = jwt.sign(
    { sub: 'u-1', email: 'a@b.co', role: 'admin', type: 'access' },
    'test-secret',
    { expiresIn: '1h', issuer: 'rtmn-twinos' }
  );
  console.log('TOKEN ' + token);
});
EOF

# Boot the app and capture READY <port> + TOKEN <jwt>
BOOT_LOG="$ROOT/tests/.e2e-stderr.log"
: > "$BOOT_LOG"

PORT="$(pick_port)"
PORT="$PORT" node "$APP_FILE" > "$BOOT_LOG" 2>&1 &
SERVER_PID=$!

# Wait until READY appears or we time out.
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if grep -q "^READY" "$BOOT_LOG" 2>/dev/null; then break; fi
  sleep 0.2
done

if ! grep -q "^READY" "$BOOT_LOG"; then
  echo "Server failed to start. Log:"; cat "$BOOT_LOG"
  exit 1
fi

# Extract the actual bound port (in case 0 was used)
ACTUAL_PORT="$(grep '^READY' "$BOOT_LOG" | head -1 | awk '{print $2}')"
TOKEN="$(grep '^TOKEN' "$BOOT_LOG" | head -1 | awk '{print $2}')"
BASE="http://127.0.0.1:$ACTUAL_PORT"

echo "=== @rtmn/twinos-shared e2e test ==="
echo "base: $BASE"
echo

# 1. /health responds
out="$(http_get "$BASE/health")"
status="$(printf "%s" "$out" | head -1)"
body="$(printf "%s" "$out" | tail -n +2)"
if [ "$status" = "200" ] && echo "$body" | grep -q '"ok":true'; then
  ok "GET /health returns 200 ok:true"
else
  bad "GET /health failed (status=$status, body=$body)"
fi

# 2. Helmet adds X-DNS-Prefetch-Control header
HDR_FILE="$ROOT/tests/.e2e-hdr.txt"
: > "$HDR_FILE"
curl -s -D "$HDR_FILE" -o /dev/null "$BASE/health"
if grep -qi "x-dns-prefetch-control" "$HDR_FILE"; then
  ok "helmetConfig adds security headers"
else
  bad "helmetConfig did not add expected headers"
fi
rm -f "$HDR_FILE"

# 3. /protected without token -> 401 UNAUTHORIZED
out="$(http_get "$BASE/protected")"
status="$(printf "%s" "$out" | head -1)"
body="$(printf "%s" "$out" | tail -n +2)"
if [ "$status" = "401" ] && echo "$body" | grep -q 'UNAUTHORIZED'; then
  ok "requireAuth rejects missing token with 401"
else
  bad "requireAuth missing-token handling failed (status=$status, body=$body)"
fi

# 4. /protected with bad token -> 401 INVALID_TOKEN
out="$(http_get "$BASE/protected" -H "Authorization: Bearer not-a-real-token")"
status="$(printf "%s" "$out" | head -1)"
body="$(printf "%s" "$out" | tail -n +2)"
if [ "$status" = "401" ] && echo "$body" | grep -q 'INVALID_TOKEN'; then
  ok "requireAuth rejects invalid token with 401"
else
  bad "requireAuth bad-token handling failed (status=$status, body=$body)"
fi

# 5. /protected with valid token -> 200 + user info
out="$(http_get "$BASE/protected" -H "Authorization: Bearer $TOKEN")"
status="$(printf "%s" "$out" | head -1)"
body="$(printf "%s" "$out" | tail -n +2)"
if [ "$status" = "200" ] && echo "$body" | grep -q '"id":"u-1"' && echo "$body" | grep -q '"role":"admin"'; then
  ok "requireAuth accepts valid token and attaches user"
else
  bad "requireAuth valid-token handling failed (status=$status, body=$body)"
fi

# 6. preventPrototypePollution blocks __proto__ in body
out="$(curl -s -o "$RESP_FILE" -w '%{http_code}' -X POST "$BASE/validate" \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@b.co","age":30,"__proto__":{"polluted":true},"constructor":{"prototype":{}}}')"
status="$out"
body="$(cat "$RESP_FILE")"
# After cleanup, validation should pass (no polluted keys remain) and the body
# should NOT contain __proto__ or constructor as own keys.
if [ "$status" = "200" ] && ! echo "$body" | grep -q '__proto__'; then
  ok "preventPrototypePollution strips __proto__ from request body"
else
  bad "preventPrototypePollution failed (status=$status, body=$body)"
fi

# 7. validateInput accepts a good payload
out="$(curl -s -o "$RESP_FILE" -w '%{http_code}' -X POST "$BASE/validate" \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","age":33,"role":"admin"}')"
status="$out"
body="$(cat "$RESP_FILE")"
if [ "$status" = "200" ] && echo "$body" | grep -q '"received"'; then
  ok "validateInput accepts valid payload"
else
  bad "validateInput good payload failed (status=$status, body=$body)"
fi

# 8. validateInput rejects a bad email
out="$(curl -s -o "$RESP_FILE" -w '%{http_code}' -X POST "$BASE/validate" \
  -H 'Content-Type: application/json' \
  -d '{"email":"not-an-email","age":33}')"
status="$out"
body="$(cat "$RESP_FILE")"
if [ "$status" = "400" ] && echo "$body" | grep -q 'VALIDATION_ERROR'; then
  ok "validateInput rejects invalid email"
else
  bad "validateInput bad email failed (status=$status, body=$body)"
fi

# 9. validateInput rejects age out of range
out="$(curl -s -o "$RESP_FILE" -w '%{http_code}' -X POST "$BASE/validate" \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@b.co","age":999}')"
status="$out"
body="$(cat "$RESP_FILE")"
if [ "$status" = "400" ] && echo "$body" | grep -q 'VALIDATION_ERROR'; then
  ok "validateInput rejects out-of-range age"
else
  bad "validateInput age range failed (status=$status, body=$body)"
fi

# 10. validateInput rejects bad enum value
out="$(curl -s -o "$RESP_FILE" -w '%{http_code}' -X POST "$BASE/validate" \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@b.co","age":30,"role":"superuser"}')"
status="$out"
body="$(cat "$RESP_FILE")"
if [ "$status" = "400" ] && echo "$body" | grep -q 'VALIDATION_ERROR'; then
  ok "validateInput rejects unknown enum value"
else
  bad "validateInput enum failed (status=$status, body=$body)"
fi

# 11. errorHandler returns 500 + structured JSON for thrown errors
out="$(http_get "$BASE/boom")"
status="$(printf "%s" "$out" | head -1)"
body="$(printf "%s" "$out" | tail -n +2)"
if [ "$status" = "500" ] && echo "$body" | grep -q '"success":false' && echo "$body" | grep -q 'INTERNAL_ERROR'; then
  ok "errorHandler converts thrown errors to JSON 500"
else
  bad "errorHandler failed (status=$status, body=$body)"
fi

# 12. defaultLimiter is wired (route still works)
out="$(http_get "$BASE/public")"
status="$(printf "%s" "$out" | head -1)"
if [ "$status" = "200" ]; then
  ok "defaultLimiter does not block normal traffic"
else
  bad "defaultLimiter blocked normal traffic (status=$status)"
fi

# 13. strictLimiter exhausts after 20 requests within a window
# Reset state by waiting (not reliable), so we just hit it 22 times and check
# that somewhere after request #20 we get a 429.
got_429=0
for i in $(seq 1 25); do
  s="$(curl -s -o /dev/null -w '%{http_code}' "$BASE/limited")"
  if [ "$s" = "429" ]; then got_429=1; break; fi
done
if [ "$got_429" = "1" ]; then
  ok "strictLimiter eventually returns 429 (rate limiting works)"
else
  bad "strictLimiter never returned 429 (rate limiting may not work)"
fi

# 14. logger writes to stdout (info) - capture and check JSON shape
# Reset log capture around the call
LOG_OUT="$ROOT/tests/.e2e-logger.log"
: > "$LOG_OUT"
node -e "import('$LIB').then(m => m.logger.info('hello', { foo: 'bar' }))" >> "$LOG_OUT" 2>&1
if grep -q '"level":"info"' "$LOG_OUT" && grep -q '"foo":"bar"' "$LOG_OUT" && grep -q '"service":"@rtmn/twinos-shared"' "$LOG_OUT"; then
  ok "logger.info emits structured JSON with service tag"
else
  bad "logger.info output malformed: $(cat "$LOG_OUT")"
fi
rm -f "$LOG_OUT"

# Summary
echo
echo "=== Summary ==="
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo "Log:    $LOG_FILE"

rm -f "$LOG_FILE"

[ "$FAIL" -eq 0 ] && exit 0 || exit 1