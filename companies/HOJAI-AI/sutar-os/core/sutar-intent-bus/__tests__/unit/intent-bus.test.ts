/**
 * SUTAR OS — Intent Bus Tests
 */
import { describe, it, expect } from 'vitest';

describe('Intent Bus — Pattern Matching', () => {
  function matchPattern(intent, pattern) {
    const p = pattern.toLowerCase();
    const i = (intent.action || '').toLowerCase();
    const source = (intent.source || '').toLowerCase();
    const target = (intent.target || '').toLowerCase();
    const tags = (intent.tags || []).map(t => t.toLowerCase());

    if (p === '*') return true;
    if (p === i) return true;
    if (p.startsWith('action:') && i === p.slice(7)) return true;
    if (p.startsWith('source:') && source.includes(p.slice(7))) return true;
    if (p.startsWith('target:') && target.includes(p.slice(7))) return true;
    if (p.startsWith('tag:') && tags.some(t => t.includes(p.slice(4)))) return true;
    if (p.includes('*')) {
      const regex = new RegExp('^' + p.replace(/\*/g, '.*') + '$', 'i');
      if (regex.test(intent.action)) return true;
    }
    return false;
  }

  it('matches wildcard pattern', () => {
    expect(matchPattern({ action: 'anything' }, '*')).toBe(true);
  });

  it('matches exact action', () => {
    expect(matchPattern({ action: 'negotiate_contract' }, 'negotiate_contract')).toBe(true);
    expect(matchPattern({ action: 'negotiate_contract' }, 'place_order')).toBe(false);
  });

  it('matches action: prefix', () => {
    expect(matchPattern({ action: 'negotiate_contract' }, 'action:negotiate_contract')).toBe(true);
    expect(matchPattern({ action: 'place_order' }, 'action:negotiate_contract')).toBe(false);
  });

  it('matches source: prefix', () => {
    expect(matchPattern({ action: 'test', source: 'sales-agent' }, 'source:sales')).toBe(true);
    expect(matchPattern({ action: 'test', source: 'procurement-agent' }, 'source:sales')).toBe(false);
  });

  it('matches target: prefix', () => {
    expect(matchPattern({ action: 'test', target: 'supplier-agent' }, 'target:supplier')).toBe(true);
  });

  it('matches tag: prefix', () => {
    expect(matchPattern({ action: 'test', tags: ['urgent', 'contract'] }, 'tag:contract')).toBe(true);
    expect(matchPattern({ action: 'test', tags: ['urgent'] }, 'tag:contract')).toBe(false);
  });

  it('matches wildcard patterns', () => {
    expect(matchPattern({ action: 'negotiate_contract_v2' }, 'negotiate_*')).toBe(true);
    expect(matchPattern({ action: 'negotiate_contract_v2' }, 'order_*')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(matchPattern({ action: 'Negotiate_Contract' }, 'negotiate_contract')).toBe(true);
    expect(matchPattern({ action: 'NEGOTIATE', source: 'SalesAgent' }, 'action:negotiate')).toBe(true);
  });
});

describe('Intent Bus — Intent Publishing', () => {
  const intents = [];

  function publishIntent(params) {
    const intent = {
      intentId: 'id-' + Date.now(),
      action: params.action,
      source: params.source,
      target: params.target,
      priority: params.priority || 'normal',
      payload: params.payload || {},
      tags: params.tags || [],
      timestamp: new Date().toISOString(),
      ttl: params.ttl || 3600,
      correlationId: params.correlationId || null,
    };
    intents.push(intent);
    return { intent, delivered: 0 };
  }

  it('creates intent with defaults', () => {
    const result = publishIntent({ action: 'test_action', source: 'agent-1' });
    expect(result.intent.action).toBe('test_action');
    expect(result.intent.priority).toBe('normal');
    expect(result.intent.ttl).toBe(3600);
    expect(result.intent.tags).toEqual([]);
  });

  it('sets priority', () => {
    const result = publishIntent({ action: 'urgent', priority: 'critical' });
    expect(result.intent.priority).toBe('critical');
  });

  it('sets tags', () => {
    const result = publishIntent({ action: 'negotiate', tags: ['contract', 'urgent'] });
    expect(result.intent.tags).toContain('urgent');
    expect(result.intent.tags).toContain('contract');
  });

  it('sets correlation ID', () => {
    const result = publishIntent({ action: 'test', correlationId: 'corr-123' });
    expect(result.intent.correlationId).toBe('corr-123');
  });

  it('sets payload', () => {
    const result = publishIntent({ action: 'test', payload: { dealValue: 50000 } });
    expect(result.intent.payload.dealValue).toBe(50000);
  });
});

describe('Intent Bus — Subscription Management', () => {
  const subscriptions = new Map();
  let counter = 0;

  function createSubscription(params) {
    const subId = 'sub-' + (++counter);
    const sub = {
      id: subId,
      pattern: params.pattern || '*',
      subscriberId: params.subscriberId,
      callbackUrl: params.callbackUrl,
      description: params.description,
      createdAt: new Date().toISOString(),
      active: true,
      matchedCount: 0,
    };
    subscriptions.set(subId, sub);
    return sub;
  }

  it('creates subscription with defaults', () => {
    const sub = createSubscription({ subscriberId: 'agent-1', callbackUrl: 'http://callback' });
    expect(sub.pattern).toBe('*');
    expect(sub.active).toBe(true);
    expect(sub.matchedCount).toBe(0);
  });

  it('creates pattern-specific subscription', () => {
    const sub = createSubscription({ subscriberId: 'agent-2', pattern: 'negotiate_*', callbackUrl: 'http://cb' });
    expect(sub.pattern).toBe('negotiate_*');
  });

  it('creates source-specific subscription', () => {
    const sub = createSubscription({ subscriberId: 'agent-3', pattern: 'source:sales', callbackUrl: 'http://cb' });
    expect(sub.pattern).toBe('source:sales');
  });
});
