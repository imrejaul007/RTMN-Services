#!/bin/bash
COMPANY=$1
DIR="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"

if [ ! -d "$DIR/.git" ]; then
  echo "$COMPANY: NOT a git repo"
  return
fi

cd "$DIR"
BRANCH=$(git branch --show-current 2>/dev/null)
REMOTE=$(git remote get-url origin 2>/dev/null)
LAST_COMMIT=$(git log -1 --format="%h %s" 2>/dev/null)
UNTRACKED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

echo "$COMPANY | branch: $BRANCH | remote: $REMOTE | last: $LAST_COMMIT | uncommitted: $UNTRACKED"
