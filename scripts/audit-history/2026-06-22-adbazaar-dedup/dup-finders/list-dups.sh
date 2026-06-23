#!/bin/bash
COMPANY=$1
TOP="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"
LEGACY="$TOP/legacy-audit/legacy-services"

find "$TOP" -type d -not -path "*/legacy-audit*" -not -path "*/.git*" -not -path "*/node_modules*" -not -name "node_modules" -not -name ".git" 2>/dev/null | sort -u > /tmp/top-dirs.txt
TOP_DIRS=$(cat /tmp/top-dirs.txt | xargs -I{} basename {} | sort -u)
LEGACY_DIRS=$(find "$LEGACY" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | xargs -I{} basename {} | sort -u)
DUPES=$(comm -12 <(echo "$TOP_DIRS") <(echo "$LEGACY_DIRS"))

# Show first 20 dups with sizes
for d in $DUPES; do
  TOP_PATH=$(grep "/$d$" /tmp/top-dirs.txt | head -1)
  LEGACY_PATH="$LEGACY/$d"
  if [ -d "$TOP_PATH" ] && [ -d "$LEGACY_PATH" ]; then
    TOP_SIZE=$(du -sh "$TOP_PATH" 2>/dev/null | awk '{print $1}')
    LEGACY_SIZE=$(du -sh "$LEGACY_PATH" 2>/dev/null | awk '{print $1}')
    # Check identical
    if diff -rq "$TOP_PATH" "$LEGACY_PATH" 2>/dev/null | wc -l | grep -q "^0$"; then
      STATUS="IDENTICAL"
    else
      STATUS="DIFFERENT"
    fi
    echo "$STATUS  top=$TOP_SIZE  legacy=$LEGACY_SIZE  $d"
  fi
done | head -20
