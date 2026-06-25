#!/usr/bin/env bash
# Liveness smoke test for `npx hojai deploy --mode=local`.
#
# This is separate from smoke-deploy.sh because the local mode spawns
# the backend as a detached process — when run inside a shell that exits
# shortly after, the detached child may get reaped before binding.
#
# Here we use `nohup` + `disown` to fully detach, then sleep + curl.
#
# Run: bash foundry/scripts/smoke-deploy-liveness.sh
set -e

CLI="/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/foundry/packages/create-hojai/src/index.js"
SCRATCH="/tmp/smoke-deploy-liveness"
rm -rf "$SCRATCH"
mkdir -p "$SCRATCH"

echo "── liveness smoke ──"
proj="$SCRATCH/app"
(cd "$SCRATCH" && node "$CLI" create app --template=hotel --region=us-east --lang=en --no-install --no-git --yes >/dev/null)
(cd "$proj" && npm install --no-audit --no-fund --silent)
(cd "$proj" && node "$CLI" deploy --mode=local --yes >/dev/null 2>&1 &)

# Wait a bit for the spawn to happen
sleep 3

# Read the deploy record
backend=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$proj/.hojai/deploy.json','utf8')).backendUrl)")
pid=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$proj/.hojai/deploy.json','utf8')).backendPid)")
echo "  spawned pid=$pid backend=$backend"

# Poll
ok=0
for i in $(seq 1 20); do
  sleep 0.5
  code=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" "$backend/health" 2>/dev/null || echo "000")
  if [ "$code" = "200" ]; then ok=1; echo "  /health 200 on attempt $i"; break; fi
done

# Cleanup
kill "$pid" 2>/dev/null || true
sleep 1
kill -9 "$pid" 2>/dev/null || true

if [ $ok -eq 1 ]; then
  echo "  ✓ backend is live after deploy"
  exit 0
else
  echo "  ✗ backend never came up"
  exit 1
fi
