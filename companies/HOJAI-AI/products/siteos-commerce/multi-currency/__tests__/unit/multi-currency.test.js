import { describe, it, expect } from 'vitest';

describe('Multi-Currency Service', () => {
  describe('Currencies API', () => {
    it('should list all supported currencies', async () => {
      const res = await fetch('http://localhost:5490/api/currencies');
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.currencies).toBeDefined();
      expect(data.currencies.length).toBeGreaterThan(5);
    });
  });

  describe('Convert API', () => {
    it('should convert INR to USD', async () => {
      const res = await fetch('http://localhost:5490/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test' },
        body: JSON.stringify({ amount: 8312, from: 'INR', to: 'USD' })
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.converted.currency).toBe('USD');
    });

    it('should reject invalid currency', async () => {
      const res = await fetch('http://localhost:5490/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test' },
        body: JSON.stringify({ amount: 100, from: 'INVALID', to: 'USD' })
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Format API', () => {
    it('should format INR correctly', async () => {
      const res = await fetch('http://localhost:5490/api/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test' },
        body: JSON.stringify({ amount: 10000, currency: 'INR' })
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.formatted).toBeDefined();
      expect(data.symbol).toBe('₹');
    });

    it('should format USD correctly', async () => {
      const res = await fetch('http://localhost:5490/api/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test' },
        body: JSON.stringify({ amount: 100, currency: 'USD' })
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.formatted).toContain('$');
    });
  });
});
