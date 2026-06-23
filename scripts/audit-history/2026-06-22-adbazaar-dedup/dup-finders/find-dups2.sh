#!/bin/bash
COMPANY=$1
TOP="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"
LEGACY="$TOP/legacy-audit"

if [ ! -d "$LEGACY" ]; then
  echo "$COMPANY: no legacy-audit"
  exit 0
fi

# Get all top-level item names (excluding legacy-audit, .git, node_modules)
TOP_ITEMS=$(find "$TOP" -mindepth 1 -maxdepth 1 \( -type d -o -type f \) -not -path "*/legacy-audit" -not -name ".git" -not -name "node_modules" -not -name ".DS_Store" 2>/dev/null | xargs -I{} basename {} 2>/dev/null | sort -u)

# Get all item names inside legacy-audit (excluding legacy-services subdir)
LEGACY_ITEMS=$(find "$LEGACY" -mindepth 1 -maxdepth 1 \( -type d -o -type f \) -not -name "MIGRATION-README.md" -not -name "legacy-services" -not -name ".DS_Store" 2>/dev/null | xargs -I{} basename {} 2>/dev/null | sort -u)

# Find duplicates (items in both top-level and legacy-audit root)
DUPES=$(comm -12 <(echo "$TOP_ITEMS") <(echo "$LEGACY_ITEMS"))
COUNT=$(echo "$DUPES" | grep -v "^$" | wc -l | tr -d ' ')
echo "=== $COMPANY: $COUNT dupes between top and legacy-audit root ==="
if [ "$COUNT" -gt 0 ] && [ "$COUNT" -lt 30 ]; then
  echo "$DUPES" | grep -v "^$"
fi
