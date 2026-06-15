#!/bin/bash
# Add auth routes to all Industry OS services
# This script injects auth middleware into each service

set -e

cd "$(dirname "$0")/.."

AUTH_CODE='
// ============= AUTH ENDPOINTS =============

const authBusinesses = new Map();
const authUsers = new Map();
const authSessions = new Map();
const crypto = require("crypto");

function genToken() { return crypto.randomBytes(32).toString("hex"); }

// Register business
app.post("/auth/register", (req, res) => {
  const { businessName, ownerName, email, phone, password, plan } = req.body;
  if (!businessName || !ownerName || !email || !password) {
    return res.status(400).json({ success: false, error: "businessName, ownerName, email, password required" });
  }
  for (const [, u] of authUsers) {
    if (u.email === email && u.industry === INDUSTRY) {
      return res.status(409).json({ success: false, error: "Email already registered" });
    }
  }
  const businessId = "BIZ_" + INDUSTRY.toUpperCase() + "_" + Date.now();
  const ownerId = "OWN_" + INDUSTRY.toUpperCase() + "_" + Date.now();
  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  const token = genToken();
  authBusinesses.set(businessId, {
    id: businessId, name: businessName, industry: INDUSTRY, email, phone: phone || "",
    plan: plan || "starter", status: "active", createdAt: new Date().toISOString()
  });
  authUsers.set(ownerId, {
    id: ownerId, businessId, industry: INDUSTRY, email, name: ownerName,
    role: "owner", passwordHash, status: "active", createdAt: new Date().toISOString()
  });
  authSessions.set(token, {
    userId: ownerId, businessId, industry: INDUSTRY, role: "owner",
    createdAt: Date.now(), expiresAt: Date.now() + 2592000000
  });
  res.status(201).json({
    success: true, message: INDUSTRY + " registered",
    business: { id: businessId, name: businessName, industry: INDUSTRY },
    user: { id: ownerId, name: ownerName, email, role: "owner" },
    token
  });
});

// Login
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, error: "Email and password required" });
  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  for (const [userId, user] of authUsers) {
    if (user.email === email && user.industry === INDUSTRY) {
      if (user.passwordHash !== passwordHash) {
        return res.status(401).json({ success: false, error: "Invalid password" });
      }
      const token = genToken();
      authSessions.set(token, {
        userId, businessId: user.businessId, industry: INDUSTRY, role: user.role,
        createdAt: Date.now(), expiresAt: Date.now() + 2592000000
      });
      return res.json({
        success: true, message: "Login successful",
        user: { id: userId, name: user.name, email, role: user.role, businessId: user.businessId },
        business: authBusinesses.get(user.businessId),
        token
      });
    }
  }
  res.status(401).json({ success: false, error: "User not found" });
});

// Verify token
app.get("/auth/verify", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ success: false, error: "No token" });
  const token = authHeader.substring(7);
  const session = authSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) authSessions.delete(token);
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
  const user = authUsers.get(session.userId);
  res.json({ success: true, valid: true, user: { id: session.userId, name: user?.name, email: user?.email, role: session.role }, businessId: session.businessId });
});

// Auth middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ success: false, error: "Authentication required" });
  const token = authHeader.substring(7);
  const session = authSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
  req.session = session;
  next();
}
'

SERVICES=(
  "restaurant-os|restaurant|5010"
  "hotel-os|hotel|5025"
  "healthcare-os|healthcare|5020"
  "retail-os|retail|5030"
  "legal-os|legal|5035"
  "hospitality-os|hospitality|5050"
  "education-os|education|5060"
  "automotive-os|automotive|5080"
  "beauty-os|beauty|5090"
  "fitness-os|fitness|5110"
  "manufacturing-os|manufacturing|5150"
  "realestate-os|realestate|5230"
)

echo "Adding auth to Industry OS services..."
echo ""

