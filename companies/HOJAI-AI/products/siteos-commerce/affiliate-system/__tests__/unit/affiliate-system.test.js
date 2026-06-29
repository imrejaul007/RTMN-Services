import { describe, it, expect } from 'vitest';

describe('Affiliate System', () => {
  describe('Partners API', () => {
    it('should register new partner', async () => {
      const res = await fetch('http://localhost:5493/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test' },
        body: JSON.stringify({
          name: 'John Affiliate',
          email: 'john@example.com',
          type: 'affiliate'
        })
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.partner.code).toBeDefined();
      expect(data.partner.commissionType).toBe('CPS');
    });

    it('should list partners', async () => {
      const res = await fetch('http://localhost:5493/api/partners', {
        headers: { 'X-API-Key': 'test' }
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.partners).toBeDefined();
    });

    it('should reject without email', async () => {
      const res = await fetch('http://localhost:5493/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test' },
        body: JSON.stringify({ name: 'Test' })
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Conversions API', () => {
    it('should record conversion', async () => {
      const res = await fetch('http://localhost:5493/api/conversions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test' },
        body: JSON.stringify({
          partnerCode: 'REF123',
          type: 'sale',
          value: 1000
        })
      });
      expect(res.status).toBe(200);
    });
  });

  describe('Stats API', () => {
    it('should get partner stats', async () => {
      const res = await fetch('http://localhost:5493/api/partners/partner_123/stats', {
        headers: { 'X-API-Key': 'test' }
      });
      expect(res.ok).toBe(true);
    });
  });
});
