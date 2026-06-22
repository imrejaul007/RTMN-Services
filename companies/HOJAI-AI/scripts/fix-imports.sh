#!/bin/bash
# HOJAI AI — Fix import paths after reorganization
# Old: services/<svc>/src/index.js → ../../../shared/lib/...
# New: products/<prod>/<svc>/src/index.js OR platform/<sys>/<svc>/src/index.js OR sutar-os/<sub>/<svc>/src/index.js

set -e
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI

# Find all JS files with old import patterns and fix them
# Old pattern: '../../../shared/lib/
# Need: count levels up from file to repo root, then 'shared/lib/'

# For files at depth 4 (products/<p>/<svc>/src/index.js OR platform/<s>/<svc>/src/index.js):
#   Need 4 levels up: ../../../../shared/
# For files at depth 5 (nested deeper):
#   Need 5 levels up

# We'll use sed to replace based on actual file paths.

echo "Fixing import paths..."
echo ""

# Process each location
for location_root in products platform sutar-os; do
  if [ ! -d "$location_root" ]; then continue; fi
  # Find all .js files at depth src/index.js (4 levels from root)
  find "$location_root" -path "*/src/*.js" -type f 2>/dev/null | while read -r f; do
    # Count depth from src/ to repo root
    # src/index.js is 4 levels: src → service → sub → location → repo
    # So 4 levels up
    depth=4
    new_prefix=""
    for ((i=0; i<depth; i++)); do
      new_prefix="../$new_prefix"
    done
    new_prefix="${new_prefix}shared/"

    # Count occurrences before
    count_before=$(grep -c "'\.\./.*shared/lib" "$f" 2>/dev/null || echo 0)

    # Replace '../../../shared/' with the calculated prefix (handles ' and ")
    # Common patterns: '../../../shared/lib/', '../../shared/lib/', '../shared/lib/'
    # We'll normalize all to 4 levels up
    sed -i.bak "s|'\.\./\.\./\.\./\.\./shared/|'${new_prefix}|g" "$f"
    sed -i.bak "s|\"\.\./\.\./\.\./\.\./shared/|\"${new_prefix}|g" "$f"
    sed -i.bak "s|'\.\./\.\./\.\./shared/|'${new_prefix}|g" "$f"
    sed -i.bak "s|\"\.\./\.\./\.\./shared/|\"${new_prefix}|g" "$f"

    # Count occurrences after
    count_after=$(grep -c "'\.\./.*shared/lib" "$f" 2>/dev/null || echo 0)

    if [ "$count_before" != "$count_after" ]; then
      echo "  Fixed $count_before → $count_after paths in $f"
    fi

    # Remove backup file
    rm -f "$f.bak"
  done
done

echo ""
echo "Done!"
