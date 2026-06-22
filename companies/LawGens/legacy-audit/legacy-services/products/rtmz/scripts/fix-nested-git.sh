#!/bin/bash
# Fix nested git repos - convert submodules to regular directories

echo "Removing nested .git directories..."
cd "$(dirname "$0")/.."

for gitdir in $(find apps/mcp apps/services apps/monitoring -name ".git" -type d 2>/dev/null); do
    echo "Removing: $gitdir"
    rm -rf "$gitdir"
done

echo "Done. Commit and push the changes."