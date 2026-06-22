#!/usr/bin/env bash
# MemoryOS e2e test suite
# Exercises all newly added spec features plus existing happy paths.
# Uses temp files (/tmp/_mo_*.json) and python for JSON parsing.

set -u
BASE="${BASE:-http://localhost:4703}"
PASS=0
FAIL=0
FAILURES=()

red()   { printf "\033[31m%s\033[0m" "$1"; }
green() { printf "\033[32m%s\033[0m" "$1"; }

check() {
  # check <label> <actual_status> <expected_status> [extra_evidence]
  local label="$1" actual="$2" expected="$3" extra="${4:-}"
  if [ "$actual" = "$expected" ]; then
    printf "  [%s] %s\n" "$(green PASS)" "$label"
    PASS=$((PASS + 1))
  else
    printf "  [%s] %s (expected %s got %s) %s\n" "$(red FAIL)" "$label" "$expected" "$actual" "$extra"
    FAIL=$((FAIL + 1))
    FAILURES+=("$label (expected $expected got $actual)")
  fi
}

jget() {
  # jget <file> <python expr on d>
  python3 -c "import json,sys; d=json.load(open('$1')); $2"
}

http() {
  # http <method> <path> [json_body]  -> writes body to /tmp/_mo_body.json, returns status code
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -s -o /tmp/_mo_body.json -w "%{http_code}" -X "$method" "$BASE$path" \
      -H "Content-Type: application/json" -d "$body"
  else
    curl -s -o /tmp/_mo_body.json -w "%{http_code}" -X "$method" "$BASE$path"
  fi
}

echo "=========================================="
echo "MemoryOS e2e test suite"
echo "BASE = $BASE"
echo "=========================================="

# ----------------------------------------------------------------------------
# 1. Invalid type -> 400
# ----------------------------------------------------------------------------
echo
echo "[1] POST memory with invalid type -> 400"
code=$(http POST /api/memories '{"twinId":"t1","type":"bogus_type","content":"x"}')
check "invalid type rejected" "$code" "400"
extra=$(jget /tmp/_mo_body.json "print(d.get('error',''))")
echo "    error code: $extra"

# ----------------------------------------------------------------------------
# 2. Valid type, no importance -> defaults to medium
# ----------------------------------------------------------------------------
echo
echo "[2] POST memory with valid type, no importance -> defaults to medium"
code=$(http POST /api/memories '{"twinId":"t1","type":"preference","content":"I love dark mode"}')
check "create with default importance" "$code" "201"
imp=$(jget /tmp/_mo_body.json "print(d['data']['importance'])")
check "importance default == Medium" "$imp" "Medium"
stage=$(jget /tmp/_mo_body.json "print(d['data']['lifecycleStage'])")
check "lifecycleStage default == created" "$stage" "created"
ver=$(jget /tmp/_mo_body.json "print(d['data']['version'])")
check "version starts at 1" "$ver" "1"
mid=$(jget /tmp/_mo_body.json "print(d['data']['id'])")
echo "    memory id: $mid"

# ----------------------------------------------------------------------------
# 3. TTL in past -> read returns 410
# ----------------------------------------------------------------------------
echo
echo "[3] POST memory with ttl in past -> read returns 410"
code=$(http POST /api/memories '{"twinId":"t1","type":"event","content":"expired","ttl":"2020-01-01T00:00:00.000Z"}')
check "create expired memory" "$code" "201"
eid=$(jget /tmp/_mo_body.json "print(d['data']['id'])")
code=$(http GET "/api/memories/$eid")
check "expired read returns 410" "$code" "410"

# cleanup-expired should also remove it
code=$(http POST /api/memories/cleanup-expired '{}')
check "cleanup-expired returns 200" "$code" "200"
removed=$(jget /tmp/_mo_body.json "print(d['removed'])")
echo "    removed $removed expired memory(ies)"

# verify the expired one is truly gone
code=$(http GET "/api/memories/$eid")
check "expired memory now 404" "$code" "404"

# ----------------------------------------------------------------------------
# 4. Lifecycle transition: created -> captured -> indexed -> connected -> learned
#    -> recalled -> summarized -> archived
# ----------------------------------------------------------------------------
echo
echo "[4] POST memory, then transition through stages, ending in archived"
code=$(http POST /api/memories '{"twinId":"t1","type":"knowledge","content":"lifecycle test","importance":"High"}')
check "create for lifecycle" "$code" "201"
lid=$(jget /tmp/_mo_body.json "print(d['data']['id'])")

for stage in captured indexed connected learned recalled summarized archived; do
  code=$(http POST "/api/memories/$lid/transition" "{\"to\":\"$stage\"}")
  check "transition -> $stage" "$code" "200"
