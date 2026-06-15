#!/bin/bash
# RTMN Ecosystem Stop Script
# Stops all industry OS services

echo "Stopping RTMN Ecosystem services..."

# Services to stop
PORTS=(4399 4510 4000 4242 4703 5010 5020 5025 5030 5035 5050 5060 5080 5090 5100 5110 5150 5230 5600)

for port in "${PORTS[@]}"; do
  pid=$(lsof -ti :$port 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "Stopping port $port (PID: $pid)..."
    kill $pid 2>/dev/null || true
  fi
done

echo "Done. All services stopped."