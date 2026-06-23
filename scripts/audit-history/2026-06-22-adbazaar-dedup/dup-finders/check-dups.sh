#!/bin/bash
COMPANY=$1
TOP="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"
LEGACY="$TOP/legacy-audit"

# Get items in both
TOP_ITEMS=$(find "$TOP" -mindepth 1 -maxdepth 1 \( -type d -o -type f \) -not -path "*/legacy-audit" -not -name ".git" -not -name "node_modules" -not -name ".DS_Store" 2>/dev/null | xargs -I{} basename {} 2>/dev/null | sort -u)
LEGACY_ITEMS=$(find "$LEGACY" -mindepth 1 -maxdepth 1 \( -type d -o -type f \) -not -name "MIGRATION-README.md" -not -name "legacy-services" -not -name ".DS_Store" 2>/dev/null | xargs -I{} basename {} 2>/dev/null | sort -u)
DUPES=$(comm -12 <(echo "$TOP_ITEMS") <(echo "$LEGACY_ITEMS"))

SAME=0
DIFF=0
SAME_LIST=""
DIFF_LIST=""
for item in $DUPES; do
  if [ -f "$TOP/$item" ] && [ -f "$LEGACY/$item" ]; then
    if diff -q "$TOP/$item" "$LEGACY/$item" >/dev/null 2>&1; then
      SAME=$((SAME+1))
      SAME_LIST="$SAME_LIST $item"
    else
      DIFF=$((DIFF+1))
      DIFF_LIST="$DIFF_LIST $item"
    fi
  fi
done
echo "=== $COMPANY ==="
echo "  Identical files: $SAME"
echo "  Different files: $DIFF"
if [ -n "$DIFF_LIST" ]; then
  echo "  Different:$DIFF_LIST"
fi
