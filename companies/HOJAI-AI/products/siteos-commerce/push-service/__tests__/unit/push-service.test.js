import { describe, it, expect } from 'vitest';

describe('Push Service', () => {
  describe('Subscribe', () => {
    it('should subscribe a device', async () => {
      const res = await fetch('http://localhost:5488/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-key' },
        body: JSON.stringify({
          token: 'fcm_token_123',
          userId: 'user_123',
          platform: 'web'
        })
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.subscription.subId).toBeDefined();
    });

    it('should require token', async () => {
      const res = await fetch('http://localhost:5488/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-key' },
        body: JSON.stringify({ userId: 'user_123' })
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Send Push', () => {
    it('should send push notification', async () => {
      const res = await fetch('http://localhost:5488/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-key' },
        body: JSON.stringify({
          token: 'fcm_token_123',
          notification: { title: 'Test', body: 'Hello!' }
        })
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.push.pushId).toBeDefined();
    });
  });

  describe('Send Segment', () => {
    it('should send to segment', async () => {
      const res = await fetch('http://localhost:5488/api/push/send-segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-key' },
        body: JSON.stringify({
          segment: 'all_users',
          notification: { title: 'Broadcast', body: 'Hello everyone!' }
        })
      });
      expect(res.ok).toBe(true);
    });
  });
});
