#!/bin/bash
COMPANY=$1
TOP="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"
LEGACY="$TOP/legacy-audit/legacy-services"

find "$TOP" -type d -not -path "*/legacy-audit*" -not -path "*/.git*" -not -path "*/node_modules*" -not -name "node_modules" -not -name ".git" 2>/dev/null | sort -u > /tmp/top-dirs.txt
TOP_DIRS=$(cat /tmp/top-dirs.txt | xargs -I{} basename {} | sort -u)
LEGACY_DIRS=$(find "$LEGACY" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | xargs -I{} basename {} | sort -u)
DUPES=$(comm -12 <(echo "$TOP_DIRS") <(echo "$LEGACY_DIRS"))

REMOVED=0
SKIPPED=0
for d in $DUPES; do
  TOP_PATH=$(grep "/$d$" /tmp/top-dirs.txt | head -1)
  LEGACY_PATH="$LEGACY/$d"
  
  if [ -d "$TOP_PATH" ] && [ -d "$LEGACY_PATH" ]; then
    # Check if identical (excluding symlink errors)
    DIFF_OUT=$(diff -rq "$TOP_PATH" "$LEGACY_PATH" 2>&1 | grep -v "No such file or directory" | grep -v "Too many levels of symbolic links")
    if [ -z "$DIFF_OUT" ]; then
      rm -rf "$LEGACY_PATH"
      REMOVED=$((REMOVED+1))
    else
      SKIPPED=$((SKIPPED+1))
    fi
  fi
done

echo "$COMPANY: removed $REMOVED, skipped $SKIPPED (different content)"
