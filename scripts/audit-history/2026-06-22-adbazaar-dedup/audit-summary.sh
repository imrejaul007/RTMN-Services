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
TOP_HAS_UNIQUE=0
LEGACY_HAS_UNIQUE=0

for d in $DUPES; do
  TOTAL=$((TOTAL+1))
  TOP_PATH=$(grep "/$d$" /tmp/top-dirs.txt | head -1)
  LEGACY_PATH="$LEGACY/$d"
  
  if [ -d "$TOP_PATH" ] && [ -d "$LEGACY_PATH" ]; then
    cd "$TOP_PATH" 2>/dev/null
    TOP_FILES=$(find . -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -name ".DS_Store" 2>/dev/null | sort)
    cd "$LEGACY_PATH" 2>/dev/null
    LEGACY_FILES=$(find . -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -name ".DS_Store" 2>/dev/null | sort)
    
    DIFF_FILES=0
    COMMON=$(comm -12 <(echo "$TOP_FILES") <(echo "$LEGACY_FILES"))
    for f in $COMMON; do
      T_MD5=$(md5 -q "$TOP_PATH/${f#./}" 2>/dev/null)
      L_MD5=$(md5 -q "$LEGACY_PATH/${f#./}" 2>/dev/null)
      if [ "$T_MD5" != "$L_MD5" ] && [ -n "$T_MD5" ] && [ -n "$L_MD5" ]; then
        DIFF_FILES=$((DIFF_FILES+1))
      fi
    done
    
    ONLY_TOP_COUNT=$(comm -23 <(echo "$TOP_FILES") <(echo "$LEGACY_FILES") | grep -v "^$" | wc -l | tr -d ' ')
    ONLY_LEGACY_COUNT=$(comm -13 <(echo "$TOP_FILES") <(echo "$LEGACY_FILES") | grep -v "^$" | wc -l | tr -d ' ')
    
    if [ "$DIFF_FILES" -eq 0 ] && [ "$ONLY_TOP_COUNT" -eq 0 ] && [ "$ONLY_LEGACY_COUNT" -eq 0 ]; then
      IDENTICAL=$((IDENTICAL+1))
    elif [ "$ONLY_LEGACY_COUNT" -gt 0 ]; then
      LEGACY_HAS_UNIQUE=$((LEGACY_HAS_UNIQUE+1))
    else
      TOP_HAS_UNIQUE=$((TOP_HAS_UNIQUE+1))
    fi
  fi
done

echo "$COMPANY: total=$TOTAL identical=$IDENTICAL top_has_new=$TOP_HAS_UNIQUE legacy_has_unique=$LEGACY_HAS_UNIQUE"
