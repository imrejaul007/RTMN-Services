#!/bin/bash
COMPANY=$1
SERVICE=$2
TOP="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"
LEGACY="$TOP/legacy-audit/legacy-services"

TOP_PATH=$(find "$TOP" -type d -not -path "*/legacy-audit*" -not -name "node_modules" -not -name ".git" -name "$SERVICE" 2>/dev/null | head -1)
LEGACY_PATH="$LEGACY/$SERVICE"

if [ -z "$TOP_PATH" ] || [ -z "$LEGACY_PATH" ]; then
  echo "Not found"
  exit 0
fi

# Files only in legacy
echo "=== $SERVICE: Files ONLY IN LEGACY (potentially unique code) ==="
diff -rq "$TOP_PATH" "$LEGACY_PATH" 2>/dev/null | grep "Only in $LEGACY_PATH" | head -20

# Files only in top  
echo "=== $SERVICE: Files ONLY IN TOP-LEVEL ==="
diff -rq "$TOP_PATH" "$LEGACY_PATH" 2>/dev/null | grep "Only in $TOP_PATH" | head -20
