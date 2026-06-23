#!/bin/bash
COMPANY=$1
TOP="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"
LEGACY="$TOP/legacy-audit/legacy-services"

if [ ! -d "$LEGACY" ]; then
  exit 0
fi

# Get all service dirs anywhere in top-level (excluding legacy-audit, .git, node_modules, src, etc.)
find "$TOP" -type d -not -path "*/legacy-audit*" -not -path "*/.git*" -not -path "*/node_modules*" -not -name "node_modules" -not -name ".git" 2>/dev/null | sort -u > /tmp/top-dirs.txt
TOP_DIRS=$(cat /tmp/top-dirs.txt | xargs -I{} basename {} | sort -u)

# Legacy service dirs
LEGACY_DIRS=$(find "$LEGACY" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | xargs -I{} basename {} | sort -u)

# Find names in both
DUPES=$(comm -12 <(echo "$TOP_DIRS") <(echo "$LEGACY_DIRS"))
COUNT=$(echo "$DUPES" | grep -v "^$" | wc -l | tr -d ' ')

# For each dupe, check if content is identical
TRULY_IDENTICAL=0
DIFFERENT=0
for d in $DUPES; do
  # Find actual paths
  TOP_PATH=$(grep "/$d$" /tmp/top-dirs.txt | head -1)
  LEGACY_PATH="$LEGACY/$d"
  if [ -d "$TOP_PATH" ] && [ -d "$LEGACY_PATH" ]; then
    if diff -rq "$TOP_PATH" "$LEGACY_PATH" 2>/dev/null | head -1 | grep -q "^Only"; then
      DIFFERENT=$((DIFFERENT+1))
    else
      TRULY_IDENTICAL=$((TRULY_IDENTICAL+1))
    fi
  fi
done

echo "=== $COMPANY ==="
echo "  Service names in both: $COUNT"
echo "  Truly identical: $TRULY_IDENTICAL"
echo "  Different content: $DIFFERENT"
