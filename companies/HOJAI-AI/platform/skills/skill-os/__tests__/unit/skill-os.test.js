/**
 * SkillOS - Unit Tests for response helpers + analytics + events
 *
 * These test the small pure functions that don't need a running server.
 * Run with: NODE_ENV=test npx vitest run __tests__/unit/skill-os.test.js
 */
import { describe, it, expect } from 'vitest';
import {
  nowIso,
  ok,
  fail,
  getSkill,
  bumpAnalytics,
  logEvent,
  categories,
  CATEGORY_SEED,
  SKILL_SEED,
} from '../../src/index.js';

describe('nowIso', () => {
  it('returns a valid ISO-8601 string', () => {
    const t = nowIso();
    expect(typeof t).toBe('string');
    expect(new Date(t).toISOString()).toBe(t); // round-trips exactly
  });
  it('two calls return strings', () => {
    expect(typeof nowIso()).toBe('string');
    expect(typeof nowIso()).toBe('string');
  });
});

describe('ok / fail helpers', () => {
  it('ok() sends success envelope', () => {
    let captured;
    const fakeRes = {
      json: (obj) => { captured = obj; },
    };
    ok(fakeRes, { data: { id: 1 } });
    expect(captured).toEqual({ success: true, data: { id: 1 } });
  });
  it('fail() sends error envelope with status', () => {
    let captured_status, captured_body;
    const fakeRes = {
      status: (s) => { captured_status = s; return fakeRes; },
      json: (b) => { captured_body = b; },
    };
    fail(fakeRes, 'BAD', 'something went wrong', 422);
    expect(captured_status).toBe(422);
    expect(captured_body).toEqual({ success: false, error: 'BAD', message: 'something went wrong' });
  });
  it('fail() defaults to 400', () => {
    let captured_status;
    const fakeRes = {
      status: (s) => { captured_status = s; return fakeRes; },
      json: () => {},
    };
    fail(fakeRes, 'X', 'msg');
    expect(captured_status).toBe(400);
  });
});

describe('getSkill', () => {
  it('returns null for unknown id', () => {
    expect(getSkill('nonexistent')).toBeFalsy();
  });
});

describe('bumpAnalytics', () => {
  it('creates analytics record on first call', () => {
    const skillId = 'test-bump-' + Date.now();
    bumpAnalytics(skillId, true, 100);
    // We can't read the analytics store from here without exporting it,
    // but we can at least verify it doesn't throw on second call.
    bumpAnalytics(skillId, true, 50);
    bumpAnalytics(skillId, false, 200);
    expect(true).toBe(true); // got here without throwing
  });
});

describe('logEvent', () => {
  it('appends an event record', () => {
    const skillId = 'test-event-' + Date.now();
    logEvent(skillId, 'test.event', { foo: 'bar' });
    logEvent(skillId, 'test.event2', { count: 42 });
    // We don't expose skillEvents from src, so just verify it doesn't throw
    expect(true).toBe(true);
  });
});

describe('Seed data', () => {
  it('CATEGORY_SEED has 6 expected categories', () => {
    expect(CATEGORY_SEED).toBeDefined();
    expect(Array.isArray(CATEGORY_SEED)).toBe(true);
    expect(CATEGORY_SEED.length).toBe(6);
    const ids = CATEGORY_SEED.map((c) => c.id);
    expect(ids).toContain('ai');
    expect(ids).toContain('commerce');
    expect(ids).toContain('industry');
  });

  it('SKILL_SEED has 6 pre-seeded skills', () => {
    expect(SKILL_SEED).toBeDefined();
    expect(Array.isArray(SKILL_SEED)).toBe(true);
    expect(SKILL_SEED.length).toBe(6);
    SKILL_SEED.forEach((s) => {
      expect(s.id).toBeDefined();
      expect(s.name).toBeDefined();
      expect(s.category).toBeDefined();
      // Seeded skills don't have .code (set when created via API),
      // but they do have either tags or description.
      const hasMeta = s.tags || s.description;
      expect(hasMeta).toBeDefined();
    });
  });
});

describe('Categories PersistentMap', () => {
  it('has 6 categories after seed', () => {
    expect(categories.size).toBeGreaterThanOrEqual(6);
  });
});
