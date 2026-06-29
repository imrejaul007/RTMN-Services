/**
 * Education Extension Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Education Extension', () => {
  const tenantId = 'test_education_001';

  beforeEach(() => {
    // Reset between tests if needed
  });

  describe('Health Check', () => {
    it('should respond to health check', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toContain('education');
    });
  });

  describe('Item Module', () => {
    it('should require tenant ID', async () => {
      const response = await request(app).get('/api/item');
      expect(response.status).toBe(401);
      expect(response.body.error).toContain('X-Tenant-ID');
    });

    it('should list item with tenant header', async () => {
      const response = await request(app)
        .get('/api/item')
        .set('X-Tenant-ID', tenantId);
      expect(response.status).toBe(200);
      expect(response.body.item).toBeDefined();
      expect(Array.isArray(response.body.item)).toBe(true);
    });

    it('should create item', async () => {
      const response = await request(app)
        .post('/api/item')
        .set('X-Tenant-ID', tenantId)
        .send({ name: 'Test Item' });
      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.tenantId).toBe(tenantId);
    });
  });

  describe('Tenant Isolation', () => {
    it('should isolate data between tenants', async () => {
      // Create in tenant A
      const resA = await request(app)
        .post('/api/item')
        .set('X-Tenant-ID', 'tenant_a')
        .send({ name: 'Tenant A Item' });
      expect(resA.status).toBe(201);

      // Tenant B should not see it
      const resB = await request(app)
        .get('/api/item')
        .set('X-Tenant-ID', 'tenant_b');
      expect(resB.status).toBe(200);
      expect(resB.body.item.length).toBe(0);
    });
  });
});
