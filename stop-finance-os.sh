#!/bin/bash

# ============================================
# HOJAI FinanceOS Stop Script
# Stops all FinanceOS services
# ============================================

echo "============================================"
echo "   HOJAI FinanceOS Shutdown"
echo "============================================"
echo ""

# Ports to check
PORTS=(4900 4901 4902 4903 4904 4905 4906 5220 5250 5255 5260 5270 5280 5290)

STOPPED=0

for port in "${PORTS[@]}"; do
    # Find PID using the port
    pid=$(lsof -ti:$port 2>/dev/null)

    if [ -n "$pid" ]; then
        echo "Stopping service on port $port (PID: $pid)..."
        kill $pid 2>/dev/null
        STOPPED=$((STOPPED + 1))
    fi
done

echo ""
if [ $STOPPED -gt 0 ]; then
    echo "✓ Stopped $STOPPED services"
else
    echo "No FinanceOS services running"
fi
