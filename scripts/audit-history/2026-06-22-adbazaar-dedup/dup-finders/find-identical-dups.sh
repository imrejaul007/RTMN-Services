#!/bin/bash
COMPANY=$1
TOP="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"
LEGACY="$TOP/legacy-audit/legacy-services"

if [ ! -d "$LEGACY" ]; then
  exit 0
fi

# Find all top-level dirs
find "$TOP" -type d -not -path "*/legacy-audit*" -not -path "*/.git*" -not -path "*/node_modules*" -not -name "node_modules" -not -name ".git" 2>/dev/null | sort -u > /tmp/top-dirs.txt
TOP_DIRS=$(cat /tmp/top-dirs.txt | xargs -I{} basename {} | sort -u)
LEGACY_DIRS=$(find "$LEGACY" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | xargs -I{} basename {} | sort -u)
DUPES=$(comm -12 <(echo "$TOP_DIRS") <(echo "$LEGACY_DIRS"))

# For each dupe, check if content is truly identical
echo "=== $COMPANY: TRULY IDENTICAL services (safe to remove) ==="
for d in $DUPES; do
  TOP_PATH=$(grep "/$d$" /tmp/top-dirs.txt | head -1)
  LEGACY_PATH="$LEGACY/$d"
  if [ -d "$TOP_PATH" ] && [ -d "$LEGACY_PATH" ]; then
    # Check if identical
    if diff -rq "$TOP_PATH" "$LEGACY_PATH" 2>/dev/null | wc -l | grep -q "^0$"; then
      echo "$d"
    fi
  fi
done | head -50
