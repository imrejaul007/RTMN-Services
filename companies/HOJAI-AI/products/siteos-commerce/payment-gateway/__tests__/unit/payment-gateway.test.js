/**
 * Payment Gateway Service Tests
 * Tests run against a live server instance
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';

// Start server for testing
let server;
const PORT = 5479;
const BASE_URL = `http://localhost:${PORT}`;
const API_KEY = 'test-api-key';
const COMPANY_ID = 'test-company';

// Simple test server setup
beforeAll(async () => {
  // Start the server in background
  const { spawn } = await import('child_process');
  server = spawn('node', ['src/index.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT, STORAGE_PATH: '/tmp/test-payments' },
    stdio: 'pipe'
  });

  // Wait for server to be ready
  await new Promise((resolve) => {
    server.stdout.on('data', (data) => {
      if (data.toString().includes('running on port')) {
        resolve();
      }
    });
    setTimeout(resolve, 2000); // Fallback timeout
  });
});

afterAll(() => {
  if (server) {
    server.kill();
  }
  // Clean up test files
  ['/tmp/test-payments/siteos-payments-test-company.json'].forEach(f => {
    try { if (existsSync(f)) unlinkSync(f); } catch {}
  });
});

describe('Payment Gateway Service', () => {
  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await fetch(`${BASE_URL}/health`);
      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('payment-gateway');
    });
  });

  describe('GET /api/payments/methods', () => {
    it('should return available payment methods', async () => {
      const response = await fetch(`${BASE_URL}/api/payments/methods`, {
        headers: { 'x-api-key': API_KEY, 'x-company-id': COMPANY_ID }
      });
      const data = await response.json();
      expect(data.methods).toBeDefined();
      expect(Array.isArray(data.methods)).toBe(true);
      expect(data.methods.length).toBe(4); // razorpay, upi, card, wallet
    });
  });

  describe('POST /api/payments/initiate', () => {
    it('should create a payment', async () => {
      const response = await fetch(`${BASE_URL}/api/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'x-company-id': COMPANY_ID
        },
        body: JSON.stringify({
          orderId: `order_${Date.now()}`,
          amount: 1000,
          customerId: 'cust_123'
        })
      });
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.payment).toBeDefined();
      expect(data.payment.razorpayOrderId).toBeDefined();
    });

    it('should reject without required fields', async () => {
      const response = await fetch(`${BASE_URL}/api/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'x-company-id': COMPANY_ID
        },
        body: JSON.stringify({ orderId: 'order_123' })
      });
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/payments/upi-qr', () => {
    it('should generate UPI QR data', async () => {
      // First create a payment
      const createResponse = await fetch(`${BASE_URL}/api/payments/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'x-company-id': COMPANY_ID },
        body: JSON.stringify({ orderId: `order_${Date.now()}`, amount: 2000, customerId: 'cust_upi' })
      });
      const createData = await createResponse.json();

      const qrResponse = await fetch(`${BASE_URL}/api/payments/upi-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'x-company-id': COMPANY_ID },
        body: JSON.stringify({ paymentId: createData.payment.id, amount: 2000, note: 'Test' })
      });
      const qrData = await qrResponse.json();
      expect(qrData.success).toBe(true);
      expect(qrData.upi.qrData).toContain('upi://pay');
    });
  });

  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      const response = await fetch(`${BASE_URL}/api/payments/methods`);
      expect(response.status).toBe(401);
    });
  });
});
