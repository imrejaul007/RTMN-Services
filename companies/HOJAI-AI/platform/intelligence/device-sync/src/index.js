/**
 * Device Sync Service
 *
 * Port: 4802
 *
 * Cross-device conversation sync — pick up where you left off on any device.
 *
 * Why a separate service:
 *   - Each device maintains its own local state (memory cache, UI scroll
 *     position, in-flight tool calls)
 *   - When user opens Genie on a new device, we need to hand off the
 *     conversation + context atomically
 *   - Device-specific capabilities (voice, screen, location) need to be
 *     known to the runtime so it picks the right response format
 *
 * Storage: PersistentMap. Per-user namespace.
 *
 * Routes:
 *   POST   /api/sync/devices/:userId/register      — register a device
 *   GET    /api/sync/devices/:userId               — list devices
 *   DELETE /api/sync/devices/:userId/:deviceId     — forget a device
 *   POST   /api/sync/devices/:userId/:deviceId/heartbeat — keep-alive
 *   GET    /api/sync/devices/:userId/active        — most recently active
 *   POST   /api/sync/session/handoff               — transfer session to new device
 *   GET    /api/sync/session/:userId               — current session state
 *   POST   /api/sync/session/:userId/message       — append a message
 *   GET    /health
 *   GET    /ready
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import crypto from 'node:crypto';
import { requireAuth } from '@rtmn/shared/auth';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { createLogger } from '@rtmn/shared/lib/logger';
import { pickActive, mergeHistories, isStale, normalize } from '../lib/sync.js';

const PORT = parseInt(process.env.PORT || '4802', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const log = createLogger('device-sync');

// Per-user stores
const devices = new PersistentMap('device-sync-devices', { serviceName: 'device-sync' });
const sessions = new PersistentMap('device-sync-sessions', { serviceName: 'device-sync' });

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

const send = (res, s, d) => res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });
const sendErr = (res, s, code, msg) => res.status(s).json({ success: false, error: { code, message: msg }, meta: { timestamp: new Date().toISOString() } });

// ---------- helpers ----------

function deviceKey(userId, deviceId) { return `${userId}:${deviceId}`; }
function sessionKey(userId) { return userId; }

function getDevice(userId, deviceId) {
  return devices.get(deviceKey(userId, deviceId)) || null;
}

function setDevice(userId, deviceId, data) {
  const key = deviceKey(userId, deviceId);
  const existing = devices.get(key);
  const merged = normalize({ ...existing, ...data, deviceId, userId }, userId);
  merged.lastSeenAt = data.lastSeenAt || new Date().toISOString();
  devices.set(key, merged);
  return merged;
}

function listDevices(userId) {
  const list = [];
  for (const [, v] of devices) {
    if (v && v.userId === userId) list.push(v);
  }
  return list;
}

function getSession(userId) {
  return sessions.get(sessionKey(userId)) || null;
}

function setSession(userId, data) {
  const existing = getSession(userId);
  const merged = {
    userId,
    activeDeviceId: data.activeDeviceId || existing?.activeDeviceId || null,
    conversationId: data.conversationId || existing?.conversationId || null,
    history: data.history || existing?.history || [],
    context: { ...(existing?.context || {}), ...(data.context || {}) },
    handoffAt: data.handoffAt || existing?.handoffAt || null,
    lastMessageAt: data.lastMessageAt || existing?.lastMessageAt || null,
    updatedAt: new Date().toISOString(),
  };
  sessions.set(sessionKey(userId), merged);
  return merged;
}

// ---------- routes ----------

app.get('/health', (req, res) => send(res, 200, { status: 'healthy', service: 'device-sync', port: PORT }));

// REGISTER
app.post('/api/sync/devices/:userId/register', requireAuth, (req, res) => {
  const { userId } = req.params;
  const { deviceId, name, type, platform, capabilities, metadata } = req.body || {};
  if (!deviceId) return sendErr(res, 400, 'VALIDATION', 'deviceId required');
  const saved = setDevice(userId, deviceId, {
    name, type, platform, capabilities, metadata,
    sessionActive: true,
  });
  // Activate this device
  setSession(userId, { activeDeviceId: deviceId });
  send(res, 200, saved);
});

// LIST
app.get('/api/sync/devices/:userId', requireAuth, (req, res) => {
  const { userId } = req.params;
  const list = listDevices(userId);
  // attach stale flag
  const enriched = list.map((d) => ({ ...d, stale: isStale(d, 24) }));
  enriched.sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
  send(res, 200, { userId, count: enriched.length, devices: enriched });
});

// DELETE
app.delete('/api/sync/devices/:userId/:deviceId', requireAuth, (req, res) => {
  const { userId, deviceId } = req.params;
  const key = deviceKey(userId, deviceId);
  if (!devices.get(key)) return sendErr(res, 404, 'NOT_FOUND', `No device ${deviceId}`);
  devices.delete(key);
  // If active was this device, clear
  const session = getSession(userId);
  if (session?.activeDeviceId === deviceId) {
    setSession(userId, { activeDeviceId: null });
  }
  send(res, 200, { deleted: true, deviceId });
});

// HEARTBEAT
app.post('/api/sync/devices/:userId/:deviceId/heartbeat', requireAuth, (req, res) => {
  const { userId, deviceId } = req.params;
  const existing = getDevice(userId, deviceId);
  if (!existing) return sendErr(res, 404, 'NOT_FOUND', `Device not registered. POST /register first.`);
  const updated = setDevice(userId, deviceId, { ...existing, sessionActive: true });
  send(res, 200, updated);
});

// ACTIVE
app.get('/api/sync/devices/:userId/active', requireAuth, (req, res) => {
  const { userId } = req.params;
  const list = listDevices(userId);
  const active = pickActive(list);
  send(res, 200, { userId, activeDevice: active });
});

// HANDOFF — transfer session to a different device
app.post('/api/sync/session/handoff', requireAuth, (req, res) => {
  const { userId, toDeviceId, history, context } = req.body || {};
  if (!userId) return sendErr(res, 400, 'VALIDATION', 'userId required');
  if (!toDeviceId) return sendErr(res, 400, 'VALIDATION', 'toDeviceId required');

  // Verify the destination device is registered
  const target = getDevice(userId, toDeviceId);
  if (!target) return sendErr(res, 404, 'NOT_FOUND', `Target device ${toDeviceId} not registered`);

  const current = getSession(userId);
  const merged = mergeHistories(current?.history || [], history || []);
  const updated = setSession(userId, {
    activeDeviceId: toDeviceId,
    conversationId: current?.conversationId || `conv_${crypto.randomBytes(4).toString('hex')}`,
    history: merged,
    context: context || {},
    handoffAt: new Date().toISOString(),
  });

  // Mark source as inactive, target as active
  if (current?.activeDeviceId && current.activeDeviceId !== toDeviceId) {
    setDevice(userId, current.activeDeviceId, { sessionActive: false });
  }
  setDevice(userId, toDeviceId, { sessionActive: true });

  send(res, 200, updated);
});

// GET SESSION
app.get('/api/sync/session/:userId', requireAuth, (req, res) => {
  const { userId } = req.params;
  const s = getSession(userId);
  if (!s) return send(res, 200, { userId, history: [], activeDeviceId: null, handoffAt: null });
  send(res, 200, s);
});

// APPEND MESSAGE
app.post('/api/sync/session/:userId/message', requireAuth, (req, res) => {
  const { userId } = req.params;
  const { role, text, deviceId, metadata } = req.body || {};
  if (!role || !text) return sendErr(res, 400, 'VALIDATION', 'role and text required');

  const current = getSession(userId);
  const message = {
    id: `msg_${crypto.randomBytes(6).toString('hex')}`,
    role,
    text,
    deviceId: deviceId || current?.activeDeviceId,
    metadata: metadata || {},
    at: new Date().toISOString(),
  };
  const updated = setSession(userId, {
    history: [...(current?.history || []), message],
    lastMessageAt: message.at,
  });

  send(res, 200, { message, session: { activeDeviceId: updated.activeDeviceId, historyLen: updated.history.length } });
});

// 404
app.use((req, res) => sendErr(res, 404, 'NOT_FOUND', `${req.method} ${req.path} not found`));

requireEnv(['PORT'], { allowDev: true });
const server = app.listen(PORT, () => log.info(`device-sync listening on :${PORT}`));
installGracefulShutdown(server, 'device-sync');
export default app;