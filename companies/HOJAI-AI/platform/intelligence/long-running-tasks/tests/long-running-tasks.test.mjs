#!/usr/bin/env node
/**
 * Long-Running Tasks — Test Suite (ESM)
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';

process.env.PORT = '0';
process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';

const { default: app } = await import('../src/index.js');

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

const userId = `u-lrt-${Date.now()}`;

test('http — GET /health', async () => {
  const r = await fetch('/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'healthy');
  assert.equal(r.body.phase, '6.4-stub');
});

test('http — GET /ready', async () => {
  const r = await fetch('/ready');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'ready');
});

test('http — POST /api/lrt/:userId/tasks', async () => {
  const r = await fetch(`/api/lrt/${userId}/tasks`, {
    method: 'POST',
    body: { title: 'Plan Tokyo trip', description: '5 days in October' },
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.title, 'Plan Tokyo trip');
  assert.equal(r.body.status, 'pending');
  assert.equal(r.body.progress, 0);
});

test('http — GET /api/lrt/:userId/tasks', async () => {
  const r = await fetch(`/api/lrt/${userId}/tasks`);
  assert.equal(r.status, 200);
  assert.equal(r.body.tasks.length, 1);
});

test('http — GET /api/lrt/:userId/tasks/:taskId', async () => {
  const list = await fetch(`/api/lrt/${userId}/tasks`);
  const taskId = list.body.tasks[0].id;
  const r = await fetch(`/api/lrt/${userId}/tasks/${taskId}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.id, taskId);
});

test('http — POST /api/lrt/:userId/tasks/:taskId/progress', async () => {
  const list = await fetch(`/api/lrt/${userId}/tasks`);
  const taskId = list.body.tasks[0].id;
  const r = await fetch(`/api/lrt/${userId}/tasks/${taskId}/progress`, {
    method: 'POST',
    body: { progress: 50, status: 'in_progress', note: 'halfway done' },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.progress, 50);
  assert.equal(r.body.status, 'in_progress');
  assert.equal(r.body.history.length, 1);
  assert.equal(r.body.history[0].kind, 'progress');
});

test('http — POST progress clamps to [0,100]', async () => {
  const list = await fetch(`/api/lrt/${userId}/tasks`);
  const taskId = list.body.tasks[0].id;
  const r1 = await fetch(`/api/lrt/${userId}/tasks/${taskId}/progress`, {
    method: 'POST',
    body: { progress: 200 },
  });
  assert.equal(r1.body.progress, 100);
  const r2 = await fetch(`/api/lrt/${userId}/tasks/${taskId}/progress`, {
    method: 'POST',
    body: { progress: -5 },
  });
  assert.equal(r2.body.progress, 0);
});

test('http — DELETE /api/lrt/:userId/tasks/:taskId', async () => {
  const list = await fetch(`/api/lrt/${userId}/tasks`);
  const taskId = list.body.tasks[0].id;
  const r = await fetch(`/api/lrt/${userId}/tasks/${taskId}`, { method: 'DELETE' });
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'cancelled');
});

test('http — GET /api/lrt/:userId/tasks/:taskId — still readable after cancel', async () => {
  const list = await fetch(`/api/lrt/${userId}/tasks`);
  const taskId = list.body.tasks[0].id;
  const r = await fetch(`/api/lrt/${userId}/tasks/${taskId}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'cancelled');
});

test('http — GET /api/lrt/:userId/tasks — empty for new user', async () => {
  const r = await fetch(`/api/lrt/u-lrt-empty-${Date.now()}/tasks`);
  assert.equal(r.status, 200);
  assert.equal(r.body.tasks.length, 0);
});

test('http — POST progress — 404 for unknown task', async () => {
  const r = await fetch(`/api/lrt/${userId}/tasks/nope/progress`, {
    method: 'POST',
    body: { progress: 10 },
  });
  assert.equal(r.status, 404);
});

process.on('exit', () => { try { server.close(); } catch {} });