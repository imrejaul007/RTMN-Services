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
NM_DIFF=0
REAL_CONTENT_DIFF=0
REAL_DIFF_LIST=()

for d in $DUPES; do
  TOTAL=$((TOTAL+1))
  TOP_PATH=$(grep "/$d$" /tmp/top-dirs.txt | head -1)
  LEGACY_PATH="$LEGACY/$d"
  
  if [ -d "$TOP_PATH" ] && [ -d "$LEGACY_PATH" ]; then
    # Get diff excluding node_modules AND .git
    DIFF_OUT=$(diff -rq "$TOP_PATH" "$LEGACY_PATH" 2>/dev/null | grep -v "node_modules\|.git/")
    if [ -z "$DIFF_OUT" ]; then
      IDENTICAL=$((IDENTICAL+1))
    else
      # Check if only node_modules differs
      DIFF_NM_ONLY=$(diff -rq "$TOP_PATH" "$LEGACY_PATH" 2>/dev/null | grep -v "node_modules\|.git/" | wc -l | tr -d ' ')
      DIFF_NM=$(diff -rq "$TOP_PATH" "$LEGACY_PATH" 2>/dev/null | wc -l | tr -d ' ')
      if [ "$DIFF_NM_ONLY" -eq 0 ]; then
        NM_DIFF=$((NM_DIFF+1))
      else
        REAL_CONTENT_DIFF=$((REAL_CONTENT_DIFF+1))
        REAL_DIFF_LIST+=("$d")
      fi
    fi
  fi
done

echo "=== $COMPANY ==="
echo "  Total same-name services: $TOTAL"
echo "  IDENTICAL (incl. node_modules): $IDENTICAL"
echo "  Only node_modules/.git differs: $NM_DIFF"
echo "  Real content differences (excluding nm/git): $REAL_CONTENT_DIFF"
if [ $REAL_CONTENT_DIFF -gt 0 ] && [ $REAL_CONTENT_DIFF -lt 100 ]; then
  echo "  --- Services with real content differences: ---"
  for s in "${REAL_DIFF_LIST[@]}"; do
    echo "    $s"
  done | head -50
fi
