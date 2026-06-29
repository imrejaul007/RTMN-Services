#!/bin/bash
# ==============================================================================
# Genie Services Startup Script
# Starts all 14 Genie services + Genie OS Runtime + RTMN Hub
# ==============================================================================

set -e

GENIE_DIR="/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/products/genie"
HUB_DIR="/Users/rejaulkarim/Documents/RTMN/services/rtmn-unified-hub"
LOG_DIR="/tmp/genie-logs"
mkdir -p "$LOG_DIR"

echo "================================================================"
echo "  Genie Ecosystem Startup — $(date)"
echo "================================================================"

# Start Redis if not running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "Starting Redis..."
    redis-server --daemonize yes
    sleep 2
fi

# Start services in order
declare -A SERVICES=(
    ["decision-intelligence"]="4740"
    ["learning-loop"]="4742"
    ["anticipation"]="4745"
    ["ambient"]="4746"
    ["constitution"]="4743"
    ["financial-life"]="4747"
    ["health-intelligence"]="4748"
    ["household"]="4749"
    ["travel"]="4750"
    ["spiritual"]="4751"
    ["life-simulation"]="4752"
    ["focus"]="4753"
    ["dreams"]="4754"
    ["legacy"]="4755"
)

for service in "${!SERVICES[@]}"; do
    port="${SERVICES[$service]}"
    service_dir="$GENIE_DIR/genie-$service"

    if [ -d "$service_dir" ]; then
        echo "Starting $service on port $port..."
        cd "$service_dir"

        if [ ! -d "node_modules" ]; then
            echo "  Installing dependencies for $service..."
            npm install --silent 2>&1 | tail -1 || echo "  (npm install may have failed)"
        fi

        if [ ! -d "dist" ] && [ -f "tsconfig.json" ]; then
            echo "  Building $service..."
            npm run build 2>&1 | tail -1 || echo "  (build may have failed)"
        fi

        PORT=$port nohup node dist/index.js > "$LOG_DIR/$service.log" 2>&1 &
        echo "  PID: $!"
    else
        echo "  ✗ Directory not found: $service_dir"
    fi

    sleep 1
done

# Start Genie OS Runtime
echo "Starting Genie OS Runtime on port 7100..."
GENIE_DIR_RUNTIME="$GENIE_DIR/genie-os/runtime/genie"
if [ -d "$GENIE_DIR_RUNTIME" ]; then
    cd "$GENIE_DIR_RUNTIME"
    if [ ! -d "node_modules" ]; then
        npm install --silent 2>&1 | tail -1 || true
    fi
    GENIE_PORT=7100 nohup node src/index.js > "$LOG_DIR/genie-runtime.log" 2>&1 &
    echo "  PID: $!"
fi

# Start RTMN Hub
echo "Starting RTMN Unified Hub on port 4399..."
if [ -d "$HUB_DIR" ]; then
    cd "$HUB_DIR"
    if [ ! -d "node_modules" ]; then
        npm install --silent 2>&1 | tail -1 || true
    fi
    if [ ! -d "dist" ] && [ -f "tsconfig.json" ]; then
        npm run build 2>&1 | tail -1 || true
    fi
    PORT=4399 nohup node dist/index.js > "$LOG_DIR/rtmn-hub.log" 2>&1 &
    echo "  PID: $!"
fi

sleep 5

echo ""
echo "================================================================"
echo "  Genie Ecosystem Status"
echo "================================================================"

# Check health
echo "Genie Runtime (7100):"
curl -s http://localhost:7100/health 2>/dev/null | head -1 || echo "  Not responding"

echo ""
echo "RTMN Hub (4399):"
curl -s http://localhost:4399/health 2>/dev/null | head -1 || echo "  Not responding"

echo ""
echo "All 14 Genie services:"
for service in "${!SERVICES[@]}"; do
    port="${SERVICES[$service]}"
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:$port/health 2>/dev/null || echo "down")
    if [ "$status" = "200" ]; then
        echo "  ✓ $service (:$port)"
    else
        echo "  ✗ $service (:$port) - $status"
    fi
done

echo ""
echo "Logs: $LOG_DIR/"
echo "================================================================"