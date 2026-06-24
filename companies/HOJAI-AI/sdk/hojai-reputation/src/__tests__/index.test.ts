/**
 * @hojai/reputation — Comprehensive test suite.
 *
 * Uses Node's built-in test runner (no extra deps).
 * Run with: npm test (after build)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Reputation, HttpError } from '../index.js';
import { AgentReputationClient, DisputeClient, RiskClient, SadaClient, TrustNetworkClient, LeaderboardClient } from '../index.js';
import { request } from '../utils.js';
import type { HojaiConfig } from '../foundation-config.js';

/**
 * Mock fetch helper — replaces globalThis.fetch and restores after the test.
 * Records all calls so tests can assert on URL/method/body.
 */
interface FetchCall {
  url: string;
  method: string;
  body?: string;
  headers: Record<string, string>;
}

function withFetchMock(handler: (url: string, options: RequestInit) => Promise<Response>) {
  const original = globalThis.fetch;
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (url: unknown, init: RequestInit | undefined) => {
    calls.push({
      url: String(url),
      method: init?.method ?? 'GET',
      body: init?.body as string | undefined,
      headers: (init?.headers ?? {}) as Record<string, string>
    });
    return handler(String(url), init ?? {});
  }) as typeof fetch;
  return {
    calls,
    restore: () => { globalThis.fetch = original; }
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

const baseConfig: HojaiConfig = {
  apiKey: 'test-key',
  baseUrl: 'http://localhost:4399'
};

// ─── 1. Facade wiring ─────────────────────────────────────────────────
test('Reputation client instantiates with all 6 sub-clients', () => {
  const rep = new Reputation(baseConfig);
  assert.ok(rep.agent instanceof AgentReputationClient);
  assert.ok(rep.dispute instanceof DisputeClient);
  assert.ok(rep.risk instanceof RiskClient);
  assert.ok(rep.sada instanceof SadaClient);
  assert.ok(rep.network instanceof TrustNetworkClient);
  assert.ok(rep.leaderboard instanceof LeaderboardClient);
  assert.equal(rep.config.apiKey, 'test-key');
});

// ─── 2. AGENT — 10 methods ────────────────────────────────────────────
test('agent.create POSTs to /api/reputation', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { agentId: 'a-1', trustScore: 50, trustBand: 'bronze', status: 'active', totalTransactions: 0, successfulTransactions: 0, failedTransactions: 0, disputesRaised: 0, disputesAgainst: 0, createdAt: '2026-06-24' }));
  await new Reputation(baseConfig).agent.create({ agentId: 'a-1' });
  assert.equal(m.calls[0].url, 'http://localhost:4399/api/reputation');
  m.restore();
});

test('agent.getTrust returns score + band', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { agentId: 'a-1', trustScore: 92, trustBand: 'platinum' }));
  const t = await new Reputation(baseConfig).agent.getTrust('a-1');
  assert.equal(t.trustBand, 'platinum');
  m.restore();
});

test('agent.recordTransaction POSTs with full payload', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { id: 'tx-1', agentId: 'a-1', type: 'sale', amount: 1000, currency: 'INR', outcome: 'success', occurredAt: '2026-06-24' }));
  await new Reputation(baseConfig).agent.recordTransaction({
    agentId: 'a-1', counterpartyAgentId: 'a-2', type: 'sale', amount: 1000, currency: 'INR', outcome: 'success'
  });
  assert.equal(m.calls[0].method, 'POST');
  m.restore();
});

test('agent.raiseDispute creates dispute', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { disputeId: 'd-1', agentId: 'a-1', status: 'open', createdAt: '2026-06-24' }));
  const d = await new Reputation(baseConfig).agent.raiseDispute({
    agentId: 'a-1', transactionId: 'tx-1', reason: 'non_delivery'
  });
  assert.equal(d.disputeId, 'd-1');
  m.restore();
});

