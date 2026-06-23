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
REAL_DIFF=0
REAL_DIFF_LIST=()

for d in $DUPES; do
  TOTAL=$((TOTAL+1))
  TOP_PATH=$(grep "/$d$" /tmp/top-dirs.txt | head -1)
  LEGACY_PATH="$LEGACY/$d"
  
  if [ -d "$TOP_PATH" ] && [ -d "$LEGACY_PATH" ]; then
    # Get list of files that exist in both, excluding node_modules and .DS_Store and .git
    cd "$TOP_PATH" 2>/dev/null
    TOP_FILES=$(find . -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -name ".DS_Store" 2>/dev/null | sort)
    cd "$LEGACY_PATH" 2>/dev/null
    LEGACY_FILES=$(find . -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -name ".DS_Store" 2>/dev/null | sort)
    
    # Check if file content is identical (using md5)
    DIFF_FILES=0
    COMMON=$(comm -12 <(echo "$TOP_FILES") <(echo "$LEGACY_FILES"))
    for f in $COMMON; do
      T_MD5=$(md5 -q "$TOP_PATH/${f#./}" 2>/dev/null)
      L_MD5=$(md5 -q "$LEGACY_PATH/${f#./}" 2>/dev/null)
      if [ "$T_MD5" != "$L_MD5" ] && [ -n "$T_MD5" ] && [ -n "$L_MD5" ]; then
        DIFF_FILES=$((DIFF_FILES+1))
      fi
    done
    
    # Files only in top
    ONLY_TOP=$(comm -23 <(echo "$TOP_FILES") <(echo "$LEGACY_FILES"))
    ONLY_LEGACY=$(comm -13 <(echo "$TOP_FILES") <(echo "$LEGACY_FILES"))
    
    ONLY_TOP_COUNT=$(echo "$ONLY_TOP" | grep -v "^$" | wc -l | tr -d ' ')
    ONLY_LEGACY_COUNT=$(echo "$ONLY_LEGACY" | grep -v "^$" | wc -l | tr -d ' ')
    
    if [ "$DIFF_FILES" -eq 0 ] && [ "$ONLY_TOP_COUNT" -eq 0 ] && [ "$ONLY_LEGACY_COUNT" -eq 0 ]; then
      IDENTICAL=$((IDENTICAL+1))
    else
      REAL_DIFF=$((REAL_DIFF+1))
      REAL_DIFF_LIST+=("$d: diff=$DIFF_FILES top_only=$ONLY_TOP_COUNT legacy_only=$ONLY_LEGACY_COUNT")
    fi
  fi
done

echo "=== $COMPANY ==="
echo "  Total same-name services: $TOTAL"
echo "  TRULY IDENTICAL source code: $IDENTICAL"
echo "  Real content differences: $REAL_DIFF"
if [ $REAL_DIFF -gt 0 ] && [ $REAL_DIFF -lt 50 ]; then
  for s in "${REAL_DIFF_LIST[@]}"; do
    echo "    $s"
  done
fi
