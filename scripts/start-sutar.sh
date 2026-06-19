#!/bin/bash
# Start all SUTAR OS real services
# Generated 2026-06-19
#
# Uses --prefix to bypass root workspace resolution (which fails due to
# @types/express-rate-limit version mismatches in unrelated packages).

set -e

LOG_DIR="/tmp/sutar-logs"
mkdir -p "$LOG_DIR"
cd /Users/rejaulkarim/Documents/RTMN

# === Layer 4: Decision & Flow ===
echo "Starting Decision Engine (4240)..."
cd industry-os/shared/decision-engine
PORT=4240 nohup node src/index.js > "$LOG_DIR/decision-engine.log" 2>&1 &
echo "  PID: $!"
cd /Users/rejaulkarim/Documents/RTMN

echo "Starting Goal OS (4242)..."
cd industry-os/shared/goal-os
PORT=4242 nohup node src/index.js > "$LOG_DIR/goal-os.log" 2>&1 &
echo "  PID: $!"
cd /Users/rejaulkarim/Documents/RTMN

echo "Starting Flow OS / Workflow Executor (4310)..."
cd companies/RABTUL-Technologies/REZ-workflow-executor
PORT=4310 nohup node dist/index.js > "$LOG_DIR/flow-os.log" 2>&1 &
echo "  PID: $!"
cd /Users/rejaulkarim/Documents/RTMN

# === Layer 5: Marketplace & Economy ===
echo "Starting Economy OS (4251)..."
cd companies/RABTUL-Technologies/REZ-economy-os
PORT=4251 nohup npx --prefix . ts-node src/index.ts > "$LOG_DIR/economy-os.log" 2>&1 &
echo "  PID: $!"
cd /Users/rejaulkarim/Documents/RTMN

echo "Starting Policy OS (3000 - env PORT can override)..."
cd companies/RABTUL-Technologies/REZ-policy-engine
PORT=4254 nohup npx --prefix . ts-node src/server.ts > "$LOG_DIR/policy-os.log" 2>&1 &
echo "  PID: $!"
cd /Users/rejaulkarim/Documents/RTMN

# === Layer 6: Trust & Contracts ===
echo "Starting Trust Engine (4180)..."
cd companies/RABTUL-Technologies/REZ-trust-scorer
PORT=4180 nohup npx --prefix . ts-node src/index.ts > "$LOG_DIR/trust-engine.log" 2>&1 &
echo "  PID: $!"
cd /Users/rejaulkarim/Documents/RTMN

echo "Starting Negotiation Engine (4191)..."
cd companies/RABTUL-Technologies/REZ-negotiation-engine
PORT=4191 nohup npx --prefix . ts-node src/index.ts > "$LOG_DIR/negotiation-engine.log" 2>&1 &
echo "  PID: $!"
cd /Users/rejaulkarim/Documents/RTMN

sleep 4
echo ""
echo "=== Active SUTAR Ports ==="
for p in 4180 4191 4240 4242 4251 4254 4310; do
  health=$(curl -sS --max-time 2 "http://localhost:$p/health" 2>&1 | head -1)
  echo "  $p: $health"
done