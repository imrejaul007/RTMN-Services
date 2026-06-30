/**
 * Tests for Auto Life Assistant
 */

import { describe, it, expect, beforeEach } from 'vitest';

const AutoLifeAssistant = require('../../src/core/autoLifeAssistant');
const I18n = require('../../src/core/i18n');

describe('AutoLifeAssistant', () => {
  let assistant;
  let i18n;

  beforeEach(() => {
    i18n = new I18n({ logger: { info: () => {} } });
    assistant = new AutoLifeAssistant({
      logger: { info: () => {}, error: () => {} },
      i18n
    });
  });

  describe('checkProactive()', () => {
    it('should return suggestions for a user', async () => {
      const result = await assistant.checkProactive('user-1');
      expect(result.suggestions).toBeDefined();
      expect(result.remainingToday).toBeGreaterThanOrEqual(0);
    });

    it('should respect daily limit (max 3 per day)', async () => {
      // First check
      const r1 = await assistant.checkProactive('user-1');
      const r2 = await assistant.checkProactive('user-1');
      const r3 = await assistant.checkProactive('user-1');
      const r4 = await assistant.checkProactive('user-1');

      // 4th call should hit daily limit
      expect(r4.suggestions.length).toBe(0);
      expect(r4.reason).toContain('Daily limit');
    });

    it('should include trigger information', async () => {
      const result = await assistant.checkProactive('user-1');
      if (result.suggestions.length > 0) {
        const suggestion = result.suggestions[0];
        expect(suggestion).toHaveProperty('triggerId');
        expect(suggestion).toHaveProperty('category');
        expect(suggestion).toHaveProperty('importance');
        expect(suggestion).toHaveProperty('title');
        expect(suggestion).toHaveProperty('suggestion');
        expect(suggestion).toHaveProperty('actions');
      }
    });

    it('should sort suggestions by importance', async () => {
      const result = await assistant.checkProactive('user-1');
      if (result.suggestions.length > 1) {
        for (let i = 0; i < result.suggestions.length - 1; i++) {
          expect(result.suggestions[i].importance).toBeGreaterThanOrEqual(
            result.suggestions[i + 1].importance
          );
        }
      }
    });
  });

  describe('snoozeSuggestion()', () => {
    it('should snooze for 24 hours by default', () => {
      const result = assistant.snoozeSuggestion('user-1', 'flight_tomorrow');
      expect(result.success).toBe(true);
      expect(result.snoozedUntil).toBeDefined();
    });

    it('should support custom snooze duration', () => {
      const result = assistant.snoozeSuggestion('user-1', 'flight_tomorrow', 48);
      expect(result.success).toBe(true);
      const hoursUntil = (new Date(result.snoozedUntil) - new Date()) / (1000 * 60 * 60);
      expect(hoursUntil).toBeGreaterThan(40);
      expect(hoursUntil).toBeLessThan(50);
    });
  });

  describe('disableCategory()', () => {
    it('should disable a category', () => {
      const result = assistant.disableCategory('user-1', 'travel');
      expect(result.success).toBe(true);
      expect(result.enabledCategories).not.toContain('travel');
    });
  });

  describe('trackAction()', () => {
    it('should track user actions on suggestions', async () => {
      const r1 = await assistant.trackAction('user-1', 'flight_tomorrow', 'acted');
      expect(r1.success).toBe(true);

      const stats = assistant.getStats();
      expect(stats.suggestionsActed).toBeGreaterThan(0);
    });
  });

  describe('trigger detection', () => {
    it('should have all expected triggers', () => {
      expect(assistant.triggers.flight_tomorrow).toBeDefined();
      expect(assistant.triggers.rain_outdoor_plan).toBeDefined();
      expect(assistant.triggers.family_birthday).toBeDefined();
      expect(assistant.triggers.family_anniversary).toBeDefined();
      expect(assistant.triggers.low_wallet_balance).toBeDefined();
      expect(assistant.triggers.subscription_renewal).toBeDefined();
      expect(assistant.triggers.free_slot).toBeDefined();
      expect(assistant.triggers.medication_refill).toBeDefined();
      expect(assistant.triggers.festival_today).toBeDefined();
    });

    it('should respect user preferences (disabled categories)', async () => {
      assistant.disableCategory('user-1', 'travel');
      assistant.disableCategory('user-1', 'weather');
      assistant.disableCategory('user-1', 'family');

      const result = await assistant.checkProactive('user-1');
      // Result should not include disabled categories
      const travelSuggestion = result.suggestions.find(s => s.category === 'travel');
      expect(travelSuggestion).toBeUndefined();
    });
  });

  describe('stats', () => {
    it('should track statistics', async () => {
      await assistant.checkProactive('user-1');
      const stats = assistant.getStats();
      expect(stats.checks).toBeGreaterThan(0);
      expect(stats).toHaveProperty('triggersActivated');
      expect(stats).toHaveProperty('suggestionsShown');
    });
  });
});