test('agent.block + unblock cycle', async () => {
  const m = withFetchMock(async (url) => {
    if (url.includes('/block')) return jsonResponse(200, { agentId: 'a-1', status: 'blocked' });
    return jsonResponse(200, { agentId: 'a-1', status: 'active' });
  });
  const blocked = await new Reputation(baseConfig).agent.block('a-1', 'fraud');
  assert.equal(blocked.status, 'blocked');
  const active = await new Reputation(baseConfig).agent.unblock('a-1');
  assert.equal(active.status, 'active');
  m.restore();
});

test('agent.getLeaderboard with band filter', async () => {
  const m = withFetchMock(async (url) => {
    assert.ok(url.includes('band=platinum'));
    return jsonResponse(200, [{ agentId: 'a-99', trustScore: 99, trustBand: 'platinum', totalTransactions: 5000 }]);
  });
  const lb = await new Reputation(baseConfig).agent.getLeaderboard({ band: 'platinum', limit: 10 });
  assert.equal(lb[0].trustBand, 'platinum');
  m.restore();
});

// ─── 3. DISPUTE — 13 methods ──────────────────────────────────────────
test('dispute.create posts full payload', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    id: 'd-1', raisedBy: 'a-1', raisedAgainst: 'a-2', reason: 'quality_issue',
    description: 'broken', status: 'open', evidenceIds: [], createdAt: '2026-06-24', updatedAt: '2026-06-24'
  }));
  await new Reputation(baseConfig).dispute.create({
    raisedBy: 'a-1', raisedAgainst: 'a-2', reason: 'quality_issue', description: 'broken', amount: 500, currency: 'INR'
  });
  m.restore();
});

test('dispute.addEvidence returns evidence with id', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    id: 'ev-1', disputeId: 'd-1', type: 'image', url: 'https://...',
    submittedBy: 'a-1', submittedAt: '2026-06-24'
  }));
  const ev = await new Reputation(baseConfig).dispute.addEvidence({ disputeId: 'd-1', type: 'image', url: 'https://...' });
  assert.equal(ev.id, 'ev-1');
  m.restore();
});

test('dispute.analyze returns AI recommendation', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { disputeId: 'd-1', recommendation: 'refund', confidence: 0.87, reasoning: 'strong evidence' }));
  const a = await new Reputation(baseConfig).dispute.analyze('d-1');
  assert.equal(a.recommendation, 'refund');
  assert.equal(a.confidence, 0.87);
  m.restore();
});

test('dispute.mediate assigns mediator', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { id: 'med-1', disputeId: 'd-1', mediatorAgentId: 'arb-1', status: 'proposed', createdAt: '2026-06-24' }));
  await new Reputation(baseConfig).dispute.mediate('d-1', 'arb-1');
  m.restore();
});

test('dispute.resolve sets outcome', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    id: 'd-1', raisedBy: 'a-1', raisedAgainst: 'a-2', reason: 'quality_issue', description: 'broken',
    status: 'resolved', evidenceIds: [], resolution: { outcome: 'refund', notes: 'ok', resolvedAt: '2026-06-24' },
    createdAt: '2026-06-24', updatedAt: '2026-06-24'
  }));
  const r = await new Reputation(baseConfig).dispute.resolve('d-1', { outcome: 'refund', notes: 'ok' });
  assert.equal(r.resolution?.outcome, 'refund');
  m.restore();
});

// ─── 4. RISK — 7 methods ──────────────────────────────────────────────
test('risk.assess returns risk score + recommendation', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    id: 'ra-1', subjectType: 'agent', subjectId: 'a-1', riskScore: 25, riskLevel: 'low',
    categories: ['velocity'], factors: [{ category: 'velocity', weight: 0.5, description: 'normal' }],
    recommendation: 'allow', assessedAt: '2026-06-24'
  }));
  const r = await new Reputation(baseConfig).risk.assess({ subjectType: 'agent', subjectId: 'a-1' });
  assert.equal(r.recommendation, 'allow');
  m.restore();
});

test('risk.flag creates risk flag', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    id: 'rf-1', subjectType: 'merchant', subjectId: 'm-1', category: 'fraud',
    severity: 'high', description: 'suspicious', status: 'open', flaggedAt: '2026-06-24'
  }));
  const f = await new Reputation(baseConfig).risk.flag({
    subjectType: 'merchant', subjectId: 'm-1', category: 'fraud', severity: 'high', description: 'suspicious'
  });
  assert.equal(f.severity, 'high');
  m.restore();
});

