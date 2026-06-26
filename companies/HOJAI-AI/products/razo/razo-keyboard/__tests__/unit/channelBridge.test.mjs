/**
 * RAZO ChannelBridge Tests
 * Uses nock to intercept real HTTP calls (vi.mock can't intercept CJS require).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';

const ChannelBridge = (await import('../../src/channels/bridge.js')).default;

describe('ChannelBridge', () => {
  let bridge;

  beforeEach(() => {
    nock.cleanAll();
    bridge = new ChannelBridge(console);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ─── Phone Number Formatting ─────────────────────────────────────────────────

  describe('formatPhoneNumber()', () => {
    it('formats 10-digit Indian numbers with 91 prefix', () => {
      expect(bridge.formatPhoneNumber('9876543210')).toBe('919876543210');
    });

    it('keeps already-formatted 12-digit Indian numbers', () => {
      expect(bridge.formatPhoneNumber('919876543210')).toBe('919876543210');
    });

    it('strips non-numeric characters', () => {
      expect(bridge.formatPhoneNumber('+91-98765-43210')).toBe('919876543210');
    });

    it('returns cleaned number for other formats', () => {
      expect(bridge.formatPhoneNumber('+1-555-123-4567')).toBe('15551234567');
    });
  });

  // ─── WhatsApp Webhook Verification ──────────────────────────────────────────

  describe('verifyWhatsAppWebhook()', () => {
    const prev = process.env.WHATSAPP_WEBHOOK_TOKEN;

    afterEach(() => {
      process.env.WHATSAPP_WEBHOOK_TOKEN = prev;
    });

    it('returns challenge when mode=subscribe and token matches', () => {
      process.env.WHATSAPP_WEBHOOK_TOKEN = 'my-secret-token';
      expect(bridge.verifyWhatsAppWebhook('subscribe', 'my-secret-token', 'challenge123')).toBe('challenge123');
    });

    it('returns false when token does not match', () => {
      process.env.WHATSAPP_WEBHOOK_TOKEN = 'secret';
      expect(bridge.verifyWhatsAppWebhook('subscribe', 'wrong', 'challenge')).toBe(false);
    });

    it('returns false for wrong mode', () => {
      expect(bridge.verifyWhatsAppWebhook('unsubscribe', 'token', 'challenge')).toBe(false);
    });
  });

  // ─── sendMessage() Router ─────────────────────────────────────────────────

  describe('sendMessage() routes to correct channel', () => {
    beforeEach(() => {
      bridge.channels.whatsapp.enabled = true;
      bridge.channels.whatsapp.accessToken = 'token';
      bridge.channels.whatsapp.phoneNumberId = 'pid';
      bridge.channels.whatsapp.apiVersion = 'v18.0';
      bridge.channels.telegram.enabled = true;
      bridge.channels.telegram.botToken = 'bot';
    });

    it('routes whatsapp channel to sendWhatsApp()', async () => {
      nock('https://graph.facebook.com')
        .post('/v18.0/pid/messages')
        .reply(200, { messages: [{ id: 'msg-1' }] });
      const result = await bridge.sendMessage({ channel: 'whatsapp', to: '919876543210', message: 'Hello' });
      expect(result.success).toBe(true);
      expect(result.channel).toBe('whatsapp');
    });

    it('routes telegram channel to sendTelegram()', async () => {
      nock('https://api.telegram.org')
        .post('/botbot/sendMessage')
        .reply(200, { result: { message_id: 42 } });
      const result = await bridge.sendMessage({ channel: 'telegram', to: '123456', message: 'Hi' });
      expect(result.success).toBe(true);
      expect(result.channel).toBe('telegram');
    });

    it('throws for unsupported channel', async () => {
      await expect(
        bridge.sendMessage({ channel: 'signal', to: '123', message: 'Hi' })
      ).rejects.toThrow('Unsupported channel');
    });
  });

  // ─── WhatsApp Payload ─────────────────────────────────────────────────────

  describe('sendWhatsApp()', () => {
    beforeEach(() => {
      bridge.channels.whatsapp.enabled = true;
      bridge.channels.whatsapp.accessToken = 'token';
      bridge.channels.whatsapp.phoneNumberId = 'pid';
      bridge.channels.whatsapp.apiVersion = 'v18.0';
    });

    it('sends correct payload with text message', async () => {
      const scope = nock('https://graph.facebook.com')
        .post('/v18.0/pid/messages', {
          messaging_product: 'whatsapp',
          to: '919876543210',
          type: 'text',
          text: { body: 'Your order is confirmed!' }
        })
        .reply(200, { messages: [{ id: 'w-1' }] });

      const result = await bridge.sendWhatsApp('919876543210', 'Your order is confirmed!');
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('w-1');
      scope.done(); // verify exact payload was sent
    });

    it('includes mediaUrl in payload when provided', async () => {
      const scope = nock('https://graph.facebook.com')
        .post('/v18.0/pid/messages', {
          messaging_product: 'whatsapp',
          to: '919876543210',
          type: 'image',
          image: { link: 'https://cdn.example.com/receipt.jpg', caption: 'Here is your receipt' }
        })
        .reply(200, { messages: [{ id: 'w-2' }] });

      await bridge.sendWhatsApp('919876543210', 'Here is your receipt', {
        mediaUrl: 'https://cdn.example.com/receipt.jpg'
      });
      scope.done();
    });

    it('throws when WhatsApp not configured', async () => {
      bridge.channels.whatsapp.enabled = false;
      await expect(bridge.sendWhatsApp('919876543210', 'Hi')).rejects.toThrow('WhatsApp not configured');
    });

    it('throws on WhatsApp API error', async () => {
      nock('https://graph.facebook.com').post('/v18.0/pid/messages').reply(500, { error: { message: 'Server error' } });
      await expect(bridge.sendWhatsApp('919876543210', 'Hi')).rejects.toThrow('Server error');
    });
  });

  // ─── Telegram ──────────────────────────────────────────────────────────────

  describe('sendTelegram()', () => {
    beforeEach(() => {
      bridge.channels.telegram.enabled = true;
      bridge.channels.telegram.botToken = 'bot123';
    });

    it('sends correct payload', async () => {
      const scope = nock('https://api.telegram.org')
        .post('/botbot123/sendMessage', {
          chat_id: '123456',
          text: 'Meeting at 3pm',
          parse_mode: 'HTML'
        })
        .reply(200, { result: { message_id: 5 } });

      const result = await bridge.sendTelegram('123456', 'Meeting at 3pm');
      expect(result.success).toBe(true);
      expect(result.messageId).toBe(5);
      scope.done();
    });

    it('throws when Telegram not configured', async () => {
      bridge.channels.telegram.enabled = false;
      await expect(bridge.sendTelegram('123', 'Hi')).rejects.toThrow('Telegram not configured');
    });
  });

  // ─── SMS ─────────────────────────────────────────────────────────────────

  describe('sendSMS()', () => {
    it('returns dev mode result when SMS not configured', async () => {
      bridge.channels.sms.enabled = false;
      const result = await bridge.sendSMS('919876543210', 'OTP is 1234');
      expect(result.success).toBe(true);
      expect(result.channel).toBe('sms');
      expect(result.messageId).toMatch(/^dev_/);
    });
  });

  // ─── Broadcast ─────────────────────────────────────────────────────────────

  describe('broadcast()', () => {
    beforeEach(() => {
      bridge.channels.whatsapp.enabled = true;
      bridge.channels.whatsapp.accessToken = 'token';
      bridge.channels.whatsapp.phoneNumberId = 'pid';
    });

    it('sends to all recipients and aggregates results', async () => {
      nock('https://graph.facebook.com')
        .post('/v18.0/pid/messages')
        .reply(200, { messages: [{ id: 'm1' }] })
        .post('/v18.0/pid/messages')
        .reply(200, { messages: [{ id: 'm2' }] })
        .post('/v18.0/pid/messages')
        .reply(200, { messages: [{ id: 'm3' }] });

      const result = await bridge.broadcast({
        channel: 'whatsapp',
        recipients: ['919900000001', '919900000002', '919900000003'],
        message: 'Hello all'
      });

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('counts failures in broadcast', async () => {
      nock('https://graph.facebook.com')
        .post('/v18.0/pid/messages')
        .reply(200, { messages: [{ id: 'm1' }] })
        .post('/v18.0/pid/messages')
        .reply(500, { error: 'fail' })
        .post('/v18.0/pid/messages')
        .reply(200, { messages: [{ id: 'm3' }] });

      const result = await bridge.broadcast({
        channel: 'whatsapp',
        recipients: ['919900000001', '919900000002', '919900000003'],
        message: 'Hello all'
      });

      expect(result.total).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
    });
  });

  // ─── Channel Status ─────────────────────────────────────────────────────────

  describe('getChannelStatus()', () => {
    it('returns enabled flag for each channel', () => {
      bridge.channels.whatsapp.enabled = true;
      bridge.channels.telegram.enabled = false;
      bridge.channels.sms.enabled = true;
      bridge.channels.email.enabled = false;
      const status = bridge.getChannelStatus();
      expect(status.whatsapp.enabled).toBe(true);
      expect(status.telegram.enabled).toBe(false);
      expect(status.sms.enabled).toBe(true);
      expect(status.email.enabled).toBe(false);
    });
  });
});
