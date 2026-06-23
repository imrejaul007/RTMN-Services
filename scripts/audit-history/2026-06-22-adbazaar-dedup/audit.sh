#!/bin/bash
# Audit a single service directory
audit_service() {
  local dir="$1"
  local name="$2"
  
  if [ ! -d "$dir" ]; then
    echo "$name | MISSING"
    return
  fi
  
  cd "$dir" 2>/dev/null || return
  
  # package.json
  if [ -f "package.json" ]; then
    PKG="Y"
  else
    PKG="N"
  fi
  
  # src/index.{ts,js}
  if [ -f "src/index.ts" ] || [ -f "src/index.js" ]; then
    ENTRY="Y"
  else
    ENTRY="N"
  fi
  
  # LOC in src/ (excluding node_modules, dist, .git)
  if [ -d "src" ]; then
    LOC=$(find src -type f \( -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" \) 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
    LOC=${LOC:-0}
  else
    LOC=0
  fi
  
  # routes/
  if [ -d "routes" ] || [ -d "src/routes" ]; then
    if [ -d "src/routes" ]; then
      ROUTES=$(find src/routes -type f 2>/dev/null | wc -l | tr -d ' ')
    else
      ROUTES=$(find routes -type f 2>/dev/null | wc -l | tr -d ' ')
    fi
  else
    ROUTES=0
  fi
  
  # models/
  if [ -d "models" ] || [ -d "src/models" ] || [ -d "prisma" ]; then
    if [ -d "src/models" ]; then
      MODELS=$(find src/models -type f 2>/dev/null | wc -l | tr -d ' ')
    elif [ -d "models" ]; then
      MODELS=$(find models -type f 2>/dev/null | wc -l | tr -d ' ')
    elif [ -d "prisma" ]; then
      MODELS=$(find prisma -type f 2>/dev/null | wc -l | tr -d ' ')
    else
      MODELS=0
    fi
  else
    MODELS=0
  fi
  
  # services/ or business logic
  if [ -d "services" ] || [ -d "src/services" ]; then
    BL="Y"
  else
    BL="N"
  fi
  
  # tests
  TESTS=$(find . -type f \( -name "*.test.ts" -o -name "*.test.js" -o -name "*.spec.ts" -o -name "*.spec.js" \) -not -path "*/node_modules/*" -not -path "*/dist/*" 2>/dev/null | wc -l | tr -d ' ')
  
  printf "%-40s | pkg=%s | entry=%s | LOC=%-6s | routes=%-3s | models=%-3s | biz=%s | tests=%-3s\n" "$name" "$PKG" "$ENTRY" "$LOC" "$ROUTES" "$MODELS" "$BL" "$TESTS"
}

export -f audit_service
