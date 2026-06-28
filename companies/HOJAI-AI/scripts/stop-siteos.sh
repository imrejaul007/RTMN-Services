#!/bin/bash
# Stop all HOJAI SiteOS services
BASE="/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/products"
PID_DIR="/tmp/hojai-siteos-pids"

echo "Stopping SiteOS..."
for pidf in $PID_DIR/*.pid 2>/dev/null; do
  pid=$(cat "$pidf" 2>/dev/null)
  kill $pid 2>/dev/null && echo "Killed PID $pid"
done
rm -rf $PID_DIR 2>/dev/null
echo "All stopped."
