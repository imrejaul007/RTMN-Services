#!/bin/bash
COMPANY=$1
TOP="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"
LEGACY="$TOP/legacy-audit/legacy-services"

find "$TOP" -type d -not -path "*/legacy-audit*" -not -path "*/.git*" -not -path "*/node_modules*" -not -name "node_modules" -not -name ".git" 2>/dev/null | sort -u > /tmp/top-dirs.txt
TOP_DIRS=$(cat /tmp/top-dirs.txt | xargs -I{} basename {} | sort -u)
LEGACY_DIRS=$(find "$LEGACY" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | xargs -I{} basename {} | sort -u)
DUPES=$(comm -12 <(echo "$TOP_DIRS") <(echo "$LEGACY_DIRS"))

TOTAL=0
IDENTICAL=0
ONLY_TOP_NEW=0
ONLY_LEGACY_UNIQUE=0

for d in $DUPES; do
  TOTAL=$((TOTAL+1))
  TOP_PATH=$(grep "/$d$" /tmp/top-dirs.txt | head -1)
  LEGACY_PATH="$LEGACY/$d"
  
  if [ -d "$TOP_PATH" ] && [ -d "$LEGACY_PATH" ]; then
    # Use diff -r for actual diff
    DIFF_FULL=$(diff -rq "$TOP_PATH" "$LEGACY_PATH" 2>/dev/null)
    if [ -z "$DIFF_FULL" ]; then
      IDENTICAL=$((IDENTICAL+1))
    else
      # Check what's different - exclude common noise (node_modules, .DS_Store, .git)
      REAL_DIFF=$(echo "$DIFF_FULL" | grep -v "node_modules\|.git/\|.DS_Store")
      ONLY_LEGACY=$(echo "$REAL_DIFF" | grep "Only in $LEGACY_PATH" | head -1)
      
      if [ -n "$ONLY_LEGACY" ]; then
        ONLY_LEGACY_UNIQUE=$((ONLY_LEGACY_UNIQUE+1))
      else
        ONLY_TOP_NEW=$((ONLY_TOP_NEW+1))
      fi
    fi
  fi
done

# Calculate reclaimable size
RECLAIMABLE=0
for d in $DUPES; do
  TOP_PATH=$(grep "/$d$" /tmp/top-dirs.txt | head -1)
  LEGACY_PATH="$LEGACY/$d"
  if [ -d "$TOP_PATH" ] && [ -d "$LEGACY_PATH" ]; then
    DIFF_FULL=$(diff -rq "$TOP_PATH" "$LEGACY_PATH" 2>/dev/null)
    if [ -z "$DIFF_FULL" ]; then
      SIZE=$(du -sk "$LEGACY_PATH" 2>/dev/null | awk '{print $1}')
      RECLAIMABLE=$((RECLAIMABLE+SIZE))
    fi
  fi
done
RECLAIM_MB=$((RECLAIMABLE / 1024))

echo "$COMPANY: total=$TOTAL identical=$IDENTICAL (${RECLAIM_MB}MB reclaimable) top_has_new=$ONLY_TOP_NEW legacy_has_unique=$ONLY_LEGACY_UNIQUE"
