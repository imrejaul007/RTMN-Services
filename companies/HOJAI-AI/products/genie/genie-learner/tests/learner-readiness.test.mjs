/**
 * genie-learner — Phase A readiness tests.
 *
 * Tests the spaced-repetition engine + decks/cards/paths.
 * - 3 seeded paths
 * - 2 seeded decks (Spanish, PM) with 6 cards
 * - SM-2-lite algorithm (again/hard/good/easy)
 * - Streak tracking
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-learner-tests';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createToken } = require('@rtmn/shared/auth');
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const TOKEN = createToken({ userId: 'user-001', businessId: 'learner-test', industry: 'test', role: 'owner' });
const USER_ID = 'user-001';
const PORT = parseInt(process.env.PORT || '4742', 10);
const BASE = `http://127.0.0.1:${PORT}`;
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'learner-test-token';

let serverProc;

function req(method, path, body = null, expect = 200) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request(`${BASE}${path}`, {
      method,
      headers: {
        'authorization': `Bearer ${TOKEN}`,
        'x-internal-token': INTERNAL_TOKEN,
        ...(data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {}),
      },
      timeout: 5000,
    }, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => {
        try {
          const json = buf ? JSON.parse(buf) : null;
          resolve({ status: res.statusCode, body: json });
        } catch (e) { resolve({ status: res.statusCode, body: buf }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

test('setup: boot learner service', async () => {
  const { spawn } = require('node:child_process');
  const path = require('node:path');
  serverProc = spawn('node', [path.join(process.cwd(), 'src/index.js')], {
    env: { ...process.env, JWT_SECRET: 'test-jwt-secret-for-learner-tests', INTERNAL_SERVICE_TOKEN: INTERNAL_TOKEN, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve) => {
    let buf = '';
    serverProc.stdout.on('data', (c) => {
      buf += c.toString();
      if (buf.includes('running on port')) resolve();
    });
    setTimeout(resolve, 3000);
  });
});

test('health: returns 200', async () => {
  const { status, body } = await req('GET', '/health');
  assert.equal(status, 200);
  assert.match(body.service, /Learner/);
});

test('root: banner', async () => {
  const { status, body } = await req('GET', '/');
  assert.equal(status, 200);
  assert.ok(body.endpoints.length >= 10);
});

test('paths: list seeded (3)', async () => {
  const { status, body } = await req('GET', '/paths');
  assert.equal(status, 200);
  assert.equal(body.total, 3);
  assert.ok(body.paths.some(p => p.id === 'pth-spanish'));
  assert.ok(body.paths.some(p => p.id === 'pth-pm'));
  assert.ok(body.paths.some(p => p.id === 'pth-mind'));
});

test('paths: detail by id', async () => {
  const { status, body } = await req('GET', '/paths/pth-spanish');
  assert.equal(status, 200);
  assert.equal(body.data.id, 'pth-spanish');
  assert.ok(body.data.weeks === 4);
  assert.ok(Array.isArray(body.data.modules_list));
  assert.ok(body.data.modules_list.length >= 4);
});

test('paths: 404 for unknown', async () => {
  const { status } = await req('GET', '/paths/pth-nope');
  assert.equal(status, 404);
});

test('decks: list by user (2 seeded for user-001)', async () => {
  const { status, body } = await req('GET', `/decks/by-user/${USER_ID}`);
  assert.equal(status, 200);
  assert.equal(body.total, 2);
  assert.ok(body.decks.some(d => d.id === 'dk-spanish'));
  assert.ok(body.decks.some(d => d.id === 'dk-pm'));
});

test('decks: list empty for unknown user', async () => {
  const { body } = await req('GET', '/decks/by-user/user-zzz');
  assert.equal(body.total, 0);
  assert.deepEqual(body.decks, []);
});

test('decks: create new', async () => {
  const { status, body } = await req('POST', `/decks/by-user/${USER_ID}`, {
    title: 'React Hooks',
    description: 'useState, useEffect, useMemo, useCallback',
    tags: ['frontend', 'react'],
  }, 201);
  assert.equal(status, 201);
  assert.match(body.data.id, /^dk-/);
  assert.equal(body.data.title, 'React Hooks');
});

test('decks: rejects missing title', async () => {
  const { status } = await req('POST', `/decks/by-user/${USER_ID}`, { description: 'no title' }, 400);
  assert.equal(status, 400);
});

test('decks: get deck with cards', async () => {
  const { status, body } = await req('GET', '/decks/dk-spanish');
  assert.equal(status, 200);
  assert.equal(body.data.id, 'dk-spanish');
  assert.ok(Array.isArray(body.data.cards));
  assert.ok(body.data.cards.length === 4);
});

test('decks: 404 unknown deck', async () => {
  const { status } = await req('GET', '/decks/dk-nope');
  assert.equal(status, 404);
});

test('cards: add card to deck', async () => {
  const { status, body } = await req('POST', `/decks/dk-spanish/cards`, {
    userId: USER_ID,
    front: 'Where is the bathroom?',
    back: '¿Dónde está el baño?',
    tags: ['travel'],
  }, 201);
  assert.equal(status, 201);
  assert.match(body.data.id, /^cd-/);
  assert.equal(body.data.interval, 0);
  assert.equal(body.data.reps, 0);
});

test('cards: rejects missing front/back', async () => {
  const { status } = await req('POST', `/decks/dk-spanish/cards`, { userId: USER_ID, front: 'only' }, 400);
  assert.equal(status, 400);
});

test('cards: rejects card add to foreign deck', async () => {
  // create deck for user-002
  const c = await req('POST', `/decks/by-user/user-002`, { title: 'Mine' }, 201);
  const deckId = c.body.data.id;
  const { status } = await req('POST', `/decks/${deckId}/cards`, { userId: USER_ID, front: 'a', back: 'b' }, 403);
  assert.equal(status, 403);
});

test('cards: delete card', async () => {
  const c = await req('POST', `/decks/dk-spanish/cards`, { userId: USER_ID, front: 'tmp-front', back: 'tmp-back' }, 201);
  const id = c.body.data.id;
  const { status, body } = await req('DELETE', `/cards/${id}`, { userId: USER_ID });
  assert.equal(status, 200);
  assert.equal(body.deleted, id);
});

test('decks: delete deck (cascades to cards)', async () => {
  const c = await req('POST', `/decks/by-user/${USER_ID}`, { title: 'Throwaway' }, 201);
  const deckId = c.body.data.id;
  await req('POST', `/decks/${deckId}/cards`, { userId: USER_ID, front: 'a', back: 'b' }, 201);
  const { status, body } = await req('DELETE', `/decks/${deckId}/${USER_ID}`);
  assert.equal(status, 200);
  assert.equal(body.deleted, deckId);
  assert.ok(body.cardsDeleted >= 1);
});

test('decks: delete rejects foreign deck', async () => {
  const { status } = await req('DELETE', `/decks/dk-spanish/user-002`);
  assert.equal(status, 403);
});

test('review: due cards (4 of 6 due immediately)', async () => {
  const { status, body } = await req('GET', `/decks/dk-spanish/review?userId=${USER_ID}`);
  assert.equal(status, 200);
  assert.ok(body.due.length >= 4);
});

test('review: foreign deck forbidden', async () => {
  const { status } = await req('GET', `/decks/dk-spanish/review?userId=user-002`);
  assert.equal(status, 403);
});

test('review: again rating resets card', async () => {
  const r1 = await req('POST', `/review/cd-1`, { userId: USER_ID, rating: 'again' });
  assert.equal(r1.status, 200);
  assert.equal(r1.body.data.card.interval, 0);
  assert.equal(r1.body.data.card.reps, 0);
  assert.ok(r1.body.data.card.ease < 2.5);
});

test('review: good rating advances', async () => {
  const r1 = await req('POST', `/review/cd-2`, { userId: USER_ID, rating: 'good' });
  assert.equal(r1.body.data.card.interval, 1);
  assert.equal(r1.body.data.card.reps, 1);
});

test('review: easy rating boosts ease', async () => {
  const r1 = await req('POST', `/review/cd-4`, { userId: USER_ID, rating: 'easy' });
  assert.ok(r1.body.data.card.ease >= 2.5);
  assert.ok(r1.body.data.card.interval >= 1);
});

test('review: hard rating shrinks ease', async () => {
  const r1 = await req('POST', `/review/cd-5`, { userId: USER_ID, rating: 'hard' });
  assert.ok(r1.body.data.card.ease < 2.5);
  assert.equal(r1.body.data.card.reps, 1);
});

test('review: rejects invalid rating', async () => {
  const { status } = await req('POST', `/review/cd-1`, { userId: USER_ID, rating: 'perfect' }, 400);
  assert.equal(status, 400);
});

test('review: 404 unknown card', async () => {
  const { status } = await req('POST', `/review/cd-nope`, { userId: USER_ID, rating: 'good' }, 404);
  assert.equal(status, 404);
});

test('streak: empty for fresh user', async () => {
  const { status, body } = await req('GET', `/users/user-new/streak`);
  assert.equal(status, 200);
  assert.equal(body.data.totalReviews, 0);
  assert.equal(body.data.streakDays, 0);
});

test('streak: counts after reviews', async () => {
  const { status, body } = await req('GET', `/users/${USER_ID}/streak`);
  assert.equal(status, 200);
  assert.ok(body.data.totalReviews >= 1);
  assert.ok(body.data.streakDays >= 1);
  assert.ok(typeof body.data.cardsDue === 'number');
});

test('readiness: healthy', async () => {
  const { status, body } = await req('GET', '/api/readiness');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.ready, true);
});

test('auth: 401 without token', async () => {
  const r = await new Promise((resolve) => {
    const x = http.request(`${BASE}/decks/by-user/${USER_ID}`, { method: 'GET', timeout: 3000 }, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => resolve({ status: res.statusCode, body: buf }));
    });
    x.on('error', () => resolve({ status: 0 }));
    x.end();
  });
  assert.equal(r.status, 401);
});

test('teardown: shutdown server', async () => {
  if (serverProc) {
    serverProc.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
  }
});
