import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';

function createTestApp() {
  const app = express();
  app.use(express.json());

  const importJobs = new Map();
  const sourceConfigs = new Map();
  const memoryMappings = new Map();

  const createId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // SOURCE CONFIGURATIONS
  app.post('/api/v1/import/sources', async (req, res) => {
    try {
      const { name, type, connectionConfig, importConfig } = req.body;
      if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
      const validTypes = ['crm', 'erp', 'database', 'api', 'file', 'custom'];
      if (!validTypes.includes(type)) return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });

      const source = {
        id: createId('src'),
        name, type,
        connectionConfig: connectionConfig || {},
        importConfig: importConfig || { batchSize: 100, dedupEnabled: true },
        status: 'active',
        lastImportAt: null,
        totalImported: 0,
        createdAt: new Date().toISOString(),
      };
      sourceConfigs.set(source.id, source);
      res.status(201).json(source);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/v1/import/sources', async (req, res) => {
    try {
      const { type, status } = req.query;
      let result = [...sourceConfigs.values()];
      if (type) result = result.filter(s => s.type === type);
      if (status) result = result.filter(s => s.status === status);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/v1/import/sources/:sourceId', async (req, res) => {
    try {
      const source = sourceConfigs.get(req.params.sourceId);
      if (!source) return res.status(404).json({ error: 'Source not found' });
      res.json(source);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/v1/import/sources/:sourceId', async (req, res) => {
    try {
      const source = sourceConfigs.get(req.params.sourceId);
      if (!source) return res.status(404).json({ error: 'Source not found' });
      source.status = 'deleted';
      sourceConfigs.set(source.id, source);
      res.json({ message: 'Source deleted', id: source.id });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // IMPORT MAPPINGS
  app.post('/api/v1/import/mappings', async (req, res) => {
    try {
      const { sourceId, fieldMappings, memoryType } = req.body;
      if (!sourceId || !fieldMappings) return res.status(400).json({ error: 'sourceId and fieldMappings are required' });

      const mapping = {
        id: createId('map'),
        sourceId, fieldMappings,
        memoryType: memoryType || 'generic',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      memoryMappings.set(mapping.id, mapping);
      res.status(201).json(mapping);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/v1/import/mappings', async (req, res) => {
    try {
      const { sourceId } = req.query;
      let result = [...memoryMappings.values()];
      if (sourceId) result = result.filter(m => m.sourceId === sourceId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // IMPORT JOBS
  app.post('/api/v1/import/jobs', async (req, res) => {
    try {
      const { sourceId, mappingId, options } = req.body;
      if (!sourceId) return res.status(400).json({ error: 'sourceId is required' });

      const job = {
        id: createId('imp'),
        sourceId, mappingId: mappingId || null,
        status: 'pending',
        progress: 0,
        totalRecords: 0,
        processedRecords: 0,
        importedRecords: 0,
        skippedRecords: 0,
        failedRecords: 0,
        options: options || { batchSize: 100 },
        startedAt: null,
        completedAt: null,
        createdAt: new Date().toISOString(),
      };
      importJobs.set(job.id, job);
      res.status(201).json(job);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/v1/import/jobs/:jobId', async (req, res) => {
    try {
      const job = importJobs.get(req.params.jobId);
      if (!job) return res.status(404).json({ error: 'Job not found' });
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/v1/import/jobs', async (req, res) => {
    try {
      const { status, sourceId, limit } = req.query;
      let result = [...importJobs.values()];
      if (status) result = result.filter(j => j.status === status);
      if (sourceId) result = result.filter(j => j.sourceId === sourceId);
      result = result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      result = result.slice(0, parseInt(limit) || 100);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/v1/import/jobs/:jobId/execute', async (req, res) => {
    try {
      const job = importJobs.get(req.params.jobId);
      if (!job) return res.status(404).json({ error: 'Job not found' });
      if (job.status === 'running') return res.status(400).json({ error: 'Job already running' });
      if (job.status === 'completed') return res.status(400).json({ error: 'Job already completed' });

      job.status = 'running';
      job.startedAt = new Date().toISOString();
      importJobs.set(job.id, job);

      // Simulate completion
      setTimeout(() => {
        job.status = 'completed';
        job.progress = 100;
        job.processedRecords = 10;
        job.importedRecords = 9;
        job.skippedRecords = 1;
        job.failedRecords = 0;
        job.completedAt = new Date().toISOString();
        importJobs.set(job.id, job);
      }, 10);

      res.json({ message: 'Import started', jobId: job.id, status: job.status });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/v1/import/jobs/:jobId/cancel', async (req, res) => {
    try {
      const job = importJobs.get(req.params.jobId);
      if (!job) return res.status(404).json({ error: 'Job not found' });
      if (job.status !== 'pending' && job.status !== 'running') return res.status(400).json({ error: `Cannot cancel job with status: ${job.status}` });
      job.status = 'cancelled';
      job.completedAt = new Date().toISOString();
      importJobs.set(job.id, job);
      res.json({ message: 'Job cancelled', job });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // FORMAT CONVERSION
  app.post('/api/v1/import/convert', async (req, res) => {
    try {
      const { data, fromFormat, toFormat } = req.body;
      if (!data || !fromFormat || !toFormat) return res.status(400).json({ error: 'data, fromFormat, and toFormat are required' });

      let converted;
      if (fromFormat === 'csv' && toFormat === 'json') {
        const lines = data.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        converted = lines.slice(1).map(line => {
          const values = line.split(',');
          const obj = {};
          headers.forEach((h, i) => obj[h] = values[i]?.trim());
          return obj;
        });
      } else if (fromFormat === 'json' && toFormat === 'csv') {
        const arr = Array.isArray(data) ? data : [data];
        if (arr.length === 0) return res.json({ converted: '' });
        const headers = Object.keys(arr[0]);
        const lines = [headers.join(',')];
        arr.forEach(item => lines.push(headers.map(h => JSON.stringify(item[h] ?? '')).join(',')));
        converted = lines.join('\n');
      } else {
        converted = data;
      }
      res.json({ converted, fromFormat, toFormat });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // VALIDATION
  app.post('/api/v1/import/validate', async (req, res) => {
    try {
      const { data, rules } = req.body;
      if (!data) return res.status(400).json({ error: 'data is required' });

      const items = Array.isArray(data) ? data : [data];
      const results = items.map((item, index) => {
        const errors = [];
        if (rules) {
          rules.forEach(rule => {
            const value = item[rule.field];
            if (rule.required && !value) errors.push({ field: rule.field, message: `${rule.field} is required` });
            if (rule.type && typeof value !== rule.type) errors.push({ field: rule.field, message: `${rule.field} must be of type ${rule.type}` });
          });
        }
        return { index, valid: errors.length === 0, errors };
      });

      const summary = {
        total: items.length,
        valid: results.filter(r => r.valid).length,
        invalid: results.filter(r => !r.valid).length,
      };
      res.json({ results, summary });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // STATISTICS
  app.get('/api/v1/import/stats', async (req, res) => {
    try {
      const stats = {
        sources: { total: sourceConfigs.size },
        jobs: { total: importJobs.size, pending: [...importJobs.values()].filter(j => j.status === 'pending').length },
        records: { totalImported: [...importJobs.values()].reduce((sum, j) => sum + (j.importedRecords || 0), 0) },
        mappings: { total: memoryMappings.size },
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return { app, importJobs, sourceConfigs, memoryMappings };
}

describe('Memory Import Service', () => {
  describe('Source Configurations', () => {
    it('should create a source configuration', async () => {
      const { app } = createTestApp();
      const res = await request(app)
        .post('/api/v1/import/sources')
        .send({ name: 'Salesforce CRM', type: 'crm' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Salesforce CRM');
      expect(res.body.type).toBe('crm');
      expect(res.body.status).toBe('active');
    });

    it('should reject invalid source type', async () => {
      const { app } = createTestApp();
      const res = await request(app)
        .post('/api/v1/import/sources')
        .send({ name: 'Test', type: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid type');
    });

    it('should require name and type', async () => {
      const { app } = createTestApp();
      const res = await request(app)
        .post('/api/v1/import/sources')
        .send({ name: 'Test' });

      expect(res.status).toBe(400);
    });

    it('should list sources with filters', async () => {
      const { app } = createTestApp();
      await request(app).post('/api/v1/import/sources').send({ name: 'CRM', type: 'crm' });
      await request(app).post('/api/v1/import/sources').send({ name: 'ERP', type: 'erp' });

      const res = await request(app).get('/api/v1/import/sources?type=crm');
      expect(res.body.length).toBe(1);
      expect(res.body[0].type).toBe('crm');
    });

    it('should get source by ID', async () => {
      const { app } = createTestApp();
      const createRes = await request(app)
        .post('/api/v1/import/sources')
        .send({ name: 'Test', type: 'api' });

      const res = await request(app).get(`/api/v1/import/sources/${createRes.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test');
    });

    it('should delete source', async () => {
      const { app } = createTestApp();
      const createRes = await request(app)
        .post('/api/v1/import/sources')
        .send({ name: 'Test', type: 'api' });

      const res = await request(app).delete(`/api/v1/import/sources/${createRes.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });
  });

  describe('Import Mappings', () => {
    it('should create a mapping', async () => {
      const { app } = createTestApp();
      const sourceRes = await request(app)
        .post('/api/v1/import/sources')
        .send({ name: 'CRM', type: 'crm' });

      const res = await request(app)
        .post('/api/v1/import/mappings')
        .send({
          sourceId: sourceRes.body.id,
          fieldMappings: { name: 'contactName', email: 'emailAddress' },
          memoryType: 'contact'
        });

      expect(res.status).toBe(201);
      expect(res.body.fieldMappings).toHaveProperty('name');
    });

    it('should require sourceId and fieldMappings', async () => {
      const { app } = createTestApp();
      const res = await request(app)
        .post('/api/v1/import/mappings')
        .send({ sourceId: 'test' });

      expect(res.status).toBe(400);
    });

    it('should list mappings by source', async () => {
      const { app } = createTestApp();
      const sourceRes = await request(app)
        .post('/api/v1/import/sources')
        .send({ name: 'CRM', type: 'crm' });

      await request(app)
        .post('/api/v1/import/mappings')
        .send({ sourceId: sourceRes.body.id, fieldMappings: { a: 'b' } });

      const res = await request(app)
        .get(`/api/v1/import/mappings?sourceId=${sourceRes.body.id}`);

      expect(res.body.length).toBe(1);
    });
  });

  describe('Import Jobs', () => {
    it('should create an import job', async () => {
      const { app } = createTestApp();
      const sourceRes = await request(app)
        .post('/api/v1/import/sources')
        .send({ name: 'CRM', type: 'crm' });

      const res = await request(app)
        .post('/api/v1/import/jobs')
        .send({ sourceId: sourceRes.body.id });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending');
    });

    it('should require sourceId', async () => {
      const { app } = createTestApp();
      const res = await request(app)
        .post('/api/v1/import/jobs')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should execute import job', async () => {
      const { app } = createTestApp();
      const sourceRes = await request(app)
        .post('/api/v1/import/sources')
        .send({ name: 'CRM', type: 'crm' });

      const jobRes = await request(app)
        .post('/api/v1/import/jobs')
        .send({ sourceId: sourceRes.body.id });

      const res = await request(app)
        .post(`/api/v1/import/jobs/${jobRes.body.id}/execute`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('started');
    });

    it('should cancel pending job', async () => {
      const { app } = createTestApp();
      const sourceRes = await request(app)
        .post('/api/v1/import/sources')
        .send({ name: 'CRM', type: 'crm' });

      const jobRes = await request(app)
        .post('/api/v1/import/jobs')
        .send({ sourceId: sourceRes.body.id });

      const res = await request(app)
        .post(`/api/v1/import/jobs/${jobRes.body.id}/cancel`);

      expect(res.status).toBe(200);
      expect(res.body.job.status).toBe('cancelled');
    });

    it('should list jobs with filters', async () => {
      const { app } = createTestApp();
      const sourceRes = await request(app)
        .post('/api/v1/import/sources')
        .send({ name: 'CRM', type: 'crm' });

      await request(app).post('/api/v1/import/jobs').send({ sourceId: sourceRes.body.id });

      const res = await request(app).get('/api/v1/import/jobs?status=pending');
      expect(res.body.length).toBe(1);
    });
  });

  describe('Format Conversion', () => {
    it('should convert CSV to JSON', async () => {
      const { app } = createTestApp();
      const csvData = 'name,email\nJohn,john@example.com';

      const res = await request(app)
        .post('/api/v1/import/convert')
        .send({ data: csvData, fromFormat: 'csv', toFormat: 'json' });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.converted)).toBe(true);
      expect(res.body.converted[0].name).toBe('John');
    });

    it('should convert JSON to CSV', async () => {
      const { app } = createTestApp();
      const jsonData = [{ name: 'John', email: 'john@example.com' }];

      const res = await request(app)
        .post('/api/v1/import/convert')
        .send({ data: jsonData, fromFormat: 'json', toFormat: 'csv' });

      expect(res.status).toBe(200);
      expect(res.body.converted).toContain('name');
      expect(res.body.converted).toContain('John');
    });
  });

  describe('Validation', () => {
    it('should validate data with rules', async () => {
      const { app } = createTestApp();
      const data = [{ name: 'John', email: 'john@example.com' }, { name: '', email: 'invalid' }];
      const rules = [{ field: 'name', required: true }, { field: 'email', type: 'string' }];

      const res = await request(app)
        .post('/api/v1/import/validate')
        .send({ data, rules });

      expect(res.status).toBe(200);
      expect(res.body.summary.total).toBe(2);
      expect(res.body.summary.valid).toBe(1);
    });

    it('should require data', async () => {
      const { app } = createTestApp();
      const res = await request(app)
        .post('/api/v1/import/validate')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('Statistics', () => {
    it('should return import statistics', async () => {
      const { app } = createTestApp();
      const sourceRes = await request(app)
        .post('/api/v1/import/sources')
        .send({ name: 'CRM', type: 'crm' });

      await request(app).post('/api/v1/import/jobs').send({ sourceId: sourceRes.body.id });

      const res = await request(app).get('/api/v1/import/stats');
      expect(res.body.sources.total).toBe(1);
      expect(res.body.jobs.total).toBe(1);
    });
  });
});
