#!/bin/bash
COMPANY=$1
SERVICE=$2
TOP="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"
LEGACY="$TOP/legacy-audit/legacy-services"

# Find the service in top-level
TOP_PATH=$(find "$TOP" -type d -not -path "*/legacy-audit*" -not -name "node_modules" -not -name ".git" -name "$SERVICE" 2>/dev/null | head -1)
LEGACY_PATH="$LEGACY/$SERVICE"

if [ -z "$TOP_PATH" ] || [ -z "$LEGACY_PATH" ]; then
  echo "Not found"
  exit 0
fi

echo "=== $COMPANY/$SERVICE ==="
echo "TOP: $TOP_PATH"
TOP_SIZE=$(du -sh "$TOP_PATH" 2>/dev/null | awk '{print $1}')
LEGACY_SIZE=$(du -sh "$LEGACY_PATH" 2>/dev/null | awk '{print $1}')
TOP_FILES=$(find "$TOP_PATH" -type f 2>/dev/null | wc -l | tr -d ' ')
LEGACY_FILES=$(find "$LEGACY_PATH" -type f 2>/dev/null | wc -l | tr -d ' ')
echo "  Top: $TOP_SIZE ($TOP_FILES files)"
echo "  Legacy: $LEGACY_SIZE ($LEGACY_FILES files)"

# Show diff summary
echo "--- DIFF SUMMARY ---"
diff -rq "$TOP_PATH" "$LEGACY_PATH" 2>/dev/null | head -10
