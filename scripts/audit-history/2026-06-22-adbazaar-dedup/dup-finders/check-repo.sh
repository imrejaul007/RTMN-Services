#!/bin/bash
COMPANY=$1
DIR="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"

cd "$DIR"
if [ -d ".git" ]; then
  REMOTE=$(git remote get-url origin 2>/dev/null)
  echo "$COMPANY: SEPARATE_REPO|$REMOTE"
else
  echo "$COMPANY: MONOREPO"
fi
