/**
 * Account Routes — provider catalog + connect/disconnect + sample data
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const PROVIDERS = {
  google_calendar: {
    name: 'Google Calendar',
    icon: '📅',
    color: '#4285F4',
    category: 'productivity',
    scopes: ['calendar.readonly'],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?...',
  },
  gmail: {
    name: 'Gmail',
    icon: '✉️',
    color: '#EA4335',
    category: 'productivity',
    scopes: ['gmail.readonly'],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?...',
  },
  google_photos: {
    name: 'Google Photos',
    icon: '📸',
    color: '#FBBC04',
    category: 'media',
    scopes: ['photos.readonly'],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?...',
  },
  apple_health: {
    name: 'Apple Health',
    icon: '❤️',
    color: '#FF2D55',
    category: 'health',
    scopes: ['steps', 'sleep', 'heart_rate', 'workouts'],
    authUrl: 'health://...',
  },
  apple_photos: {
    name: 'Apple Photos',
    icon: '🖼️',
    color: '#007AFF',
    category: 'media',
    scopes: ['photos.readonly'],
    authUrl: 'photos-redirect://...',
  },
  bank_plaid: {
    name: 'Plaid Banking',
    icon: '🏦',
    color: '#111111',
    category: 'finance',
    scopes: ['transactions', 'balance'],
    authUrl: 'https://plaid.com/oauth/...',
  },
  contacts: {
    name: 'Contacts',
    icon: '👥',
    color: '#5856D6',
    category: 'social',
    scopes: ['contacts.readonly'],
    authUrl: 'addressbook://...',
  },
  slack: {
    name: 'Slack',
    icon: '💬',
    color: '#4A154B',
    category: 'work',
    scopes: ['channels:read', 'chat:write'],
    authUrl: 'https://slack.com/oauth/...',
  },
  github: {
    name: 'GitHub',
    icon: '🐙',
    color: '#181717',
    category: 'work',
    scopes: ['repo', 'read:user'],
    authUrl: 'https://github.com/login/oauth/...',
  },
  notion: {
    name: 'Notion',
    icon: '📝',
    color: '#000000',
    category: 'productivity',
    scopes: ['read_content', 'read_user'],
    authUrl: 'https://api.notion.com/v1/oauth/...',
  },
};

// Sample data mocks per provider
const SAMPLE_DATA = {
  google_calendar: () => ({
    events: [
      { id: 'evt-1', title: 'Team standup', start: new Date(Date.now() + 3600000).toISOString(), attendees: 5 },
      { id: 'evt-2', title: 'Investor call', start: new Date(Date.now() + 86400000).toISOString(), attendees: 2 },
      { id: 'evt-3', title: 'Yoga', start: new Date(Date.now() + 2 * 86400000).toISOString(), attendees: 1 },
    ],
    nextSync: new Date(Date.now() + 3600000).toISOString(),
  }),
  gmail: () => ({
    unread: 12,
    recent: [
      { id: 'm-1', from: 'team@hojai.ai', subject: 'Q3 OKRs draft', time: new Date(Date.now() - 7200000).toISOString() },
      { id: 'm-2', from: 'investor@vc.com', subject: 'Re: Series A', time: new Date(Date.now() - 14400000).toISOString() },
    ],
  }),
  google_photos: () => ({
    photosThisWeek: 23,
    recent: [
      { id: 'p-1', takenAt: new Date(Date.now() - 86400000).toISOString(), location: 'Bengaluru' },
    ],
  }),
  apple_health: () => ({
    stepsToday: 8420,
    sleepHoursLast: 7.2,
    restingHeartRate: 62,
    workoutsThisWeek: 3,
  }),
  apple_photos: () => ({
    photosThisWeek: 18,
    favoriteThisMonth: { id: 'fav-1', takenAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  }),
  bank_plaid: () => ({
    accounts: [
      { id: 'a-1', name: 'Checking', balance: 8420.32, currency: 'USD' },
      { id: 'a-2', name: 'Savings', balance: 42100.00, currency: 'USD' },
    ],
    transactionsThisMonth: 47,
  }),
  contacts: () => ({
    total: 1247,
    recent: [
      { id: 'c-1', name: 'Aarav Sharma', lastContacted: new Date(Date.now() - 86400000).toISOString() },
    ],
  }),
  slack: () => ({
    unread: 8,
    channels: ['general', 'random', 'engineering'],
  }),
  github: () => ({
    username: 'demo-dev',
    publicRepos: 23,
    recentCommit: { sha: 'abc123', message: 'feat: ship C9', time: new Date(Date.now() - 3600000).toISOString() },
  }),
  notion: () => ({
    pages: 47,
    recent: [
      { id: 'n-1', title: 'Q3 OKRs', updatedAt: new Date(Date.now() - 86400000).toISOString() },
    ],
  }),
};

module.exports = function({ connectionsStore }) {
  const router = express.Router();

  /**
   * GET /accounts/providers — list all providers
   */
  router.get('/providers', (req, res) => {
    const providers = Object.entries(PROVIDERS).map(([k, v]) => ({ id: k, ...v }));
    res.json({ success: true, total: providers.length, providers });
  });

  /**
   * GET /accounts/list/:userId — list connected accounts
   */
  router.get('/list/:userId', (req, res) => {
    const { userId } = req.params;
    const conns = Array.from(connectionsStore.entries())
      .map(([k, v]) => ({ id: k, ...v }))
      .filter(c => c.userId === userId);
    // Enrich with provider metadata
    const enriched = conns.map(c => ({
      ...c,
      providerMeta: PROVIDERS[c.provider] || null,
    }));
    res.json({ success: true, total: enriched.length, accounts: enriched });
  });

  /**
   * POST /accounts/connect/:userId/:provider — initiate OAuth (mock)
   */
  router.post('/connect/:userId/:provider', (req, res) => {
    const { userId, provider } = req.params;
    if (!PROVIDERS[provider]) {
      return res.status(404).json({ success: false, error: 'Unknown provider', available: Object.keys(PROVIDERS) });
    }

    // Check existing
    const existing = Array.from(connectionsStore.entries())
      .map(([k, v]) => ({ id: k, ...v }))
      .find(c => c.userId === userId && c.provider === provider);
    if (existing && existing.status === 'connected') {
      return res.status(409).json({ success: false, error: 'Already connected', account: existing });
    }

    const id = `acc-${uuidv4().slice(0, 8)}`;
    const conn = {
      id, userId, provider,
      status: 'connected',  // mocked — real OAuth would set 'pending'
      scopes: PROVIDERS[provider].scopes,
      connectedAt: new Date().toISOString(),
      lastSync: new Date().toISOString(),
      accountEmail: req.body?.accountEmail || `demo@${provider}.com`,
    };
    if (existing) {
      conn.id = existing.id;
    }
    connectionsStore.set(conn.id, conn);
    res.status(201).json({ success: true, data: conn, authUrl: PROVIDERS[provider].authUrl });
  });

  /**
   * POST /accounts/disconnect/:userId/:provider
   */
  router.post('/disconnect/:userId/:provider', (req, res) => {
    const { userId, provider } = req.params;
    const conn = Array.from(connectionsStore.entries())
      .map(([k, v]) => ({ id: k, ...v }))
      .find(c => c.userId === userId && c.provider === provider);
    if (!conn) return res.status(404).json({ success: false, error: 'Not connected' });
    connectionsStore.delete(conn.id);
    res.json({ success: true, disconnected: provider });
  });

  /**
   * GET /accounts/data/:userId/:provider — fetch sample data
   */
  router.get('/data/:userId/:provider', (req, res) => {
    const { userId, provider } = req.params;
    if (!PROVIDERS[provider]) {
      return res.status(404).json({ success: false, error: 'Unknown provider' });
    }
    const conn = Array.from(connectionsStore.entries())
      .map(([k, v]) => ({ id: k, ...v }))
      .find(c => c.userId === userId && c.provider === provider);
    if (!conn || conn.status !== 'connected') {
      return res.status(403).json({ success: false, error: 'Not connected to this provider' });
    }
    const data = SAMPLE_DATA[provider] ? SAMPLE_DATA[provider]() : {};
    res.json({ success: true, provider, data, fetchedAt: new Date().toISOString() });
  });

  /**
   * POST /accounts/sync/:userId/:provider — trigger sync (mock updates lastSync)
   */
  router.post('/sync/:userId/:provider', (req, res) => {
    const { userId, provider } = req.params;
    const conn = Array.from(connectionsStore.entries())
      .map(([k, v]) => ({ id: k, ...v }))
      .find(c => c.userId === userId && c.provider === provider);
    if (!conn) return res.status(404).json({ success: false, error: 'Not connected' });
    conn.lastSync = new Date().toISOString();
    connectionsStore.set(conn.id, conn);
    res.json({ success: true, lastSync: conn.lastSync });
  });

  return router;
};
