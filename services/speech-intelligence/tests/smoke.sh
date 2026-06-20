#!/bin/bash
set -e
PORT=${PORT:-4870}
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

echo "=== speech-intelligence smoke ==="
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/health); check "GET /health" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/); check "GET /" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/voice-profiles); check "GET /api/voice-profiles" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/transcriptions); check "GET /api/transcriptions" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/tts); check "GET /api/tts" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/sentiment); check "GET /api/sentiment" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/diarizations); check "GET /api/diarizations" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/vocabularies); check "GET /api/vocabularies" $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/batches); check "GET /api/batches" $code

# Quick POST
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{"name":"smoke-voice","language":"en-US"}' $BASE/api/voice-profiles); check "POST /api/voice-profiles" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{"text":"Hello world"}' $BASE/api/sentiment); check "POST /api/sentiment" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{"text":"नमस्ते दोस्त"}' $BASE/api/detect-language); check "POST /api/detect-language" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
