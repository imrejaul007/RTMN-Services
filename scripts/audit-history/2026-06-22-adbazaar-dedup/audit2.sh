#!/bin/bash
dir="$1"
name="$2"

if [ ! -d "$dir" ]; then
  echo "$name | MISSING"
  exit
fi

cd "$dir" 2>/dev/null

PKG="N"; [ -f "package.json" ] && PKG="Y"
ENTRY="N"; [ -f "src/index.ts" ] || [ -f "src/index.js" ] || [ -f "index.js" ] || [ -f "index.ts" ] || [ -f "server.js" ] || [ -f "server.ts" ] || [ -f "app.js" ] || [ -f "app.ts" ] && ENTRY="Y"

# LOC in src/
LOC=0
if [ -d "src" ]; then
  LOC=$(find src -type f \( -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" \) 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
  LOC=${LOC:-0}
fi

# routes/
ROUTES=0
for rd in routes src/routes api src/api; do
  if [ -d "$rd" ]; then
    N=$(find "$rd" -type f 2>/dev/null | wc -l | tr -d ' ')
    ROUTES=$((ROUTES+N))
  fi
done

# models/
MODELS=0
for md in models src/models prisma schema src/schema; do
  if [ -d "$md" ]; then
    N=$(find "$md" -type f 2>/dev/null | wc -l | tr -d ' ')
    MODELS=$((MODELS+N))
  fi
done

# business layer
BL="N"
for sd in services src/services business src/business lib src/lib core src/core; do
  if [ -d "$sd" ]; then
    BL="Y"
    break
  fi
done

# tests
TESTS=$(find . -type f \( -name "*.test.ts" -o -name "*.test.js" -o -name "*.spec.ts" -o -name "*.spec.js" -o -name "*.test.tsx" -o -name "*.spec.tsx" \) -not -path "*/node_modules/*" -not -path "*/dist/*" 2>/dev/null | wc -l | tr -d ' ')

printf "%-45s | pkg=%s | entry=%s | LOC=%-6s | routes=%-3s | models=%-3s | biz=%s | tests=%-3s\n" "$name" "$PKG" "$ENTRY" "$LOC" "$ROUTES" "$MODELS" "$BL" "$TESTS"
