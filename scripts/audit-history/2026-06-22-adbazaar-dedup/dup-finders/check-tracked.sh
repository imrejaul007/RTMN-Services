#!/bin/bash
COMPANY=$1
DIR="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"

cd "$DIR"
echo "=== $COMPANY ==="
# Check if legacy-audit is tracked at all
TRACKED=$(git ls-files legacy-audit/ 2>/dev/null | wc -l | tr -d ' ')
UNTRACKED=$(git status --porcelain legacy-audit/ 2>/dev/null | grep "^??" | wc -l | tr -d ' ')
TOTAL_FILES=$(find legacy-audit/ -type f 2>/dev/null | wc -l | tr -d ' ')
echo "  Total files in legacy-audit: $TOTAL_FILES"
echo "  Tracked in git: $TRACKED"
echo "  Untracked (??): $UNTRACKED"
