#!/bin/bash
COMPANY=$1
TOP="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"
LEGACY="$TOP/legacy-audit"

if [ ! -d "$LEGACY" ]; then
  echo "$COMPANY: no legacy-audit"
  exit 0
fi

# Get all top-level dir names (excluding legacy-audit and hidden)
TOP_DIRS=$(find "$TOP" -mindepth 1 -maxdepth 1 -type d -not -path "*/legacy-audit*" -not -path "*/.git*" -not -path "*/node_modules*" 2>/dev/null | xargs -I{} basename {} 2>/dev/null | sort)

# Get all dir names inside legacy-audit
LEGACY_DIRS=$(find "$LEGACY" -mindepth 1 -maxdepth 1 \( -type d -o -type f \) -not -name "MIGRATION-README.md" -not -path "*/legacy-services*" -not -name ".DS_Store" 2>/dev/null | xargs -I{} basename {} 2>/dev/null | sort)

# Find duplicates
DUPES=$(comm -12 <(echo "$TOP_DIRS") <(echo "$LEGACY_DIRS"))
COUNT=$(echo "$DUPES" | grep -v "^$" | wc -l | tr -d ' ')
echo "$COMPANY: $COUNT top-level dupes"
if [ "$COUNT" -gt 0 ] && [ "$COUNT" -lt 50 ]; then
  echo "$DUPES" | grep -v "^$" | head -20
fi
