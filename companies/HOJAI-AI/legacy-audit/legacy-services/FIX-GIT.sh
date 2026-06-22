#!/bin/bash
# Fix Git Large Files Issue
# Run this once to clean up git history

echo "🧹 Cleaning git history..."

cd "$(dirname "$0")"

# Remove large files from git history
git filter-branch --force --index-filter \
  'git rm -rf --cached --ignore-unmatch "*/node_modules/@next/swc-darwin-arm64/*" "*/node_modules/@next/swc-linux-x64-gnu/*" "*/node_modules/@next/swc-win32-arm64-msvc/*"' \
  --prune-empty --tag-name-filter cat -- --all 2>/dev/null || true

# Clean up
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "✅ Git cleaned! Now push with force:"
echo "   git push origin main --force"
