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

echo "=== speech-intelligence e2e: ASR → sentiment → TTS → diarization → vocab → batch ==="

# 1. ASR transcription
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"audio_url":"https://example.com/audio1.mp3","language":"en-US"}' \
  $BASE/api/transcriptions > /tmp/_si_t.json
T_ID=$(python3 -c "import json; print(json.load(open('/tmp/_si_t.json'))['transcription']['id'])")
TEXT=$(python3 -c "import json; print(json.load(open('/tmp/_si_t.json'))['transcription']['text'])")
CONF=$(python3 -c "import json; print(json.load(open('/tmp/_si_t.json'))['transcription']['confidence'])")
[ -n "$T_ID" ] && [ -n "$TEXT" ] && { echo "  ✓ ASR produced text + confidence=$CONF"; PASS=$((PASS+1)); }

# 2. Sentiment analysis on positive text
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"text":"This product is amazing and I love it!"}' \
  $BASE/api/sentiment > /tmp/_si_s.json
SENT=$(python3 -c "import json; print(json.load(open('/tmp/_si_s.json'))['sentiment_job']['sentiment'])")
[ "$SENT" = "positive" ] && { echo "  ✓ sentiment=positive"; PASS=$((PASS+1)); } || { echo "  ✗ sentiment: $SENT"; FAIL=$((FAIL+1)); }

# 3. Sentiment analysis on negative text
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"text":"This is terrible and awful."}' \
  $BASE/api/sentiment > /tmp/_si_s2.json
SENT=$(python3 -c "import json; print(json.load(open('/tmp/_si_s2.json'))['sentiment_job']['sentiment'])")
[ "$SENT" = "negative" ] && { echo "  ✓ sentiment=negative"; PASS=$((PASS+1)); } || { echo "  ✗ sentiment: $SENT"; FAIL=$((FAIL+1)); }

# 4. TTS with seeded voice profile
curl -s $BASE/api/voice-profiles > /tmp/_si_vp.json
VP_ID=$(python3 -c "import json; print(json.load(open('/tmp/_si_vp.json'))['voice_profiles'][0]['id'])")
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"text\":\"Hello world this is a test\",\"voice_profile_id\":\"$VP_ID\"}" \
  $BASE/api/tts > /tmp/_si_tts.json
AUDIO=$(python3 -c "import json; print(json.load(open('/tmp/_si_tts.json'))['tts_job']['audio_url'])")
DUR=$(python3 -c "import json; print(json.load(open('/tmp/_si_tts.json'))['tts_job']['duration_s'])")
[ -n "$AUDIO" ] && { echo "  ✓ TTS produced audio (duration=${DUR}s)"; PASS=$((PASS+1)); }

# 5. Diarization
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"transcription_id\":\"$T_ID\",\"num_speakers\":2}" \
  $BASE/api/diarizations > /tmp/_si_d.json
SPEAKERS=$(python3 -c "import json; print(len(json.load(open('/tmp/_si_d.json'))['diarization']['speakers']))")
[ "$SPEAKERS" = "2" ] && { echo "  ✓ diarization found 2 speakers"; PASS=$((PASS+1)); } || { echo "  ✗ speakers: $SPEAKERS"; FAIL=$((FAIL+1)); }

# 6. Custom vocabulary
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"medical-terms","language":"en-US","phrases":["myocardial infarction","hypertension"]}' \
  $BASE/api/vocabularies > /tmp/_si_v.json
V_ID=$(python3 -c "import json; print(json.load(open('/tmp/_si_v.json'))['vocabulary']['id'])")
[ -n "$V_ID" ] && { echo "  ✓ custom vocab created"; PASS=$((PASS+1)); }

# 7. ASR with custom vocab → transcript should include phrases
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"audio_url\":\"https://example.com/medical.mp3\",\"language\":\"en-US\",\"vocabulary_id\":\"$V_ID\"}" \
  $BASE/api/transcriptions > /tmp/_si_t2.json
TEXT2=$(python3 -c "import json; print(json.load(open('/tmp/_si_t2.json'))['transcription']['text'])")
echo "$TEXT2" | grep -q "myocardial infarction" && { echo "  ✓ custom vocab applied to ASR"; PASS=$((PASS+1)); } || { echo "  ✗ vocab not applied: $TEXT2"; FAIL=$((FAIL+1)); }

# 8. Language detection
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"text":"Bonjour comment ça va"}' \
  $BASE/api/detect-language > /tmp/_si_lang.json
LANG=$(python3 -c "import json; print(json.load(open('/tmp/_si_lang.json'))['detected_language'])")
[ "$LANG" = "fr-FR" ] && { echo "  ✓ detected French"; PASS=$((PASS+1)); } || { echo "  ✗ lang: $LANG"; FAIL=$((FAIL+1)); }

# 9. Batch sentiment
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"items":[{"text":"I love this"},{"text":"I hate that"},{"text":"It is okay"}]}' \
  $BASE/api/batches > /tmp/_si_b.json
COUNT=$(python3 -c "import json; print(len(json.load(open('/tmp/_si_b.json'))['batch']['results']))")
[ "$COUNT" = "3" ] && { echo "  ✓ batch returned 3 results"; PASS=$((PASS+1)); } || { echo "  ✗ batch: $COUNT"; FAIL=$((FAIL+1)); }

# 10. Filter by language
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/transcriptions?language=en-US"); check "filter by lang" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
