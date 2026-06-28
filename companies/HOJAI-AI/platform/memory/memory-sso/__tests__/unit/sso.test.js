/**
 * Memory SSO Unit Tests
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

process.env.SSO_PORT = '4897';

const { default: app } = await import('../../src/index.js');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const addr = server.address();
      baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });
});

function url(path) { return baseUrl + path; }

describe('Memory SSO — Health', () => {
  it('GET /health → 200', async () => {
    const r = await fetch(url('/health'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.status, 'healthy');
    assert.equal(j.service, 'memory-sso');
  });
});

describe('Memory SSO — Auth', () => {
  it('GET /auth/okta → returns auth URL', async () => {
    const r = await fetch(url('/auth/okta'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(j.authUrl);
    assert.equal(j.provider, 'okta');
  });

  it('GET /auth/azure → returns auth URL', async () => {
    const r = await fetch(url('/auth/azure'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(j.authUrl);
    assert.equal(j.provider, 'azure');
  });

  it('GET /auth/google → returns auth URL', async () => {
    const r = await fetch(url('/auth/google'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(j.authUrl);
    assert.equal(j.provider, 'google');
  });

  it('GET /auth/invalid → 400', async () => {
    const r = await fetch(url('/auth/invalid'));
    assert.equal(r.status, 400);
  });

  it('POST /auth/logout → 200', async () => {
    const r = await fetch(url('/auth/logout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'test-session' })
    });
    assert.equal(r.status, 200);
  });
});

describe('Memory SSO — Session', () => {
  it('GET /api/session/invalid → 404', async () => {
    const r = await fetch(url('/api/session/invalid-session'));
    assert.equal(r.status, 404);
  });

  it('POST /api/session/validate → 400 without token', async () => {
    const r = await fetch(url('/api/session/validate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(r.status, 400);
  });
});

describe('Memory SSO — Users', () => {
  it('GET /api/users → list users', async () => {
    const r = await fetch(url('/api/users'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(Array.isArray(j.users));
  });

  it('GET /api/users?provider=okta → filtered users', async () => {
    const r = await fetch(url('/api/users?provider=okta'));
    assert.equal(r.status, 200);
  });

  it('GET /api/users/invalid → 404', async () => {
    const r = await fetch(url('/api/users/invalid-user'));
    assert.equal(r.status, 404);
  });

  it('PUT /api/users/invalid/roles → 404', async () => {
    const r = await fetch(url('/api/users/invalid-user/roles'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roles: ['admin'] })
    });
    assert.equal(r.status, 404);
  });
});

describe('Memory SSO — Roles', () => {
  it('GET /api/roles → list roles', async () => {
    const r = await fetch(url('/api/roles'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(Array.isArray(j.mappings));
  });

  it('POST /api/roles → create mapping', async () => {
    const r = await fetch(url('/api/roles'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group: 'engineers', roles: ['engineer', 'viewer'] })
    });
    assert.equal(r.status, 200);
  });

  it('POST /api/roles → 400 without group', async () => {
    const r = await fetch(url('/api/roles'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roles: ['admin'] })
    });
    assert.equal(r.status, 400);
  });
});

after(() => { server?.close(); });