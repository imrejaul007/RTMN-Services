#!/bin/bash
COMPANY=$1
TOP="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"
LEGACY="$TOP/legacy-audit"

# Compare all root files
TOP_FILES=$(find "$TOP" -mindepth 1 -maxdepth 1 -type f -not -name ".DS_Store" 2>/dev/null | xargs -I{} basename {} | sort -u)
LEGACY_FILES=$(find "$LEGACY" -mindepth 1 -maxdepth 1 -type f -not -name "MIGRATION-README.md" -not -name ".DS_Store" 2>/dev/null | xargs -I{} basename {} | sort -u)

DUPES=$(comm -12 <(echo "$TOP_FILES") <(echo "$LEGACY_FILES"))
DUPES_COUNT=$(echo "$DUPES" | grep -v "^$" | wc -l | tr -d ' ')

IDENTICAL=0
DIFFERENT=0
TOTAL_BYTES=0
for d in $DUPES; do
  if [ -f "$TOP/$d" ] && [ -f "$LEGACY/$d" ]; then
    if diff -q "$TOP/$d" "$LEGACY/$d" >/dev/null 2>&1; then
      IDENTICAL=$((IDENTICAL+1))
      SIZE=$(stat -f%z "$LEGACY/$d" 2>/dev/null || echo 0)
      TOTAL_BYTES=$((TOTAL_BYTES+SIZE))
    else
      DIFFERENT=$((DIFFERENT+1))
    fi
  fi
done

echo "$COMPANY: root_dupes=$DUPES_COUNT identical=$IDENTICAL different=$DIFFERENT"