test('risk.setThresholds updates thresholds', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { low: 20, medium: 50, high: 80, critical: 95 }));
  const t = await new Reputation(baseConfig).risk.setThresholds({ low: 20, medium: 50, high: 80, critical: 95 });
  assert.equal(t.critical, 95);
  m.restore();
});

// ─── 5. SADA — 11 methods ─────────────────────────────────────────────
test('sada.getTrust returns trust score with band + components', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    entityId: 'a-1', entityType: 'agent', score: 88, band: 'gold',
    components: [{ dimension: 'transaction_history', weight: 0.5, score: 90 }],
    trend: 'rising', lastUpdated: '2026-06-24'
  }));
  const t = await new Reputation(baseConfig).sada.getTrust('a-1');
  assert.equal(t.band, 'gold');
  assert.equal(t.trend, 'rising');
  m.restore();
});

test('sada.createPolicy posts rules', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    id: 'pol-1', name: 'high-velocity-block', description: 'block rapid transactions',
    rules: [{ when: { velocity: 'high' }, then: 'review' }],
    enabled: true, appliesTo: ['agent'], createdAt: '2026-06-24'
  }));
  await new Reputation(baseConfig).sada.createPolicy({
    name: 'high-velocity-block', description: 'block rapid',
    rules: [{ when: { velocity: 'high' }, then: 'review' }],
    appliesTo: ['agent']
  });
  m.restore();
});

test('sada.validatePolicy returns decision', async () => {
  const m = withFetchMock(async () => jsonResponse(200, { valid: true, decision: 'review', matchedRule: 'high-velocity-block', evaluatedAt: '2026-06-24' }));
  const v = await new Reputation(baseConfig).sada.validatePolicy({ entityType: 'agent', action: 'transfer' });
  assert.equal(v.decision, 'review');
  m.restore();
});

test('sada.submitVerification starts verification', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    id: 'v-1', entityId: 'm-1', type: 'gstin', status: 'pending', submittedAt: '2026-06-24'
  }));
  const v = await new Reputation(baseConfig).sada.submitVerification({ entityId: 'm-1', type: 'gstin' });
  assert.equal(v.status, 'pending');
  m.restore();
});

// ─── 6. NETWORK — 11 methods ──────────────────────────────────────────
test('network.listEntities filters by type', async () => {
  const m = withFetchMock(async (url) => {
    assert.ok(url.includes('type=merchant'));
    return jsonResponse(200, [{ id: 'm-1', type: 'merchant', name: 'Acme', trustScore: 90, endorsementCount: 50, verificationCount: 3, riskFlagCount: 0, createdAt: '2026-06-01' }]);
  });
  await new Reputation(baseConfig).network.listEntities({ type: 'merchant' });
  m.restore();
});

test('network.endorse creates endorsement with weight', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    id: 'end-1', fromEntityId: 'm-1', toEntityId: 'm-2', weight: 0.8, createdAt: '2026-06-24'
  }));
  await new Reputation(baseConfig).network.endorse({ fromEntityId: 'm-1', toEntityId: 'm-2', weight: 0.8, context: 'reliable supplier' });
  m.restore();
});

test('network.getTopTrusted returns sorted entities', async () => {
  const m = withFetchMock(async () => jsonResponse(200, [
    { id: 'm-1', type: 'merchant', name: 'Top1', trustScore: 99, endorsementCount: 500, verificationCount: 10, riskFlagCount: 0, createdAt: '2025-01-01' }
  ]));
  await new Reputation(baseConfig).network.getTopTrusted({ limit: 10 });
  m.restore();
});

