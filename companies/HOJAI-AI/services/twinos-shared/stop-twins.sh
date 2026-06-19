#!/bin/bash

# RTMN TwinOS Services - Stop Script
# Stops all twin services

echo "Stopping RTMN TwinOS Services..."

# Twin service ports
for port in 4705 4730 4710 4720 4876 4880 4885 4886 4887 4888 4889 4890 4892 4894 4895 4896; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        kill $pid 2>/dev/null
        echo "  Stopped service on port $port (PID: $pid)"
    fi
done

echo ""
echo "All TwinOS services stopped."
