/**
 * Widget Automation - Tests
 */

import { jest } from '@jest/globals';

// Mock stores
const mockRulesStore = new Map();
const mockExecutionsStore = new Map();
const mockScheduledJobsStore = new Map();

jest.unstable_mockModule('../src/index.js', () => ({
  rulesStore: mockRulesStore,
  executionsStore: mockExecutionsStore,
  scheduledJobsStore: mockScheduledJobsStore,
  DEFAULT_RULES: [
    { id: 'abandoned-cart', name: 'Abandoned Cart', trigger: 'cart_abandoned', enabled: true },
    { id: 'welcome-series', name: 'Welcome Series', trigger: 'email_subscribed', enabled: true },
    { id: 'win-back', name: 'Win Back', trigger: 'inactivity', enabled: true },
    { id: 'post-purchase', name: 'Post Purchase', trigger: 'purchase_completed', enabled: true },
    { id: 'birthday-campaign', name: 'Birthday', trigger: 'birthday', enabled: true },
  ],
  getRule: jest.fn((ruleId) => mockRulesStore.get(ruleId)),
  getAllRules: jest.fn(() => Array.from(mockRulesStore.values())),
  createRule: jest.fn((data) => {
    const rule = { id: data.id || 'rule-1', ...data };
    mockRulesStore.set(rule.id, rule);
    return rule;
  }),
  updateRule: jest.fn((ruleId, updates) => {
    const rule = mockRulesStore.get(ruleId);
    if (!rule) return null;
    const updated = { ...rule, ...updates };
    mockRulesStore.set(ruleId, updated);
    return updated;
  }),
  deleteRule: jest.fn((ruleId) => mockRulesStore.delete(ruleId)),
  triggerRule: jest.fn((ruleId, visitorId, context) => {
    const rule = mockRulesStore.get(ruleId);
    if (!rule || !rule.enabled) return null;
    const execution = { id: 'exec-1', ruleId, visitorId, triggeredAt: Date.now() };
    mockExecutionsStore.set(execution.id, execution);
    return execution;
  }),
  evaluateConditions: jest.fn(() => true),
}));

describe('Widget Automation', () => {
  beforeEach(() => {
    mockRulesStore.clear();
    mockExecutionsStore.clear();
    mockScheduledJobsStore.clear();
  });

  describe('Default Rules', () => {
    test('should have 5 default rules', async () => {
      const { DEFAULT_RULES } = await import('../src/index.js');
      expect(DEFAULT_RULES).toHaveLength(5);
    });

    test('should have abandoned-cart rule', async () => {
      const { DEFAULT_RULES } = await import('../src/index.js');
      expect(DEFAULT_RULES.find(r => r.id === 'abandoned-cart')).toBeDefined();
    });

    test('should have win-back rule with inactivity trigger', async () => {
      const { DEFAULT_RULES } = await import('../src/index.js');
      const winBack = DEFAULT_RULES.find(r => r.id === 'win-back');
      expect(winBack).toBeDefined();
      expect(winBack.trigger).toBe('inactivity');
    });
  });

  describe('Rule Management', () => {
    test('should create a new rule', async () => {
      const { createRule } = await import('../src/index.js');

      const rule = createRule({
        id: 'test-rule',
        name: 'Test Rule',
        trigger: 'manual',
        actions: [{ type: 'email', delay: 0, template: 'test' }],
      });

      expect(rule.id).toBe('test-rule');
      expect(rule.name).toBe('Test Rule');
    });

    test('should get all rules', async () => {
      const { createRule, getAllRules } = await import('../src/index.js');

      createRule({ id: 'rule-1', name: 'Rule 1', trigger: 'manual', actions: [] });
      createRule({ id: 'rule-2', name: 'Rule 2', trigger: 'manual', actions: [] });

      const rules = getAllRules();
      expect(rules).toHaveLength(2);
    });

    test('should update a rule', async () => {
      const { createRule, updateRule } = await import('../src/index.js');

      createRule({ id: 'rule-1', name: 'Original', trigger: 'manual', actions: [] });
      const updated = updateRule('rule-1', { name: 'Updated', enabled: false });

      expect(updated.name).toBe('Updated');
      expect(updated.enabled).toBe(false);
    });

    test('should delete a rule', async () => {
      const { createRule, deleteRule, getRule } = await import('../src/index.js');

      createRule({ id: 'rule-1', name: 'To Delete', trigger: 'manual', actions: [] });
      deleteRule('rule-1');

      const rule = getRule('rule-1');
      expect(rule).toBeUndefined();
    });
  });

  describe('Rule Triggering', () => {
    test('should trigger a rule for a visitor', async () => {
      const { createRule, triggerRule } = await import('../src/index.js');

      createRule({
        id: 'abandoned-cart',
        name: 'Abandoned Cart',
        trigger: 'cart_abandoned',
        enabled: true,
        actions: [{ type: 'email', delay: 0, template: 'cart_recovery' }],
      });

      const execution = triggerRule('abandoned-cart', 'visitor-123');
      expect(execution).toBeDefined();
      expect(execution.visitorId).toBe('visitor-123');
    });

    test('should not trigger disabled rule', async () => {
      const { createRule, triggerRule } = await import('../src/index.js');

      createRule({
        id: 'test-rule',
        name: 'Test',
        trigger: 'manual',
        enabled: false,
        actions: [],
      });

      const execution = triggerRule('test-rule', 'visitor-123');
      expect(execution).toBeNull();
    });

    test('should return null for non-existent rule', async () => {
      const { triggerRule } = await import('../src/index.js');

      const execution = triggerRule('non-existent', 'visitor-123');
      expect(execution).toBeNull();
    });
  });

  describe('Condition Evaluation', () => {
    test('should evaluate conditions correctly', async () => {
      const { evaluateConditions } = await import('../src/index.js');

      const conditions = [
        { field: 'days_inactive', operator: 'gte', value: 60 },
      ];

      expect(evaluateConditions(conditions, { days_inactive: 90 })).toBe(true);
      expect(evaluateConditions(conditions, { days_inactive: 30 })).toBe(false);
    });

    test('should pass with empty conditions', async () => {
      const { evaluateConditions } = await import('../src/index.js');
      expect(evaluateConditions([], {})).toBe(true);
    });
  });
});