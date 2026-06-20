#!/bin/bash
set -e
PORT=${PORT:-4869}
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

echo "=== phone-ai e2e: agent → number → call → route → transcript → recording → analytics ==="

# 1. Create agent
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"e2e-agent-1","persona":"E2E test persona"}' $BASE/api/agents > /tmp/_pa_a.json
A_ID=$(python3 -c "import json; print(json.load(open('/tmp/_pa_a.json'))['agent']['id'])")
[ -n "$A_ID" ] && { echo "  ✓ agent created"; PASS=$((PASS+1)); }

# 2. Create number bound to agent
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"e164\":\"+15555550100\",\"country\":\"US\",\"agent_id\":\"$A_ID\",\"capabilities\":[\"inbound\"]}" \
  $BASE/api/numbers > /tmp/_pa_n.json
N_ID=$(python3 -c "import json; print(json.load(open('/tmp/_pa_n.json'))['number']['id'])")
[ -n "$N_ID" ] && { echo "  ✓ number created"; PASS=$((PASS+1)); }

# 3. Inbound call
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"from\":\"+15555559999\",\"to\":\"+15555550100\",\"direction\":\"inbound\"}" \
  $BASE/api/calls > /tmp/_pa_c.json
C_ID=$(python3 -c "import json; print(json.load(open('/tmp/_pa_c.json'))['call']['id'])")
[ -n "$C_ID" ] && { echo "  ✓ inbound call created"; PASS=$((PASS+1)); }

# 4. Create IVR with menu
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"name\":\"e2e-ivr\",\"number_id\":\"$N_ID\",\"menu\":[{\"key\":\"1\",\"label\":\"Sales\",\"action\":\"transfer\",\"target\":\"e2e-agent-1\"}]}" \
  $BASE/api/ivrs > /tmp/_pa_i.json
IVR_ID=$(python3 -c "import json; print(json.load(open('/tmp/_pa_i.json'))['ivr']['id'])")
[ -n "$IVR_ID" ] && { echo "  ✓ ivr created"; PASS=$((PASS+1)); }

# 5. Route via IVR key "1" — should match our agent
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"ivr_id\":\"$IVR_ID\",\"menu_key\":\"1\"}" $BASE/api/calls/$C_ID/route > /tmp/_pa_r.json
ROUTED=$(python3 -c "import json; print(json.load(open('/tmp/_pa_r.json'))['call']['agent_id'])")
[ "$ROUTED" = "$A_ID" ] && { echo "  ✓ routed to agent via IVR"; PASS=$((PASS+1)); } || { echo "  ✗ route: $ROUTED vs $A_ID"; FAIL=$((FAIL+1)); }

# 6. Update call to in-progress then complete
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"status":"in-progress","duration_s":42}' $BASE/api/calls/$C_ID); check "PATCH in-progress" $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H "Content-Type: application/json" \
  -d '{"status":"completed","duration_s":120}' $BASE/api/calls/$C_ID); check "PATCH completed" $code

# 7. Attach transcript
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"call_id\":\"$C_ID\",\"turns\":[{\"speaker\":\"agent\",\"text\":\"Hello, how can I help?\"},{\"speaker\":\"caller\",\"text\":\"I'd like to schedule a demo.\"}],\"language\":\"en-US\"}" \
  $BASE/api/transcripts > /tmp/_pa_t.json
T_ID=$(python3 -c "import json; print(json.load(open('/tmp/_pa_t.json'))['transcript']['id'])")
[ -n "$T_ID" ] && { echo "  ✓ transcript attached"; PASS=$((PASS+1)); }

# Verify call now has transcript_id
curl -s $BASE/api/calls/$C_ID > /tmp/_pa_c2.json
T_ATTACHED=$(python3 -c "import json; print(json.load(open('/tmp/_pa_c2.json'))['call']['transcript_id'])")
[ "$T_ATTACHED" = "$T_ID" ] && { echo "  ✓ call linked to transcript"; PASS=$((PASS+1)); } || { echo "  ✗ call.transcript_id=$T_ATTACHED"; FAIL=$((FAIL+1)); }

# 8. Attach recording
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"call_id\":\"$C_ID\",\"url\":\"https://recordings.example.com/$C_ID.wav\",\"duration_s\":120,\"format\":\"wav\"}" \
  $BASE/api/recordings > /tmp/_pa_rec.json
R_ID=$(python3 -c "import json; print(json.load(open('/tmp/_pa_rec.json'))['recording']['id'])")
[ -n "$R_ID" ] && { echo "  ✓ recording created"; PASS=$((PASS+1)); }

# 9. Analytics today
curl -s $BASE/api/analytics/today > /tmp/_pa_an.json
TOTAL=$(python3 -c "import json; print(json.load(open('/tmp/_pa_an.json'))['analytics']['total_calls'])")
[ "$TOTAL" -ge "1" ] && { echo "  ✓ analytics updated ($TOTAL calls)"; PASS=$((PASS+1)); } || { echo "  ✗ analytics: $TOTAL"; FAIL=$((FAIL+1)); }

# 10. Filter calls by status
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/calls?status=completed"); check "filter by status" $code
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/calls?agent_id=$A_ID"); check "filter by agent" $code

echo "==="
echo "PASS: $PASS  FAIL: $FAIL"
[ $FAIL -eq 0 ] && exit 0 || exit 1
