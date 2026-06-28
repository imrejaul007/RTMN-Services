/**
 * Loyalty Connector Service Tests
 * Tests run against a live server instance
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, unlinkSync } from 'fs';

// Start server for testing
let server;
const PORT = 5481;
const BASE_URL = `http://localhost:${PORT}`;
const API_KEY = 'test-api-key';
const COMPANY_ID = 'test-company';

beforeAll(async () => {
  const { spawn } = await import('child_process');
  server = spawn('node', ['src/index.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT, STORAGE_PATH: '/tmp/test-loyalty' },
    stdio: 'pipe'
  });

  await new Promise((resolve) => {
    server.stdout.on('data', (data) => {
      if (data.toString().includes('running on port')) {
        resolve();
      }
    });
    setTimeout(resolve, 2000);
  });
});

afterAll(() => {
  if (server) server.kill();
  // Clean up
  ['profiles', 'transactions', 'referrals'].forEach(type => {
    try {
      const f = `/tmp/test-loyalty/siteos-loyalty-${type}-${COMPANY_ID}.json`;
      if (existsSync(f)) unlinkSync(f);
    } catch {}
  });
});

describe('Loyalty Connector Service', () => {
  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await fetch(`${BASE_URL}/health`);
      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('loyalty-connector');
    });
  });

  describe('GET /api/loyalty/tiers', () => {
    it('should return tier list', async () => {
      const response = await fetch(`${BASE_URL}/api/loyalty/tiers`, {
        headers: { 'x-api-key': API_KEY, 'x-company-id': COMPANY_ID }
      });
      const data = await response.json();
      expect(data.tiers).toBeDefined();
      expect(data.tiers.length).toBe(4);
    });
  });

  describe('POST /api/loyalty/earn', () => {
    it('should earn points on purchase', async () => {
      const response = await fetch(`${BASE_URL}/api/loyalty/earn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'x-company-id': COMPANY_ID },
        body: JSON.stringify({ customerId: `cust_${Date.now()}`, type: 'purchase', amount: 1000 })
      });
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.pointsEarned).toBe(1000);
    });

    it('should earn points for review', async () => {
      const response = await fetch(`${BASE_URL}/api/loyalty/earn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'x-company-id': COMPANY_ID },
        body: JSON.stringify({ customerId: `cust_${Date.now()}`, type: 'review' })
      });
      const data = await response.json();
      expect(data.pointsEarned).toBe(50);
    });
  });

  describe('GET /api/loyalty/rewards', () => {
    it('should return available rewards', async () => {
      const response = await fetch(`${BASE_URL}/api/loyalty/rewards`, {
        headers: { 'x-api-key': API_KEY, 'x-company-id': COMPANY_ID }
      });
      const data = await response.json();
      expect(data.rewards).toBeDefined();
      expect(data.rewards.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      const response = await fetch(`${BASE_URL}/api/loyalty/tiers`);
      expect(response.status).toBe(401);
    });
  });
});
