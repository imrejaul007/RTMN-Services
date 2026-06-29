import { describe, it, expect } from 'vitest';

describe('SMS Service', () => {
  describe('Send SMS', () => {
    it('should send single SMS', async () => {
      const res = await fetch('http://localhost:5487/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-key' },
        body: JSON.stringify({
          to: '+919876543210',
          message: 'Test SMS message'
        })
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.sms.smsId).toBeDefined();
    });

    it('should require phone number', async () => {
      const res = await fetch('http://localhost:5487/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-key' },
        body: JSON.stringify({ message: 'Test' })
      });
      expect(res.status).toBe(400);
    });

    it('should require DLT template for India', async () => {
      const res = await fetch('http://localhost:5487/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-key' },
        body: JSON.stringify({
          to: '+919876543210',
          message: 'Marketing SMS'
        })
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Bulk SMS', () => {
    it('should send bulk SMS', async () => {
      const res = await fetch('http://localhost:5487/api/sms/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-key' },
        body: JSON.stringify({
          recipients: ['+919876543210', '+919876543211'],
          message: 'Bulk SMS test'
        })
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.results).toBeDefined();
      expect(data.total).toBe(2);
    });
  });

  describe('SMS Stats', () => {
    it('should return SMS statistics', async () => {
      const res = await fetch('http://localhost:5487/api/sms/stats', {
        headers: { 'X-API-Key': 'test-key' }
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.total).toBeDefined();
    });
  });
});
