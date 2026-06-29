#!/bin/bash
# ==============================================================================
# Stop all Genie Services
# ==============================================================================

echo "Stopping all Genie services..."

# Kill by port
for port in 4740 4742 4743 4745 4746 4747 4748 4749 4750 4751 4752 4753 4754 4755 7100 4399; do
    pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "  Killing processes on port $port: $pids"
        kill $pids 2>/dev/null
    fi
done

sleep 2

# Verify all stopped
echo ""
echo "Remaining processes:"
for port in 4740 4742 4743 4745 4746 4747 4748 4749 4750 4751 4752 4753 4754 4755 7100 4399; do
    pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "  Port $port: still running ($pids)"
    fi
done

echo ""
echo "All Genie services stopped."