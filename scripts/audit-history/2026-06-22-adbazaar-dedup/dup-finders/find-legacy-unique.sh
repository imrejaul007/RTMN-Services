#!/bin/bash
COMPANY=$1
SERVICE=$2
TOP="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"
LEGACY="$TOP/legacy-audit/legacy-services"

TOP_PATH=$(find "$TOP" -type d -not -path "*/legacy-audit*" -not -name "node_modules" -not -name ".git" -name "$SERVICE" 2>/dev/null | head -1)
LEGACY_PATH="$LEGACY/$SERVICE"

if [ -z "$TOP_PATH" ] || [ -z "$LEGACY_PATH" ]; then
  exit 0
fi

# Get files only in legacy (excluding nm/git)
echo "=== $SERVICE: Files ONLY IN LEGACY ==="
diff -rq "$TOP_PATH" "$LEGACY_PATH" 2>/dev/null | grep "Only in $LEGACY_PATH" | grep -v "node_modules\|.git/\|.DS_Store" | head -10
