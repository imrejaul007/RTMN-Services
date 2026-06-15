/**
 * Gaming OS
 * Port: 5120
 * Industry: gaming
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5120;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());


// ============= AUTH + DATABASE =============
const authBusinesses = new Map();
const authUsers = new Map();
const authSessions = new Map();
const crypto = require('crypto');

let mongoose = null;
let dbConnected = false;
const MONGODB_URI = process.env.MONGODB_URI;
const CRM_HUB_URL = process.env.CRM_HUB_URL || 'http://localhost:4056';
const SERVICE_NAME = process.env.SERVICE_NAME || 'Gaming OS';

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

async function syncCustomerToCRM(customer, businessId) {
  if (!dbConnected) return;
  try {
    await fetch(`${CRM_HUB_URL}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        industry: 'gaming',
        businessId,
        loyaltyPoints: customer.loyaltyPoints || 0,
        tier: customer.tier || 'bronze',
      }),
    });
  } catch (err) {
    console.warn('CRM sync failed:', err.message);
  }
}

// ============= END AUTH + DATABASE =============

// ============= GAMING OS DATA =============
const games = new Map();
const players = new Map();
const tournaments = new Map();
const matches = new Map();

// ============= END DATA =============

// ============= TWINS =============
const gameTwin = new Map();
const playerTwin = new Map();
const tournamentTwin = new Map();

// ============= END TWINS =============

// ============= API ROUTES =============

app.get('/api/games', (req, res) => {
  res.json({ games: Array.from(games.values()) });
});

app.post('/api/games', requireAuth, (req, res) => {
  const game = { id: 'game_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  games.set(game.id, game);
  res.json(game);
});

app.get('/api/games/:id', (req, res) => {
  const game = games.get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Not found' });
  res.json(game);
});

app.put('/api/games/:id', requireAuth, (req, res) => {
  const game = games.get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Not found' });
  if (game.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  games.set(req.params.id, { ...game, ...req.body });
  res.json(games.get(req.params.id));
});

app.delete('/api/games/:id', requireAuth, (req, res) => {
  const game = games.get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Not found' });
  if (game.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  games.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/players', (req, res) => {
  res.json({ players: Array.from(players.values()) });
});

app.post('/api/players', requireAuth, (req, res) => {
  const player = { id: 'player_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  players.set(player.id, player);
  res.json(player);
});

app.get('/api/players/:id', (req, res) => {
  const player = players.get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Not found' });
  res.json(player);
});

app.put('/api/players/:id', requireAuth, (req, res) => {
  const player = players.get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Not found' });
  if (player.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  players.set(req.params.id, { ...player, ...req.body });
  res.json(players.get(req.params.id));
});

app.delete('/api/players/:id', requireAuth, (req, res) => {
  const player = players.get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Not found' });
  if (player.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  players.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/tournaments', (req, res) => {
  res.json({ tournaments: Array.from(tournaments.values()) });
});

app.post('/api/tournaments', requireAuth, (req, res) => {
  const tournament = { id: 'tournament_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  tournaments.set(tournament.id, tournament);
  res.json(tournament);
});

app.get('/api/tournaments/:id', (req, res) => {
  const tournament = tournaments.get(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Not found' });
  res.json(tournament);
});

app.put('/api/tournaments/:id', requireAuth, (req, res) => {
  const tournament = tournaments.get(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Not found' });
  if (tournament.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  tournaments.set(req.params.id, { ...tournament, ...req.body });
  res.json(tournaments.get(req.params.id));
});

app.delete('/api/tournaments/:id', requireAuth, (req, res) => {
  const tournament = tournaments.get(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Not found' });
  if (tournament.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  tournaments.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/matches', (req, res) => {
  res.json({ matches: Array.from(matches.values()) });
});

app.post('/api/matches', requireAuth, (req, res) => {
  const matche = { id: 'matche_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  matches.set(matche.id, matche);
  res.json(matche);
});

app.get('/api/matches/:id', (req, res) => {
  const matche = matches.get(req.params.id);
  if (!matche) return res.status(404).json({ error: 'Not found' });
  res.json(matche);
});

app.put('/api/matches/:id', requireAuth, (req, res) => {
  const matche = matches.get(req.params.id);
  if (!matche) return res.status(404).json({ error: 'Not found' });
  if (matche.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  matches.set(req.params.id, { ...matche, ...req.body });
  res.json(matches.get(req.params.id));
});

app.delete('/api/matches/:id', requireAuth, (req, res) => {
  const matche = matches.get(req.params.id);
  if (!matche) return res.status(404).json({ error: 'Not found' });
  if (matche.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  matches.delete(req.params.id);
  res.json({ success: true });
});


// Analytics
app.get('/api/analytics', (req, res) => {
  res.json({
    gameCount: games.size, playerCount: players.size, tournamentCount: tournaments.size, matcheCount: matches.size
  });
});

// Twins sync
app.post('/api/twins/sync', requireAuth, (req, res) => {
  const twinData = { game: Array.from(gameTwin.values()), player: Array.from(playerTwin.values()), tournament: Array.from(tournamentTwin.values()) };
  res.json({ success: true, synced: twinData });
});

// ============= END ROUTES =============

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});

// Start server
initDatabase().catch(console.warn);
app.listen(PORT, () => console.log(`✅ Gaming OS running on port ${PORT}`));

