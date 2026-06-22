#!/bin/bash
REZ-ADMIN/14 FIX: Detect `as any` casts in TypeScript/TSX files.
# This script scans the admin app source for unsafe type casts.
# Fails the build if any `as any` casts are found.

set -e

SOURCE_DIR="${1:-app}"
COUNT=$(grep -r --include='*.ts' --include='*.tsx' 'as any' "$SOURCE_DIR" 2>/dev/null | grep -v 'node_modules' | grep -v 'declare ' | wc -l | tr -d ' ')

if [ "$COUNT" -gt 0 ]; then
  echo "FAIL: Found $COUNT 'as any' cast(s) in $SOURCE_DIR"
  grep -r --include='*.ts' --include='*.tsx' 'as any' "$SOURCE_DIR" 2>/dev/null | grep -v 'node_modules' | grep -v 'declare ' | head -20
  echo ""
  echo "Run 'grep -r \"as any\" $SOURCE_DIR --include=\"*.ts\" --include=\"*.tsx\"' for full list"
  echo "To fix: Replace 'as any' with proper typed interfaces or 'as unknown as T'"
  exit 1
fi

echo "PASS: No 'as any' casts found in $SOURCE_DIR"
exit 0
