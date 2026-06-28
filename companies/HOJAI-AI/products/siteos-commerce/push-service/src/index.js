/**
 * HOJAI SiteOS Push Notification Service
 * Port: 5488
 * Web push notifications with FCM/APNS
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const app = express();
const PORT = process.env.PORT || 5488;
const STORAGE_PATH = process.env.STORAGE_PATH || '/tmp';

app.use(helmet());
app.use(cors());
app.use(express.json());

const requireAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
  if (!apiKey) return res.status(401).json({ error: 'API key required' });
  req.companyId = req.headers['x-company-id'] || 'default';
  next();
};

const getFile = (companyId, type) => `${STORAGE_PATH}/push-${type}-${companyId}.json`;
const loadData = (companyId, type) => {
  const file = getFile(companyId, type);
  if (existsSync(file)) {
    try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return []; }
  }
  return [];
};
const saveData = (companyId, type, data) => {
  writeFileSync(getFile(companyId, type), JSON.stringify(data, null, 2));
};

// FCM config (mock for dev)
const FCM_CONFIG = {
  projectId: process.env.FCM_PROJECT || 'mock-project',
  privateKey: process.env.FCM_KEY || 'mock-key'
};

const sendPush = async (token, notification, data) => {
  console.log(`[Push] Token: ${token.substring(0, 20)}..., Title: ${notification.title}`);
  return { messageId: `push_${uuidv4().substring(0, 8)}`, success: true };
};

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'push-service', port: PORT });
});

// Subscribe to push
app.post('/api/push/subscribe', requireAuth, (req, res) => {
  const { token, userId, browser, platform = 'web' } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });

  const subscription = {
    subId: uuidv4(),
    companyId: req.companyId,
    userId: userId || null,
    token,
    browser: browser || 'unknown',
    platform,
    active: true,
    createdAt: new Date().toISOString()
  };

  const subs = loadData(req.companyId, 'subscriptions');
  // Remove old subscription with same token
  const filtered = subs.filter(s => s.token !== token);
  filtered.push(subscription);
  saveData(req.companyId, 'subscriptions', filtered);

  res.json({ success: true, subscription });
});

// Get all tokens
app.get('/api/push/tokens', requireAuth, (req, res) => {
  const { active = true } = req.query;
  let subs = loadData(req.companyId, 'subscriptions');
  if (active !== undefined) {
    subs = subs.filter(s => s.active === (active === 'true'));
  }
  res.json({ tokens: subs });
});

// Send push to single token
app.post('/api/push/send', requireAuth, async (req, res) => {
  const { token, notification, data } = req.body;
  if (!token || !notification) return res.status(400).json({ error: 'token and notification required' });

  try {
    const result = await sendPush(token, notification, data);
    const push = {
      pushId: uuidv4(),
      companyId: req.companyId,
      messageId: result.messageId,
      token,
      notification,
      data: data || {},
      status: result.success ? 'sent' : 'failed',
      sentAt: new Date().toISOString()
    };

    const pushes = loadData(req.companyId, 'pushes');
    pushes.push(push);
    saveData(req.companyId, 'pushes', pushes);

    res.json({ success: true, push });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send push', details: err.message });
  }
});

// Send to segment
app.post('/api/push/send-segment', requireAuth, async (req, res) => {
  const { segment, notification, data } = req.body;
  if (!segment || !notification) return res.status(400).json({ error: 'segment and notification required' });

  const subs = loadData(req.companyId, 'subscriptions').filter(s => s.active);
  const tokens = subs.map(s => s.token);

  const results = { sent: 0, failed: 0 };
  for (const token of tokens) {
    try {
      await sendPush(token, notification, data);
      results.sent++;
    } catch { results.failed++; }
  }

  res.json({ success: true, results, total: tokens.length });
});

// Stats
app.get('/api/push/stats', requireAuth, (req, res) => {
  const pushes = loadData(req.companyId, 'pushes');
  const subs = loadData(req.companyId, 'subscriptions');
  const active = subs.filter(s => s.active).length;

  res.json({
    totalSent: pushes.length,
    activeSubscribers: active,
    byStatus: pushes.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {})
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Push Service running on port ${PORT}`);
});

export default app;
