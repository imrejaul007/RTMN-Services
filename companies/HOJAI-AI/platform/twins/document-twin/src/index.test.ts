/**
 * Document Twin Service Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createDocumentTwinService } from './index';

describe('Document Twin Service', () => {
  let app: ReturnType<typeof createDocumentTwinService>;

  beforeEach(() => {
    app = createDocumentTwinService();
  });

  describe('POST /api/documents', () => {
    it('should create document', async () => {
      const res = await supertest(app)
        .post('/api/documents')
        .send({ employeeId: 'emp-1', type: 'contract', name: 'Employment Contract' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        employeeId: 'emp-1',
        type: 'contract',
        name: 'Employment Contract',
        status: 'pending'
      });
    });

    it('should require employeeId, type, and name', async () => {
      const res = await supertest(app)
        .post('/api/documents')
        .send({ employeeId: 'emp-1' });
      expect(res.status).toBe(400);
    });

    it('should set default status to pending', async () => {
      const res = await supertest(app)
        .post('/api/documents')
        .send({ employeeId: 'emp-1', type: 'id', name: 'ID Card' });
      expect(res.body.status).toBe('pending');
    });
  });

  describe('GET /api/documents', () => {
    it('should list all documents', async () => {
      await supertest(app).post('/api/documents').send({ employeeId: 'emp-1', type: 'contract', name: 'Doc1' });
      await supertest(app).post('/api/documents').send({ employeeId: 'emp-2', type: 'id', name: 'Doc2' });
      const res = await supertest(app).get('/api/documents');
      expect(res.body.total).toBe(2);
    });

    it('should filter by employeeId', async () => {
      await supertest(app).post('/api/documents').send({ employeeId: 'emp-1', type: 'contract', name: 'Doc1' });
      await supertest(app).post('/api/documents').send({ employeeId: 'emp-2', type: 'contract', name: 'Doc2' });
      const res = await supertest(app).get('/api/documents?employeeId=emp-1');
      expect(res.body.total).toBe(1);
    });

    it('should filter by type', async () => {
      await supertest(app).post('/api/documents').send({ employeeId: 'emp-1', type: 'contract', name: 'Doc1' });
      await supertest(app).post('/api/documents').send({ employeeId: 'emp-1', type: 'id', name: 'Doc2' });
      const res = await supertest(app).get('/api/documents?type=contract');
      expect(res.body.total).toBe(1);
    });
  });

  describe('GET /api/documents/:id', () => {
    it('should get document by id', async () => {
      const create = await supertest(app)
        .post('/api/documents')
        .send({ employeeId: 'emp-1', type: 'contract', name: 'Doc' });
      const res = await supertest(app).get(`/api/documents/${create.body.id}`);
      expect(res.status).toBe(200);
    });

    it('should return 404 for unknown id', async () => {
      const res = await supertest(app).get('/api/documents/unknown');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/documents/:id', () => {
    it('should update document status', async () => {
      const create = await supertest(app)
        .post('/api/documents')
        .send({ employeeId: 'emp-1', type: 'contract', name: 'Doc' });
      const res = await supertest(app)
        .put(`/api/documents/${create.body.id}`)
        .send({ status: 'verified' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('verified');
    });
  });

  describe('DELETE /api/documents/:id', () => {
    it('should delete document', async () => {
      const create = await supertest(app)
        .post('/api/documents')
        .send({ employeeId: 'emp-1', type: 'contract', name: 'Doc' });
      await supertest(app).delete(`/api/documents/${create.body.id}`).expect(204);
      await supertest(app).get(`/api/documents/${create.body.id}`).expect(404);
    });
  });

  describe('GET /api/documents/analytics', () => {
    it('should return analytics', async () => {
      await supertest(app).post('/api/documents').send({ employeeId: 'emp-1', type: 'contract', name: 'Doc1', status: 'pending' });
      await supertest(app).post('/api/documents').send({ employeeId: 'emp-2', type: 'id', name: 'Doc2', status: 'verified' });
      const res = await supertest(app).get('/api/documents/analytics');
      expect(res.body.byType).toMatchObject({ contract: 1, id: 1 });
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await supertest(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('document-twin');
    });
  });
});
