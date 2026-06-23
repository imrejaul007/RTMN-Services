#!/bin/bash
COMPANY=$1
TOP="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"
LEGACY="$TOP/legacy-audit"

TOP_FILES=$(find "$TOP" -mindepth 1 -maxdepth 1 -type f -not -name ".DS_Store" 2>/dev/null | xargs -I{} basename {} | sort -u)
LEGACY_FILES=$(find "$LEGACY" -mindepth 1 -maxdepth 1 -type f -not -name "MIGRATION-README.md" -not -name ".DS_Store" 2>/dev/null | xargs -I{} basename {} | sort -u)
DUPES=$(comm -12 <(echo "$TOP_FILES") <(echo "$LEGACY_FILES"))

REMOVED=0
for d in $DUPES; do
  if [ -f "$TOP/$d" ] && [ -f "$LEGACY/$d" ]; then
    if diff -q "$TOP/$d" "$LEGACY/$d" >/dev/null 2>&1; then
      rm "$LEGACY/$d"
      REMOVED=$((REMOVED+1))
    fi
  fi
done
echo "$COMPANY: removed $REMOVED identical root files"
