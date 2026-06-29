/**
 * HOJAI API Tests
 */

const request = require('supertest');
const TwilioSMSClient = require('../../connectors/twilio-sms-connector/src');
const WhatsAppBusinessClient = require('../../connectors/whatsapp-business-connector/src');

describe('Connectors', () => {
  describe('TwilioSMSClient', () => {
    test('handles missing credentials gracefully', async () => {
      const client = new TwilioSMSClient({
        accountSid: undefined,
        authToken: undefined,
        fromNumber: undefined,
      });

      const result = await client.sendSMS({ to: '+1234567890', message: 'test' });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('validates result structure', () => {
      const client = new TwilioSMSClient({});
      expect(client.client).toBeDefined();
    });
  });

  describe('WhatsAppBusinessClient', () => {
    test('verifies webhook', () => {
      const client = new WhatsAppBusinessClient({
        verifyToken: 'test-token',
      });

      const result = client.verifyWebhook('subscribe', 'test-token', '12345');
      expect(result).toBe(12345);

      const invalid = client.verifyWebhook('subscribe', 'wrong-token', '12345');
      expect(invalid).toBe(403);
    });

    test('builds proper API base URL', () => {
      const client = new WhatsAppBusinessClient({
        apiVersion: 'v19.0',
        phoneNumberId: '123',
      });

      expect(client.baseUrl).toBe('https://graph.facebook.com/v19.0/123');
    });
  });

  describe('BackgroundCheckClient', () => {
    test('creates client', () => {
      const client = require('../../connectors/background-check-connector/src');
      const instance = new client({ apiKey: 'test' });
      expect(instance.apiKey).toBe('test');
    });
  });
});

describe('Services', () => {
  test('ReplyDraftingService builds prompt', () => {
    const service = require('../../services/reply-drafting-service/src');
    const instance = new service({});
    const prompt = instance.buildPrompt(
      { subject: 'Test', description: 'Test issue' },
      { name: 'John' },
      { customer_name: 'John', ticket_priority: 'normal', customer_history: 'New', kb_articles: [] },
      'friendly'
    );
    expect(prompt.system).toContain('customer support agent');
  });

  test('RefundApprovalService determines route', () => {
    const service = require('../../services/refund-approval-service/src');
    const instance = new service({});

    expect(instance.determineRoute(1000, 0.1).level).toBe('auto');
    expect(instance.determineRoute(50000, 0.1).level).toBe('manager');
    expect(instance.determineRoute(500000, 0.1).level).toBe('cfo');
  });

  test('RefundApprovalService rejects high fraud', () => {
    const service = require('../../services/refund-approval-service/src');
    const instance = new service({});

    expect(instance.determineRoute(1000, 0.9).level).toBe('reject');
  });
});
