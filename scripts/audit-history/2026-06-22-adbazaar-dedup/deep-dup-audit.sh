#!/bin/bash
COMPANY=$1
TOP="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"
LEGACY="$TOP/legacy-audit/legacy-services"

if [ ! -d "$LEGACY" ]; then
  exit 0
fi

echo "=== $COMPANY: DEEP DUP AUDIT ==="

# Get all top-level service dirs with their paths
find "$TOP" -type d -not -path "*/legacy-audit*" -not -path "*/.git*" -not -path "*/node_modules*" -not -name "node_modules" -not -name ".git" 2>/dev/null | sort -u > /tmp/top-dirs.txt

# Same-name match
TOP_DIRS=$(cat /tmp/top-dirs.txt | xargs -I{} basename {} | sort -u)
LEGACY_DIRS=$(find "$LEGACY" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | xargs -I{} basename {} | sort -u)
DUPES=$(comm -12 <(echo "$TOP_DIRS") <(echo "$LEGACY_DIRS"))

# Categorize each dupe
TOTAL=0
IDENTICAL=0
DIFFERENT_TOP_NEWER=0  # top is newer than legacy (legacy is older copy)
DIFFERENT_LEGACY_NEWER=0 # legacy is newer/different
ONLY_DIRS_DIFF=0  # only some dirs differ

for d in $DUPES; do
  TOTAL=$((TOTAL+1))
  TOP_PATH=$(grep "/$d$" /tmp/top-dirs.txt | head -1)
  LEGACY_PATH="$LEGACY/$d"
  
  if [ -d "$TOP_PATH" ] && [ -d "$LEGACY_PATH" ]; then
    # Use file count + checksum approach
    TOP_COUNT=$(find "$TOP_PATH" -type f 2>/dev/null | wc -l | tr -d ' ')
    LEGACY_COUNT=$(find "$LEGACY_PATH" -type f 2>/dev/null | wc -l | tr -d ' ')
    
    if [ "$TOP_COUNT" -eq 0 ] && [ "$LEGACY_COUNT" -eq 0 ]; then
      continue
    fi
    
    # Check if identical
    DIFF_OUT=$(diff -rq "$TOP_PATH" "$LEGACY_PATH" 2>/dev/null)
    if [ -z "$DIFF_OUT" ]; then
      IDENTICAL=$((IDENTICAL+1))
    else
      # Check which is newer by checking specific files
      # Use md5sum on common files
      TOP_NEWER_COUNT=0
      LEGACY_NEWER_COUNT=0
      COMMON_FILES=$(comm -12 <(cd "$TOP_PATH" && find . -type f 2>/dev/null | sort) <(cd "$LEGACY_PATH" && find . -type f 2>/dev/null | sort) | head -50)
      for cf in $COMMON_FILES; do
        T_HASH=$(md5 -q "$TOP_PATH/${cf#./}" 2>/dev/null)
        L_HASH=$(md5 -q "$LEGACY_PATH/${cf#./}" 2>/dev/null)
        if [ -n "$T_HASH" ] && [ -n "$L_HASH" ]; then
          if [ "$T_HASH" = "$L_HASH" ]; then
            continue
          else
            # Check modification time
            T_MTIME=$(stat -f "%m" "$TOP_PATH/${cf#./}" 2>/dev/null)
            L_MTIME=$(stat -f "%m" "$LEGACY_PATH/${cf#./}" 2>/dev/null)
            if [ -n "$T_MTIME" ] && [ -n "$L_MTIME" ]; then
              if [ "$T_MTIME" -gt "$L_MTIME" ]; then
                TOP_NEWER_COUNT=$((TOP_NEWER_COUNT+1))
              else
                LEGACY_NEWER_COUNT=$((LEGACY_NEWER_COUNT+1))
              fi
            fi
          fi
        fi
      done
      if [ "$TOP_NEWER_COUNT" -gt "$LEGACY_NEWER_COUNT" ]; then
        DIFFERENT_TOP_NEWER=$((DIFFERENT_TOP_NEWER+1))
      else
        DIFFERENT_LEGACY_NEWER=$((DIFFERENT_LEGACY_NEWER+1))
      fi
    fi
  fi
done

echo "  Total same-name services: $TOTAL"
echo "  TRULY IDENTICAL: $IDENTICAL"
echo "  Different (top newer): $DIFFERENT_TOP_NEWER"
echo "  Different (legacy newer): $DIFFERENT_LEGACY_NEWER"
