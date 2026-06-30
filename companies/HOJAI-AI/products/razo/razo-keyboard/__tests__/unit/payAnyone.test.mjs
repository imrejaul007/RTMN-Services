/**
 * Tests for PayAnyone
 */

import { describe, it, expect, beforeEach } from 'vitest';

const PayAnyone = require('../../src/core/payAnyone');

describe('PayAnyone', () => {
  let payAnyone;
  let mockVoiceGateway;

  beforeEach(() => {
    mockVoiceGateway = {
      speechToText: async () => ({ success: true, text: 'Send Rahul 500' }),
      identifySpeaker: async () => ({ success: true, speakerId: 'user-1', confidence: 0.95 }),
      authorizePayment: async () => ({ success: true, authorized: true })
    };

    payAnyone = new PayAnyone({
      logger: { info: () => {}, error: () => {} },
      voiceGateway: mockVoiceGateway
    });
  });

  describe('parsePaymentText()', () => {
    it('should parse "Send Rahul 500"', () => {
      const result = payAnyone._parsePaymentText('Send Rahul 500');
      expect(result.amount).toBe(500);
      expect(result.recipient).toBe('Rahul');
    });

    it('should parse "Pay Ali 1000"', () => {
      const result = payAnyone._parsePaymentText('Pay Ali 1000');
      expect(result.amount).toBe(1000);
      expect(result.recipient).toBe('Ali');
    });

    it('should parse "Transfer 200 to Mom"', () => {
      const result = payAnyone._parsePaymentText('Transfer 200 to Mom');
      expect(result.amount).toBe(200);
      expect(result.recipient).toBe('Mom');
    });

    it('should parse Hinglish "Rahul ko 500"', () => {
      const result = payAnyone._parsePaymentText('Rahul ko 500');
      expect(result.amount).toBe(500);
      expect(result.recipient).toBe('Rahul');
    });

    it('should extract purpose', () => {
      const result = payAnyone._parsePaymentText('Send Rahul 500 for lunch');
      expect(result.purpose).toBe('lunch');
    });

    it('should handle invalid text', () => {
      const result = payAnyone._parsePaymentText('hello world');
      expect(result.amount).toBeNull();
      expect(result.recipient).toBeNull();
    });
  });

  describe('parseUPIQR()', () => {
    it('should parse valid UPI QR code', () => {
      const qr = 'upi://pay?pa=rahul@upi&pn=Rahul&am=500&tn=lunch';
      const result = payAnyone._parseUPIQR(qr);
      expect(result.payeeAddress).toBe('rahul@upi');
      expect(result.payeeName).toBe('Rahul');
      expect(result.amount).toBe(500);
    });

    it('should handle QR without amount', () => {
      const qr = 'upi://pay?pa=ali@upi&pn=Ali';
      const result = payAnyone._parseUPIQR(qr);
      expect(result.payeeAddress).toBe('ali@upi');
      expect(result.amount).toBeNull();
    });

    it('should handle generic QR', () => {
      const result = payAnyone._parseUPIQR('plain-qr-data');
      expect(result.payeeAddress).toBe('plain-qr-data');
    });
  });

  describe('checkSafety()', () => {
    it('should require voice auth for amount > ₹1000', async () => {
      const safety = await payAnyone._checkSafety({
        userId: 'user-1',
        amount: 1500,
        recipient: 'Rahul',
        method: 'voice'
      });
      expect(safety.requiresVoiceAuth).toBe(true);
    });

    it('should not require voice auth for amount < ₹1000', async () => {
      const safety = await payAnyone._checkSafety({
        userId: 'user-1',
        amount: 500,
        recipient: 'Rahul',
        method: 'voice'
      });
      expect(safety.requiresVoiceAuth).toBe(false);
    });

    it('should require cooldown for amount > ₹10000', async () => {
      const safety = await payAnyone._checkSafety({
        userId: 'user-1',
        amount: 15000,
        recipient: 'Rahul',
        method: 'voice'
      });
      expect(safety.requiresCooldown).toBe(true);
    });

    it('should block when daily limit exceeded', async () => {
      // Add a large transaction
      payAnyone.history.push({
        userId: 'user-1',
        amount: 99000,
        timestamp: new Date().toISOString()
      });

      const safety = await payAnyone._checkSafety({
        userId: 'user-1',
        amount: 5000,
        recipient: 'Rahul',
        method: 'voice'
      });
      expect(safety.allowed).toBe(false);
      expect(safety.message).toContain('Daily limit');
    });
  });

  describe('payByVoice()', () => {
    it('should execute payment via voice command', async () => {
      const result = await payAnyone.payByVoice({
        audioBuffer: Buffer.from('fake audio'),
        userId: 'user-1'
      });
      expect(result.success).toBe(true);
      expect(result.payment).toBeDefined();
      expect(result.payment.amount).toBe(500);
      expect(result.payment.recipient).toBe('Rahul');
    });

    it('should fail when voice gateway unavailable', async () => {
      const payWithoutVoice = new PayAnyone({
        logger: { info: () => {}, error: () => {} }
        // No voice gateway
      });

      const result = await payWithoutVoice.payByVoice({
        audioBuffer: Buffer.from('audio'),
        userId: 'user-1'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('payByQR()', () => {
    it('should execute payment via QR code', async () => {
      const result = await payAnyone.payByQR({
        qrData: 'upi://pay?pa=rahul@upi&pn=Rahul',
        amount: 500,
        userId: 'user-1'
      });
      expect(result.success).toBe(true);
      expect(result.payment.amount).toBe(500);
      expect(result.payment.recipientUPI).toBe('rahul@upi');
    });

    it('should require amount if not in QR', async () => {
      const result = await payAnyone.payByQR({
        qrData: 'upi://pay?pa=rahul@upi&pn=Rahul',
        userId: 'user-1'
      });
      expect(result.requiresAmount).toBe(true);
    });

    it('should reject invalid QR', async () => {
      const result = await payAnyone.payByQR({
        qrData: 'invalid-qr',
        amount: 500,
        userId: 'user-1'
      });
      expect(result.success).toBe(true); // Treated as generic QR
      expect(result.payment.recipientUPI).toBe('invalid-qr');
    });
  });

  describe('payByContact()', () => {
    it('should execute payment via contact picker', async () => {
      const result = await payAnyone.payByContact({
        contact: 'Rahul',
        amount: 500,
        userId: 'user-1'
      });
      expect(result.success).toBe(true);
      expect(result.payment.amount).toBe(500);
      expect(result.payment.recipient).toBe('Rahul');
    });

    it('should suggest quick amounts when amount missing', async () => {
      const result = await payAnyone.payByContact({
        contact: 'Rahul',
        userId: 'user-1'
      });
      expect(result.requiresAmount).toBe(true);
      expect(result.quickAmounts).toContain(500);
      expect(result.quickAmounts).toContain(1000);
    });
  });

  describe('recent recipients', () => {
    it('should track recent recipients', async () => {
      await payAnyone.payByContact({ contact: 'Rahul', amount: 100, userId: 'user-1' });
      await payAnyone.payByContact({ contact: 'Ali', amount: 200, userId: 'user-1' });
      await payAnyone.payByContact({ contact: 'Rahul', amount: 300, userId: 'user-1' });

      const recent = payAnyone.getRecentRecipients('user-1');
      expect(recent[0]).toBe('Rahul'); // Most recent
      expect(recent[1]).toBe('Ali');
    });
  });

  describe('history', () => {
    it('should track transaction history', async () => {
      await payAnyone.payByContact({ contact: 'Rahul', amount: 500, userId: 'user-1' });
      const history = payAnyone.getHistory('user-1');
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].amount).toBe(500);
      expect(history[0].transactionRef).toBeDefined();
    });
  });

  describe('stats', () => {
    it('should track payment stats', async () => {
      await payAnyone.payByContact({ contact: 'Rahul', amount: 100, userId: 'u1' });
      await payAnyone.payByContact({ contact: 'Ali', amount: 200, userId: 'u2' });

      const stats = payAnyone.getStats();
      expect(stats.paymentsInitiated).toBe(2);
      expect(stats.paymentsCompleted).toBe(2);
      expect(stats.contactPayments).toBe(2);
    });
  });
});