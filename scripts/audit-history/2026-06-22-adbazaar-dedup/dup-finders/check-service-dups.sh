#!/bin/bash
COMPANY=$1
TOP="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"
LEGACY="$TOP/legacy-audit/legacy-services"

if [ ! -d "$LEGACY" ]; then
  exit 0
fi

# Get top-level service dirs (excluding legacy-audit, node_modules, etc.)
TOP_SERVICES=$(find "$TOP" -mindepth 1 -maxdepth 1 -type d -not -path "*/legacy-audit" -not -name ".git" -not -name "node_modules" 2>/dev/null | xargs -I{} basename {} 2>/dev/null | sort -u)

# Get service dirs inside legacy
LEGACY_SERVICES=$(find "$LEGACY" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | xargs -I{} basename {} 2>/dev/null | sort -u)

# Find duplicates
DUPES=$(comm -12 <(echo "$TOP_SERVICES") <(echo "$LEGACY_SERVICES"))
COUNT=$(echo "$DUPES" | grep -v "^$" | wc -l | tr -d ' ')
TOTAL_LEGACY=$(echo "$LEGACY_SERVICES" | grep -v "^$" | wc -l | tr -d ' ')
echo "=== $COMPANY ==="
echo "  Total legacy services: $TOTAL_LEGACY"
echo "  Service-level dupes: $COUNT"
if [ "$COUNT" -gt 0 ] && [ "$COUNT" -lt 30 ]; then
  echo "  Duplicates:$DUPES"
fi
