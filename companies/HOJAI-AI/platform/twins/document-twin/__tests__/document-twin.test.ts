import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createDocumentTwinService } from '../src/index.js';

describe('DocumentTwin', () => {
  let app: ReturnType<typeof createDocumentTwinService>;
  beforeEach(() => { app = createDocumentTwinService(); });

  describe('POST /api/documents', () => {
    it('should create document', async () => {
      const res = await request(app).post('/api/documents').send({ employeeId: 'emp-1', type: 'contract', name: 'Employment Contract' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Employment Contract');
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app).post('/api/documents').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/documents', () => {
    it('should list documents', async () => {
      await request(app).post('/api/documents').send({ employeeId: 'emp-1', type: 'contract', name: 'Contract' });
      const res = await request(app).get('/api/documents');
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('should filter by type', async () => {
      await request(app).post('/api/documents').send({ employeeId: 'emp-1', type: 'contract', name: 'Contract' });
      const res = await request(app).get('/api/documents?type=contract');
      expect(res.body.documents.every((d: any) => d.type === 'contract')).toBe(true);
    });
  });

  describe('GET /api/documents/:id', () => {
    it('should return document', async () => {
      const createRes = await request(app).post('/api/documents').send({ employeeId: 'emp-1', type: 'contract', name: 'Contract' });
      const res = await request(app).get(`/api/documents/${createRes.body.id}`);
      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/documents/:id', () => {
    it('should update document', async () => {
      const createRes = await request(app).post('/api/documents').send({ employeeId: 'emp-1', type: 'contract', name: 'Contract' });
      const res = await request(app).put(`/api/documents/${createRes.body.id}`).send({ status: 'verified' });
      expect(res.body.status).toBe('verified');
    });
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('document-twin');
    });
  });
});