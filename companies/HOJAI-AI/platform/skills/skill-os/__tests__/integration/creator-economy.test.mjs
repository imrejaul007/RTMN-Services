/**
 * SkillOS — Creator economy integration tests
 *
 * End-to-end flow: create library → train skill via dataset → publish asset →
 * install → review → creator reputation → publisher dashboard.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SKILLOS_REQUIRE_AUTH = 'false';
process.env.SKILLOS_NO_LISTEN = '1';
process.env.NODE_ENV = 'test';
process.env.HOJAI_DATA_DIR = `/tmp/hojai-creator-econ-${Date.now()}`;

const BASE = `http://localhost:${process.env.PORT || 4744}`;

let app;
let server;

async function start() {
  const mod = await import('file:///Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/skills/skill-os/src/index.js');
  app = mod.app;
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      process.env.PORT = String(addr.port);
      resolve();
    });
  });
  await new Promise((r) => setTimeout(r, 200));
}

async function stop() {
  if (server) await new Promise((r) => server.close(r));
}

function url(path) { return `http://localhost:${process.env.PORT}${path}`; }

async function get(path) {
  const res = await fetch(url(path));
  return { status: res.status, body: await res.json() };
}

async function post(path, body) {
  const res = await fetch(url(path), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  return { status: res.status, body: await res.json() };
}

async function put(path, body) {
  const res = await fetch(url(path), {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  return { status: res.status, body: await res.json() };
}

async function del(path) {
  const res = await fetch(url(path), { method: 'DELETE' });
  return { status: res.status, body: await res.json() };
}

test('Creator economy — personal libraries', async (t) => {
  await start();
  t.after(async () => { await stop(); });

  let libId, skillId;

  await t.test('create a personal library', async () => {
    const r = await post('/api/libraries', { ownerId: 'user-1', name: 'My Sales Library' });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.ownerId, 'user-1');
    libId = r.body.data.id;
  });

  await t.test('list libraries', async () => {
    const r = await get('/api/libraries?ownerId=user-1');
    assert.equal(r.status, 200);
    assert.ok(r.body.libraries.length >= 1);
  });

  await t.test('create a skill to add to the library', async () => {
    const r = await post('/api/assets', {
      name: 'My Sales Skill', assetType: 'skill', description: 'Personal sales training',
      category: 'business', code: 'result = { trained: true };',
      publisher: 'user-1', ownerId: 'user-1', ownerType: 'human',
    });
    assert.equal(r.status, 201);
    skillId = r.body.data.id;
  });

  await t.test('add a skill to the library', async () => {
    const r = await post(`/api/libraries/${libId}/skills/${skillId}`);
    assert.equal(r.status, 200);
    assert.ok(r.body.data.skillIds.includes(skillId));
  });

  await t.test('list skills in the library', async () => {
    const r = await get(`/api/libraries/${libId}/skills`);
    assert.equal(r.status, 200);
    assert.equal(r.body.count, 1);
    assert.equal(r.body.skills[0].id, skillId);
  });

  await t.test('bind library to an agent', async () => {
    const r = await post(`/api/libraries/${libId}/agents/agent-1`);
    assert.equal(r.status, 200);
    assert.ok(r.body.data.agentRefs.includes('agent-1'));
  });
});

test('Creator economy — training pipeline', async (t) => {
  await start();
  t.after(async () => { await stop(); });

  let datasetId, jobId, skillId;

  await t.test('create a skill to train', async () => {
    const r = await post('/api/assets', {
      name: 'Trainable Skill', assetType: 'skill', description: 'for training test',
      category: 'ai', code: 'result = 1;',
      publisher: 'creator-1', ownerId: 'creator-1', ownerType: 'human',
    });
    assert.equal(r.status, 201);
    skillId = r.body.data.id;
  });

  await t.test('create a dataset with examples', async () => {
    const r = await post('/api/datasets', {
      name: 'My Training Data', ownerId: 'creator-1', skillId,
      examples: [
        { input: { q: 'hello' }, output: { a: 'hi' }, score: 0.9, tags: ['greeting'] },
        { input: { q: 'bye' }, output: { a: 'goodbye' }, score: 0.95, tags: ['greeting'] },
        { input: { q: 'price?' }, output: { a: 'check catalog' }, score: 0.85, tags: ['sales'] },
      ],
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.examples.length, 3);
    assert.equal(r.body.data.stats.avgScore, 0.9);
    datasetId = r.body.data.id;
  });

  await t.test('add more examples to the dataset', async () => {
    const r = await post(`/api/datasets/${datasetId}/examples`, {
      examples: [
        { input: { q: 'thanks' }, output: { a: 'you\'re welcome' }, score: 0.92 },
      ],
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.examples.length, 4);
  });

  await t.test('finalize the dataset', async () => {
    const r = await post(`/api/datasets/${datasetId}/finalize`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.status, 'finalized');
  });

  await t.test('cannot add examples to a finalized dataset', async () => {
    const r = await post(`/api/datasets/${datasetId}/examples`, {
      examples: [{ input: {}, output: {} }],
    });
    assert.equal(r.status, 400);
  });

  await t.test('submit a training job', async () => {
    const r = await post('/api/training/jobs', {
      datasetId, skillId, baseModel: 'gpt-4o-mini', method: 'lora',
      hyperparameters: { epochs: 3 }, createdBy: 'creator-1',
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.status, 'queued');
    assert.equal(r.body.data.estimatedCost, 10);
    jobId = r.body.data.id;
  });

  await t.test('list training jobs for the creator', async () => {
    const r = await get('/api/training/jobs?ownerId=creator-1');
    assert.equal(r.status, 200);
    assert.ok(r.body.jobs.length >= 1);
  });

  await t.test('create a versioned dataset (new version)', async () => {
    const r = await post(`/api/datasets/${datasetId}/version`);
    assert.equal(r.status, 201);
    assert.equal(r.body.data.version, 2);
    assert.equal(r.body.data.parentVersionId, datasetId);
    assert.equal(r.body.data.status, 'draft');
  });

  await t.test('cancel a training job (only queued/running cancellable)', async () => {
    const r = await post(`/api/training/jobs/${jobId}/cancel`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.status, 'cancelled');
  });
});

test('Creator economy — reviews and reputation', async (t) => {
  await start();
  t.after(async () => { await stop(); });

  let assetId;

  await t.test('publish an asset to review', async () => {
    const r = await post('/api/assets', {
      name: 'Reviewable Asset', assetType: 'skill', description: 'for review test',
      category: 'ai', code: 'result=1;', publisher: 'review-test-publisher',
    });
    assert.equal(r.status, 201);
    assetId = r.body.data.id;
  });

  await t.test('submit a review (1-5)', async () => {
    const r = await post(`/api/assets/${assetId}/reviews`, {
      reviewerId: 'rev-1', rating: 5, title: 'Excellent', body: 'Worked great',
      pros: ['fast'], cons: ['docs'],
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.rating, 5);
  });

  await t.test('rejects out-of-range rating', async () => {
    const r = await post(`/api/assets/${assetId}/reviews`, {
      reviewerId: 'rev-2', rating: 7,
    });
    assert.equal(r.status, 400);
  });

  await t.test('list reviews with aggregate', async () => {
    const r = await get(`/api/assets/${assetId}/reviews`);
    assert.equal(r.status, 200);
    assert.ok(r.body.aggregate.count >= 1);
    assert.ok(r.body.aggregate.average > 0);
  });

  await t.test('vote helpful', async () => {
    // Get the first review id
    const list = await get(`/api/assets/${assetId}/reviews`);
    const rid = list.body.reviews[0].id;
    const r = await post(`/api/reviews/${rid}/helpful`, { vote: 'helpful' });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.helpful, 1);
  });

  await t.test('publisher responds to review (one-shot)', async () => {
    const list = await get(`/api/assets/${assetId}/reviews`);
    const rid = list.body.reviews[0].id;
    const r = await post(`/api/reviews/${rid}/response`, { response: 'Thanks!' });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.publisherResponse, 'Thanks!');
    const again = await post(`/api/reviews/${rid}/response`, { response: 'twice' });
    assert.equal(again.status, 400);
  });

  await t.test('fetch creator reputation', async () => {
    const r = await get('/api/creators/review-test-publisher');
    assert.equal(r.status, 200);
    assert.equal(r.body.data.creatorId, 'review-test-publisher');
    assert.ok(r.body.data.trustScore >= 0);
    assert.equal(r.body.data.totalReviews, 1);
  });
});

test('Creator economy — monetization dashboard', async (t) => {
  await start();
  t.after(async () => { await stop(); });

  let assetId, planId;

  await t.test('publish a paid asset', async () => {
    const r = await post('/api/assets', {
      name: 'Pro Sales', assetType: 'skill', description: 'paid',
      category: 'sales', code: 'result=1;', publisher: 'dash-publisher',
      pricingModel: 'subscription', price: 29,
    });
    assert.equal(r.status, 201);
    assetId = r.body.data.id;
  });

  await t.test('create a pricing plan', async () => {
    const r = await post(`/api/assets/${assetId}/plans`, {
      name: 'Pro', pricingModel: 'subscription', price: 29,
      features: ['all'], limits: { callsPerMonth: 1000 },
    });
    assert.equal(r.status, 201);
    planId = r.body.data.id;
  });

  await t.test('start a subscription', async () => {
    const r = await post('/api/subscriptions', {
      planId, tenantId: 't-1', plan: 'Pro', monthlyPrice: 29, currency: 'USD',
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.status, 'active');
  });

  await t.test('get publisher dashboard', async () => {
    const r = await get('/api/dashboard/publisher/dash-publisher');
    assert.equal(r.status, 200);
    assert.equal(r.body.data.publisherId, 'dash-publisher');
    assert.ok(r.body.data.grossRevenue >= 29);
    assert.ok(r.body.data.byAsset.length >= 1);
    assert.equal(r.body.data.customerCount, 1);
  });

  await t.test('request a payout', async () => {
    const r = await post('/api/billing/payouts', {
      publisherId: 'dash-publisher', amount: 24.65, method: 'rez-wallet',
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.status, 'requested');
  });
});

test('Creator economy — packs and agent enhancement', async (t) => {
  await start();
  t.after(async () => { await stop(); });

  let packId, skillId1, skillId2;

  await t.test('create 2 skills to bundle', async () => {
    const r1 = await post('/api/assets', {
      name: 'Pack Skill 1', assetType: 'skill', description: 'p1', category: 'sales', code: 'result=1;',
      publisher: 'packer', pricingModel: 'one-time', price: 19,
    });
    skillId1 = r1.body.data.id;
    const r2 = await post('/api/assets', {
      name: 'Pack Skill 2', assetType: 'skill', description: 'p2', category: 'sales', code: 'result=2;',
      publisher: 'packer', pricingModel: 'one-time', price: 19,
    });
    skillId2 = r2.body.data.id;
  });

  await t.test('create a pack', async () => {
    const r = await post('/api/assets', {
      name: 'Sales Pack', assetType: 'pack', description: 'bundle', category: 'sales',
      memberAssetIds: [skillId1, skillId2], installBehavior: 'best-effort',
      publisher: 'packer', pricingModel: 'one-time', price: 29,
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.assetType, 'pack');
    packId = r.body.data.id;
  });

  await t.test('install the pack (installs all members)', async () => {
    const r = await post(`/api/assets/${packId}/install-pack`, { tenantId: 'pack-test' });
    assert.equal(r.status, 201);
    assert.equal(r.body.installedCount, 2);
  });

  await t.test('enhance an agent with skills', async () => {
    const r = await post('/api/agents/agent-99/enhance', {
      skillIds: [skillId1, skillId2], installedBy: 'u-1', tenantId: 'pack-test',
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.skillIds.length, 2);
  });

  await t.test('list skills available to the agent', async () => {
    const r = await get('/api/agents/agent-99/skills');
    assert.equal(r.status, 200);
    assert.ok(r.body.skills.length >= 2);
  });
});

test('Creator economy — leaderboard', async (t) => {
  await start();
  t.after(async () => { await stop(); });

  await t.test('GET /api/creators/leaderboard returns ranked list', async () => {
    const r = await get('/api/creators/leaderboard?limit=10');
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.leaderboard));
    // Ranks should be sequential starting from 1
    if (r.body.leaderboard.length >= 2) {
      assert.equal(r.body.leaderboard[0].rank, 1);
      assert.equal(r.body.leaderboard[1].rank, 2);
    }
  });
});

test('Creator economy — versioned datasets', async (t) => {
  await start();
  t.after(async () => { await stop(); });

  let v1, v2;

  await t.test('create v1 dataset', async () => {
    const r = await post('/api/datasets', {
      name: 'Versioned', ownerId: 'u-1', skillId: 'sk-1',
      examples: [{ input: {}, output: {} }],
    });
    v1 = r.body.data.id;
    await post(`/api/datasets/${v1}/finalize`);
  });

  await t.test('version v1 → v2', async () => {
    const r = await post(`/api/datasets/${v1}/version`);
    assert.equal(r.status, 201);
    v2 = r.body.data.id;
    assert.equal(r.body.data.version, 2);
  });

  await t.test('v1 and v2 are separate', async () => {
    const a = await get(`/api/datasets/${v1}`);
    const b = await get(`/api/datasets/${v2}`);
    assert.equal(a.body.data.version, 1);
    assert.equal(b.body.data.version, 2);
  });
});
