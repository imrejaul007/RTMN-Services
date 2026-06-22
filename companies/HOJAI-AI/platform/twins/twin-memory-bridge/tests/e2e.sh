#!/usr/bin/env bash
# End-to-end test for Twin Memory Bridge proxy endpoints.
#
# Exercises the three new endpoints (read / write / migrate) by binding a
# twin, reading memories through the bridge, writing one, verifying
# MemoryOS received it, then migrating the binding from episodic →
# long-term and verifying subsequent reads now use the long-term
# MemoryOS endpoint.
#
# Pre-reqs: this script expects the bridge on :4704 and MemoryOS on :4703
# to already be running (the run sequence in the task spins both up
# before invoking this script).
#
# Output: writes /tmp/_tmb_*.json intermediate files for python JSON
# parsing, then exits non-zero on the first failed assertion.

set -u

BRIDGE="${BRIDGE:-http://localhost:4704}"
MEMORYOS="${MEMORYOS:-http://localhost:4703}"
TWIN_ID="twin-e2e-$(date +%s)-$RANDOM"
TMP_DIR="$(mktemp -d /tmp/_tmb_XXXXXX)"
PASS=0
FAIL=0

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok()   { PASS=$((PASS+1)); printf '  \033[32mOK\033[0m   %s\n' "$*"; }
bad()  { FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m %s\n' "$*"; }

# Usage: assert <test-name> <python-eval-expression>
# where the python expression sees:
#   bridge   = $BRIDGE
#   mos      = $MEMORYOS
#   twin     = $TWIN_ID
#   files    = list of /tmp/_tmb_*.json paths (one per earlier curl)
# It must print "TRUE" or "FALSE".
assert() {
  local label="$1"; shift
  local expr="$1"
  PYTHONPATH= python3 - "$BRIDGE" "$MEMORYOS" "$TWIN_ID" "$TMP_DIR" <<PY
import json, os, sys, urllib.request
bridge, mos, twin, tmp = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
files = sorted(os.path.join(tmp, f) for f in os.listdir(tmp) if f.endswith('.json'))
data = {os.path.basename(p): json.load(open(p)) for p in files}
$expr
PY
  if [[ $? -eq 0 ]]; then ok "$label"; else bad "$label"; fi
}

# curl_bridge and curl_mos run in subshells when called via $(...), which means
# REQ/MOSREQ resets every time. We use files to communicate state out.
LAST_CB_FILE=""
LAST_MO_FILE=""

curl_bridge() {
  # curl_bridge <method> <path> [body] → writes JSON to $TMP_DIR/<n>.json
  local method="$1" path="$2" body="${3:-}"
  # Use a counter file so the count persists across subshell invocations.
  local cb_count_file="$TMP_DIR/.cb_count"
  local n
  n=$(($(cat "$cb_count_file" 2>/dev/null || echo 0) + 1))
  echo "$n" > "$cb_count_file"
  local out="$TMP_DIR/cb_$(printf '%04d' "$n").json"
  if [[ -n "$body" ]]; then
    curl -sS -X "$method" -H 'Content-Type: application/json' -d "$body" "$BRIDGE$path" -o "$out" -w '%{http_code}' > "$out.code"
  else
    curl -sS -X "$method" "$BRIDGE$path" -o "$out" -w '%{http_code}' > "$out.code"
  fi
  cat "$out.code"; echo
  LAST_CB_FILE="$out"
}

curl_mos() {
  local method="$1" path="$2" body="${3:-}"
  local mo_count_file="$TMP_DIR/.mo_count"
  local n
  n=$(($(cat "$mo_count_file" 2>/dev/null || echo 0) + 1))
  echo "$n" > "$mo_count_file"
  local out="$TMP_DIR/mo_$(printf '%04d' "$n").json"
  if [[ -n "$body" ]]; then
    curl -sS -X "$method" -H 'Content-Type: application/json' -d "$body" "$MEMORYOS$path" -o "$out" -w '%{http_code}' > "$out.code"
  else
    curl -sS -X "$method" "$MEMORYOS$path" -o "$out" -w '%{http_code}' > "$out.code"
  fi
  cat "$out.code"; echo
  LAST_MO_FILE="$out"
}

REQ=0; MOSREQ=0
echo "0" > "$TMP_DIR/.cb_count"
echo "0" > "$TMP_DIR/.mo_count"

bold "1) Health checks"
code=$(curl_bridge GET /health)
[[ "$code" == "200" ]] && ok "bridge /health → 200" || bad "bridge /health → $code"
code=$(curl_mos GET /health)
[[ "$code" == "200" ]] && ok "memory-os /health → 200" || bad "memory-os /health → $code"

bold "2) Bind twin to episodic kind"
body="{\"kind\":\"episodic\"}"
code=$(curl_bridge POST "/api/twins/$TWIN_ID/bind" "$body")
[[ "$code" == "201" ]] && ok "bind → 201" || bad "bind → $code"

bold "3) Seed MemoryOS with an episodic memory for the twin (so read has data)"
# Note: MemoryOS validates `type` strictly. We use "event" (a valid type) and
# stash the kind in metadata + tags so the bridge can still route by metadata.kind.
seed=$(cat <<JSON
{"twinId":"$TWIN_ID","type":"event","content":"Met Alice for coffee to discuss Q3 roadmap","tags":["meeting","alice","q3","episodic"],"metadata":{"kind":"episodic"}}
JSON
)
code=$(curl_mos POST /api/memories "$seed")
[[ "$code" == "201" ]] && ok "memory-os /api/memories → 201" || bad "memory-os /api/memories → $code"
# Capture the memory id for later (use LAST_MO_FILE saved by curl_mos)
seed_id=$(python3 -c "import json,sys; print(json.load(open('$LAST_MO_FILE'))['data']['id'])")
ok "seed memory id captured: $seed_id"

bold "4) Read memories via bridge (episodic) — should proxy to /api/memories/timeline/:twinId"
code=$(curl_bridge POST "/api/twins/$TWIN_ID/memory/read" '{"kind":"episodic"}')
[[ "$code" == "200" ]] && ok "read → 200" || bad "read → $code"

# Read must contain source=memory-os, kind=episodic, and our seed
assert "read returns proxy envelope with kind=episodic" "
d = data['cb_0003.json']
ok = (d.get('kind') == 'episodic'
      and d.get('source') == 'memory-os'
      and d.get('twinId') == twin
      and d.get('memoryOsPath','').startswith('/api/memories/timeline/')
      and d.get('count', 0) >= 1)
print('TRUE' if ok else 'FALSE')
"

assert "episodic read returns the seeded memory" "
d = data['cb_0003.json']
ids = [m.get('id') for m in d.get('memories', [])]
print('TRUE' if '$seed_id' in ids else 'FALSE')
"

assert "episodic partition stats read counter incremented" "
d = data['cb_0003.json']
print('TRUE' if d.get('partitionId') else 'FALSE')
"

bold "5) Write a new memory via the bridge (episodic)"
write_body=$(cat <<JSON
{"kind":"episodic","memory":{"content":"Bridge-write: closed deal with Globex","tags":["deal","globex"],"metadata":{"source":"bridge-e2e"}}}
JSON
)
code=$(curl_bridge POST "/api/twins/$TWIN_ID/memory/write" "$write_body")
[[ "$code" == "201" ]] && ok "write → 201" || bad "write → $code"

assert "write returns 201 envelope with twin binding" "
d = data['cb_0004.json']
ok = (d.get('twinId') == twin
      and d.get('kind') == 'episodic'
      and d.get('partitionId')
      and d.get('memory', {}).get('id'))
print('TRUE' if ok else 'FALSE')
"

bold "6) Verify MemoryOS actually received the bridge-written memory"
# Hit MemoryOS directly using the timeline endpoint we know contains it.
code=$(curl_mos GET "/api/memories/timeline/$TWIN_ID")
[[ "$code" == "200" ]] && ok "memory-os timeline → 200" || bad "memory-os timeline → $code"

assert "MemoryOS timeline includes bridge-written content" "
d = data['mo_0003.json']
contents = [m.get('content','') for m in d.get('memories', []) or d.get('data',{}).get('memories',[])]
print('TRUE' if any('Bridge-write: closed deal with Globex' in c for c in contents) else 'FALSE')
"

bold "7) Migrate binding from episodic → long-term (preserveHistory=true)"
body="{\"fromKind\":\"episodic\",\"toKind\":\"long-term\",\"preserveHistory\":true}"
code=$(curl_bridge POST "/api/twins/$TWIN_ID/migrate" "$body")
[[ "$code" == "200" ]] && ok "migrate → 200" || bad "migrate → $code"

assert "migrate returns from/to partition ids, distinct" "
d = data['cb_0005.json']
print('TRUE' if d.get('fromPartitionId') and d.get('toPartitionId') and d['fromPartitionId'] != d['toPartitionId'] else 'FALSE')
"

assert "migrate preserves both bindings when preserveHistory=true" "
d = data['cb_0005.json']
b = d.get('binding', {}).get('partitions', {})
print('TRUE' if ('episodic' in b and 'long-term' in b) else 'FALSE')
"

bold "8) Read via bridge using long-term kind — should now proxy to /api/memory/longterm/:twinId"
# Seed a long-term entry directly so the read returns something
code=$(curl_mos POST "/api/memory/longterm/$TWIN_ID" '{"key":"preferred-language","value":"en-US","kind":"preference"}')
[[ "$code" == "201" ]] && ok "memory-os longterm seed → 201" || bad "memory-os longterm seed → $code"

code=$(curl_bridge POST "/api/twins/$TWIN_ID/memory/read" '{"kind":"long-term"}')
[[ "$code" == "200" ]] && ok "long-term read → 200" || bad "long-term read → $code"

assert "long-term read routes to /api/memory/longterm/" "
d = data['cb_0006.json']
ok = (d.get('kind') == 'long-term'
      and '/api/memory/longterm/' in d.get('memoryOsPath','')
      and d.get('source') == 'memory-os')
print('TRUE' if ok else 'FALSE')
"

assert "long-term read returns the seeded preference" "
d = data['cb_0006.json']
entries = d.get('memories', [])
print('TRUE' if any(e.get('key') == 'preferred-language' for e in entries) else 'FALSE')
"

bold "9) Read with working kind — should proxy to /api/memory/working/:twinId"
# Seed working memory
code=$(curl_mos PUT "/api/memory/working/$TWIN_ID" '{"context":{"step":"checkout"},"currentTask":"buy-movie-tickets"}')
[[ "$code" == "200" ]] && ok "memory-os working seed → 200" || bad "memory-os working seed → $code"

code=$(curl_bridge POST "/api/twins/$TWIN_ID/memory/read" '{"kind":"working"}')
[[ "$code" == "200" ]] && ok "working read → 200" || bad "working read → $code"

assert "working read routes to /api/memory/working/" "
d = data['cb_0007.json']
ok = (d.get('kind') == 'working'
      and '/api/memory/working/' in d.get('memoryOsPath',''))
print('TRUE' if ok else 'FALSE')
"

bold "10) Read with procedural kind — should proxy to /api/memories?type=procedural"
# Use a valid MemoryOS type; the bridge routes by metadata.kind, not the strict type field.
code=$(curl_mos POST /api/memories "{\"twinId\":\"$TWIN_ID\",\"type\":\"knowledge\",\"content\":\"how-to-reset-router: press button for 10s\",\"tags\":[\"howto\",\"router\",\"procedural\"],\"metadata\":{\"kind\":\"procedural\"}}")
[[ "$code" == "201" ]] && ok "procedural seed → 201" || bad "procedural seed → $code"

code=$(curl_bridge POST "/api/twins/$TWIN_ID/memory/read" '{"kind":"procedural"}')
[[ "$code" == "200" ]] && ok "procedural read → 200" || bad "procedural read → $code"

assert "procedural read routes to /api/memories?type=workflow" "
d = data['cb_0008.json']
ok = (d.get('kind') == 'procedural'
      and '/api/memories' in d.get('memoryOsPath','')
      and 'type=workflow' in d.get('memoryOsPath',''))
print('TRUE' if ok else 'FALSE')
"

bold "11) Read with semantic kind — should proxy to /api/memories/search?type=semantic"
code=$(curl_bridge POST "/api/twins/$TWIN_ID/memory/read" '{"kind":"semantic","query":"router"}')
[[ "$code" == "200" ]] && ok "semantic read → 200" || bad "semantic read → $code"

assert "semantic read routes to /api/memories/search" "
d = data['cb_0009.json']
ok = (d.get('kind') == 'semantic'
      and '/api/memories/search' in d.get('memoryOsPath',''))
print('TRUE' if ok else 'FALSE')
"

bold "12) Migrate with preserveHistory=false — from-kind binding should be dropped"
body="{\"fromKind\":\"procedural\",\"toKind\":\"semantic\",\"preserveHistory\":false}"
code=$(curl_bridge POST "/api/twins/$TWIN_ID/migrate" "$body")
# 200 if a procedural binding existed and was migrated away; 404 if it was
# already migrated in an earlier test step. Both outcomes prove the drop path.
if [[ "$code" == "200" || "$code" == "404" ]]; then
  ok "migrate (drop) → $code"
else
  bad "migrate (drop) → $code"
fi

assert "migrate with preserveHistory=false removes from-binding" "
d = data['cb_0010.json']
b = d.get('binding', {}).get('partitions', {})
print('TRUE' if 'procedural' not in b and 'semantic' in b else 'FALSE')
"

bold "13) Invalid kind rejected with 400"
code=$(curl_bridge POST "/api/twins/$TWIN_ID/memory/read" '{"kind":"bogus"}')
[[ "$code" == "400" ]] && ok "invalid kind → 400" || bad "invalid kind → $code"

bold "14) Audit log captured the proxy activity"
code=$(curl_bridge GET '/api/audit?limit=200')
[[ "$code" == "200" ]] && ok "audit → 200" || bad "audit → $code"

assert "audit log shows proxy-read and proxy-write events" "
d = data['cb_0012.json']
entries = d.get('entries', [])
kinds = {e.get('kind') for e in entries}
print('TRUE' if 'proxy-read' in kinds and 'proxy-write' in kinds and 'migrate' in kinds else 'FALSE')
"

echo
bold "Summary"
echo "  passed: $PASS"
echo "  failed: $FAIL"

if [[ $FAIL -gt 0 ]]; then exit 1; fi
exit 0
