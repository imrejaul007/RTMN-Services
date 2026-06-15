#!/bin/bash
# RTMN CRM Stack - Start Script
# Usage: ./start-crm-stack.sh [pm2|node]
#   pm2  - Use pm2 process manager (recommended for production)
#   node - Direct node process (development only)

set -e

MODE="${1:-pm2}"
LOG_DIR="$(dirname "$0")/logs"
mkdir -p "$LOG_DIR"

echo "🚀 Starting RTMN CRM Stack..."
echo "   Mode: $MODE"
echo "   Log dir: $LOG_DIR"

case "$MODE" in
  pm2)
    if ! command -v pm2 &>/dev/null; then
      echo "❌ pm2 not found. Install with: npm install -g pm2"
      exit 1
    fi
    echo "📦 Using pm2..."
    pm2 delete rez-crm-hub 2>/dev/null || true
    pm2 delete rez-salesmind 2>/dev/null || true
    pm2 start "$(dirname "$0")/ecosystem.crm.json"
    pm2 save
    echo ""
    echo "✅ Services started. Use these commands:"
    echo "   pm2 status              # check status"
    echo "   pm2 logs rez-crm-hub   # view CRM Hub logs"
    echo "   pm2 logs rez-salesmind # view SalesMind logs"
    echo "   pm2 monit               # live monitor"
    echo "   pm2 stop all            # stop everything"
    ;;
  node)
    echo "⚠️  Running with node (no process manager - development only)"
    echo "   This will NOT survive terminal close!"
    echo ""
    echo "Starting REZ CRM Hub (port 4056)..."
    cd "$(dirname "$0")/companies/AdBazaar/REZ-crm-hub"
    node dist/index.js > "$LOG_DIR/crm-hub-out.log" 2>&1 &
    CRM_PID=$!
    echo "   PID: $CRM_PID"

    echo "Starting REZ SalesMind (port 5170)..."
    cd "$(dirname "$0")/companies/RTNM-Digital/REZ-SalesMind"
    node dist/index.js > "$LOG_DIR/salesmind-out.log" 2>&1 &
    SM_PID=$!
    echo "   PID: $SM_PID"

    echo ""
    echo "✅ Both services started."
    echo "   CRM Hub:   http://localhost:4056/api/health"
    echo "   SalesMind: http://localhost:5170/health"
    echo "   Logs: $LOG_DIR/"
    ;;
  *)
    echo "Usage: $0 [pm2|node]"
    exit 1
    ;;
esac
