/**
 * Gaming OS - Complete Gaming/Esports Management Platform
 *
 * Industry: Gaming & Esports
 * Port: 5120
 *
 * Features:
 * - Game/Title Management
 * - Tournament/Event Management
 * - Team/Player Management
 * - Match/Stats Tracking
 * - Prize Pool Management
 * - Sponsorship/Brand Deals
 * - Streaming/Content Management
 * - Fan/Community Management
 * - Analytics
 * - RTMN Layer Integration
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5120;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============================================================
// SAMPLE DATA - 4 Games, 3 Tournaments, 5 Teams, 6 Players
// ============================================================

const games = new Map([
  ['G001', {
    id: 'G001',
    title: 'Valorant',
    publisher: 'Riot Games',
    genre: 'Tactical Shooter',
    releaseYear: 2020,
    platform: 'PC',
    playerCount: 5,
    logo: 'https://cdn.rtmn.com/games/valorant.png',
    active: true,
    tournaments: ['T001', 'T002'],
    totalPrizePool: 250000,
    createdAt: new Date('2024-01-15')
  }],
  ['G002', {
    id: 'G002',
    title: 'League of Legends',
    publisher: 'Riot Games',
    genre: 'MOBA',
    releaseYear: 2009,
    platform: 'PC',
    playerCount: 5,
    logo: 'https://cdn.rtmn.com/games/lol.png',
    active: true,
    tournaments: ['T003'],
    totalPrizePool: 500000,
    createdAt: new Date('2024-01-10')
  }],
  ['G003', {
    id: 'G003',
    title: 'BGMI',
    publisher: 'Krafton',
    genre: 'Battle Royale',
    releaseYear: 2018,
    platform: 'Mobile',
    playerCount: 4,
    logo: 'https://cdn.rtmn.com/games/bgmi.png',
    active: true,
    tournaments: ['T001'],
    totalPrizePool: 100000,
    createdAt: new Date('2024-02-01')
  }],
  ['G004', {
    id: 'G004',
    title: 'Counter-Strike 2',
    publisher: 'Valve',
    genre: 'Tactical Shooter',
    releaseYear: 2023,
    platform: 'PC',
    playerCount: 5,
    logo: 'https://cdn.rtmn.com/games/cs2.png',
    active: true,
    tournaments: ['T002', 'T003'],
    totalPrizePool: 750000,
    createdAt: new Date('2024-01-20')
  }]
]);

const tournaments = new Map([
  ['T001', {
    id: 'T001',
    name: 'RTMN Esports Championship 2024',
    gameId: 'G001',
    format: 'Double Elimination',
    teams: ['TM001', 'TM002', 'TM003'],
    prizePool: 100000,
    registrationOpen: true,
    status: 'upcoming',
    startDate: new Date('2024-07-01'),
    endDate: new Date('2024-07-15'),
    venue: 'Online',
    streamUrl: 'https://twitch.tv/rtmnesports',
    sponsors: ['SP001', 'SP003'],
    matches: ['M001', 'M002'],
    createdAt: new Date('2024-05-01')
  }],
  ['T002', {
    id: 'T002',
    name: 'South Asia Masters',
    gameId: 'G001',
    format: 'Group Stage + Knockout',
    teams: ['TM001', 'TM003', 'TM004'],
    prizePool: 150000,
    registrationOpen: false,
    status: 'live',
    startDate: new Date('2024-06-01'),
    endDate: new Date('2024-06-20'),
    venue: 'Mumbai Convention Center',
    streamUrl: 'https://youtube.com/rtmnesports',
    sponsors: ['SP002'],
    matches: ['M003', 'M004'],
    createdAt: new Date('2024-04-15')
  }],
  ['T003', {
    id: 'T003',
    name: 'World Gaming League',
    gameId: 'G002',
    format: 'Round Robin + Finals',
    teams: ['TM002', 'TM005'],
    prizePool: 500000,
    registrationOpen: false,
    status: 'completed',
    winner: 'TM002',
    startDate: new Date('2024-05-01'),
    endDate: new Date('2024-05-30'),
    venue: 'Singapore Expo',
    streamUrl: 'https://twitch.tv/wgl',
    sponsors: ['SP001', 'SP002', 'SP003'],
    matches: ['M005'],
    createdAt: new Date('2024-03-01')
  }]
]);

const teams = new Map([
  ['TM001', {
    id: 'TM001',
    name: 'Team Phoenix',
    tag: 'PHX',
    gameId: 'G001',
    region: 'South Asia',
    players: ['P001', 'P002', 'P003'],
    captain: 'P001',
    wins: 45,
    losses: 12,
    rating: 1850,
    logo: 'https://cdn.rtmn.com/teams/phoenix.png',
    sponsors: ['SP001'],
    earnings: 75000,
    founded: new Date('2022-03-15'),
    createdAt: new Date('2022-03-15')
  }],
  ['TM002', {
    id: 'TM002',
    name: 'Neon Warriors',
    tag: 'NWR',
    gameId: 'G002',
    region: 'Southeast Asia',
    players: ['P004', 'P005'],
    captain: 'P004',
    wins: 62,
    losses: 8,
    rating: 2100,
    logo: 'https://cdn.rtmn.com/teams/neon.png',
    sponsors: ['SP002', 'SP003'],
    earnings: 250000,
    founded: new Date('2021-06-01'),
    createdAt: new Date('2021-06-01')
  }],
  ['TM003', {
    id: 'TM003',
    name: 'Shadow Strikers',
    tag: 'SHS',
    gameId: 'G001',
    region: 'South Asia',
    players: ['P006', 'P001'],
    captain: 'P006',
    wins: 38,
    losses: 20,
    rating: 1720,
    logo: 'https://cdn.rtmn.com/teams/shadow.png',
    sponsors: [],
    earnings: 45000,
    founded: new Date('2023-01-10'),
    createdAt: new Date('2023-01-10')
  }],
  ['TM004', {
    id: 'TM004',
    name: 'Thunder Strike',
    tag: 'THS',
    gameId: 'G001',
    region: 'Middle East',
    players: ['P002', 'P006'],
    captain: 'P002',
    wins: 30,
    losses: 15,
    rating: 1680,
    logo: 'https://cdn.rtmn.com/teams/thunder.png',
    sponsors: ['SP003'],
    earnings: 35000,
    founded: new Date('2023-06-20'),
    createdAt: new Date('2023-06-20')
  }],
  ['TM005', {
    id: 'TM005',
    name: 'Dragon Slayers',
    tag: 'DGS',
    gameId: 'G002',
    region: 'East Asia',
    players: ['P004', 'P005'],
    captain: 'P005',
    wins: 55,
    losses: 10,
    rating: 2050,
    logo: 'https://cdn.rtmn.com/teams/dragon.png',
    sponsors: ['SP001'],
    earnings: 180000,
    founded: new Date('2021-09-01'),
    createdAt: new Date('2021-09-01')
  }]
]);

const players = new Map([
  ['P001', {
    id: 'P001',
    gamertag: 'Phoenix_Star',
    realName: 'Rahul Sharma',
    teamId: 'TM001',
    gameId: 'G001',
    role: 'Duelist',
    age: 22,
    country: 'India',
    rating: 1950,
    kda: 2.4,
    headshots: 38,
    matches: 156,
    wins: 98,
    earnings: 25000,
    twitch: 'phoenix_star',
    twitter: '@phoenix_star',
    avatar: 'https://cdn.rtmn.com/players/p001.png',
    achievements: ['MVP S1', 'Top Fragger'],
    social: { twitch: true, twitter: true, youtube: false },
    createdAt: new Date('2022-03-15')
  }],
  ['P002', {
    id: 'P002',
    gamertag: 'ThunderKing',
    realName: 'Arjun Patel',
    teamId: 'TM001',
    gameId: 'G001',
    role: 'Sentinel',
    age: 24,
    country: 'India',
    rating: 1880,
    kda: 1.9,
    headshots: 32,
    matches: 180,
    wins: 112,
    earnings: 20000,
    twitch: 'thunderking',
    twitter: '@thunderking',
    avatar: 'https://cdn.rtmn.com/players/p002.png',
    achievements: ['Best Support'],
    social: { twitch: true, twitter: true, youtube: true },
    createdAt: new Date('2022-03-15')
  }],
  ['P003', {
    id: 'P003',
    gamertag: 'ViperX',
    realName: 'Vikram Singh',
    teamId: 'TM001',
    gameId: 'G001',
    role: 'Controller',
    age: 21,
    country: 'India',
    rating: 1820,
    kda: 1.7,
    headshots: 28,
    matches: 120,
    wins: 75,
    earnings: 15000,
    twitch: 'viperx',
    twitter: '@viperx',
    avatar: 'https://cdn.rtmn.com/players/p003.png',
    achievements: [],
    social: { twitch: false, twitter: true, youtube: true },
    createdAt: new Date('2022-08-01')
  }],
  ['P004', {
    id: 'P004',
    gamertag: 'NeonBlade',
    realName: 'Tan Wei Jian',
    teamId: 'TM002',
    gameId: 'G002',
    role: 'Mid Lane',
    age: 25,
    country: 'Singapore',
    rating: 2150,
    kda: 4.2,
    csPerMin: 9.5,
    matches: 250,
    wins: 185,
    earnings: 120000,
    twitch: 'neonblade',
    twitter: '@neonblade_lol',
    avatar: 'https://cdn.rtmn.com/players/p004.png',
    achievements: ['World Champion 2023', 'MVP Finals', 'Best Mid'],
    social: { twitch: true, twitter: true, youtube: true },
    createdAt: new Date('2021-06-01')
  }],
  ['P005', {
    id: 'P005',
    gamertag: 'IceQueen',
    realName: 'Lee Min Ji',
    teamId: 'TM002',
    gameId: 'G002',
    role: 'ADC',
    age: 23,
    country: 'South Korea',
    rating: 2100,
    kda: 3.8,
    csPerMin: 10.2,
    matches: 220,
    wins: 160,
    earnings: 100000,
    twitch: 'icequeen',
    twitter: '@icequeen_lol',
    avatar: 'https://cdn.rtmn.com/players/p005.png',
    achievements: ['World Champion 2023', 'Best ADC'],
    social: { twitch: true, twitter: true, youtube: false },
    createdAt: new Date('2021-06-01')
  }],
  ['P006', {
    id: 'P006',
    gamertag: 'ShadowRider',
    realName: 'Faisal Ahmed',
    teamId: 'TM003',
    gameId: 'G001',
    role: 'Initiator',
    age: 20,
    country: 'Bangladesh',
    rating: 1750,
    kda: 1.6,
    headshots: 25,
    matches: 85,
    wins: 48,
    earnings: 8000,
    twitch: 'shadowrider',
    twitter: '@shadowrider',
    avatar: 'https://cdn.rtmn.com/players/p006.png',
    achievements: ['Rising Star'],
    social: { twitch: false, twitter: true, youtube: true },
    createdAt: new Date('2023-01-10')
  }]
]);

const sponsors = new Map([
  ['SP001', {
    id: 'SP001',
    name: 'TechGear Pro',
    tier: 'Platinum',
    logo: 'https://cdn.rtmn.com/sponsors/techgear.png',
    website: 'https://techgearpro.com',
    deals: ['T001', 'TM001', 'TM005'],
    totalValue: 150000,
    active: true,
    createdAt: new Date('2024-01-01')
  }],
  ['SP002', {
    id: 'SP002',
    name: 'EnergyX Drinks',
    tier: 'Gold',
    logo: 'https://cdn.rtmn.com/sponsors/energyx.png',
    website: 'https://energyxdrinks.com',
    deals: ['T002', 'T003', 'TM002'],
    totalValue: 100000,
    active: true,
    createdAt: new Date('2024-02-01')
  }],
  ['SP003', {
    id: 'SP003',
    name: 'GameZone Store',
    tier: 'Silver',
    logo: 'https://cdn.rtmn.com/sponsors/gamezone.png',
    website: 'https://gamezonestore.com',
    deals: ['T001', 'T003', 'TM001', 'TM004'],
    totalValue: 50000,
    active: true,
    createdAt: new Date('2024-03-01')
  }]
]);

const matches = new Map([
  ['M001', {
    id: 'M001',
    tournamentId: 'T001',
    teamA: 'TM001',
    teamB: 'TM002',
    scoreA: 13,
    scoreB: 9,
    map: 'Ascent',
    status: 'completed',
    winner: 'TM001',
    mvp: 'P001',
    streamUrl: 'https://twitch.tv/rtmnesports',
    scheduledAt: new Date('2024-07-05T18:00:00Z'),
    completedAt: new Date('2024-07-05T19:45:00Z'),
    createdAt: new Date('2024-07-01')
  }],
  ['M002', {
    id: 'M002',
    tournamentId: 'T001',
    teamA: 'TM003',
    teamB: 'TM001',
    scoreA: 11,
    scoreB: 13,
    map: 'Bind',
    status: 'completed',
    winner: 'TM001',
    mvp: 'P002',
    streamUrl: 'https://twitch.tv/rtmnesports',
    scheduledAt: new Date('2024-07-06T18:00:00Z'),
    completedAt: new Date('2024-07-06T20:00:00Z'),
    createdAt: new Date('2024-07-01')
  }],
  ['M003', {
    id: 'M003',
    tournamentId: 'T002',
    teamA: 'TM001',
    teamB: 'TM004',
    scoreA: 13,
    scoreB: 7,
    map: 'Haven',
    status: 'completed',
    winner: 'TM001',
    mvp: 'P003',
    streamUrl: 'https://youtube.com/rtmnesports',
    scheduledAt: new Date('2024-06-10T16:00:00Z'),
    completedAt: new Date('2024-06-10T17:30:00Z'),
    createdAt: new Date('2024-06-01')
  }],
  ['M004', {
    id: 'M004',
    tournamentId: 'T002',
    teamA: 'TM001',
    teamB: 'TM003',
    scoreA: 8,
    scoreB: 0,
    map: 'Split',
    status: 'live',
    winner: null,
    mvp: null,
    streamUrl: 'https://youtube.com/rtmnesports',
    scheduledAt: new Date('2024-06-15T18:00:00Z'),
    completedAt: null,
    createdAt: new Date('2024-06-01')
  }],
  ['M005', {
    id: 'M005',
    tournamentId: 'T003',
    teamA: 'TM002',
    teamB: 'TM005',
    scoreA: 3,
    scoreB: 1,
    map: 'Summoner\'s Rift',
    status: 'completed',
    winner: 'TM002',
    mvp: 'P004',
    streamUrl: 'https://twitch.tv/wgl',
    scheduledAt: new Date('2024-05-25T14:00:00Z'),
    completedAt: new Date('2024-05-25T18:00:00Z'),
    createdAt: new Date('2024-05-01')
  }]
]);

const streams = new Map([
  ['ST001', {
    id: 'ST001',
    playerId: 'P001',
    platform: 'twitch',
    title: 'Grinding Ranked - Road to Immortal',
    viewers: 2500,
    followers: 15000,
    live: true,
    scheduledAt: new Date('2024-07-20T15:00:00Z'),
    createdAt: new Date('2024-07-20')
  }],
  ['ST002', {
    id: 'ST002',
    playerId: 'P004',
    platform: 'twitch',
    title: 'World Champion Coaching Session',
    viewers: 8000,
    followers: 50000,
    live: true,
    scheduledAt: new Date('2024-07-20T10:00:00Z'),
    createdAt: new Date('2024-07-20')
  }]
]);

const fans = new Map([
  ['F001', {
    id: 'F001',
    username: 'GamingFan_India',
    email: 'fan1@example.com',
    favoriteTeams: ['TM001', 'TM003'],
    favoritePlayers: ['P001', 'P006'],
    points: 1500,
    badges: ['Early Adopter', 'Tournament Viewer'],
    createdAt: new Date('2024-01-01')
  }],
  ['F002', {
    id: 'F002',
    username: 'EsportsLover_SG',
    email: 'fan2@example.com',
    favoriteTeams: ['TM002'],
    favoritePlayers: ['P004', 'P005'],
    points: 3200,
    badges: ['Champion Supporter', 'Top Contributor'],
    createdAt: new Date('2023-06-15')
  }]
]);

// Auth storage
const authUsers = new Map();
const authSessions = new Map();

// Initialize demo user
authUsers.set('admin@rtmn.gaming', {
  id: 'U001',
  email: 'admin@rtmn.gaming',
  password: 'gaming2024',
  name: 'Gaming Admin',
  role: 'admin'
});

// ============================================================
// AUTH MIDDLEWARE
// ============================================================

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const session = authSessions.get(token);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized - Invalid or expired token' });
  }

  req.user = session.user;
  next();
};

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Gaming OS',
    port: PORT,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      games: games.size,
      tournaments: tournaments.size,
      teams: teams.size,
      players: players.size,
      matches: matches.size,
      sponsors: sponsors.size,
      streams: streams.size,
      fans: fans.size
    }
  });
});

// ============================================================
// AUTH ROUTES
// ============================================================

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  const user = authUsers.get(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = uuidv4();
  const session = {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    createdAt: new Date()
  };

  authSessions.set(token, session);

  res.json({
    token,
    user: session.user,
    expiresIn: 86400
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;

  if (authUsers.has(email)) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const userId = 'U' + uuidv4().slice(0, 8).toUpperCase();
  const user = {
    id: userId,
    email,
    password,
    name,
    role: 'user'
  };

  authUsers.set(email, user);

  const token = uuidv4();
  const session = {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    createdAt: new Date()
  };

  authSessions.set(token, session);

  res.status(201).json({
    token,
    user: session.user,
    expiresIn: 86400
  });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.split(' ')[1];
  authSessions.delete(token);
  res.json({ message: 'Logged out successfully' });
});

// ============================================================
// GAMES ROUTES
// ============================================================

app.get('/api/games', (req, res) => {
  const { genre, platform, active } = req.query;
  let result = Array.from(games.values());

  if (genre) result = result.filter(g => g.genre.toLowerCase().includes(genre.toLowerCase()));
  if (platform) result = result.filter(g => g.platform.toLowerCase() === platform.toLowerCase());
  if (active !== undefined) result = result.filter(g => g.active === (active === 'true'));

  res.json({ games: result, count: result.length });
});

app.get('/api/games/:id', (req, res) => {
  const game = games.get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  // Include related tournaments and teams
  const gameTournaments = Array.from(tournaments.values()).filter(t => t.gameId === game.id);
  const gameTeams = Array.from(teams.values()).filter(t => t.gameId === game.id);

  res.json({
    ...game,
    tournaments: gameTournaments,
    teams: gameTeams
  });
});

app.post('/api/games', requireAuth, (req, res) => {
  const { title, publisher, genre, releaseYear, platform, playerCount } = req.body;

  const id = 'G' + uuidv4().slice(0, 3).toUpperCase();
  const game = {
    id,
    title,
    publisher,
    genre,
    releaseYear,
    platform,
    playerCount,
    active: true,
    tournaments: [],
    totalPrizePool: 0,
    logo: `https://cdn.rtmn.com/games/${title.toLowerCase().replace(/\s/g, '')}.png`,
    createdAt: new Date()
  };

  games.set(id, game);
  res.status(201).json(game);
});

app.put('/api/games/:id', requireAuth, (req, res) => {
  const game = games.get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  const updated = { ...game, ...req.body, id: game.id };
  games.set(req.params.id, updated);
  res.json(updated);
});

app.delete('/api/games/:id', requireAuth, (req, res) => {
  if (!games.has(req.params.id)) return res.status(404).json({ error: 'Game not found' });
  games.delete(req.params.id);
  res.json({ message: 'Game deleted' });
});

// ============================================================
// TOURNAMENTS ROUTES
// ============================================================

app.get('/api/tournaments', (req, res) => {
  const { status, gameId } = req.query;
  let result = Array.from(tournaments.values());

  if (status) result = result.filter(t => t.status === status);
  if (gameId) result = result.filter(t => t.gameId === gameId);

  res.json({ tournaments: result, count: result.length });
});

app.get('/api/tournaments/:id', (req, res) => {
  const tournament = tournaments.get(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  const tournamentMatches = Array.from(matches.values()).filter(m => m.tournamentId === tournament.id);
  const tournamentSponsors = tournament.sponsors.map(sid => sponsors.get(sid)).filter(Boolean);
  const game = games.get(tournament.gameId);
  const tournamentTeams = tournament.teams.map(tid => teams.get(tid)).filter(Boolean);

  res.json({
    ...tournament,
    matches: tournamentMatches,
    sponsors: tournamentSponsors,
    game,
    teams: tournamentTeams
  });
});

app.post('/api/tournaments', requireAuth, (req, res) => {
  const { name, gameId, format, prizePool, startDate, endDate, venue } = req.body;

  const id = 'T' + uuidv4().slice(0, 3).toUpperCase();
  const tournament = {
    id,
    name,
    gameId,
    format,
    teams: [],
    prizePool,
    registrationOpen: true,
    status: 'upcoming',
    winner: null,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    venue,
    streamUrl: null,
    sponsors: [],
    matches: [],
    createdAt: new Date()
  };

  tournaments.set(id, tournament);
  res.status(201).json(tournament);
});

app.put('/api/tournaments/:id', requireAuth, (req, res) => {
  const tournament = tournaments.get(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  const updated = { ...tournament, ...req.body, id: tournament.id };
  tournaments.set(req.params.id, updated);
  res.json(updated);
});

app.post('/api/tournaments/:id/register', requireAuth, (req, res) => {
  const { teamId } = req.body;
  const tournament = tournaments.get(req.params.id);

  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
  if (!tournament.registrationOpen) return res.status(400).json({ error: 'Registration closed' });
  if (tournament.teams.includes(teamId)) return res.status(400).json({ error: 'Team already registered' });

  tournament.teams.push(teamId);
  tournaments.set(req.params.id, tournament);
  res.json({ message: 'Team registered', tournament });
});

// ============================================================
// TEAMS ROUTES
// ============================================================

app.get('/api/teams', (req, res) => {
  const { gameId, region } = req.query;
  let result = Array.from(teams.values());

  if (gameId) result = result.filter(t => t.gameId === gameId);
  if (region) result = result.filter(t => t.region.toLowerCase().includes(region.toLowerCase()));

  // Sort by rating descending
  result.sort((a, b) => b.rating - a.rating);

  res.json({ teams: result, count: result.length });
});

app.get('/api/teams/:id', (req, res) => {
  const team = teams.get(req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  const teamPlayers = team.players.map(pid => players.get(pid)).filter(Boolean);
  const teamMatches = Array.from(matches.values()).filter(m =>
    m.teamA === team.id || m.teamB === team.id
  );

  res.json({
    ...team,
    players: teamPlayers,
    recentMatches: teamMatches.slice(-5)
  });
});

app.post('/api/teams', requireAuth, (req, res) => {
  const { name, tag, gameId, region } = req.body;

  const id = 'TM' + uuidv4().slice(0, 3).toUpperCase();
  const team = {
    id,
    name,
    tag,
    gameId,
    region,
    players: [],
    captain: null,
    wins: 0,
    losses: 0,
    rating: 1000,
    logo: `https://cdn.rtmn.com/teams/${tag.toLowerCase()}.png`,
    sponsors: [],
    earnings: 0,
    founded: new Date(),
    createdAt: new Date()
  };

  teams.set(id, team);
  res.status(201).json(team);
});

app.put('/api/teams/:id', requireAuth, (req, res) => {
  const team = teams.get(req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  const updated = { ...team, ...req.body, id: team.id };
  teams.set(req.params.id, updated);
  res.json(updated);
});

app.post('/api/teams/:id/players', requireAuth, (req, res) => {
  const { playerId } = req.body;
  const team = teams.get(req.params.id);
  const player = players.get(playerId);

  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (!player) return res.status(404).json({ error: 'Player not found' });

  team.players.push(playerId);
  player.teamId = team.id;

  teams.set(team.id, team);
  players.set(player.id, player);

  res.json({ message: 'Player added to team', team, player });
});

// ============================================================
// PLAYERS ROUTES
// ============================================================

app.get('/api/players', (req, res) => {
  const { teamId, gameId, country, role } = req.query;
  let result = Array.from(players.values());

  if (teamId) result = result.filter(p => p.teamId === teamId);
  if (gameId) result = result.filter(p => p.gameId === gameId);
  if (country) result = result.filter(p => p.country.toLowerCase().includes(country.toLowerCase()));
  if (role) result = result.filter(p => p.role.toLowerCase() === role.toLowerCase());

  // Sort by rating descending
  result.sort((a, b) => b.rating - a.rating);

  res.json({ players: result, count: result.length });
});

app.get('/api/players/:id', (req, res) => {
  const player = players.get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const team = teams.get(player.teamId);
  const playerMatches = Array.from(matches.values()).filter(m =>
    m.mvp === player.id
  );

  res.json({
    ...player,
    team,
    mvpAwards: playerMatches.length
  });
});

app.post('/api/players', requireAuth, (req, res) => {
  const { gamertag, realName, gameId, role, age, country } = req.body;

  const id = 'P' + uuidv4().slice(0, 3).toUpperCase();
  const player = {
    id,
    gamertag,
    realName,
    teamId: null,
    gameId,
    role,
    age,
    country,
    rating: 1000,
    kda: 0,
    matches: 0,
    wins: 0,
    earnings: 0,
    achievements: [],
    social: { twitch: false, twitter: false, youtube: false },
    avatar: `https://cdn.rtmn.com/players/${id.toLowerCase()}.png`,
    createdAt: new Date()
  };

  players.set(id, player);
  res.status(201).json(player);
});

app.put('/api/players/:id', requireAuth, (req, res) => {
  const player = players.get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const updated = { ...player, ...req.body, id: player.id };
  players.set(req.params.id, updated);
  res.json(updated);
});

// ============================================================
// MATCHES ROUTES
// ============================================================

app.get('/api/matches', (req, res) => {
  const { tournamentId, status, teamA, teamB } = req.query;
  let result = Array.from(matches.values());

  if (tournamentId) result = result.filter(m => m.tournamentId === tournamentId);
  if (status) result = result.filter(m => m.status === status);
  if (teamA) result = result.filter(m => m.teamA === teamA || m.teamB === teamA);
  if (teamB) result = result.filter(m => m.teamA === teamB || m.teamB === teamB);

  res.json({ matches: result, count: result.length });
});

app.get('/api/matches/:id', (req, res) => {
  const match = matches.get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const teamAData = teams.get(match.teamA);
  const teamBData = teams.get(match.teamB);
  const mvpPlayer = players.get(match.mvp);
  const tournament = tournaments.get(match.tournamentId);

  res.json({
    ...match,
    teamAData,
    teamBData,
    mvpPlayer,
    tournament
  });
});

app.post('/api/matches', requireAuth, (req, res) => {
  const { tournamentId, teamA, teamB, map, scheduledAt } = req.body;

  const id = 'M' + uuidv4().slice(0, 3).toUpperCase();
  const match = {
    id,
    tournamentId,
    teamA,
    teamB,
    scoreA: 0,
    scoreB: 0,
    map,
    status: 'scheduled',
    winner: null,
    mvp: null,
    streamUrl: null,
    scheduledAt: new Date(scheduledAt),
    completedAt: null,
    createdAt: new Date()
  };

  matches.set(id, match);
  res.status(201).json(match);
});

app.put('/api/matches/:id', requireAuth, (req, res) => {
  const match = matches.get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const updated = { ...match, ...req.body, id: match.id };
  matches.set(req.params.id, updated);
  res.json(updated);
});

app.post('/api/matches/:id/complete', requireAuth, (req, res) => {
  const { scoreA, scoreB, winner, mvp } = req.body;
  const match = matches.get(req.params.id);

  if (!match) return res.status(404).json({ error: 'Match not found' });

  match.scoreA = scoreA;
  match.scoreB = scoreB;
  match.winner = winner;
  match.mvp = mvp;
  match.status = 'completed';
  match.completedAt = new Date();

  // Update team stats
  const teamA = teams.get(match.teamA);
  const teamB = teams.get(match.teamB);

  if (teamA) {
    if (winner === teamA.id) {
      teamA.wins++;
    } else {
      teamA.losses++;
    }
    teamA.rating = Math.min(2500, teamA.rating + (winner === teamA.id ? 25 : -15));
    teams.set(teamA.id, teamA);
  }

  if (teamB) {
    if (winner === teamB.id) {
      teamB.wins++;
    } else {
      teamB.losses++;
    }
    teamB.rating = Math.min(2500, teamB.rating + (winner === teamB.id ? 25 : -15));
    teams.set(teamB.id, teamB);
  }

  matches.set(match.id, match);
  res.json({ message: 'Match completed', match, teamA, teamB });
});

// ============================================================
// SPONSORS ROUTES
// ============================================================

app.get('/api/sponsors', (req, res) => {
  const { tier, active } = req.query;
  let result = Array.from(sponsors.values());

  if (tier) result = result.filter(s => s.tier.toLowerCase() === tier.toLowerCase());
  if (active !== undefined) result = result.filter(s => s.active === (active === 'true'));

  res.json({ sponsors: result, count: result.length });
});

app.get('/api/sponsors/:id', (req, res) => {
  const sponsor = sponsors.get(req.params.id);
  if (!sponsor) return res.status(404).json({ error: 'Sponsor not found' });

  const sponsorTournaments = sponsor.deals.filter(d => d.startsWith('T')).map(tid => tournaments.get(tid)).filter(Boolean);
  const sponsorTeams = sponsor.deals.filter(d => d.startsWith('TM')).map(tid => teams.get(tid)).filter(Boolean);

  res.json({
    ...sponsor,
    tournaments: sponsorTournaments,
    teams: sponsorTeams
  });
});

app.post('/api/sponsors', requireAuth, (req, res) => {
  const { name, tier, website } = req.body;

  const id = 'SP' + uuidv4().slice(0, 3).toUpperCase();
  const sponsor = {
    id,
    name,
    tier,
    logo: `https://cdn.rtmn.com/sponsors/${name.toLowerCase().replace(/\s/g, '')}.png`,
    website,
    deals: [],
    totalValue: 0,
    active: true,
    createdAt: new Date()
  };

  sponsors.set(id, sponsor);
  res.status(201).json(sponsor);
});

app.put('/api/sponsors/:id', requireAuth, (req, res) => {
  const sponsor = sponsors.get(req.params.id);
  if (!sponsor) return res.status(404).json({ error: 'Sponsor not found' });

  const updated = { ...sponsor, ...req.body, id: sponsor.id };
  sponsors.set(req.params.id, updated);
  res.json(updated);
});

// ============================================================
// STREAMS ROUTES
// ============================================================

app.get('/api/streams', (req, res) => {
  const { platform, live, playerId } = req.query;
  let result = Array.from(streams.values());

  if (platform) result = result.filter(s => s.platform === platform);
  if (live !== undefined) result = result.filter(s => s.live === (live === 'true'));
  if (playerId) result = result.filter(s => s.playerId === playerId);

  res.json({ streams: result, count: result.length });
});

app.get('/api/streams/:id', (req, res) => {
  const stream = streams.get(req.params.id);
  if (!stream) return res.status(404).json({ error: 'Stream not found' });

  const streamer = players.get(stream.playerId);
  res.json({ ...stream, streamer });
});

app.post('/api/streams', requireAuth, (req, res) => {
  const { playerId, platform, title, scheduledAt } = req.body;

  const id = 'ST' + uuidv4().slice(0, 3).toUpperCase();
  const stream = {
    id,
    playerId,
    platform,
    title,
    viewers: 0,
    followers: 0,
    live: false,
    scheduledAt: new Date(scheduledAt),
    createdAt: new Date()
  };

  streams.set(id, stream);
  res.status(201).json(stream);
});

app.put('/api/streams/:id', requireAuth, (req, res) => {
  const stream = streams.get(req.params.id);
  if (!stream) return res.status(404).json({ error: 'Stream not found' });

  const updated = { ...stream, ...req.body, id: stream.id };
  streams.set(req.params.id, updated);
  res.json(updated);
});

// ============================================================
// FANS ROUTES
// ============================================================

app.get('/api/fans', (req, res) => {
  let result = Array.from(fans.values());
  result.sort((a, b) => b.points - a.points);
  res.json({ fans: result, count: result.length });
});

app.get('/api/fans/:id', (req, res) => {
  const fan = fans.get(req.params.id);
  if (!fan) return res.status(404).json({ error: 'Fan not found' });

  const favoriteTeamsData = fan.favoriteTeams.map(tid => teams.get(tid)).filter(Boolean);
  const favoritePlayersData = fan.favoritePlayers.map(pid => players.get(pid)).filter(Boolean);

  res.json({
    ...fan,
    favoriteTeams: favoriteTeamsData,
    favoritePlayers: favoritePlayersData
  });
});

app.post('/api/fans', (req, res) => {
  const { username, email } = req.body;

  const id = 'F' + uuidv4().slice(0, 3).toUpperCase();
  const fan = {
    id,
    username,
    email,
    favoriteTeams: [],
    favoritePlayers: [],
    points: 100,
    badges: ['New Fan'],
    createdAt: new Date()
  };

  fans.set(id, fan);
  res.status(201).json(fan);
});

app.post('/api/fans/:id/follow/team', requireAuth, (req, res) => {
  const { teamId } = req.body;
  const fan = fans.get(req.params.id);
  const team = teams.get(teamId);

  if (!fan) return res.status(404).json({ error: 'Fan not found' });
  if (!team) return res.status(404).json({ error: 'Team not found' });

  if (!fan.favoriteTeams.includes(teamId)) {
    fan.favoriteTeams.push(teamId);
    fan.points += 50;
    fans.set(fan.id, fan);
  }

  res.json({ message: 'Team followed', fan });
});

app.post('/api/fans/:id/follow/player', requireAuth, (req, res) => {
  const { playerId } = req.body;
  const fan = fans.get(req.params.id);
  const player = players.get(playerId);

  if (!fan) return res.status(404).json({ error: 'Fan not found' });
  if (!player) return res.status(404).json({ error: 'Player not found' });

  if (!fan.favoritePlayers.includes(playerId)) {
    fan.favoritePlayers.push(playerId);
    fan.points += 25;
    fans.set(fan.id, fan);
  }

  res.json({ message: 'Player followed', fan });
});

// ============================================================
// ANALYTICS ROUTES
// ============================================================

app.get('/api/analytics/overview', (req, res) => {
  const allMatches = Array.from(matches.values());
  const completedMatches = allMatches.filter(m => m.status === 'completed');
  const liveMatches = allMatches.filter(m => m.status === 'live');

  const totalPrizePools = Array.from(tournaments.values()).reduce((sum, t) => sum + t.prizePool, 0);
  const totalEarnings = Array.from(players.values()).reduce((sum, p) => sum + p.earnings, 0);
  const totalViewers = Array.from(streams.values()).filter(s => s.live).reduce((sum, s) => sum + s.viewers, 0);

  const topPlayers = Array.from(players.values())
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  const topTeams = Array.from(teams.values())
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  res.json({
    overview: {
      totalGames: games.size,
      activeTournaments: tournaments.size,
      totalTeams: teams.size,
      totalPlayers: players.size,
      totalMatches: allMatches.length,
      completedMatches: completedMatches.length,
      liveMatches: liveMatches.length,
      totalPrizePools,
      totalEarnings,
      totalViewers
    },
    topPlayers,
    topTeams
  });
});

app.get('/api/analytics/tournaments', (req, res) => {
  const tournamentStats = Array.from(tournaments.values()).map(t => {
    const tournamentMatches = Array.from(matches.values()).filter(m => m.tournamentId === t.id);
    const game = games.get(t.gameId);
    return {
      id: t.id,
      name: t.name,
      game: game?.title,
      status: t.status,
      prizePool: t.prizePool,
      teams: t.teams.length,
      matches: tournamentMatches.length,
      viewership: tournamentMatches.reduce((sum, m) => sum + (m.status === 'live' ? 5000 : 0), 0)
    };
  });

  res.json({ tournamentStats });
});

app.get('/api/analytics/teams', (req, res) => {
  const teamStats = Array.from(teams.values()).map(t => {
    const teamMatches = Array.from(matches.values()).filter(m => m.teamA === t.id || m.teamB === t.id);
    const teamPlayers = t.players.map(pid => players.get(pid)).filter(Boolean);
    const winRate = t.wins + t.losses > 0 ? (t.wins / (t.wins + t.losses) * 100).toFixed(1) : 0;

    return {
      id: t.id,
      name: t.name,
      tag: t.tag,
      region: t.region,
      rating: t.rating,
      wins: t.wins,
      losses: t.losses,
      winRate,
      earnings: t.earnings,
      players: teamPlayers.length,
      matchesPlayed: teamMatches.length
    };
  });

  res.json({ teamStats });
});

// ============================================================
// RTMN LAYER INTEGRATION
// ============================================================

app.get('/api/layers', (req, res) => {
  res.json({
    layers: [
      { id: 1, name: 'Intelligence', endpoint: '/api/layer/intelligence' },
      { id: 2, name: 'Customer Growth', endpoint: '/api/layer/customer-growth' },
      { id: 3, name: 'Commerce', endpoint: '/api/layer/commerce' },
      { id: 4, name: 'Financial', endpoint: '/api/layer/finance' },
      { id: 5, name: 'Workforce', endpoint: '/api/layer/workforce' },
      { id: 6, name: 'Legal & Trust', endpoint: '/api/layer/legal' },
      { id: 7, name: 'Property', endpoint: '/api/layer/property' },
      { id: 8, name: 'Health', endpoint: '/api/layer/health' },
      { id: 9, name: 'Mobility', endpoint: '/api/layer/mobility' },
      { id: 10, name: 'Identity', endpoint: '/api/layer/identity' },
      { id: 11, name: 'Memory', endpoint: '/api/layer/memory' },
      { id: 12, name: 'Twins', endpoint: '/api/layer/twins' },
      { id: 13, name: 'Automation', endpoint: '/api/layer/automation' },
      { id: 14, name: 'Autonomous', endpoint: '/api/layer/autonomous' },
      { id: 15, name: 'Network', endpoint: '/api/layer/network' }
    ]
  });
});

app.get('/api/layer/intelligence', (req, res) => {
  res.json({
    layer: 1,
    name: 'Intelligence',
    services: [
      { name: 'AI Copilot', port: 4765, status: 'available' },
      { name: 'AI Agents', port: 4764, status: 'available' },
      { name: 'Analytics', port: 4761, status: 'available' }
    ],
    gamingFeatures: {
      playerMatching: 'AI-powered team balancing',
      matchPrediction: 'ML-based outcome prediction',
      performanceAnalysis: 'Player stats intelligence',
      contentModeration: 'AI chat moderation'
    }
  });
});

app.get('/api/layer/customer-growth', (req, res) => {
  res.json({
    layer: 2,
    name: 'Customer Growth',
    services: [
      { name: 'CRM Hub', port: 4056, status: 'available' },
      { name: 'AdBazaar', port: 5000, status: 'available' }
    ],
    gamingFeatures: {
      fanEngagement: 'Fan tracking and loyalty',
      sponsorshipDeals: 'Brand partnership management',
      communityBuilding: 'Social features integration',
      streamingAnalytics: 'Viewership tracking'
    }
  });
});

app.get('/api/layer/commerce', (req, res) => {
  res.json({
    layer: 3,
    name: 'Commerce',
    services: [
      { name: 'REZ-Merchant', port: 4800, status: 'available' },
      { name: 'Payments', port: 4803, status: 'available' }
    ],
    gamingFeatures: {
      ticketSales: 'Tournament ticket purchasing',
      merchandise: 'Team/event merchandise',
      inGamePurchases: 'Virtual item sales',
      prizeDisbursement: 'Automated prize payments'
    }
  });
});

app.get('/api/layer/finance', (req, res) => {
  res.json({
    layer: 4,
    name: 'Financial',
    services: [
      { name: 'Wallet', port: 4004, status: 'available' },
      { name: 'Event Bus', port: 4510, status: 'available' }
    ],
    gamingFeatures: {
      prizePools: 'Prize pool management',
      playerEarnings: 'Earnings tracking and payouts',
      sponsorshipPayments: 'Brand deal financial tracking',
      teamFinances: 'Team revenue and expenses'
    }
  });
});

app.get('/api/layer/twins', (req, res) => {
  res.json({
    layer: 12,
    name: 'Twins',
    services: [
      { name: 'TwinOS Hub', port: 4705, status: 'available' }
    ],
    gamingTwins: {
      playerTwin: {
        description: 'Complete player profile with stats, achievements, and history',
        dataPoints: ['Performance', 'Achievements', 'Social', 'Financial']
      },
      teamTwin: {
        description: 'Team profile with roster, history, and brand value',
        dataPoints: ['Roster', 'Tournaments', 'Sponsors', 'Earnings']
      },
      tournamentTwin: {
        description: 'Tournament metadata and historical data',
        dataPoints: ['Format', 'Participants', 'Results', 'Viewership']
      }
    }
  });
});

app.get('/api/layer/autonomous', (req, res) => {
  res.json({
    layer: 14,
    name: 'Autonomous',
    services: [
      { name: 'SUTAR OS', port: 4140, status: 'available' },
      { name: 'Goal OS', port: 4242, status: 'available' },
      { name: 'Agent Economy', port: 4251, status: 'available' }
    ],
    gamingFeatures: {
      autonomousCoaching: 'AI agent provides training recommendations',
      automatedScheduling: 'Tournament scheduling automation',
      smartPrizeDistribution: 'Automated prize calculations',
      fraudDetection: 'Anti-cheat AI monitoring'
    }
  });
});

// ============================================================
// PRIZE POOL ROUTES
// ============================================================

app.get('/api/prize-pools', (req, res) => {
  const { tournamentId, year } = req.query;
  let result = Array.from(tournaments.values());

  if (tournamentId) result = result.filter(t => t.id === tournamentId);
  if (year) {
    result = result.filter(t => new Date(t.startDate).getFullYear() === parseInt(year));
  }

  const totalPrizePool = result.reduce((sum, t) => sum + t.prizePool, 0);
  const distribution = {
    first: Math.round(totalPrizePool * 0.5),
    second: Math.round(totalPrizePool * 0.25),
    third: Math.round(totalPrizePool * 0.15),
    fourth: Math.round(totalPrizePool * 0.1)
  };

  res.json({
    tournaments: result.map(t => ({
      id: t.id,
      name: t.name,
      prizePool: t.prizePool,
      winner: t.winner ? teams.get(t.winner)?.name : null
    })),
    totalPrizePool,
    distribution
  });
});

// ============================================================
// LEADERBOARD ROUTES
// ============================================================

app.get('/api/leaderboard/players', (req, res) => {
  const { gameId, limit } = req.query;
  let result = Array.from(players.values());

  if (gameId) result = result.filter(p => p.gameId === gameId);
  result.sort((a, b) => b.rating - a.rating);
  if (limit) result = result.slice(0, parseInt(limit));

  res.json({
    leaderboard: result.map((p, idx) => ({
      rank: idx + 1,
      id: p.id,
      gamertag: p.gamertag,
      team: teams.get(p.teamId)?.name || 'Free Agent',
      rating: p.rating,
      country: p.country,
      earnings: p.earnings,
      mvpAwards: Array.from(matches.values()).filter(m => m.mvp === p.id).length
    }))
  });
});

app.get('/api/leaderboard/teams', (req, res) => {
  const { gameId, limit } = req.query;
  let result = Array.from(teams.values());

  if (gameId) result = result.filter(t => t.gameId === gameId);
  result.sort((a, b) => b.rating - a.rating);
  if (limit) result = result.slice(0, parseInt(limit));

  res.json({
    leaderboard: result.map((t, idx) => ({
      rank: idx + 1,
      id: t.id,
      name: t.name,
      tag: t.tag,
      region: t.region,
      rating: t.rating,
      wins: t.wins,
      losses: t.losses,
      earnings: t.earnings,
      playerCount: t.players.length
    }))
  });
});

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║     🎮 GAMING OS - Esports Management Platform              ║
║                                                            ║
║     Port: ${PORT}                                            ║
║     Status: RUNNING                                         ║
║                                                            ║
║     Sample Data:                                           ║
║     • 4 Games (Valorant, LoL, BGMI, CS2)                   ║
║     • 3 Tournaments                                        ║
║     • 5 Teams                                              ║
║     • 6 Players                                            ║
║     • 5 Matches                                            ║
║     • 3 Sponsors                                           ║
║                                                            ║
║     Auth: admin@rtmn.gaming / gaming2024                   ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
