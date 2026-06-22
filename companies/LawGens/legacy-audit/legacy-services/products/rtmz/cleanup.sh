#!/bin/bash
# Remove all nested .git directories
cd "$(dirname "$0")"
find apps/services apps/mcp infra docs -name ".git" -type d -exec rm -rf {} +
echo "Nested git repos removed"