for entry in "${SERVICES[@]}"; do
  IFS='|' read -r folder industry port <<< "$entry"
  file="$folder/src/index.js"

  if [ ! -f "$file" ]; then
    echo "✗ SKIP: $folder (no src/index.js)"
    continue
  fi

  # Check if auth already exists
  if grep -q "auth/register" "$file" 2>/dev/null; then
    echo "✓ Already has auth: $folder"
    continue
  fi

  # Create backup
  cp "$file" "$file.bak"

  # Replace INDUSTRY placeholder
  auth_replaced=$(echo "$AUTH_CODE" | sed "s/INDUSTRY/$industry/g")

  # Find health check line and insert auth after it
  if grep -q 'app.get.*health' "$file"; then
    # Insert after health check
    sed -i '' '/app.get.*health.*res.json.*status.*healthy/a\
\
\
// ============= AUTH ENDPOINTS =============\
\
\
const authBusinesses = new Map();\
const authUsers = new Map();\
const authSessions = new Map();\
const crypto = require("crypto");\
\
function genToken() { return crypto.randomBytes(32).toString("hex"); }\
\
// Register business\
app.post("/auth/register", (req, res) => {\
  const { businessName, ownerName, email, phone, password, plan } = req.body;\
  if (!businessName || !ownerName || !email || !password) {\
    return res.status(400).json({ success: false, error: "businessName, ownerName, email, password required" });\
  }\
  for (const [, u] of authUsers) {\
    if (u.email === email \&\& u.industry === "'"$industry"'") {\
      return res.status(409).json({ success: false, error: "Email already registered" });\
    }\
  }\
  const businessId = "BIZ_" + "'"$industry"'".toUpperCase() + "_" + Date.now();\
  const ownerId = "OWN_" + "'"$industry"'".toUpperCase() + "_" + Date.now();\
  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");\
  const token = genToken();\
  authBusinesses.set(businessId, {\
    id: businessId, name: businessName, industry: "'"$industry"'", email, phone: phone || "",\
    plan: plan || "starter", status: "active", createdAt: new Date().toISOString()\
  });\
  authUsers.set(ownerId, {\
    id: ownerId, businessId, industry: "'"$industry"'", email, name: ownerName,\
    role: "owner", passwordHash, status: "active", createdAt: new Date().toISOString()\
  });\
  authSessions.set(token, {\
    userId: ownerId, businessId, industry: "'"$industry"'", role: "owner",\
    createdAt: Date.now(), expiresAt: Date.now() + 2592000000\
  });\
  res.status(201).json({\
    success: true, message: "'"$industry"' registered",\
    business: { id: businessId, name: businessName, industry: "'"$industry"'" },\
    user: { id: ownerId, name: ownerName, email, role: "owner" },\
    token\
  });\
});\
\
// Login\
app.post("/auth/login", (req, res) => {\
  const { email, password } = req.body;\
  if (!email || !password) return res.status(400).json({ success: false, error: "Email and password required" });\
  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");\
  for (const [userId, user] of authUsers) {\
    if (user.email === email \&\& user.industry === "'"$industry"'") {\
      if (user.passwordHash !== passwordHash) {\
        return res.status(401).json({ success: false, error: "Invalid password" });\
      }\
      const token = genToken();\
      authSessions.set(token, {\
        userId, businessId: user.businessId, industry: "'"$industry"'", role: user.role,\
        createdAt: Date.now(), expiresAt: Date.now() + 2592000000\
      });\
      return res.json({\
        success: true, message: "Login successful",\
        user: { id: userId, name: user.name, email, role: user.role, businessId: user.businessId },\
        business: authBusinesses.get(user.businessId),\
        token\
      });\
    }\
  }\
  res.status(401).json({ success: false, error: "User not found" });\
});\
\
// Verify token\
app.get("/auth/verify", (req, res) => {\
  const authHeader = req.headers.authorization;\
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ success: false, error: "No token" });\
  const token = authHeader.substring(7);\
  const session = authSessions.get(token);\
  if (!session || session.expiresAt < Date.now()) {\
    if (session) authSessions.delete(token);\
    return res.status(401).json({ success: false, error: "Invalid or expired token" });\
  }\
  const user = authUsers.get(session.userId);\
  res.json({ success: true, valid: true, user: { id: session.userId, name: user?.name, email: user?.email, role: session.role }, businessId: session.businessId });\
});\
\
// Auth middleware\
function requireAuth(req, res, next) {\
  const authHeader = req.headers.authorization;\
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ success: false, error: "Authentication required" });\
  const token = authHeader.substring(7);\
  const session = authSessions.get(token);\
  if (!session || session.expiresAt < Date.now()) {\
    return res.status(401).json({ success: false, error: "Invalid or expired token" });\
  }\
  req.session = session;\
  next();\
}\
' "$file"
    echo "✓ Added auth: $folder ($industry)"
  else
    echo "✗ Could not find health check: $folder"
  fi
done

echo ""
echo "Done! Restart services to apply changes."
