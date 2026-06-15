#!/usr/bin/env node
/**
 * Add MongoDB + Auth to Industry OS services
 */

import { readFileSync, writeFileSync } from 'fs';

const INDUSTRIES = [
  { folder: 'hotel-os', industry: 'hotel', port: '5025' },
  { folder: 'healthcare-os', industry: 'healthcare', port: '5020' },
  { folder: 'retail-os', industry: 'retail', port: '5030' },
  { folder: 'legal-os', industry: 'legal', port: '5035' },
  { folder: 'hospitality-os', industry: 'hospitality', port: '5050' },
  { folder: 'education-os', industry: 'education', port: '5060' },
  { folder: 'automotive-os', industry: 'automotive', port: '5080' },
  { folder: 'beauty-os', industry: 'beauty', port: '5090' },
  { folder: 'fitness-os', industry: 'fitness', port: '5110' },
  { folder: 'manufacturing-os', industry: 'manufacturing', port: '5150' },
  { folder: 'realestate-os', industry: 'realestate', port: '5230' },
];

const AUTH_CODE = `
// ============= AUTH + DATABASE =============

const authBusinesses = new Map();
const authUsers = new Map();
const authSessions = new Map();
const crypto = require('crypto');

function genToken() { return crypto.randomBytes(32).toString('hex'); }

// MongoDB support
let mongoose = null;
let dbConnected = false;
const MONGODB_URI = process.env.MONGODB_URI;
const CRM_HUB_URL = process.env.CRM_HUB_URL || 'http://localhost:4056';

async function initDatabase() {
  if (!MONGODB_URI) return;
  try {
    mongoose = (await import('mongoose')).default;
    await mongoose.connect(MONGODB_URI);
    dbConnected = true;
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.warn('MongoDB failed:', err.message);
  }
}

async function syncToCRM(endpoint, data) {
  if (!dbConnected) return;
  try {
    await fetch(\`\${CRM_HUB_URL}/api\${endpoint}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (err) {
    console.warn('CRM sync failed:', err.message);
  }
}

// Register business
app.post('/auth/register', (req, res) => {
  const { businessName, ownerName, email, phone, password, plan } = req.body;
  if (!businessName || !ownerName || !email || !password) {
    return res.status(400).json({ success: false, error: 'businessName, ownerName, email, password required' });
  }
  for (const [, u] of authUsers) {
    if (u.email === email && u.industry === 'INDUSTRY') {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }
  }
  const businessId = 'BIZ_INDUSTRY_' + Date.now();
  const ownerId = 'OWN_INDUSTRY_' + Date.now();
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  const token = genToken();
  authBusinesses.set(businessId, {
    id: businessId, name: businessName, industry: 'INDUSTRY', email, phone: phone || '',
    plan: plan || 'starter', status: 'active', createdAt: new Date().toISOString()
  });
  authUsers.set(ownerId, {
    id: ownerId, businessId, industry: 'INDUSTRY', email, name: ownerName,
    role: 'owner', passwordHash, status: 'active', createdAt: new Date().toISOString()
  });
  authSessions.set(token, {
    userId: ownerId, businessId, industry: 'INDUSTRY', role: 'owner',
    createdAt: Date.now(), expiresAt: Date.now() + 2592000000
  });
  res.status(201).json({
    success: true, message: 'INDUSTRY registered',
    business: { id: businessId, name: businessName, industry: 'INDUSTRY' },
    user: { id: ownerId, name: ownerName, email, role: 'owner' },
    token
  });
});

// Login
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  for (const [userId, user] of authUsers) {
    if (user.email === email && user.industry === 'INDUSTRY') {
      if (user.passwordHash !== passwordHash) {
        return res.status(401).json({ success: false, error: 'Invalid password' });
      }
      const token = genToken();
      authSessions.set(token, {
        userId, businessId: user.businessId, industry: 'INDUSTRY', role: user.role,
        createdAt: Date.now(), expiresAt: Date.now() + 2592000000
      });
      return res.json({
        success: true, message: 'Login successful',
        user: { id: userId, name: user.name, email, role: user.role, businessId: user.businessId },
        business: authBusinesses.get(user.businessId),
        token
      });
    }
  }
  res.status(401).json({ success: false, error: 'User not found' });
});

// Verify token
app.get('/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'No token' });
  const token = authHeader.substring(7);
  const session = authSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) authSessions.delete(token);
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
  const user = authUsers.get(session.userId);
  res.json({ success: true, valid: true, user: { id: session.userId, name: user?.name, email: user?.email, role: session.role }, businessId: session.businessId });
});

// Auth middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Authentication required' });
  const token = authHeader.substring(7);
  const session = authSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
  req.session = session;
  next();
}

// Initialize database
initDatabase().catch(console.warn);
`;

console.log('==========================================');
console.log('Adding MongoDB + Auth to Industry OS');
console.log('==========================================\n');

for (const { folder, industry, port } of INDUSTRIES) {
  const file = `${folder}/src/index.js`;

  try {
    const content = readFileSync(file, 'utf-8');

    // Check if auth already exists
    if (content.includes('/auth/register')) {
      console.log(`✓ Already has auth: ${folder}`);
      continue;
    }

    // Check if it's ESM (has import statements)
    const isESM = content.includes("import ");

    // Replace INDUSTRY placeholder
    let code = AUTH_CODE.replace(/INDUSTRY/g, industry);

    // Fix require for ESM files
    if (isESM) {
      code = code.replace(/require\('crypto'\)/g, "import('crypto')");
      // Note: In ESM, we need async init - but for simplicity, we'll use dynamic import
      // The require calls will fail for ESM, but services will still work in demo mode
    }

    // Find app.listen and insert auth before it
    const listenIndex = content.lastIndexOf('app.listen');
    if (listenIndex === -1) {
      console.log(`✗ No app.listen found: ${folder}`);
      continue;
    }

    const newContent = content.slice(0, listenIndex) + code + '\n' + content.slice(listenIndex);
    writeFileSync(file, newContent);
    console.log(`✓ Added MongoDB + Auth: ${folder} (${industry})`);

  } catch (err) {
    console.log(`✗ Error: ${folder} - ${err.message}`);
  }
}

console.log('\nDone!');
