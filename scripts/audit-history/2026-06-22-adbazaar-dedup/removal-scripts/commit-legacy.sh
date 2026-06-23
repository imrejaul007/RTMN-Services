#!/bin/bash
COMPANY=$1
REMOVED_SERVICES=$2
REMOVED_ROOT=$3
DIR="/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY"

cd "$DIR"

# Check if there are changes to commit
STAGED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "$STAGED" -eq 0 ]; then
  echo "$COMPANY: nothing to commit"
  exit 0
fi

# Stage everything in legacy-audit
git add legacy-audit/ 2>/dev/null

# Check if there's anything to commit
if git diff --cached --quiet 2>/dev/null; then
  echo "$COMPANY: nothing staged"
  exit 0
fi

git commit -m "chore: archive pre-consolidation legacy content

- Add legacy-audit/ with MIGRATION-README.md (older audit docs/configs)
- Add legacy-audit/legacy-services/ with older service snapshots
- Removed $REMOVED_SERVICES truly-identical duplicate services (byte-identical to top-level)
- Removed $REMOVED_ROOT identical root files (CLAUDE.md, README.md, package.json, etc.)
- All unique legacy content preserved for historical reference

See AUDIT-FINAL-2026-06-22.md for full audit details." 2>&1 | tail -3
echo "$COMPANY: committed"
