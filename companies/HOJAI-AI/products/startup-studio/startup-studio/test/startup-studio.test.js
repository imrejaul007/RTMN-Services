/**
 * Startup Studio — test suite
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'hojai-ststudio-test-'));
process.env.HOJAI_DATA_DIR = TEST_DATA_DIR;
process.env.SERVICE_NAME = 'startup-studio-test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const { createApp } = await import('../src/index.js');

let server;
let baseUrl;

async function boot() {
  if (server) {
    await new Promise((r) => server.close(r));
    server = null;
  }
  const app = createApp();
  server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
  await new Promise(r => setTimeout(r, 50));
}

function req(method, p, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + p);
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const r = http.request(url, opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

after(async () => {
  if (server) await new Promise(r => server.close(r));
  try { fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true }); } catch {}
});

async function registerOperator() {
  const res = await req('POST', '/v1/operators/register', {
    email: `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`,
    password: 'password123',
    name: 'Studio Op',
    studioName: 'Acme Studio',
  });
  return res.body.token;
}

// ============ TESTS ============

test('GET /health', async () => {
  await boot();
  const res = await req('GET', '/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.service, 'startup-studio');
});

test('GET /ready', async () => {
  await boot();
  const res = await req('GET', '/ready');
  assert.equal(res.status, 200);
  assert.equal(res.body.ready, true);
});

test('Register operator and receive token', async () => {
  await boot();
  const res = await req('POST', '/v1/operators/register', {
    email: 'op1@example.com', password: 'password123', name: 'Op', studioName: 'Studio',
  });
  assert.equal(res.status, 201);
  assert.ok(res.body.token);
  assert.equal(res.body.operator.studioName, 'Studio');
});

test('Duplicate registration is rejected', async () => {
  await boot();
  await req('POST', '/v1/operators/register', { email: 'dup@example.com', password: 'password123', name: 'A', studioName: 'B' });
  const res = await req('POST', '/v1/operators/register', { email: 'dup@example.com', password: 'password123', name: 'A', studioName: 'B' });
  assert.equal(res.status, 409);
});

test('Login works with valid credentials', async () => {
  await boot();
  await req('POST', '/v1/operators/register', { email: 'login@example.com', password: 'password123', name: 'A', studioName: 'B' });
  const res = await req('POST', '/v1/operators/login', { email: 'login@example.com', password: 'password123' });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
});

test('Login with bad password returns 401', async () => {
  await boot();
  await req('POST', '/v1/operators/register', { email: 'bp@example.com', password: 'password123', name: 'A', studioName: 'B' });
  const res = await req('POST', '/v1/operators/login', { email: 'bp@example.com', password: 'wrong' });
  assert.equal(res.status, 401);
});

test('Create program', async () => {
  await boot();
  const token = await registerOperator();
  const res = await req('POST', '/v1/programs', {
    name: 'AI Spring 2026', type: 'accelerator', description: 'For AI startups', durationWeeks: 12, equityStake: 6, investmentAmount: 150000,
  }, token);
  assert.equal(res.status, 201);
  assert.equal(res.body.program.name, 'AI Spring 2026');
  assert.equal(res.body.program.equityStake, 6);
});

test('Create cohort linked to program', async () => {
  await boot();
  const token = await registerOperator();
  const prog = await req('POST', '/v1/programs', { name: 'P1', type: 'accelerator' }, token);
  const res = await req('POST', '/v1/cohorts', {
    programId: prog.body.program.id, name: 'Spring 2026', startDate: '2026-03-01', endDate: '2026-05-24', theme: 'AI/ML', maxStartups: 15,
  }, token);
  assert.equal(res.status, 201);
  assert.equal(res.body.cohort.status, 'upcoming');
  assert.equal(res.body.cohort.theme, 'AI/ML');
});

test('Update cohort status', async () => {
  await boot();
  const token = await registerOperator();
  const prog = await req('POST', '/v1/programs', { name: 'P', type: 'incubator' }, token);
  const cohort = await req('POST', '/v1/cohorts', { programId: prog.body.program.id, name: 'C', startDate: '2026-01-01', endDate: '2026-06-01' }, token);
  const res = await req('PUT', `/v1/cohorts/${cohort.body.cohort.id}`, { status: 'active', demoDate: '2026-05-30' }, token);
  assert.equal(res.status, 200);
  assert.equal(res.body.cohort.status, 'active');
  assert.equal(res.body.cohort.demoDate, '2026-05-30');
});

test('Add mentor with expertise and industries', async () => {
  await boot();
  const token = await registerOperator();
  const res = await req('POST', '/v1/mentors', {
    name: 'Mentor One', email: 'm1@example.com', bio: '20 years in SaaS',
    expertise: ['fundraising', 'gtm', 'product'], industries: ['B2B SaaS', 'AI'],
    preferredStages: ['seed', 'series-a'], availability: 4, company: 'Acme', title: 'CEO',
  }, token);
  assert.equal(res.status, 201);
  assert.equal(res.body.mentor.expertise.length, 3);
});

test('Rate mentor updates running average', async () => {
  await boot();
  const token = await registerOperator();
  const mentor = await req('POST', '/v1/mentors', { name: 'M', email: 'm@example.com' }, token);
  await req('PUT', `/v1/mentors/${mentor.body.mentor.id}/rate`, { rating: 5 }, token);
  await req('PUT', `/v1/mentors/${mentor.body.mentor.id}/rate`, { rating: 3 }, token);
  const list = await req('GET', '/v1/mentors', null, token);
  const m = list.body.mentors[0];
  assert.equal(m.totalSessions, 2);
  assert.equal(m.rating, 4); // (5+3)/2
});

test('Submit application to cohort', async () => {
  await boot();
  const token = await registerOperator();
  const prog = await req('POST', '/v1/programs', { name: 'P', type: 'accelerator' }, token);
  const cohort = await req('POST', '/v1/cohorts', { programId: prog.body.program.id, name: 'C', startDate: '2026-01-01', endDate: '2026-06-01' }, token);
  const res = await req('POST', '/v1/applications', {
    cohortId: cohort.body.cohort.id, startupName: 'NewAI', founderName: 'Jane', founderEmail: 'jane@newai.com',
    pitch: 'AI for X', industry: 'AI', stage: 'seed', needs: ['fundraising', 'gtm'], teamSize: 3,
  }, token);
  assert.equal(res.status, 201);
  assert.equal(res.body.application.status, 'submitted');
});

test('Update application status to accepted', async () => {
  await boot();
  const token = await registerOperator();
  const prog = await req('POST', '/v1/programs', { name: 'P', type: 'accelerator' }, token);
  const cohort = await req('POST', '/v1/cohorts', { programId: prog.body.program.id, name: 'C', startDate: '2026-01-01', endDate: '2026-06-01' }, token);
  const app = await req('POST', '/v1/applications', { cohortId: cohort.body.cohort.id, startupName: 'X', founderName: 'Y', founderEmail: 'y@x.com' }, token);
  const res = await req('PUT', `/v1/applications/${app.body.application.id}/status`, { status: 'accepted', notes: 'Great team' }, token);
  assert.equal(res.status, 200);
  assert.equal(res.body.application.status, 'accepted');
});

test('Mentor matching returns scored mentors', async () => {
  await boot();
  const token = await registerOperator();
  const prog = await req('POST', '/v1/programs', { name: 'P', type: 'accelerator' }, token);
  const cohort = await req('POST', '/v1/cohorts', { programId: prog.body.program.id, name: 'C', startDate: '2026-01-01', endDate: '2026-06-01' }, token);
  // 3 mentors with different specializations
  await req('POST', '/v1/mentors', { name: 'M1', email: 'm1@e.com', expertise: ['fundraising', 'gtm'], industries: ['AI'], preferredStages: ['seed'], availability: 5 }, token);
  await req('POST', '/v1/mentors', { name: 'M2', email: 'm2@e.com', expertise: ['engineering'], industries: ['B2B'], preferredStages: ['series-a'] }, token);
  await req('POST', '/v1/mentors', { name: 'M3', email: 'm3@e.com', expertise: ['gtm'], industries: ['AI'], preferredStages: ['seed'], availability: 3 }, token);
  const app = await req('POST', '/v1/applications', {
    cohortId: cohort.body.cohort.id, startupName: 'A', founderName: 'F', founderEmail: 'f@a.com',
    industry: 'AI', stage: 'seed', needs: ['fundraising', 'gtm'],
  }, token);

  const res = await req('POST', `/v1/applications/${app.body.application.id}/match`, null, token);
  assert.equal(res.status, 200);
  assert.equal(res.body.matches.length, 3);
  // M1 should rank highest (overlap + industry + stage)
  assert.equal(res.body.matches[0].mentorName, 'M1');
  assert.ok(res.body.matches[0].score >= res.body.matches[1].score);
});

test('Schedule and complete a session', async () => {
  await boot();
  const token = await registerOperator();
  const prog = await req('POST', '/v1/programs', { name: 'P', type: 'accelerator' }, token);
  const cohort = await req('POST', '/v1/cohorts', { programId: prog.body.program.id, name: 'C', startDate: '2026-01-01', endDate: '2026-06-01' }, token);
  const mentor = await req('POST', '/v1/mentors', { name: 'M', email: 'm@e.com' }, token);
  const app = await req('POST', '/v1/applications', { cohortId: cohort.body.cohort.id, startupName: 'A', founderName: 'F', founderEmail: 'f@a.com' }, token);

  const ses = await req('POST', '/v1/sessions', {
    mentorId: mentor.body.mentor.id, applicationId: app.body.application.id,
    scheduledAt: '2026-03-15T10:00:00Z', durationMinutes: 60, agenda: 'Fundraising strategy',
  }, token);
  assert.equal(ses.status, 201);
  assert.equal(ses.body.session.status, 'scheduled');

  const done = await req('PUT', `/v1/sessions/${ses.body.session.id}/complete`, { notes: 'Great session, will intro to angels' }, token);
  assert.equal(done.body.session.status, 'completed');
  assert.equal(done.body.session.notes, 'Great session, will intro to angels');
});

test('Create and complete milestone', async () => {
  await boot();
  const token = await registerOperator();
  const prog = await req('POST', '/v1/programs', { name: 'P', type: 'accelerator' }, token);
  const cohort = await req('POST', '/v1/cohorts', { programId: prog.body.program.id, name: 'C', startDate: '2026-01-01', endDate: '2026-06-01' }, token);
  const mile = await req('POST', '/v1/milestones', {
    cohortId: cohort.body.cohort.id, name: 'Demo Day', dueDate: '2026-05-30', description: 'Final pitch', category: 'demo',
  }, token);
  assert.equal(mile.status, 201);

  const done = await req('PUT', `/v1/milestones/${mile.body.milestone.id}/complete`, null, token);
  assert.equal(done.body.milestone.status, 'completed');

  const list = await req('GET', `/v1/cohorts/${cohort.body.cohort.id}/milestones`, null, token);
  assert.equal(list.body.milestones.length, 1);
  assert.equal(list.body.milestones[0].status, 'completed');
});

test('Dashboard returns aggregated stats', async () => {
  await boot();
  const token = await registerOperator();
  const prog = await req('POST', '/v1/programs', { name: 'P', type: 'accelerator' }, token);
  const cohort = await req('POST', '/v1/cohorts', { programId: prog.body.program.id, name: 'C', startDate: '2026-01-01', endDate: '2026-06-01' }, token);
  await req('POST', '/v1/mentors', { name: 'M', email: 'm@e.com' }, token);
  await req('POST', '/v1/applications', { cohortId: cohort.body.cohort.id, startupName: 'A', founderName: 'F', founderEmail: 'f@a.com' }, token);

  const dash = await req('GET', '/v1/dashboard', null, token);
  assert.equal(dash.status, 200);
  assert.equal(dash.body.dashboard.totalPrograms, 1);
  assert.equal(dash.body.dashboard.totalCohorts, 1);
  assert.equal(dash.body.dashboard.totalMentors, 1);
  assert.equal(dash.body.dashboard.totalApplications, 1);
});

test('Unauthorized request returns 401', async () => {
  await boot();
  const res = await req('GET', '/v1/dashboard');
  assert.equal(res.status, 401);
});

test('Unknown route returns 404', async () => {
  await boot();
  const res = await req('GET', '/v1/does-not-exist');
  assert.equal(res.status, 404);
});
