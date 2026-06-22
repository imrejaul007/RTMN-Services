#!/usr/bin/env node
/**
 * Device Sync — Test Suite (ESM)
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';

process.env.PORT = '0';
process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';

const { default: app } = await import('../src/index.js');
const lib = await import('../lib/sync.js');

const server = app.listen(0);
const port = server.address().port;
const TOKEN = 'test-internal-token';

function fetch(p, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = { 'x-internal-token': TOKEN, ...(options.headers || {}) };
    if (options.body && !headers['content-type']) headers['content-type'] = 'application/json';
    const body = options.body ? JSON.stringify(options.body) : null;
    const req = http.request(
      { host: '127.0.0.1', port, path: p, method: options.method || 'GET', headers },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let parsed = data;
          try { parsed = JSON.parse(data); } catch {}
          const payload = parsed && parsed.data !== undefined ? parsed.data : parsed;
          resolve({ status: res.statusCode, body: payload, full: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ---------- pure-function tests ----------

test('lib — pickActive: most recent wins', () => {
  const now = new Date();
  const devices = [
    { deviceId: 'a', lastSeenAt: new Date(now.getTime() - 86400000).toISOString() },
    { deviceId: 'b', lastSeenAt: now.toISOString() },
    { deviceId: 'c', lastSeenAt: new Date(now.getTime() - 3600000).toISOString() },
  ];
  assert.equal(lib.pickActive(devices).deviceId, 'b');
});

test('lib — pickActive: null when empty', () => {
  assert.equal(lib.pickActive([]), null);
  assert.equal(lib.pickActive(null), null);
});

test('lib — mergeHistories: dedupes by id and merges', () => {
  const a = [
    { id: '1', text: 'first', at: '2026-06-22T10:00:00Z' },
    { id: '2', text: 'second', at: '2026-06-22T11:00:00Z' },
  ];
  const b = [
    { id: '2', text: 'second-different', at: '2026-06-22T11:00:00Z' },
    { id: '3', text: 'third', at: '2026-06-22T12:00:00Z' },
  ];
  const merged = lib.mergeHistories(a, b);
  // '2' from b wins (later); all 3 present; sorted by at asc
  assert.equal(merged.length, 3);
  assert.equal(merged[0].id, '1');
  assert.equal(merged[2].id, '3');
});

test('lib — isStale: true when never seen', () => {
  assert.equal(lib.isStale({}), true);
  assert.equal(lib.isStale({ lastSeenAt: null }), true);
});

test('lib — isStale: false when seen recently', () => {
  const recent = new Date().toISOString();
  assert.equal(lib.isStale({ lastSeenAt: recent }, 24), false);
});

test('lib — isStale: true when older than threshold', () => {
  const old = new Date(Date.now() - 25 * 3600000).toISOString();
  assert.equal(lib.isStale({ lastSeenAt: old }, 24), true);
});

test('lib — normalize: provides defaults', () => {
  const d = lib.normalize({}, 'u1');
  assert.equal(d.userId, 'u1');
  assert.equal(d.deviceId, undefined);
  assert.ok(d.lastSeenAt);
  assert.equal(d.sessionActive, false);
});

test('lib — normalize: keeps provided fields', () => {
  const d = lib.normalize({ deviceId: 'x', name: 'Phone', type: 'phone', platform: 'ios' }, 'u1');
  assert.equal(d.deviceId, 'x');
  assert.equal(d.name, 'Phone');
  assert.equal(d.type, 'phone');
});

// ---------- HTTP API tests ----------

test('HTTP — /health returns healthy', async () => {
  const r = await fetch('/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'healthy');
});

test('HTTP — register a device', async () => {
  const r = await fetch('/api/sync/devices/u1/register', {
    method: 'POST',
    body: { deviceId: 'phone-1', name: 'iPhone', type: 'phone', platform: 'ios', capabilities: ['voice', 'screen'] },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.deviceId, 'phone-1');
  assert.equal(r.body.name, 'iPhone');
  assert.equal(r.body.sessionActive, true);
});

test('HTTP — register without deviceId returns 400', async () => {
  const r = await fetch('/api/sync/devices/u1/register', { method: 'POST', body: { name: 'X' } });
  assert.equal(r.status, 400);
});

test('HTTP — list devices returns array', async () => {
  await fetch('/api/sync/devices/u-list/register', { method: 'POST', body: { deviceId: 'd1', name: 'A' } });
  await fetch('/api/sync/devices/u-list/register', { method: 'POST', body: { deviceId: 'd2', name: 'B' } });
  const r = await fetch('/api/sync/devices/u-list');
  assert.equal(r.status, 200);
  assert.equal(r.body.count, 2);
});

test('HTTP — heartbeat updates lastSeenAt', async () => {
  const userId = 'u-hb-' + Date.now();
  await fetch(`/api/sync/devices/${userId}/register`, { method: 'POST', body: { deviceId: 'd1' } });
  const r = await fetch(`/api/sync/devices/${userId}/d1/heartbeat`, { method: 'POST', body: {} });
  assert.equal(r.status, 200);
  assert.ok(r.body.lastSeenAt);
});

test('HTTP — heartbeat for unknown device returns 404', async () => {
  const r = await fetch('/api/sync/devices/u-hb-unknown/ghost/heartbeat', { method: 'POST', body: {} });
  assert.equal(r.status, 404);
});

test('HTTP — active returns most recent device', async () => {
  const userId = 'u-active-' + Date.now();
  await fetch(`/api/sync/devices/${userId}/register`, { method: 'POST', body: { deviceId: 'd1' } });
  await new Promise((r) => setTimeout(r, 50));
  await fetch(`/api/sync/devices/${userId}/register`, { method: 'POST', body: { deviceId: 'd2' } });
  const r = await fetch(`/api/sync/devices/${userId}/active`);
  assert.equal(r.status, 200);
  assert.equal(r.body.activeDevice.deviceId, 'd2');
});

test('HTTP — handoff to a new device', async () => {
  const userId = 'u-handoff-' + Date.now();
  await fetch(`/api/sync/devices/${userId}/register`, { method: 'POST', body: { deviceId: 'laptop' } });
  await fetch(`/api/sync/devices/${userId}/register`, { method: 'POST', body: { deviceId: 'phone' } });

  const r = await fetch('/api/sync/session/handoff', {
    method: 'POST',
    body: {
      userId, toDeviceId: 'phone',
      history: [{ id: 'm1', role: 'user', text: 'hello', at: new Date().toISOString() }],
      context: { topic: 'shopping' },
    },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.activeDeviceId, 'phone');
  assert.equal(r.body.history.length, 1);
});

test('HTTP — handoff without toDeviceId returns 400', async () => {
  const r = await fetch('/api/sync/session/handoff', { method: 'POST', body: { userId: 'u' } });
  assert.equal(r.status, 400);
});

test('HTTP — handoff to unknown device returns 404', async () => {
  const r = await fetch('/api/sync/session/handoff', {
    method: 'POST', body: { userId: 'u', toDeviceId: 'ghost' },
  });
  assert.equal(r.status, 404);
});

test('HTTP — append message to session', async () => {
  const userId = 'u-msg-' + Date.now();
  const r = await fetch(`/api/sync/session/${userId}/message`, {
    method: 'POST',
    body: { role: 'user', text: 'hi', deviceId: 'phone' },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.message.role, 'user');
  assert.ok(r.body.message.id);
});

test('HTTP — message without role/text returns 400', async () => {
  const r = await fetch('/api/sync/session/u/message', { method: 'POST', body: {} });
  assert.equal(r.status, 400);
});

test('HTTP — get session returns the conversation history', async () => {
  const userId = 'u-get-' + Date.now();
  await fetch(`/api/sync/session/${userId}/message`, {
    method: 'POST', body: { role: 'user', text: 'msg1', deviceId: 'd1' },
  });
  await fetch(`/api/sync/session/${userId}/message`, {
    method: 'POST', body: { role: 'assistant', text: 'reply1', deviceId: 'd1' },
  });
  const r = await fetch(`/api/sync/session/${userId}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.history.length, 2);
});

test('HTTP — DELETE device removes it', async () => {
  const userId = 'u-del-' + Date.now();
  await fetch(`/api/sync/devices/${userId}/register`, { method: 'POST', body: { deviceId: 'd1' } });
  const r = await fetch(`/api/sync/devices/${userId}/d1`, { method: 'DELETE' });
  assert.equal(r.status, 200);
  assert.equal(r.body.deleted, true);
});

test('HTTP — DELETE unknown device returns 404', async () => {
  const r = await fetch('/api/sync/devices/u/ghost', { method: 'DELETE' });
  assert.equal(r.status, 404);
});

test('HTTP — auth required', async () => {
  const r = await new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: '/api/sync/devices/u', method: 'GET' },
      (res) => { res.resume(); res.on('end', () => resolve({ status: res.statusCode })); }
    );
    req.on('error', reject);
    req.end();
  });
  assert.equal(r.status, 401);
});

test('HTTP — 404 on unknown route', async () => {
  const r = await fetch('/api/sync/nonsense');
  assert.equal(r.status, 404);
});

process.on('exit', () => { try { server.close(); } catch {} });