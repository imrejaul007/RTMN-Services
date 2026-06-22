#!/bin/bash

# Security Fix Script for HOJAI AI Ecosystem
# Fixes: hardcoded secrets, CORS wildcard, express.json limits

BASE_DIR="/Users/rejaulkarim/Documents/RTMN/companies/hojai-ai"
cd "$BASE_DIR"

echo "=== HOJAI AI Security Fix Script ==="
echo ""

# Counter for changes
secret_fixes=0
cors_fixes=0
json_limit_fixes=0

# ============================================
# 1. FIX HARDCODED SECRETS
# ============================================
echo "1. Fixing hardcoded secrets..."

# Fix 'your-secret-key' patterns
while IFS= read -r file; do
    if grep -q "|| 'your-secret-key'" "$file"; then
        sed -i '' "s/|| 'your-secret-key'/|| throw new Error('JWT_SECRET environment variable is required')/g" "$file"
        echo "  Fixed: $file"
        ((secret_fixes++))
    fi
done < <(grep -rl "|| 'your-secret-key'" . --include="*.ts" 2>/dev/null)

# Fix 'hojai-dev-token' patterns
while IFS= read -r file; do
    if grep -q "|| 'hojai-dev-token'" "$file"; then
        sed -i '' "s/|| 'hojai-dev-token'/|| throw new Error('API_TOKEN environment variable is required')/g" "$file"
        echo "  Fixed: $file"
        ((secret_fixes++))
    fi
done < <(grep -rl "|| 'hojai-dev-token'" . --include="*.ts" 2>/dev/null)

echo "   Secrets fixed: $secret_fixes files"
echo ""

# ============================================
# 2. FIX CORS WILDCARD
# ============================================
echo "2. Fixing CORS wildcard configurations..."

# Create CORS configuration helper function
CORS_CONFIG='app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));'

# Find and fix files with bare cors()
while IFS= read -r file; do
    # Replace bare cors() with configured version
    sed -i '' 's/app\.use(cors());/app.use(cors({\
  origin: process.env.CORS_ORIGIN?.split(",") || ["http:\/\/localhost:3000"],\
  credentials: true,\
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],\
  allowedHeaders: ["Content-Type", "Authorization"]\
}));/g' "$file"
    echo "  Fixed: $file"
    ((cors_fixes++))
done < <(grep -rl "app\.use(cors());" . --include="*.ts" 2>/dev/null)

echo "   CORS fixes: $cors_fixes files"
echo ""

# ============================================
# 3. ADD REQUEST BODY LIMITS
# ============================================
echo "3. Adding request body limits to express.json()..."

# Find and fix express.json() without limits
while IFS= read -r file; do
    if grep -q "app.use(express.json())" "$file"; then
        sed -i '' 's/app\.use(express\.json())/app.use(express.json({ limit: "10kb" }))/g' "$file"
        echo "  Fixed: $file"
        ((json_limit_fixes++))
    fi
done < <(grep -rl "app\.use(express\.json())" . --include="*.ts" 2>/dev/null)

echo "   JSON limit fixes: $json_limit_fixes files"
echo ""

# ============================================
# SUMMARY
# ============================================
echo "=== Summary ==="
echo "Hardcoded secrets fixed: $secret_fixes files"
echo "CORS configurations fixed: $cors_fixes files"
echo "Request body limits added: $json_limit_fixes files"
echo ""
echo "Security fixes complete!"
