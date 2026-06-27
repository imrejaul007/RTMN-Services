/**
 * Widget KB Service Tests
 */

import { jest } from '@jest/globals';

// Mock pino before importing the module
jest.unstable_mockModule('pino', () => ({
  default: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('Widget KB Service', () => {
  let kbService;
  let app;

  beforeAll(async () => {
    const module = await import('../index.js');
    kbService = module;
    app = module.app;
  });

  describe('Document Management', () => {
    test('should create a document', () => {
      const doc = kbService.createDocument({
        name: 'Test Document',
        type: 'text',
        source: 'test',
        content: 'This is a test document with some content.',
      });

      expect(doc).toBeDefined();
      expect(doc.id).toBeDefined();
      expect(doc.name).toBe('Test Document');
      expect(doc.type).toBe('text');
      expect(doc.status).toBe('processing');
    });

    test('should get document by ID', () => {
      const created = kbService.createDocument({
        name: 'Get Test',
        type: 'text',
        source: 'test',
        content: 'Content here',
      });

      const retrieved = kbService.getDocument(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
    });

    test('should update document', () => {
      const doc = kbService.createDocument({
        name: 'Before Update',
        type: 'text',
        source: 'test',
        content: 'Content',
      });

      const updated = kbService.updateDocument(doc.id, { status: 'indexed' });
      expect(updated.status).toBe('indexed');
    });

    test('should get all documents', () => {
      kbService.createDocument({
        name: 'Doc 1',
        type: 'text',
        source: 'test',
        content: 'Content 1',
      });
      kbService.createDocument({
        name: 'Doc 2',
        type: 'faq',
        source: 'test',
        content: 'Content 2',
      });

      const result = kbService.getAllDocuments();
      expect(result.total).toBeGreaterThanOrEqual(2);
    });

    test('should filter documents by type', () => {
      const result = kbService.getAllDocuments({ type: 'text' });
      expect(result.documents.every(d => d.type === 'text')).toBe(true);
    });
  });

  describe('Text Processing', () => {
    test('should chunk text', () => {
      const longText = 'This is a longer text that should be split into multiple chunks. '.repeat(50);
      const chunks = kbService.chunkText(longText, 200, 20);

      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThan(1);
    });

    test('should not chunk short text', () => {
      const shortText = 'Short text.';
      const chunks = kbService.chunkText(shortText);

      expect(chunks.length).toBe(1);
      expect(chunks[0].text).toBe(shortText);
    });

    test('should generate embeddings', () => {
      const embedding = kbService.generateEmbedding('Hello world');

      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(384);
    });

    test('should process document and create chunks', () => {
      const doc = kbService.createDocument({
        name: 'Process Test',
        type: 'text',
        source: 'test',
        content: 'This is a test document. '.repeat(20),
      });

      const processed = kbService.processDocument(doc.id);

      expect(processed).toBeDefined();
      expect(processed.status).toBe('indexed');
      expect(processed.chunkCount).toBeGreaterThan(0);
    });
  });

  describe('FAQ Management', () => {
    test('should create FAQ', () => {
      const faq = kbService.createFAQ({
        question: 'What is HOJAI?',
        answer: 'HOJAI is an AI platform.',
        category: 'general',
        tags: ['ai', 'platform'],
      });

      expect(faq).toBeDefined();
      expect(faq.id).toBeDefined();
      expect(faq.question).toBe('What is HOJAI?');
      expect(faq.embedding).toBeDefined();
    });

    test('should get FAQ by ID', () => {
      const created = kbService.createFAQ({
        question: 'Test FAQ',
        answer: 'Test answer',
      });

      const retrieved = kbService.getFAQ(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved.question).toBe('Test FAQ');
    });

    test('should update FAQ', () => {
      const faq = kbService.createFAQ({
        question: 'Before',
        answer: 'After',
      });

      const updated = kbService.updateFAQ(faq.id, {
        answer: 'Updated answer',
        category: 'tech',
      });

      expect(updated.answer).toBe('Updated answer');
      expect(updated.category).toBe('tech');
    });

    test('should import FAQs from JSON', () => {
      const faqs = [
        { question: 'Q1', answer: 'A1', category: 'cat1' },
        { question: 'Q2', answer: 'A2', category: 'cat2' },
      ];

      const imported = kbService.importFAQsFromJSON(faqs);
      expect(imported.length).toBe(2);
    });

    test('should import FAQs from CSV', () => {
      const csv = `question,answer,category
"What is X?","X is Y","general"
"How to use?","Use it like this","help"`;

      const imported = kbService.importFAQsFromCSV(csv);
      expect(imported.length).toBe(2);
    });

    test('should rate FAQ as helpful', () => {
      const faq = kbService.createFAQ({
        question: 'Rate test',
        answer: 'Answer',
      });

      const rated = kbService.rateFAQ(faq.id, true);
      expect(rated.helpful).toBe(1);
    });

    test('should rate FAQ as not helpful', () => {
      const faq = kbService.createFAQ({
        question: 'Rate test 2',
        answer: 'Answer',
      });

      const rated = kbService.rateFAQ(faq.id, false);
      expect(rated.notHelpful).toBe(1);
    });
  });

  describe('Search', () => {
    test('should search chunks', () => {
      const doc = kbService.createDocument({
        name: 'Search Test',
        type: 'text',
        source: 'test',
        content: 'This document is about artificial intelligence and machine learning.',
      });
      kbService.processDocument(doc.id);

      const results = kbService.searchChunks('artificial intelligence');
      expect(Array.isArray(results)).toBe(true);
    });

    test('should search FAQs', () => {
      kbService.createFAQ({
        question: 'How do I reset my password?',
        answer: 'Click on forgot password link.',
        category: 'account',
      });
      kbService.createFAQ({
        question: 'What payment methods do you accept?',
        answer: 'We accept credit cards and PayPal.',
        category: 'billing',
      });

      const results = kbService.searchFAQs('password');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    test('should query knowledge base', () => {
      kbService.createFAQ({
        question: 'What are your business hours?',
        answer: 'We are open 9 AM to 5 PM.',
      });

      const result = kbService.queryKnowledgeBase('business hours');
      expect(result.query).toBe('business hours');
      expect(result.queryId).toBeDefined();
      expect(result.totalResults).toBeGreaterThanOrEqual(0);
    });
  });

  describe('HTTP Endpoints', () => {
    const request = require('supertest');

    test('GET /health should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('widget-kb');
    });

    test('GET /ready should return ready status', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body.ready).toBe(true);
    });

    test('POST /api/kb/upload should upload document', async () => {
      const response = await request(app)
        .post('/api/kb/upload')
        .send({
          name: 'HTTP Upload Test',
          type: 'text',
          content: 'This is test content for the document.',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.document).toBeDefined();
    });

    test('POST /api/kb/upload should validate type', async () => {
      const response = await request(app)
        .post('/api/kb/upload')
        .send({
          name: 'Invalid Type Test',
          type: 'invalid',
          content: 'Content',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    test('GET /api/kb/documents should list documents', async () => {
      const response = await request(app).get('/api/kb/documents');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.documents)).toBe(true);
    });

    test('POST /api/kb/faq should create FAQ', async () => {
      const response = await request(app)
        .post('/api/kb/faq')
        .send({
          question: 'HTTP Test FAQ',
          answer: 'HTTP Test Answer',
          category: 'test',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.faq).toBeDefined();
    });

    test('GET /api/kb/faqs should list FAQs', async () => {
      const response = await request(app).get('/api/kb/faqs');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('POST /api/kb/faqs/import/json should import FAQs', async () => {
      const response = await request(app)
        .post('/api/kb/faqs/import/json')
        .send({
          faqs: [
            { question: 'Import Q1', answer: 'Import A1' },
            { question: 'Import Q2', answer: 'Import A2' },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
    });

    test('POST /api/kb/query should query KB', async () => {
      const response = await request(app)
        .post('/api/kb/query')
        .send({
          query: 'test query',
          limit: 5,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.query).toBe('test query');
    });

    test('GET /api/kb/status should return KB status', async () => {
      const response = await request(app).get('/api/kb/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBeDefined();
      expect(response.body.status.documents).toBeDefined();
      expect(response.body.status.faqs).toBeDefined();
    });

    test('404 for unknown routes', async () => {
      const response = await request(app).get('/unknown/route');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not found');
    });
  });
});
