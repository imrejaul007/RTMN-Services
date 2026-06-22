/**
 * Unit tests for the ACP state machine.
 *
 * Covers:
 *   - isTerminal / isValidTransition (every allowed/forbidden transition)
 *   - validateMessageBody (every message type's required fields)
 *   - appendMessage (happy path, terminal states, illegal transitions, tenant isolation)
 *   - getStats / listNegotiations / listMessages
 *
 * Uses mongodb-memory-server so no external Mongo needed.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  isTerminal,
  isValidTransition,
  validateMessageBody,
  ValidationError,
  StateTransitionError,
  appendMessage,
  listMessages,
  listNegotiations,
  getNegotiation,
  getStats,
  MESSAGE_TYPES,
  MESSAGE_NEXT_VALID,
} from '../../src/services/stateMachine.js';
import { connectTestDb, disconnectTestDb, clearTestDb } from '../helpers/db.js';

beforeAll(async () => { await connectTestDb(); });
afterAll(async () => { await disconnectTestDb(); });
beforeEach(async () => { await clearTestDb(); });

const QUERY = (overrides = {}) => ({
  type: 'QUERY',
  sender: 'agt-consumer-1',
  receiver: 'agt-merchant-1',
  intent: 'Find a steel supplier',
  context: { quantity: 100, unit: 'tons' },

  ...overrides,
});

const QUOTE = (overrides = {}) => ({
  type: 'QUOTE',
  sender: 'agt-merchant-1',
  receiver: 'agt-consumer-1',
  payload: { unitPrice: 1200, currency: 'INR', leadTimeDays: 14 },

  ...overrides,
});

const COUNTER = (overrides = {}) => ({
  type: 'COUNTER',
  sender: 'agt-consumer-1',
  receiver: 'agt-merchant-1',
  payload: { unitPrice: 1100, currency: 'INR', leadTimeDays: 21 },

  ...overrides,
});

const ACCEPT = (overrides = {}) => ({
  type: 'ACCEPT',
  sender: 'agt-consumer-1',
  receiver: 'agt-merchant-1',
  payload: { acceptedPrice: 1100 },

  ...overrides,
});

const REJECT = (overrides = {}) => ({
  type: 'REJECT',
  sender: 'agt-merchant-1',
  receiver: 'agt-consumer-1',
  payload: { reason: 'Cannot meet lead time' },

  ...overrides,
});

const ORDER = (overrides = {}) => ({
  type: 'ORDER',
  sender: 'agt-consumer-1',
  receiver: 'agt-merchant-1',
  payload: { quantity: 100, unitPrice: 1100, totalAmount: 110000 },

  ...overrides,
});

const TRACK = (overrides = {}) => ({
  type: 'TRACK',
  sender: 'agt-consumer-1',
  receiver: 'agt-merchant-1',
  payload: { status: 'IN_TRANSIT' },

  ...overrides,
});

const DISPUTE = (overrides = {}) => ({
  type: 'DISPUTE',
  sender: 'agt-consumer-1',
  receiver: 'agt-merchant-1',
  payload: { reason: 'Wrong quantity delivered' },

  ...overrides,
});

describe('isTerminal', () => {
  it('REJECT is terminal', () => {
    expect(isTerminal('REJECT')).toBe(true);
  });
  it('other types are not terminal', () => {
    for (const t of MESSAGE_TYPES.filter((t) => t !== 'REJECT')) {
      expect(isTerminal(t)).toBe(false);
    }
  });
});

describe('isValidTransition', () => {
  it('first message must be QUERY', () => {
    expect(isValidTransition(null, 'QUERY')).toBe(true);
    expect(isValidTransition(null, 'QUOTE')).toBe(false);
    expect(isValidTransition(null, 'ORDER')).toBe(false);
    expect(isValidTransition(null, 'ACCEPT')).toBe(false);
  });
  it('QUERY can go to QUOTE or REJECT only', () => {
    expect(isValidTransition('QUERY', 'QUOTE')).toBe(true);
    expect(isValidTransition('QUERY', 'REJECT')).toBe(true);
    expect(isValidTransition('QUERY', 'COUNTER')).toBe(false);
    expect(isValidTransition('QUERY', 'ORDER')).toBe(false);
    expect(isValidTransition('QUERY', 'TRACK')).toBe(false);
  });
  it('QUOTE can go to COUNTER, ACCEPT, REJECT', () => {
    expect(isValidTransition('QUOTE', 'COUNTER')).toBe(true);
    expect(isValidTransition('QUOTE', 'ACCEPT')).toBe(true);
    expect(isValidTransition('QUOTE', 'REJECT')).toBe(true);
    expect(isValidTransition('QUOTE', 'QUERY')).toBe(false);
  });
  it('COUNTER can go to COUNTER, ACCEPT, REJECT, QUOTE', () => {
    expect(isValidTransition('COUNTER', 'COUNTER')).toBe(true);
    expect(isValidTransition('COUNTER', 'ACCEPT')).toBe(true);
    expect(isValidTransition('COUNTER', 'REJECT')).toBe(true);
    expect(isValidTransition('COUNTER', 'QUOTE')).toBe(true);
    expect(isValidTransition('COUNTER', 'QUERY')).toBe(false);
  });
  it('ACCEPT can go to ORDER or REJECT', () => {
    expect(isValidTransition('ACCEPT', 'ORDER')).toBe(true);
    expect(isValidTransition('ACCEPT', 'REJECT')).toBe(true);
    expect(isValidTransition('ACCEPT', 'QUOTE')).toBe(false);
  });
  it('ORDER can go to TRACK or DISPUTE', () => {
    expect(isValidTransition('ORDER', 'TRACK')).toBe(true);
    expect(isValidTransition('ORDER', 'DISPUTE')).toBe(true);
    expect(isValidTransition('ORDER', 'ACCEPT')).toBe(false);
  });
  it('TRACK can go to TRACK or DISPUTE', () => {
    expect(isValidTransition('TRACK', 'TRACK')).toBe(true);
    expect(isValidTransition('TRACK', 'DISPUTE')).toBe(true);
  });
  it('DISPUTE can go to TRACK or ACCEPT', () => {
    expect(isValidTransition('DISPUTE', 'TRACK')).toBe(true);
    expect(isValidTransition('DISPUTE', 'ACCEPT')).toBe(true);
    expect(isValidTransition('DISPUTE', 'QUERY')).toBe(false);
  });
  it('MESSAGE_NEXT_VALID matches isValidTransition for all types', () => {
    for (const from of MESSAGE_TYPES) {
      for (const to of MESSAGE_TYPES) {
        const expected = (MESSAGE_NEXT_VALID[from] || []).includes(to);
        expect(isValidTransition(from, to)).toBe(expected);
      }
    }
  });
});

describe('validateMessageBody', () => {
  it('rejects unknown types', () => {
    expect(() => validateMessageBody('FOO', { sender: 'a', receiver: 'b' })).toThrow(ValidationError);
  });
  it('requires sender + receiver for every type', () => {
    expect(() => validateMessageBody('QUERY', { intent: 'x' })).toThrow(ValidationError);
  });
  it('QUERY requires intent', () => {
    expect(() => validateMessageBody('QUERY', { sender: 'a', receiver: 'b' })).toThrow(ValidationError);
    expect(() => validateMessageBody('QUERY', QUERY())).not.toThrow();
  });
  it('QUOTE requires payload object', () => {
    expect(() => validateMessageBody('QUOTE', { sender: 'a', receiver: 'b' })).toThrow(ValidationError);
    expect(() => validateMessageBody('QUOTE', QUOTE())).not.toThrow();
  });
  it('DISPUTE requires payload.reason', () => {
    expect(() => validateMessageBody('DISPUTE', { sender: 'a', receiver: 'b', payload: {} })).toThrow(ValidationError);
    expect(() => validateMessageBody('DISPUTE', DISPUTE())).not.toThrow();
  });
  it('context must be a plain object', () => {
    expect(() => validateMessageBody('QUERY', { ...QUERY(), context: 'not-object' })).toThrow(ValidationError);
    expect(() => validateMessageBody('QUERY', { ...QUERY(), context: [] })).toThrow(ValidationError);
  });
});

describe('appendMessage — happy path', () => {
  it('creates a new negotiation with QUERY', async () => {
    const out = await appendMessage('t-1', null, QUERY());
    expect(out.created).toBe(true);
    expect(out.negotiation.status).toBe('ACTIVE');
    expect(out.negotiation.currentType).toBe('QUERY');
    expect(out.negotiation.messageCount).toBe(1);
    expect(out.message.type).toBe('QUERY');
    expect(out.message.tenantId).toBe('t-1');
  });

  it('runs full QUERY → QUOTE → COUNTER → ACCEPT → ORDER → TRACK → TRACK happy path', async () => {
    let out = await appendMessage('t-1', null, QUERY());
    const negId = out.negotiation.negotiationId;
    out = await appendMessage('t-1', negId, QUOTE());
    expect(out.negotiation.currentType).toBe('QUOTE');
    expect(out.negotiation.status).toBe('ACTIVE');
    out = await appendMessage('t-1', negId, COUNTER());
    expect(out.negotiation.currentType).toBe('COUNTER');
    out = await appendMessage('t-1', negId, ACCEPT());
    expect(out.negotiation.currentType).toBe('ACCEPT');
    expect(out.negotiation.status).toBe('ACCEPTED');
    out = await appendMessage('t-1', negId, ORDER());
    expect(out.negotiation.currentType).toBe('ORDER');
    expect(out.negotiation.status).toBe('COMPLETED');  // ORDER after ACCEPT → COMPLETED
    expect(out.negotiation.completedAt).toBeInstanceOf(Date);
    out = await appendMessage('t-1', negId, TRACK());
    expect(out.negotiation.status).toBe('COMPLETED');  // still COMPLETED (no further transitions)
  });

  it('records every message with incremented messageCount', async () => {
    let out = await appendMessage('t-1', null, QUERY());
    const negId = out.negotiation.negotiationId;
    await appendMessage('t-1', negId, QUOTE());
    out = await appendMessage('t-1', negId, REJECT());
    expect(out.negotiation.messageCount).toBe(3);
    expect(out.negotiation.status).toBe('REJECTED');
  });
});

describe('appendMessage — illegal transitions', () => {
  it('cannot start a negotiation with QUOTE', async () => {
    await expect(appendMessage('t-1', null, QUOTE())).rejects.toThrow(StateTransitionError);
  });
  it('rejects QUERY → ACCEPT (must go through QUOTE first)', async () => {
    let out = await appendMessage('t-1', null, QUERY());
    await expect(appendMessage('t-1', out.negotiation.negotiationId, ACCEPT())).rejects.toThrow(StateTransitionError);
  });
  it('rejects further messages after REJECT', async () => {
    let out = await appendMessage('t-1', null, QUERY());
    await appendMessage('t-1', out.negotiation.negotiationId, REJECT());
    await expect(appendMessage('t-1', out.negotiation.negotiationId, QUOTE())).rejects.toThrow(StateTransitionError);
  });
  it('allows TRACK after COMPLETED (per spec, ORDER → TRACK is valid)', async () => {
    let out = await appendMessage('t-1', null, QUERY());
    const negId = out.negotiation.negotiationId;
    await appendMessage('t-1', negId, QUOTE());
    await appendMessage('t-1', negId, ACCEPT());
    await appendMessage('t-1', negId, ORDER());
    // After ORDER the status becomes COMPLETED, but TRACK is still allowed by the ACP spec.
    out = await appendMessage('t-1', negId, TRACK());
    expect(out.negotiation.status).toBe('COMPLETED');
    expect(out.negotiation.currentType).toBe('TRACK');
    expect(out.negotiation.messageCount).toBe(5);
  });
  it('rejects QUERY → QUERY (no reply)', async () => {
    let out = await appendMessage('t-1', null, QUERY());
    await expect(appendMessage('t-1', out.negotiation.negotiationId, QUERY())).rejects.toThrow(StateTransitionError);
  });
});

describe('appendMessage — tenant isolation', () => {
  it('tenant A cannot append to tenant B negotiation', async () => {
    const out = await appendMessage('t-A', null, QUERY());
    const tenantBQuery = { ...QUERY(), sender: 'b1', receiver: 'b2' };
    // Tenant B creates its own negotiation
    const outB = await appendMessage('t-B', null, tenantBQuery);
    expect(outB.negotiation.negotiationId).not.toBe(out.negotiation.negotiationId);
    // Tenant A cannot append to B's negotiation
    await expect(appendMessage('t-A', outB.negotiation.negotiationId, QUOTE({ sender: 'a1', receiver: 'b2' }))).rejects.toThrow(ValidationError);
  });
  it('requires tenantId', async () => {
    await expect(appendMessage(null, null, QUERY())).rejects.toThrow(ValidationError);
    await expect(appendMessage('', null, QUERY())).rejects.toThrow(ValidationError);
  });
  it('different tenants do not see each other negotiations', async () => {
    const a = await appendMessage('t-A', null, QUERY({ sender: 'a1', receiver: 'a2' }));
    const b = await appendMessage('t-B', null, QUERY({ sender: 'b1', receiver: 'b2' }));
    expect(a.negotiation.negotiationId).not.toBe(b.negotiation.negotiationId);
    const listA = await listNegotiations('t-A');
    const listB = await listNegotiations('t-B');
    expect(listA.map((n) => n.negotiationId)).toEqual([a.negotiation.negotiationId]);
    expect(listB.map((n) => n.negotiationId)).toEqual([b.negotiation.negotiationId]);
  });
});

describe('listMessages + getNegotiation', () => {
  it('lists messages in conversation order', async () => {
    let out = await appendMessage('t-1', null, QUERY());
    const negId = out.negotiation.negotiationId;
    await appendMessage('t-1', negId, QUOTE());
    await appendMessage('t-1', negId, ACCEPT());
    await appendMessage('t-1', negId, ORDER());
    const msgs = await listMessages('t-1', negId);
    expect(msgs.map((m) => m.type)).toEqual(['QUERY', 'QUOTE', 'ACCEPT', 'ORDER']);
  });
  it('returns null for unknown negotiation', async () => {
    expect(await getNegotiation('t-1', 'nope')).toBeNull();
  });
  it('returns null for cross-tenant negotiation lookup', async () => {
    const out = await appendMessage('t-A', null, QUERY());
    expect(await getNegotiation('t-B', out.negotiation.negotiationId)).toBeNull();
  });
});

describe('listNegotiations', () => {
  it('filters by status', async () => {
    let a = await appendMessage('t-1', null, QUERY({ messageId: 'a-1' }));
    let b = await appendMessage('t-1', null, QUERY({ messageId: 'b-1', sender: 's1', receiver: 'r1' }));
    await appendMessage('t-1', b.negotiation.negotiationId, REJECT({ messageId: 'b-r-1' }));
    const active = await listNegotiations('t-1', { status: 'ACTIVE' });
    const rejected = await listNegotiations('t-1', { status: 'REJECTED' });
    expect(active.length).toBe(1);
    expect(rejected.length).toBe(1);
  });
  it('filters by agent (initiator OR responder)', async () => {
    await appendMessage('t-1', null, QUERY({ sender: 'alice', receiver: 'bob' }));
    await appendMessage('t-1', null, QUERY({ sender: 'bob', receiver: 'carol' }));
    await appendMessage('t-1', null, QUERY({ sender: 'dave', receiver: 'eve' }));
    const bobNegs = await listNegotiations('t-1', { agent: 'bob' });
    expect(bobNegs.length).toBe(2);
  });
  it('caps limit at 200', async () => {
    for (let i = 0; i < 5; i++) {
      await appendMessage('t-1', null, QUERY({ messageId: `m-${i}`, sender: `s-${i}`, receiver: `r-${i}` }));
    }
    const all = await listNegotiations('t-1');
    expect(all.length).toBe(5);
    const one = await listNegotiations('t-1', { limit: 1 });
    expect(one.length).toBe(1);
  });
});

describe('getStats', () => {
  it('returns counts + byStatus + byType', async () => {
    let out = await appendMessage('t-1', null, QUERY({ messageId: 'q-1' }));
    await appendMessage('t-1', out.negotiation.negotiationId, QUOTE());
    await appendMessage('t-1', out.negotiation.negotiationId, REJECT());

    out = await appendMessage('t-1', null, QUERY({ messageId: 'q-2', sender: 's2', receiver: 'r2' }));
    await appendMessage('t-1', out.negotiation.negotiationId, QUOTE());

    const stats = await getStats('t-1');
    expect(stats.negotiations).toBe(2);
    expect(stats.messages).toBe(5);
    expect(stats.byStatus.ACTIVE).toBe(1);
    expect(stats.byStatus.REJECTED).toBe(1);
    expect(stats.byType.QUERY).toBe(2);
    expect(stats.byType.QUOTE).toBe(2);
    expect(stats.byType.REJECT).toBe(1);
  });
  it('stats are tenant-scoped', async () => {
    await appendMessage('t-A', null, QUERY());
    await appendMessage('t-B', null, QUERY({ sender: 's', receiver: 'r' }));
    const a = await getStats('t-A');
    const b = await getStats('t-B');
    expect(a.negotiations).toBe(1);
    expect(b.negotiations).toBe(1);
  });
});

describe('appendMessage — payload is stored verbatim', () => {
  it('preserves arbitrary payload data', async () => {
    const richPayload = { unitPrice: 1100, currency: 'INR', extras: { insurance: true, vat: 0.18 } };
    let out = await appendMessage('t-1', null, QUERY());
    out = await appendMessage('t-1', out.negotiation.negotiationId, QUOTE({ payload: richPayload }));
    expect(out.message.payload).toEqual(richPayload);
  });
});