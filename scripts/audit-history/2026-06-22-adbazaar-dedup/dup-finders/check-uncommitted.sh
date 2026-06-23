#!/bin/bash
COMPANY=$1
DIR="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"

cd "$DIR"
echo "=== $COMPANY ==="
git status --short 2>/dev/null | grep -E "(\?\?|^ M|^A)" | head -20
echo ""
