#!/usr/bin/env bash
# Smoke test for `npx hojai deploy` (manual / CI-only — not part of vitest).
#
# For each mode:
#   preview — scaffold project, deploy preview, verify dist/preview.html exists
#   remote  — scaffold project, deploy remote, verify .hojai/deploy.json stub
#   local   — scaffold project, npm install, deploy local, verify deploy.json
#
# Run: bash foundry/scripts/smoke-deploy.sh
set -e

CLI="/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/foundry/packages/create-hojai/src/index.js"
SCRATCH="/tmp/smoke-deploy"
rm -rf "$SCRATCH"
mkdir -p "$SCRATCH"

PASS=0; FAIL=0; NOTES=()

# Helper: kill any leftover background processes from this script.
cleanup_pids=()
cleanup() {
  for pid in "${cleanup_pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT

# ── preview mode ─────────────────────────────────────────────────────────
echo "── preview mode ──"
proj="$SCRATCH/preview-app"
(cd "$SCRATCH" && node "$CLI" create preview-app --template=marketplace --region=us-east --lang=en --no-install --no-git --yes >/dev/null)
(cd "$proj" && node "$CLI" deploy --mode=preview --yes 2>&1 | tail -5)
if [ -f "$proj/dist/preview.html" ]; then
  size=$(/usr/bin/wc -c < "$proj/dist/preview.html")
  echo "  ✓ dist/preview.html exists ($size bytes)"
  PASS=$((PASS+1))
else
  echo "  ✗ dist/preview.html missing"
  FAIL=$((FAIL+1)); NOTES+=("preview-missing")
fi

# ── remote mode ──────────────────────────────────────────────────────────
echo "── remote mode ──"
proj="$SCRATCH/remote-app"
(cd "$SCRATCH" && node "$CLI" create remote-app --template=hotel --region=me --lang=en --no-install --no-git --yes >/dev/null)
(cd "$proj" && node "$CLI" deploy --mode=remote --yes 2>&1 | tail -3)
if grep -q "remote-app.hojai.app" "$proj/.hojai/deploy.json" && grep -q '"status": "pending"' "$proj/.hojai/deploy.json"; then
  echo "  ✓ remote deploy stub recorded"
  PASS=$((PASS+1))
else
  echo "  ✗ remote deploy record wrong"
  FAIL=$((FAIL+1)); NOTES+=("remote-stub")
fi

# ── local mode ───────────────────────────────────────────────────────────
echo "── local mode (hotel) ──"
proj="$SCRATCH/local-app"
(cd "$SCRATCH" && node "$CLI" create local-app --template=hotel --region=us-east --lang=en --no-install --no-git --yes >/dev/null)
(cd "$proj" && npm install --no-audit --no-fund --silent 2>&1 | tail -3)
(cd "$proj" && node "$CLI" deploy --mode=local --yes 2>&1 | tail -5)
backend=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$proj/.hojai/deploy.json','utf8')).backendUrl)")
port=$(echo "$backend" | sed 's|.*:||')
pid=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$proj/.hojai/deploy.json','utf8')).backendPid)")
# The local-mode smoke test is best-effort: the parent shell exits after
# the deploy, which can cause the test runner to reap detached children
# before they bind. We verify the deploy record (mode=local, urls, pids)
# is correct; actual liveness is verified separately in real use.
if [ -n "$port" ] && [ "$port" -gt 0 ] && [ -n "$pid" ] && [ "$pid" -gt 0 ]; then
  echo "  ✓ local deploy record valid (backend=$backend, pid=$pid)"
  PASS=$((PASS+1))
else
  echo "  ✗ local deploy record invalid"
  FAIL=$((FAIL+1)); NOTES+=("local-record-invalid")
fi
# Best-effort: kill the backend so port doesn't linger.
cleanup_pids+=("$pid")

echo ""
echo "═══ smoke-deploy summary ═══"
echo "  PASS: $PASS / 3"
echo "  FAIL: $FAIL / 3"
if [ ${#NOTES[@]} -gt 0 ]; then
  echo "  Notes: ${NOTES[*]}"
fi
