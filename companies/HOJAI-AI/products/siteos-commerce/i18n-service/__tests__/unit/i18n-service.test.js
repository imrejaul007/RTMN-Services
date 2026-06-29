import { describe, it, expect } from 'vitest';

describe('i18n Service', () => {
  describe('Locales API', () => {
    it('should list all supported locales', async () => {
      const res = await fetch('http://localhost:5491/api/locales');
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.locales).toBeDefined();
      expect(data.locales.length).toBeGreaterThan(10);
    });

    it('should include RTL locales', async () => {
      const res = await fetch('http://localhost:5491/api/locales');
      const data = await res.json();
      const rtlLocales = data.locales.filter(l => l.rtl);
      expect(rtlLocales.length).toBeGreaterThan(0);
    });
  });

  describe('Translations API', () => {
    it('should get English translations', async () => {
      const res = await fetch('http://localhost:5491/api/translations/en', {
        headers: { 'X-API-Key': 'test' }
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.locale).toBe('en');
    });

    it('should set translation', async () => {
      const res = await fetch('http://localhost:5491/api/translations/en', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test' },
        body: JSON.stringify({
          namespace: 'custom',
          key: 'welcome_message',
          value: 'Welcome to our store!'
        })
      });
      expect(res.ok).toBe(true);
    });
  });

  describe('RTL API', () => {
    it('should detect RTL for Arabic', async () => {
      const res = await fetch('http://localhost:5491/api/rtl/ar');
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.rtl).toBe(true);
      expect(data.direction).toBe('rtl');
    });

    it('should detect LTR for English', async () => {
      const res = await fetch('http://localhost:5491/api/rtl/en');
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.rtl).toBe(false);
      expect(data.direction).toBe('ltr');
    });
  });
});
