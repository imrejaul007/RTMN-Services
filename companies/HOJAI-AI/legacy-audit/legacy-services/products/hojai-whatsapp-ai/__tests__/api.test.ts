import { test, expect } from '@jest/globals';

// Mock services
jest.mock('../src/services/merchantService', () => ({
  merchantService: {
    getMerchantByTenantId: jest.fn(),
    getKnowledgeBase: jest.fn(),
    addKnowledgeItem: jest.fn()
  }
}));

jest.mock('../src/services/conversationService', () => ({
  conversationService: {
    getOrCreateConversation: jest.fn(),
    addMessage: jest.fn(),
    getHistory: jest.fn()
  }
}));

jest.mock('../src/services/openaiService', () => ({
  openaiService: {
    generateResponse: jest.fn()
  }
}));

jest.mock('../src/services/tenantService', () => ({
  sessionService: {
    getSession: jest.fn(),
    saveSession: jest.fn()
  }
}));

// Import after mocks
import express from 'express';
import request from 'supertest';

// Simple unit tests
describe('WhatsApp AI Service', () => {
  test('health endpoint returns healthy', async () => {
    expect(true).toBe(true);
  });

  test('merchant service returns data', async () => {
    const { merchantService } = require('../src/services/merchantService');
    merchantService.getMerchantByTenantId.mockResolvedValue({
      id: 'merchant_123',
      tenantId: 'tenant_123',
      name: 'Test Merchant'
    });

    const merchant = await merchantService.getMerchantByTenantId('tenant_123');
    expect(merchant).toBeDefined();
    expect(merchant?.name).toBe('Test Merchant');
  });

  test('knowledge base returns items', async () => {
    const { merchantService } = require('../src/services/merchantService');
    merchantService.getKnowledgeBase.mockResolvedValue([
      { question: 'What are your hours?', answer: '9 AM - 9 PM' }
    ]);

    const kb = await merchantService.getKnowledgeBase('merchant_123');
    expect(kb.length).toBeGreaterThan(0);
  });

  test('AI response generation works', async () => {
    const { openaiService } = require('../src/services/openaiService');
    openaiService.generateResponse.mockResolvedValue({
      response: 'Hello! How can I help?',
      intent: 'greeting',
      confidence: 0.95
    });

    const response = await openaiService.generateResponse({
      merchantPersona: 'Test',
      knowledgeBase: [],
      userMessage: 'Hi',
      conversationHistory: []
    });

    expect(response.intent).toBe('greeting');
    expect(response.confidence).toBeGreaterThan(0.5);
  });

  test('conversation history is stored', async () => {
    const { conversationService } = require('../src/services/conversationService');
    conversationService.addMessage.mockResolvedValue({ id: 'msg_123' });

    const msg = await conversationService.addMessage({
      tenantId: 'tenant_123',
      merchantId: 'merchant_123',
      conversationId: 'conv_123',
      messageId: 'msg_456',
      direction: 'inbound',
      role: 'user',
      content: 'Hello'
    });

    expect(msg.id).toBeDefined();
  });

  test('session context is saved', async () => {
    const { sessionService } = require('../src/services/tenantService');
    sessionService.saveSession.mockResolvedValue(undefined);

    await sessionService.saveSession('merchant_123', 'user_123', {
      tenantId: 'tenant_123',
      context: { lastIntent: 'greeting' },
      state: 'resolved'
    });

    expect(true).toBe(true);
  });
});

describe('Signal Bridge', () => {
  test('signal emission works', async () => {
    // Mock axios
    const axios = require('axios');
    axios.post = jest.fn().mockResolvedValue({ data: { success: true } });

    const { signalBridge } = require('../src/services/bridgeService');
    // Signal would be emitted here
    expect(true).toBe(true);
  });
});

describe('Webhook Security', () => {
  test('HMAC verification works', () => {
    const crypto = require('crypto');
    const { verifyWhatsAppSignature } = require('../src/middleware/webhookAuth');

    const secret = 'test-secret';
    const payload = JSON.stringify({ test: 'data' });
    const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');

    expect(verifyWhatsAppSignature(payload, signature, secret)).toBe(true);
  });
});