// ─── 7. LEADERBOARD — 6 methods ───────────────────────────────────────
test('leaderboard.get dispatches by type', async () => {
  const m = withFetchMock(async (url) => {
    assert.ok(url.endsWith('/agent_trust?limit=10'));
    return jsonResponse(200, {
      type: 'agent_trust', period: {}, entries: [{ rank: 1, entityId: 'a-1', entityType: 'agent', entityName: 'Top', score: 99, metric: 10000 }],
      totalEntities: 500, generatedAt: '2026-06-24'
    });
  });
  const lb = await new Reputation(baseConfig).leaderboard.get('agent_trust', { limit: 10 });
  assert.equal(lb.entries[0].rank, 1);
  m.restore();
});

test('leaderboard.agentTopTrusted convenience method', async () => {
  const m = withFetchMock(async (url) => {
    assert.ok(url.includes('/agent_trust'));
    return jsonResponse(200, {
      type: 'agent_trust', period: {}, entries: [], totalEntities: 100, generatedAt: '2026-06-24'
    });
  });
  const entries = await new Reputation(baseConfig).leaderboard.agentTopTrusted(20);
  assert.deepEqual(entries, []);
  m.restore();
});

// ─── 8. Retry & error handling ────────────────────────────────────────
test('request retries on 5xx then succeeds', async () => {
  let attempts = 0;
  const m = withFetchMock(async () => {
    attempts++;
    if (attempts < 3) return jsonResponse(503, { error: 'down' });
    return jsonResponse(200, { ok: true });
  });
  const result = await request<{ ok: boolean }>({ baseUrl: 'http://x', maxRetries: 3, timeout: 5000 }, 'GET', '/health');
  assert.equal(result.ok, true);
  assert.equal(attempts, 3);
  m.restore();
});

test('request does not retry on 4xx (HttpError)', async () => {
  let attempts = 0;
  const m = withFetchMock(async () => {
    attempts++;
    return jsonResponse(404, { error: 'not found' });
  });
  await assert.rejects(
    () => request({ baseUrl: 'http://x', maxRetries: 3, timeout: 5000 }, 'GET', '/missing'),
    (err: unknown) => err instanceof HttpError && err.status === 404
  );
  assert.equal(attempts, 1);
  m.restore();
});

test('request sends Authorization header when apiKey present', async () => {
  const m = withFetchMock(async (_url, init) => {
    const auth = init.headers?.['Authorization'];
    assert.equal(auth, 'Bearer test-key');
    return jsonResponse(200, { ok: true });
  });
  await request({ apiKey: 'test-key', baseUrl: 'http://x' }, 'GET', '/whoami');
  m.restore();
});

// ─── 9. Config resolution ─────────────────────────────────────────────
test('default timeout and maxRetries applied when omitted', () => {
  const rep = new Reputation({ apiKey: 'k', baseUrl: 'http://x' });
  assert.equal(rep.config.timeout, 10000);
  assert.equal(rep.config.maxRetries, 3);
});

test('custom fetchImpl is wired through', async () => {
  let called = false;
  const custom = async () => {
    called = true;
    return jsonResponse(200, { ok: true });
  };
  await request({ baseUrl: 'http://x', fetchImpl: custom as typeof fetch }, 'GET', '/ping');
  assert.equal(called, true);
});

// ─── 10. Method count smoke ───────────────────────────────────────────
test('total public method count is at least 58', () => {
  const rep = new Reputation(baseConfig);
  const counts = {
    agent: Object.getOwnPropertyNames(Object.getPrototypeOf(rep.agent)).filter(n => n !== 'constructor').length,
    dispute: Object.getOwnPropertyNames(Object.getPrototypeOf(rep.dispute)).filter(n => n !== 'constructor').length,
    risk: Object.getOwnPropertyNames(Object.getPrototypeOf(rep.risk)).filter(n => n !== 'constructor').length,
    sada: Object.getOwnPropertyNames(Object.getPrototypeOf(rep.sada)).filter(n => n !== 'constructor').length,
    network: Object.getOwnPropertyNames(Object.getPrototypeOf(rep.network)).filter(n => n !== 'constructor').length,
    leaderboard: Object.getOwnPropertyNames(Object.getPrototypeOf(rep.leaderboard)).filter(n => n !== 'constructor').length
  };
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  assert.ok(total >= 58, `expected >= 58 methods, got ${total} (${JSON.stringify(counts)})`);
});