done
code=$(http GET "/api/memories/$lid")
check "read after archived (not deleted)" "$code" "200"
final=$(jget /tmp/_mo_body.json "print(d['data']['lifecycleStage'])")
check "final lifecycleStage == archived" "$final" "archived"

# invalid transition
code=$(http POST "/api/memories/$lid/transition" '{"to":"not_a_real_stage"}')
check "invalid stage rejected" "$code" "400"

# ----------------------------------------------------------------------------
# 5. Analytics: by-type
# ----------------------------------------------------------------------------
echo
echo "[5] GET analytics/by-type"
code=$(http GET /api/memories/analytics/by-type)
check "by-type returns 200" "$code" "200"
echo "    byType: $(jget /tmp/_mo_body.json "import json; print(d['byType'])")"
prefs=$(jget /tmp/_mo_body.json "print(d['byType'].get('preference',0))")
kn=$(jget /tmp/_mo_body.json "print(d['byType'].get('knowledge',0))")
[ "$prefs" -ge 1 ] && check "by-type has preference >= 1" "ok" "ok" || check "by-type has preference >= 1" "no" "ok"
[ "$kn" -ge 1 ] && check "by-type has knowledge >= 1" "ok" "ok" || check "by-type has knowledge >= 1" "no" "ok"

# growth
code=$(http GET /api/memories/analytics/growth)
check "growth returns 200" "$code" "200"
days=$(jget /tmp/_mo_body.json "print(len(d['series']))")
check "growth series has 30 days" "$days" "30"

# recall-freq
code=$(http GET /api/memories/analytics/recall-freq)
check "recall-freq returns 200" "$code" "200"

# ----------------------------------------------------------------------------
# 6. Versioning: history + revert
# ----------------------------------------------------------------------------
echo
echo "[6] Versioning: history + revert"
code=$(http POST /api/memories '{"twinId":"t1","type":"identity","content":"v1 content","importance":"Low"}')
check "create for versioning" "$code" "201"
vid=$(jget /tmp/_mo_body.json "print(d['data']['id'])")
v1=$(jget /tmp/_mo_body.json "print(d['data']['version'])")
check "v1 starts at 1" "$v1" "1"

# update a few times
for i in 2 3 4; do
  code=$(http PUT "/api/memories/$vid" "{\"content\":\"v$i content\"}")
  check "update v$i" "$code" "200"
done

code=$(http GET "/api/memories/$vid/history")
check "history returns 200" "$code" "200"
hcnt=$(jget /tmp/_mo_body.json "print(d['count'])")
echo "    history count: $hcnt"
[ "$hcnt" -ge 4 ] && check "history has >= 4 versions" "ok" "ok" || check "history has >= 4 versions" "no" "ok"

# revert to v2
code=$(http POST "/api/memories/$vid/revert" '{"version":2}')
check "revert to v2 returns 200" "$code" "200"
reverted=$(jget /tmp/_mo_body.json "print(d['data']['content'])")
check "content reverted to v2" "$reverted" "v2 content"

# ----------------------------------------------------------------------------
# 7. Confidence writeback
# ----------------------------------------------------------------------------
echo
echo "[7] Confidence: strengthen / weaken / get"
code=$(http POST /api/memories '{"twinId":"t1","type":"preference","content":"confidence test","importance":"Medium"}')
check "create for confidence" "$code" "201"
cid=$(jget /tmp/_mo_body.json "print(d['data']['id'])")
base=$(jget /tmp/_mo_body.json "print(d['data']['confidence'])")
echo "    baseline confidence: $base"

code=$(http POST "/api/memories/$cid/strengthen" '{"amount":0.2}')
check "strengthen returns 200" "$code" "200"
after_up=$(jget /tmp/_mo_body.json "print(round(d['data']['confidence'],3))")
echo "    after strengthen: $after_up"

code=$(http POST "/api/memories/$cid/weaken" '{"amount":0.1,"reason":"user changed mind"}')
check "weaken returns 200" "$code" "200"
after_dn=$(jget /tmp/_mo_body.json "print(round(d['data']['confidence'],3))")
cont=$(jget /tmp/_mo_body.json "print(d['data']['contradictions'])")
check "contradictions counter incremented" "$cont" "1"
echo "    after weaken: $after_dn (contradictions=$cont)"

code=$(http GET "/api/memories/$cid/confidence")
check "confidence endpoint returns 200" "$code" "200"
has_decay=$(jget /tmp/_mo_body.json "print('decayFactor' in d)")
check "confidence response has decayFactor" "$has_decay" "True"

