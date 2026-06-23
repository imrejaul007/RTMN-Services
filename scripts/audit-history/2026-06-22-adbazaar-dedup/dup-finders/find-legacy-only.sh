#!/bin/bash
COMPANY=$1
TOP="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"
LEGACY="$TOP/legacy-audit/legacy-services"

find "$TOP" -type d -not -path "*/legacy-audit*" -not -path "*/.git*" -not -path "*/node_modules*" -not -name "node_modules" -not -name ".git" 2>/dev/null | sort -u > /tmp/top-dirs.txt
TOP_DIRS=$(cat /tmp/top-dirs.txt | xargs -I{} basename {} | sort -u)
LEGACY_DIRS=$(find "$LEGACY" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | xargs -I{} basename {} | sort -u)
DUPES=$(comm -12 <(echo "$TOP_DIRS") <(echo "$LEGACY_DIRS"))

echo "=== $COMPANY: Services where LEGACY has files NOT in top-level ==="
for d in $DUPES; do
  TOP_PATH=$(grep "/$d$" /tmp/top-dirs.txt | head -1)
  LEGACY_PATH="$LEGACY/$d"
  
  if [ -d "$TOP_PATH" ] && [ -d "$LEGACY_PATH" ]; then
    cd "$TOP_PATH" 2>/dev/null
    TOP_FILES=$(find . -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -name ".DS_Store" 2>/dev/null | sort)
    cd "$LEGACY_PATH" 2>/dev/null
    LEGACY_FILES=$(find . -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -name ".DS_Store" 2>/dev/null | sort)
    
    ONLY_LEGACY=$(comm -13 <(echo "$TOP_FILES") <(echo "$LEGACY_FILES") | grep -v "^$")
    if [ -n "$ONLY_LEGACY" ]; then
      echo ""
      echo "--- $d ($(echo "$ONLY_LEGACY" | wc -l | tr -d ' ') unique files) ---"
      echo "$ONLY_LEGACY" | head -10
    fi
  fi
done
