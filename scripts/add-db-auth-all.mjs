import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const AUTH_CODE = `
// ============= AUTH + DATABASE =============
const authBusinesses = new Map();
const authUsers = new Map();
const authSessions = new Map();
const crypto = require('crypto');

let mongoose = null;
let dbConnected = false;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const SERVICE_NAME = process.env.SERVICE_NAME || 'service';

async function initDatabase() {
  if (!MONGODB_URI) {
    console.log('⚠️  MONGODB_URI not set. Running in demo mode (in-memory).');
    return;
  }
  try {
    mongoose = (await import('mongoose')).default;
    await mongoose.connect(MONGODB_URI);
    dbConnected = true;
    console.log('✅ MongoDB connected for', SERVICE_NAME);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
  }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

app.post('/auth/register', (req, res) => {
  const { businessId, email, password, role, businessName } = req.body;
  if (!email || !password || !businessId) {
    return res.status(400).json({ error: 'businessId, email, password required' });
  }
  if (authUsers.has(email)) {
    return res.status(409).json({ error: 'User already exists' });
  }
  const user = {
    id: 'user_' + Date.now(),
    businessId,
    email,
    passwordHash: hashPassword(password),
    role: role || 'owner',
    name: businessName || email.split('@')[0],
    createdAt: new Date().toISOString()
  };
  authUsers.set(email, user);
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email: user.email, businessId: user.businessId, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.get('/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  res.json({ valid: true, ...session });
});

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  req.session = session;
  next();
}

// ============= END AUTH + DATABASE =============
`;

// Services to update
const services = [
  { dir: 'corpid-service', name: 'CorpID' },
  { dir: 'memory-os', name: 'MemoryOS' },
  { dir: 'goal-os', name: 'GoalOS' },
  { dir: 'decision-engine', name: 'DecisionEngine' },
  { dir: 'agent-economy', name: 'AgentEconomy' },
  { dir: 'twinos-hub', name: 'TwinOS Hub' },
  { dir: 'agent-twin', name: 'AgentTwin' },
  { dir: 'property-twin', name: 'PropertyTwin' },
  { dir: 'referral-twin', name: 'ReferralTwin' },
  { dir: 'buyer-twin', name: 'BuyerTwin' },
  { dir: 'deal-twin', name: 'DealTwin' },
  { dir: 'area-twin', name: 'AreaTwin' },
];

console.log('==========================================');
console.log('Adding MongoDB + Auth to Foundation + Twins');
console.log('==========================================');

for (const svc of services) {
  const indexPath = join(rootDir, svc.dir, 'src', 'index.js');
  try {
    let content = readFileSync(indexPath, 'utf8');

    // Skip if already has auth
    if (content.includes('requireAuth')) {
      console.log('⏭️  Already has auth: ' + svc.name);
      continue;
    }

    // Insert auth code before app.listen
    const listenPos = content.indexOf('app.listen(');
    if (listenPos !== -1) {
      content = content.slice(0, listenPos) + AUTH_CODE + '\n' + content.slice(listenPos);
    }

    // Add initDatabase call
    if (content.indexOf('initDatabase()') === -1) {
      content = content.replace('app.listen(', 'initDatabase().catch(console.warn);\napp.listen(');
    }

    writeFileSync(indexPath, content);
    console.log('✓ Added MongoDB + Auth: ' + svc.name);
  } catch (err) {
    console.log('✗ Skipped: ' + svc.name + ' (' + err.message + ')');
  }
}

console.log('\nDone!');