# ----------------------------------------------------------------------------
# 8. Bulk create + bulk delete
# ----------------------------------------------------------------------------
echo
echo "[8] Bulk create 5 + bulk delete 3"
BULK_TWIN="twin-bulk-$(date +%s)-$$"
code=$(http POST /api/memories/bulk-create "{\"items\":[
  {\"twinId\":\"$BULK_TWIN\",\"type\":\"event\",\"content\":\"bulk1\"},
  {\"twinId\":\"$BULK_TWIN\",\"type\":\"event\",\"content\":\"bulk2\"},
  {\"twinId\":\"$BULK_TWIN\",\"type\":\"event\",\"content\":\"bulk3\"},
  {\"twinId\":\"$BULK_TWIN\",\"type\":\"event\",\"content\":\"bulk4\"},
  {\"twinId\":\"$BULK_TWIN\",\"type\":\"event\",\"content\":\"bulk5\"}
]}")
check "bulk-create returns 201" "$code" "201"
created_count=$(jget /tmp/_mo_body.json "print(d['createdCount'])")
check "bulk-create createdCount == 5" "$created_count" "5"

# collect all 5 ids
ids_json=$(python3 -c "import json; d=json.load(open('/tmp/_mo_body.json')); import json as j; print(j.dumps([m['id'] for m in d['created']]))")
echo "    ids: $ids_json"
first3=$(echo "$ids_json" | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)[:3]))")

code=$(http POST /api/memories/bulk-delete "{\"ids\":$first3}")
check "bulk-delete returns 200" "$code" "200"
del_count=$(jget /tmp/_mo_body.json "print(d['deletedCount'])")
check "bulk-delete deletedCount == 3" "$del_count" "3"

# verify only 2 left for that twin
code=$(http GET "/api/twins/$BULK_TWIN/memories")
check "twin list returns 200" "$code" "200"
remaining=$(jget /tmp/_mo_body.json "print(d['total'])")
check "2 memories left for twin-bulk" "$remaining" "2"

# ----------------------------------------------------------------------------
# 9. Per-twin search: GET /api/twins/:twinId/memories
# ----------------------------------------------------------------------------
echo
echo "[9] GET /api/twins/:twinId/memories"
# Create a few memories for a unique twin
TWIN="twin-9-$(date +%s)"
for content in "alpha" "beta" "gamma"; do
  code=$(http POST /api/memories "{\"twinId\":\"$TWIN\",\"type\":\"identity\",\"content\":\"$content\"}")
  check "seed memory '$content' for $TWIN" "$code" "201"
done

code=$(http GET "/api/twins/$TWIN/memories")
check "per-twin list returns 200" "$code" "200"
total=$(jget /tmp/_mo_body.json "print(d['total'])")
check "per-twin list total == 3" "$total" "3"

# filter by type
code=$(http GET "/api/twins/$TWIN/memories?type=identity")
check "per-twin list type=identity returns 200" "$code" "200"
total2=$(jget /tmp/_mo_body.json "print(d['total'])")
check "filtered per-twin total == 3" "$total2" "3"

# ----------------------------------------------------------------------------
# 10. Importance filter
# ----------------------------------------------------------------------------
echo
echo "[10] GET /api/memories/by-importance/High"
code=$(http GET /api/memories/by-importance/High)
check "by-importance/High returns 200" "$code" "200"
hcnt=$(jget /tmp/_mo_body.json "print(d['count'])")
[ "$hcnt" -ge 1 ] && check "by-importance/High count >= 1" "ok" "ok" || check "by-importance/High count >= 1" "no" "ok"

code=$(http GET /api/memories/by-importance/NotARealLevel)
check "by-importance invalid level returns 400" "$code" "400"

# ----------------------------------------------------------------------------
# 11. forget endpoint
# ----------------------------------------------------------------------------
echo
echo "[11] POST /api/memories/:id/forget"
code=$(http POST /api/memories '{"twinId":"t-forget","type":"identity","content":"to forget","importance":"Low"}')
check "create for forget" "$code" "201"
fid=$(jget /tmp/_mo_body.json "print(d['data']['id'])")
code=$(http POST "/api/memories/$fid/forget" '{"reason":"gdpr_test"}')
check "forget returns 200" "$code" "200"
code=$(http GET "/api/memories/$fid")
check "forgotten memory is 404" "$code" "404"

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------
echo
echo "=========================================="
TOTAL=$((PASS + FAIL))
if [ "$FAIL" -eq 0 ]; then
  echo "$(green PASS): $PASS / $TOTAL"
  echo "ALL TESTS PASSED"
  exit 0
else
  echo "$(green PASS): $PASS  $(red FAIL): $FAIL  / $TOTAL"
  echo "FAILURES:"
  for f in "${FAILURES[@]}"; do
    echo "  - $f"
  done
  exit 1
fi
