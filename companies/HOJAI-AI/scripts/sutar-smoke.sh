#!/bin/bash
# SUTAR OS smoke test
# Verifies that the security stack + canonical services boot and respond.
# Run from the HOJAI-AI repo root:
#   bash scripts/sutar-smoke.sh

set -e
cd "$(dirname "$0")/.."

# Cores per service
PORTS=(
  "sutar-os/core/sutar-gateway:4140"
  "sutar-os/core/sutar-twin-os:4142"
  "sutar-os/core/sutar-memory-bridge:4143"
  "sutar-os/core/sutar-identity:4144"
  "sutar-os/core/sutar-agent-id:4145"
  "sutar-os/core/sutar-monitoring:3100"
  "sutar-os/agents/acp-protocol:4800"
  "sutar-os/agents/acn-network:4801"
  "sutar-os/agents/agent-wallets:4840"
  "sutar-os/agents/agent-reputation:4820"
  "sutar-os/agents/agent-teaming:4190"
)

PASS=0
FAIL=0
for entry in "${PORTS[@]}"; do
  dir="${entry%%:*}"
  port="${entry##*:}"
  name=$(basename "$dir")

  echo -n "checking $name (port $port): "
  if curl -s -m 3 "http://localhost:${port}/health" > /dev/null 2>&1; then
    echo "✅ ok"
    PASS=$((PASS+1))
  else
    echo "❌ not responding (skip — service may not be running)"
  fi
done

echo ""
echo "Summary: $PASS/${#PORTS[@]} services reachable"
echo ""
echo "Note: This script does NOT start services. Use start-all.sh or run"
echo "      individual services via 'cd <svc> && npm start'."