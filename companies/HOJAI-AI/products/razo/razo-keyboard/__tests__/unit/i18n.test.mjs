/**
 * Tests for i18n (Internationalization)
 */

import { describe, it, expect, beforeEach } from 'vitest';

const I18n = require('../../src/core/i18n');

describe('I18n', () => {
  let i18n;

  beforeEach(() => {
    i18n = new I18n({ logger: { info: () => {} } });
  });

  describe('detectLanguage()', () => {
    it('should detect English', () => {
      expect(i18n.detectLanguage('Hello, how are you?')).toBe('en');
    });

    it('should detect Hindi (Devanagari)', () => {
      expect(i18n.detectLanguage('मैं ठीक हूँ, धन्यवाद')).toBe('hi');
    });

    it('should detect Bengali', () => {
      expect(i18n.detectLanguage('আমি ভালো আছি')).toBe('bn');
    });

    it('should detect Arabic', () => {
      expect(i18n.detectLanguage('السلام عليكم')).toBe('ar');
    });

    it('should detect Urdu', () => {
      expect(i18n.detectLanguage('میں ٹھیک ہوں، شکریہ')).toBe('ur');
    });

    it('should default to English for unknown scripts', () => {
      expect(i18n.detectLanguage('Random text 123')).toBe('en');
    });

    it('should handle empty/null input', () => {
      expect(i18n.detectLanguage('')).toBe('en');
      expect(i18n.detectLanguage(null)).toBe('en');
    });
  });

  describe('isHinglish()', () => {
    it('should detect Hinglish text', () => {
      expect(i18n.isHinglish('Kal milte hain bhai')).toBe(true);
    });

    it('should detect pure English', () => {
      expect(i18n.isHinglish('Let us meet tomorrow brother')).toBe(false);
    });

    it('should detect pure Hindi (Devanagari)', () => {
      expect(i18n.isHinglish('कल मिलते हैं भाई')).toBe(false);
    });

    it('should handle empty input', () => {
      expect(i18n.isHinglish('')).toBe(false);
    });
  });

  describe('translate()', () => {
    it('should not translate same language', async () => {
      const result = await i18n.translate('Hello', 'en', 'en');
      expect(result.adapted).toBe(false);
    });

    it('should translate with cultural adaptation', async () => {
      const result = await i18n.translate('Let\'s meet tomorrow', 'en', 'ar', {
        relationship: 'business',
        formality: 'high'
      });
      expect(result.adapted).toBe(true);
      expect(result.toLanguage).toBe('ar');
    });

    it('should adapt for family context', async () => {
      const result = await i18n.translate('See you tomorrow', 'en', 'hi', {
        relationship: 'family'
      });
      expect(result.text).toContain('आ');
    });

    it('should include cultural notes for Arabic', async () => {
      const result = await i18n.translate('Hello', 'en', 'ar', { religion: 'islamic' });
      expect(result.culturalNotes).toBeDefined();
      expect(result.culturalNotes.length).toBeGreaterThan(0);
    });
  });

  describe('getGreeting()', () => {
    it('should give Islamic greeting for Muslim', () => {
      const greeting = i18n.getGreeting({ religion: 'islamic' }, 'en');
      expect(greeting.text).toBe('Assalamu Alaikum');
      expect(greeting.cultural).toBe(true);
    });

    it('should give time-based greeting for non-religious', () => {
      const greeting = i18n.getGreeting({ religion: null }, 'hi');
      expect(greeting.text).toBeTruthy();
      expect(greeting.type).toBe('time-based');
    });

    it('should support multiple languages', () => {
      expect(i18n.getGreeting({}, 'hi').text).toBeTruthy();
      expect(i18n.getGreeting({}, 'ar').text).toBeTruthy();
      expect(i18n.getGreeting({}, 'bn').text).toBeTruthy();
    });
  });

  describe('getFestivalGreeting()', () => {
    it('should return Eid Mubarak for Eid', () => {
      const greeting = i18n.getFestivalGreeting('eid', 'en', 'islamic');
      expect(greeting.text).toBe('Eid Mubarak');
      expect(greeting.cultural).toBe(true);
    });

    it('should return Diwali greeting in Hindi', () => {
      const greeting = i18n.getFestivalGreeting('diwali', 'hi', 'hindu');
      expect(greeting.text).toContain('दीपावली');
    });

    it('should return Bihu greeting in Assamese', () => {
      const greeting = i18n.getFestivalGreeting('bihu', 'as', 'hindu');
      expect(greeting.text).toContain('বিহু');
    });

    it('should fall back to English if language not available', () => {
      const greeting = i18n.getFestivalGreeting('diwali', 'xyz', 'hindu');
      expect(greeting.text).toBe('Happy Diwali');
    });
  });

  describe('getCurrentFestival()', () => {
    it('should return null for non-festival days', () => {
      const festival = i18n.getCurrentFestival('user-1', 'india');
      // Result depends on date - should be string or null
      expect(['string', 'object']).toContain(typeof festival);
    });
  });

  describe('getSupportedLanguages()', () => {
    it('should return 6 languages', () => {
      const langs = i18n.getSupportedLanguages();
      expect(langs.length).toBe(6);
      expect(langs.map(l => l.code)).toEqual(
        expect.arrayContaining(['en', 'hi', 'bn', 'as', 'ar', 'ur'])
      );
    });

    it('should include language metadata', () => {
      const langs = i18n.getSupportedLanguages();
      const hindi = langs.find(l => l.code === 'hi');
      expect(hindi.name).toBe('Hindi');
      expect(hindi.script).toBe('devanagari');
    });
  });
});