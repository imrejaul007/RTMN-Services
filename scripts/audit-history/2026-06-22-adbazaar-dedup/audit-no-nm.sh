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
ONLY_NM_DIFF=0
REAL_DIFFERENT=0
SAME_NAME_DIFF=()

for d in $DUPES; do
  TOTAL=$((TOTAL+1))
  TOP_PATH=$(grep "/$d$" /tmp/top-dirs.txt | head -1)
  LEGACY_PATH="$LEGACY/$d"
  
  if [ -d "$TOP_PATH" ] && [ -d "$LEGACY_PATH" ]; then
    # Check without node_modules
    DIFF_OUT=$(diff -rq "$TOP_PATH" "$LEGACY_PATH" 2>/dev/null)
    if [ -z "$DIFF_OUT" ]; then
      IDENTICAL=$((IDENTICAL+1))
    else
      # Check if only node_modules differs
      REAL_DIFF=$(diff -rq "$TOP_PATH" "$LEGACY_PATH" 2>/dev/null | grep -v "node_modules\|.git/" | head -5)
      if [ -z "$REAL_DIFF" ]; then
        ONLY_NM_DIFF=$((ONLY_NM_DIFF+1))
      else
        REAL_DIFFERENT=$((REAL_DIFFERENT+1))
        SAME_NAME_DIFF+=("$d")
      fi
    fi
  fi
done

echo "=== $COMPANY (excluding node_modules) ==="
echo "  Total same-name services: $TOTAL"
echo "  Identical (exact): $IDENTICAL"
echo "  Only node_modules differs: $ONLY_NM_DIFF"
echo "  Real content differences: $REAL_DIFFERENT"
if [ $REAL_DIFFERENT -gt 0 ] && [ $REAL_DIFFERENT -lt 50 ]; then
  echo "  --- Services with real differences: ---"
  for s in "${SAME_NAME_DIFF[@]}"; do
    echo "    $s"
  done
fi
