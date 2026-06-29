import { describe, it, expect, beforeEach } from 'vitest';

describe('Email Service', () => {
  describe('Templates API', () => {
    it('should list templates', async () => {
      const res = await fetch('http://localhost:5486/api/templates', {
        headers: { 'X-API-Key': 'test-key' }
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.templates).toBeDefined();
    });

    it('should create template with required fields', async () => {
      const res = await fetch('http://localhost:5486/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-key' },
        body: JSON.stringify({
          name: 'Welcome Email',
          subject: 'Welcome to {{company}}',
          html: '<h1>Hi {{name}}!</h1>'
        })
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.template.templateId).toBeDefined();
    });

    it('should reject template without name', async () => {
      const res = await fetch('http://localhost:5486/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-key' },
        body: JSON.stringify({ subject: 'Test', html: '<p>Test</p>' })
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Send Email API', () => {
    it('should send email with all required fields', async () => {
      const res = await fetch('http://localhost:5486/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-key' },
        body: JSON.stringify({
          to: 'test@example.com',
          subject: 'Test Email',
          html: '<p>This is a test email</p>'
        })
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.email.emailId).toBeDefined();
    });

    it('should reject email without recipient', async () => {
      const res = await fetch('http://localhost:5486/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-key' },
        body: JSON.stringify({
          subject: 'Test',
          html: '<p>Test</p>'
        })
      });
      expect(res.status).toBe(400);
    });

    it('should send bulk email to multiple recipients', async () => {
      const res = await fetch('http://localhost:5486/api/email/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-key' },
        body: JSON.stringify({
          recipients: [
            { email: 'user1@example.com' },
            { email: 'user2@example.com' }
          ],
          subject: 'Bulk Test',
          data: { name: 'User' }
        })
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.results).toBeDefined();
    });
  });

  describe('Email Stats API', () => {
    it('should return email statistics', async () => {
      const res = await fetch('http://localhost:5486/api/email/stats', {
        headers: { 'X-API-Key': 'test-key' }
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.total).toBeDefined();
      expect(data.deliveryRate).toBeDefined();
    });
  });
});
