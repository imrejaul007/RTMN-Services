/**
 * Unit tests for Marketing Automation
 */
import { describe, it, expect } from 'vitest';

function shouldTrigger(rule, context) {
  if (rule.trigger === context.event) return true;
  if (rule.conditions) {
    return rule.conditions.every(c => {
      const val = context[c.field];
      if (c.operator === '>=') return val >= c.value;
      if (c.operator === '<=') return val <= c.value;
      return val === c.value;
    });
  }
  return false;
}

function calculateDelay(delay) {
  const match = delay.match(/(\d+)(m|h|d)/);
  if (!match) return 0;
  const num = parseInt(match[1]);
  if (match[2] === 'm') return num * 60000;
  if (match[2] === 'h') return num * 3600000;
  return num * 86400000;
}

function getNextAction(actions, index) {
  if (index >= actions.length) return null;
  return { ...actions[index], index };
}

describe('Marketing Automation', () => {
  it('should trigger on exact event match', () => {
    const rule = { trigger: 'cart_abandon', conditions: [] };
    expect(shouldTrigger(rule, { event: 'cart_abandon' })).toBe(true);
    expect(shouldTrigger(rule, { event: 'purchase' })).toBe(false);
  });

  it('should evaluate conditions', () => {
    const rule = {
      trigger: 'inactive',
      conditions: [{ field: 'days', operator: '>=', value: 60 }]
    };
    expect(shouldTrigger(rule, { event: 'inactive', days: 90 })).toBe(true);
    expect(shouldTrigger(rule, { event: 'inactive', days: 30 })).toBe(false);
  });

  it('should parse delay strings', () => {
    expect(calculateDelay('15m')).toBe(900000);
    expect(calculateDelay('6h')).toBe(21600000);
    expect(calculateDelay('1d')).toBe(86400000);
  });

  it('should get next action in sequence', () => {
    const actions = [{ channel: 'email' }, { channel: 'sms' }, { channel: 'whatsapp' }];
    expect(getNextAction(actions, 0).channel).toBe('email');
    expect(getNextAction(actions, 1).channel).toBe('sms');
    expect(getNextAction(actions, 3)).toBeNull();
  });

  it('should handle empty actions', () => {
    expect(getNextAction([], 0)).toBeNull();
  });
});
