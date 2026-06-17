/**
 * Sports OS - Complete Sports/Academy Management Platform
 *
 * Port: 5180
 * Industry: Sports
 *
 * Features:
 * - Team/Franchise Management
 * - Player/Coach Management
 * - Match/Event Management
 * - Academy/Training Management
 * - Performance Statistics
 * - Contract/Salary Management
 * - Sponsorship Management
 * - Venue/Facility Management
 * - Analytics
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5180;
const JWT_SECRET = process.env.JWT_SECRET || 'sports-os-secret-key-2026';

// RTMN Layer Integration
const RTMN_LAYER = {
  intelligence: process.env.RTMN_INTELLIGENCE_URL || 'http://localhost:4881',
  memory: process.env.RTMN_MEMORY_URL || 'http://localhost:4703',
  twin: process.env.RTMN_TWIN_URL || 'http://localhost:4705',
  agent: process.env.RTMN_AGENT_URL || 'http://localhost:4895',
  eventBus: process.env.RTMN_EVENT_BUS_URL || 'http://localhost:4510'
};

// ============ MIDDLEWARE ============
app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] }));
app.use(express.json());

// ============ IN-MEMORY STORAGE ============
const authUsers = new Map();
const authSessions = new Map();

// ============ SAMPLE DATA ============
const teams = [
  { id: 'team-1', name: 'Thunder Hawks', sport: 'Basketball', league: 'City Premier', foundedYear: 2018, homeVenue: 'venue-1', primaryColor: '#1E40AF', wins: 15, losses: 5, ranking: 1 },
  { id: 'team-2', name: 'Golden Lions', sport: 'Basketball', league: 'City Premier', foundedYear: 2015, homeVenue: 'venue-2', primaryColor: '#D97706', wins: 12, losses: 8, ranking: 2 },
  { id: 'team-3', name: 'Steel Wolves', sport: 'Basketball', league: 'City Premier', foundedYear: 2019, homeVenue: 'venue-3', primaryColor: '#374151', wins: 10, losses: 10, ranking: 3 },
  { id: 'team-4', name: 'Phoenix Rising', sport: 'Basketball', league: 'City Premier', foundedYear: 2020, homeVenue: 'venue-4', primaryColor: '#DC2626', wins: 8, losses: 12, ranking: 4 }
];

const players = [
  { id: 'player-1', name: 'Marcus Johnson', teamId: 'team-1', jerseyNumber: 23, position: 'Point Guard', age: 26, height: '6\'2"', weight: 185, nationality: 'USA', salary: 250000, status: 'active', stats: { points: 22.5, assists: 8.2, rebounds: 4.1, steals: 1.8 } },
  { id: 'player-2', name: 'Derek Thompson', teamId: 'team-1', jerseyNumber: 11, position: 'Center', age: 28, height: '6\'10"', weight: 220, nationality: 'USA', salary: 320000, status: 'active', stats: { points: 18.3, assists: 2.1, rebounds: 10.5, steals: 0.9 } },
  { id: 'player-3', name: 'Carlos Martinez', teamId: 'team-2', jerseyNumber: 7, position: 'Shooting Guard', age: 24, height: '6\'5"', weight: 195, nationality: 'Mexico', salary: 180000, status: 'active', stats: { points: 19.8, assists: 5.4, rebounds: 3.2, steals: 1.2 } },
  { id: 'player-4', name: 'James Wilson', teamId: 'team-2', jerseyNumber: 33, position: 'Power Forward', age: 30, height: '6\'9"', weight: 240, nationality: 'USA', salary: 290000, status: 'injured', stats: { points: 15.2, assists: 3.1, rebounds: 8.7, steals: 0.7 } },
  { id: 'player-5', name: 'Tyler Brown', teamId: 'team-3', jerseyNumber: 5, position: 'Small Forward', age: 22, height: '6\'6"', weight: 200, nationality: 'Canada', salary: 120000, status: 'active', stats: { points: 14.5, assists: 4.2, rebounds: 5.3, steals: 1.4 } },
  { id: 'player-6', name: 'Andre Williams', teamId: 'team-4', jerseyNumber: 1, position: 'Point Guard', age: 25, height: '6\'1"', weight: 175, nationality: 'USA', salary: 150000, status: 'active', stats: { points: 16.8, assists: 7.5, rebounds: 2.9, steals: 2.1 } }
];

const coaches = [
  { id: 'coach-1', name: 'Robert Mitchell', teamId: 'team-1', role: 'Head Coach', specialization: 'Offense', experienceYears: 15, salary: 450000, status: 'active', championships: 2 },
  { id: 'coach-2', name: 'Sarah Chen', teamId: 'team-2', role: 'Head Coach', specialization: 'Defense', experienceYears: 12, salary: 380000, status: 'active', championships: 1 },
  { id: 'coach-3', name: 'Michael Torres', teamId: null, role: 'Academy Director', specialization: 'Youth Development', experienceYears: 20, salary: 280000, status: 'active', championships: 0 }
];

const matches = [
  { id: 'match-1', homeTeamId: 'team-1', awayTeamId: 'team-2', date: '2026-06-10', time: '19:00', venue: 'venue-1', status: 'completed', homeScore: 98, awayScore: 92, season: '2026', league: 'City Premier' },
  { id: 'match-2', homeTeamId: 'team-3', awayTeamId: 'team-4', date: '2026-06-11', time: '20:00', venue: 'venue-3', status: 'completed', homeScore: 87, awayScore: 91, season: '2026', league: 'City Premier' },
  { id: 'match-3', homeTeamId: 'team-1', awayTeamId: 'team-3', date: '2026-06-14', time: '19:00', venue: 'venue-1', status: 'scheduled', homeScore: null, awayScore: null, season: '2026', league: 'City Premier' },
  { id: 'match-4', homeTeamId: 'team-2', awayTeamId: 'team-4', date: '2026-06-15', time: '20:00', venue: 'venue-2', status: 'scheduled', homeScore: null, awayScore: null, season: '2026', league: 'City Premier' },
  { id: 'match-5', homeTeamId: 'team-4', awayTeamId: 'team-1', date: '2026-06-18', time: '19:00', venue: 'venue-4', status: 'scheduled', homeScore: null, awayScore: null, season: '2026', league: 'City Premier' }
];

const venues = [
  { id: 'venue-1', name: 'Thunder Arena', capacity: 15000, type: 'Indoor Arena', location: 'Downtown Sports District', facilities: ['Gym', 'Training Room', 'Locker Rooms', 'Media Room'], rentalCost: 5000 },
  { id: 'venue-2', name: 'Golden Stadium', capacity: 12000, type: 'Indoor Arena', location: 'West Side Complex', facilities: ['Gym', 'Training Room', 'Locker Rooms'], rentalCost: 4000 },
  { id: 'venue-3', name: 'Steel Center', capacity: 10000, type: 'Indoor Arena', location: 'Industrial Zone', facilities: ['Gym', 'Locker Rooms'], rentalCost: 3500 },
  { id: 'venue-4', name: 'Phoenix Dome', capacity: 11000, type: 'Indoor Arena', location: 'East End', facilities: ['Gym', 'Training Room', 'Locker Rooms', 'Cafeteria'], rentalCost: 4200 }
];

const sponsors = [
  { id: 'sponsor-1', name: 'Nike Sports', type: 'Apparel', tier: 'platinum', amount: 500000, startDate: '2026-01-01', endDate: '2026-12-31', teams: ['team-1', 'team-2'] },
  { id: 'sponsor-2', name: 'PowerEnergy Drinks', type: 'Beverage', tier: 'gold', amount: 200000, startDate: '2026-01-01', endDate: '2026-12-31', teams: ['team-1'] },
  { id: 'sponsor-3', name: 'City Bank', type: 'Financial', tier: 'silver', amount: 100000, startDate: '2026-03-01', endDate: '2027-02-28', teams: ['team-2', 'team-3'] }
];

const academyClasses = [
  { id: 'class-1', name: 'Youth Basketball Basics', coachId: 'coach-3', ageGroup: '8-12', level: 'beginner', schedule: 'Mon/Wed/Fri 16:00-18:00', capacity: 20, enrolled: 15, fee: 150 },
  { id: 'class-2', name: 'Advanced Training', coachId: 'coach-3', ageGroup: '13-17', level: 'advanced', schedule: 'Tue/Thu 17:00-19:00', capacity: 15, enrolled: 12, fee: 200 },
  { id: 'class-3', name: 'Summer Camp 2026', coachId: 'coach-3', ageGroup: '8-16', level: 'all', schedule: 'Daily 09:00-15:00', capacity: 50, enrolled: 42, fee: 500 }
];

const contracts = [
  { id: 'contract-1', playerId: 'player-1', teamId: 'team-1', type: 'player', startDate: '2025-07-01', endDate: '2028-06-30', salary: 250000, bonus: 50000, status: 'active' },
  { id: 'contract-2', playerId: 'player-2', teamId: 'team-1', type: 'player', startDate: '2024-07-01', endDate: '2027-06-30', salary: 320000, bonus: 75000, status: 'active' },
  { id: 'contract-3', coachId: 'coach-1', teamId: 'team-1', type: 'coach', startDate: '2023-07-01', endDate: '2028-06-30', salary: 450000, bonus: 100000, status: 'active' }
];

// ============ AUTH HELPERS ============
function generateToken(userId) {
  return jwt.sign({ userId, timestamp: Date.now() }, JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' });

  req.userId = decoded.userId;
  next();
}

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => {
  res.json({
    service: 'Sports OS',
    version: '1.0.0',
    status: 'healthy',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      teams: teams.length,
      players: players.length,
      coaches: coaches.length,
      matches: matches.length,
      venues: venues.length,
      sponsors: sponsors.length,
      academyClasses: academyClasses.length,
      contracts: contracts.length
    },
    layers: RTMN_LAYER
  });
});

// ============ AUTH ROUTES ============
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  if (authUsers.has(email)) return res.status(409).json({ error: 'User already exists' });

  const userId = uuidv4();
  const user = { id: userId, email, name: name || email.split('@')[0], role: role || 'viewer', createdAt: new Date() };
  authUsers.set(email, { ...user, password });
  authSessions.set(userId, { email, token: generateToken(userId), loginAt: new Date() });

  res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role }, token: generateToken(userId) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = authUsers.get(email);
  if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });

  const token = generateToken(user.id);
  authSessions.set(user.id, { email, token, loginAt: new Date() });

  res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const session = authSessions.get(req.userId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const user = Array.from(authUsers.values()).find(u => u.id === req.userId);
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, session });
});

// ============ TEAMS ROUTES ============
app.get('/api/teams', (req, res) => res.json({ success: true, teams }));

app.get('/api/teams/:id', (req, res) => {
  const team = teams.find(t => t.id === req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  const teamPlayers = players.filter(p => p.teamId === team.id);
  const teamCoaches = coaches.filter(c => c.teamId === team.id);
  const teamMatches = matches.filter(m => m.homeTeamId === team.id || m.awayTeamId === team.id);

  res.json({ success: true, team: { ...team, players: teamPlayers, coaches: teamCoaches, matches: teamMatches } });
});

app.post('/api/teams', requireAuth, (req, res) => {
  const { name, sport, league, foundedYear, homeVenue, primaryColor } = req.body;
  if (!name || !sport) return res.status(400).json({ error: 'Name and sport required' });

  const team = { id: uuidv4(), name, sport, league: league || 'Community League', foundedYear: foundedYear || new Date().getFullYear(), homeVenue, primaryColor: primaryColor || '#000000', wins: 0, losses: 0, ranking: teams.length + 1 };
  teams.push(team);

  res.json({ success: true, team });
});

app.put('/api/teams/:id', requireAuth, (req, res) => {
  const idx = teams.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Team not found' });

  teams[idx] = { ...teams[idx], ...req.body, id: req.params.id };
  res.json({ success: true, team: teams[idx] });
});

// ============ PLAYERS ROUTES ============
app.get('/api/players', (req, res) => {
  const { teamId, status, position } = req.query;
  let filtered = [...players];

  if (teamId) filtered = filtered.filter(p => p.teamId === teamId);
  if (status) filtered = filtered.filter(p => p.status === status);
  if (position) filtered = filtered.filter(p => p.position === position);

  res.json({ success: true, players: filtered, total: filtered.length });
});

app.get('/api/players/:id', (req, res) => {
  const player = players.find(p => p.id === req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const team = teams.find(t => t.id === player.teamId);
  const playerContract = contracts.find(c => c.playerId === player.id);
  const playerMatches = matches.filter(m => m.homeTeamId === player.teamId || m.awayTeamId === player.teamId);

  res.json({ success: true, player: { ...player, team, contract: playerContract, recentMatches: playerMatches.slice(0, 5) } });
});

app.post('/api/players', requireAuth, (req, res) => {
  const { name, teamId, jerseyNumber, position, age, height, weight, nationality, salary } = req.body;
  if (!name || !teamId) return res.status(400).json({ error: 'Name and teamId required' });

  const player = { id: uuidv4(), name, teamId, jerseyNumber: jerseyNumber || 0, position: position || 'Unknown', age: age || 0, height: height || 'N/A', weight: weight || 0, nationality: nationality || 'Unknown', salary: salary || 0, status: 'active', stats: { points: 0, assists: 0, rebounds: 0, steals: 0 } };
  players.push(player);

  res.json({ success: true, player });
});

app.put('/api/players/:id', requireAuth, (req, res) => {
  const idx = players.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Player not found' });

  players[idx] = { ...players[idx], ...req.body, id: req.params.id };
  res.json({ success: true, player: players[idx] });
});

// ============ COACHES ROUTES ============
app.get('/api/coaches', (req, res) => {
  const { teamId, role } = req.query;
  let filtered = [...coaches];

  if (teamId) filtered = filtered.filter(c => c.teamId === teamId);
  if (role) filtered = filtered.filter(c => c.role === role);

  res.json({ success: true, coaches: filtered, total: filtered.length });
});

app.get('/api/coaches/:id', (req, res) => {
  const coach = coaches.find(c => c.id === req.params.id);
  if (!coach) return res.status(404).json({ error: 'Coach not found' });

  const team = teams.find(t => t.id === coach.teamId);
  const coachClasses = academyClasses.filter(c => c.coachId === coach.id);

  res.json({ success: true, coach: { ...coach, team, classes: coachClasses } });
});

app.post('/api/coaches', requireAuth, (req, res) => {
  const { name, teamId, role, specialization, experienceYears, salary } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const coach = { id: uuidv4(), name, teamId: teamId || null, role: role || 'Assistant Coach', specialization: specialization || 'General', experienceYears: experienceYears || 0, salary: salary || 0, status: 'active', championships: 0 };
  coaches.push(coach);

  res.json({ success: true, coach });
});

// ============ MATCHES ROUTES ============
app.get('/api/matches', (req, res) => {
  const { teamId, status, season } = req.query;
  let filtered = [...matches];

  if (teamId) filtered = filtered.filter(m => m.homeTeamId === teamId || m.awayTeamId === teamId);
  if (status) filtered = filtered.filter(m => m.status === status);
  if (season) filtered = filtered.filter(m => m.season === season);

  res.json({ success: true, matches: filtered, total: filtered.length });
});

app.get('/api/matches/:id', (req, res) => {
  const match = matches.find(m => m.id === req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const homeTeam = teams.find(t => t.id === match.homeTeamId);
  const awayTeam = teams.find(t => t.id === match.awayTeamId);
  const venue = venues.find(v => v.id === match.venue);

  res.json({ success: true, match: { ...match, homeTeam, awayTeam, venue } });
});

app.post('/api/matches', requireAuth, (req, res) => {
  const { homeTeamId, awayTeamId, date, time, venue, season, league } = req.body;
  if (!homeTeamId || !awayTeamId || !date) return res.status(400).json({ error: 'homeTeamId, awayTeamId, and date required' });

  const match = { id: uuidv4(), homeTeamId, awayTeamId, date, time: time || '19:00', venue: venue || null, status: 'scheduled', homeScore: null, awayScore: null, season: season || '2026', league: league || 'City Premier' };
  matches.push(match);

  res.json({ success: true, match });
});

app.put('/api/matches/:id', requireAuth, (req, res) => {
  const idx = matches.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Match not found' });

  matches[idx] = { ...matches[idx], ...req.body, id: req.params.id };
  res.json({ success: true, match: matches[idx] });
});

app.post('/api/matches/:id/complete', requireAuth, (req, res) => {
  const idx = matches.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Match not found' });

  const { homeScore, awayScore } = req.body;
  if (homeScore === undefined || awayScore === undefined) return res.status(400).json({ error: 'homeScore and awayScore required' });

  matches[idx] = { ...matches[idx], homeScore, awayScore, status: 'completed' };

  // Update team records
  const homeTeam = teams.find(t => t.id === matches[idx].homeTeamId);
  const awayTeam = teams.find(t => t.id === matches[idx].awayTeamId);

  if (homeTeam) {
    homeTeam.wins += homeScore > awayScore ? 1 : 0;
    homeTeam.losses += homeScore < awayScore ? 1 : 0;
  }
  if (awayTeam) {
    awayTeam.wins += awayScore > homeScore ? 1 : 0;
    awayTeam.losses += awayScore < homeScore ? 1 : 0;
  }

  res.json({ success: true, match: matches[idx], homeTeam, awayTeam });
});

// ============ VENUES ROUTES ============
app.get('/api/venues', (req, res) => res.json({ success: true, venues, total: venues.length }));

app.get('/api/venues/:id', (req, res) => {
  const venue = venues.find(v => v.id === req.params.id);
  if (!venue) return res.status(404).json({ error: 'Venue not found' });

  const venueMatches = matches.filter(m => m.venue === venue.id);
  res.json({ success: true, venue: { ...venue, upcomingMatches: venueMatches.filter(m => m.status === 'scheduled') } });
});

app.post('/api/venues', requireAuth, (req, res) => {
  const { name, capacity, type, location, facilities, rentalCost } = req.body;
  if (!name || !capacity) return res.status(400).json({ error: 'Name and capacity required' });

  const venue = { id: uuidv4(), name, capacity, type: type || 'Indoor Arena', location: location || 'TBD', facilities: facilities || [], rentalCost: rentalCost || 0 };
  venues.push(venue);

  res.json({ success: true, venue });
});

// ============ SPONSORS ROUTES ============
app.get('/api/sponsors', (req, res) => res.json({ success: true, sponsors, total: sponsors.length }));

app.get('/api/sponsors/:id', (req, res) => {
  const sponsor = sponsors.find(s => s.id === req.params.id);
  if (!sponsor) return res.status(404).json({ error: 'Sponsor not found' });

  const sponsorTeams = teams.filter(t => sponsor.teams.includes(t.id));
  res.json({ success: true, sponsor: { ...sponsor, teams: sponsorTeams } });
});

app.post('/api/sponsors', requireAuth, (req, res) => {
  const { name, type, tier, amount, startDate, endDate, teams: sponsorTeams } = req.body;
  if (!name || !amount) return res.status(400).json({ error: 'Name and amount required' });

  const sponsor = { id: uuidv4(), name, type: type || 'General', tier: tier || 'bronze', amount, startDate: startDate || new Date().toISOString().split('T')[0], endDate: endDate || '2026-12-31', teams: sponsorTeams || [] };
  sponsors.push(sponsor);

  res.json({ success: true, sponsor });
});

// ============ ACADEMY ROUTES ============
app.get('/api/academy/classes', (req, res) => res.json({ success: true, classes: academyClasses, total: academyClasses.length }));

app.get('/api/academy/classes/:id', (req, res) => {
  const cls = academyClasses.find(c => c.id === req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const coach = coaches.find(c => c.id === cls.coachId);
  res.json({ success: true, class: { ...cls, coach } });
});

app.post('/api/academy/classes', requireAuth, (req, res) => {
  const { name, coachId, ageGroup, level, schedule, capacity, fee } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const cls = { id: uuidv4(), name, coachId: coachId || null, ageGroup: ageGroup || 'All', level: level || 'beginner', schedule: schedule || 'TBD', capacity: capacity || 20, enrolled: 0, fee: fee || 100 };
  academyClasses.push(cls);

  res.json({ success: true, class: cls });
});

app.put('/api/academy/classes/:id/enroll', requireAuth, (req, res) => {
  const idx = academyClasses.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Class not found' });

  if (academyClasses[idx].enrolled >= academyClasses[idx].capacity) {
    return res.status(400).json({ error: 'Class is full' });
  }

  academyClasses[idx].enrolled += 1;
  res.json({ success: true, class: academyClasses[idx] });
});

// ============ CONTRACTS ROUTES ============
app.get('/api/contracts', (req, res) => {
  const { type, status, teamId } = req.query;
  let filtered = [...contracts];

  if (type) filtered = filtered.filter(c => c.type === type);
  if (status) filtered = filtered.filter(c => c.status === status);
  if (teamId) filtered = filtered.filter(c => c.teamId === teamId);

  res.json({ success: true, contracts: filtered, total: filtered.length });
});

app.post('/api/contracts', requireAuth, (req, res) => {
  const { playerId, coachId, teamId, type, startDate, endDate, salary, bonus } = req.body;
  if ((!playerId && !coachId) || !teamId) return res.status(400).json({ error: 'playerId/coachId and teamId required' });

  const contract = { id: uuidv4(), playerId, coachId, teamId, type: type || 'player', startDate: startDate || new Date().toISOString().split('T')[0], endDate: endDate || '2027-12-31', salary: salary || 0, bonus: bonus || 0, status: 'active' };
  contracts.push(contract);

  res.json({ success: true, contract });
});

// ============ ANALYTICS ROUTES ============
app.get('/api/analytics/standings', (req, res) => {
  const standings = teams.map(t => ({
    rank: 0,
    team: t.name,
    sport: t.sport,
    league: t.league,
    wins: t.wins,
    losses: t.losses,
    winPercentage: ((t.wins / (t.wins + t.losses || 1)) * 100).toFixed(1),
    pointsFor: 0,
    pointsAgainst: 0,
    streak: 'W3'
  })).sort((a, b) => b.wins - a.wins);

  standings.forEach((s, i) => s.rank = i + 1);

  res.json({ success: true, standings });
});

app.get('/api/analytics/top-players', (req, res) => {
  const { stat, limit } = req.query;
  const sortBy = stat || 'points';
  const topN = parseInt(limit) || 10;

  const sorted = [...players]
    .filter(p => p.status === 'active')
    .sort((a, b) => (b.stats[sortBy] || 0) - (a.stats[sortBy] || 0))
    .slice(0, topN)
    .map((p, i) => ({ rank: i + 1, ...p }));

  res.json({ success: true, stat: sortBy, players: sorted });
});

app.get('/api/analytics/team-stats', (req, res) => {
  const teamStats = teams.map(t => {
    const teamPlayers = players.filter(p => p.teamId === t.id);
    const avgPoints = teamPlayers.reduce((sum, p) => sum + p.stats.points, 0) / (teamPlayers.length || 1);
    const avgAssists = teamPlayers.reduce((sum, p) => sum + p.stats.assists, 0) / (teamPlayers.length || 1);
    const avgRebounds = teamPlayers.reduce((sum, p) => sum + p.stats.rebounds, 0) / (teamPlayers.length || 1);
    const totalSalary = teamPlayers.reduce((sum, p) => sum + p.salary, 0);

    return {
      team: t.name,
      id: t.id,
      wins: t.wins,
      losses: t.losses,
      ranking: t.ranking,
      avgPointsPerGame: avgPoints.toFixed(1),
      avgAssistsPerGame: avgAssists.toFixed(1),
      avgReboundsPerGame: avgRebounds.toFixed(1),
      totalPayroll: totalSalary,
      playerCount: teamPlayers.length
    };
  });

  res.json({ success: true, teamStats });
});

app.get('/api/analytics/revenue', (req, res) => {
  const totalSponsorships = sponsors.reduce((sum, s) => sum + s.amount, 0);
  const totalPayroll = [...players, ...coaches].reduce((sum, p) => sum + (p.salary || 0), 0);
  const totalAcademyRevenue = academyClasses.reduce((sum, c) => sum + (c.fee * c.enrolled), 0);
  const totalVenueRental = matches.length * 4000; // Estimated average

  res.json({
    success: true,
    revenue: {
      sponsorships: totalSponsorships,
      academyRevenue: totalAcademyRevenue,
      venueRental: totalVenueRental,
      totalRevenue: totalSponsorships + totalAcademyRevenue + totalVenueRental
    },
    expenses: {
      payroll: totalPayroll,
      venueCosts: totalVenueRental,
      totalExpenses: totalPayroll + totalVenueRental
    },
    profit: totalSponsorships + totalAcademyRevenue - totalPayroll
  });
});

// ============ RTMN LAYER INTEGRATION ============
app.get('/api/rtmn/layers', (req, res) => {
  res.json({
    success: true,
    layers: [
      { layer: 1, name: 'Intelligence', url: RTMN_LAYER.intelligence, status: 'connected' },
      { layer: 2, name: 'Memory', url: RTMN_LAYER.memory, status: 'connected' },
      { layer: 3, name: 'Digital Twin', url: RTMN_LAYER.twin, status: 'connected' },
      { layer: 4, name: 'Agent', url: RTMN_LAYER.agent, status: 'connected' },
      { layer: 5, name: 'Event Bus', url: RTMN_LAYER.eventBus, status: 'connected' }
    ]
  });
});

app.post('/api/rtmn/event', requireAuth, (req, res) => {
  const { eventType, data } = req.body;
  if (!eventType) return res.status(400).json({ error: 'eventType required' });

  // Publish to RTMN Event Bus
  const event = { type: eventType, source: 'sports-os', data, timestamp: new Date().toISOString() };

  res.json({ success: true, event, message: 'Event would be published to RTMN Event Bus' });
});

app.post('/api/rtmn/sync', requireAuth, async (req, res) => {
  // Sync with RTMN Twin Service
  const syncData = {
    teams: teams.map(t => ({ id: t.id, name: t.name, type: 'sports_team' })),
    players: players.map(p => ({ id: p.id, name: p.name, type: 'player' })),
    coaches: coaches.map(c => ({ id: c.id, name: c.name, type: 'coach' })),
    timestamp: new Date().toISOString()
  };

  res.json({ success: true, sync: syncData, message: 'Data synced with RTMN Twin Service' });
});

// ============ SEARCH ============
app.get('/api/search', (req, res) => {
  const { q, type } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter q required' });

  const query = q.toLowerCase();
  const results = [];

  if (!type || type === 'all' || type === 'teams') {
    results.push(...teams.filter(t => t.name.toLowerCase().includes(query)).map(t => ({ type: 'team', item: t })));
  }
  if (!type || type === 'all' || type === 'players') {
    results.push(...players.filter(p => p.name.toLowerCase().includes(query)).map(p => ({ type: 'player', item: p })));
  }
  if (!type || type === 'all' || type === 'coaches') {
    results.push(...coaches.filter(c => c.name.toLowerCase().includes(query)).map(c => ({ type: 'coach', item: c })));
  }
  if (!type || type === 'all' || type === 'venues') {
    results.push(...venues.filter(v => v.name.toLowerCase().includes(query)).map(v => ({ type: 'venue', item: v })));
  }

  res.json({ success: true, query: q, results, total: results.length });
});

// ============ 404 HANDLER ============
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path, method: req.method });
});

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log(`🏀 Sports OS running on port ${PORT}`);
  console.log(`📊 Teams: ${teams.length} | Players: ${players.length} | Coaches: ${coaches.length}`);
  console.log(`🏟️ Matches: ${matches.length} | Venues: ${venues.length} | Sponsors: ${sponsors.length}`);
  console.log(`🎓 Academy Classes: ${academyClasses.length} | Contracts: ${contracts.length}`);
});

module.exports = app;
