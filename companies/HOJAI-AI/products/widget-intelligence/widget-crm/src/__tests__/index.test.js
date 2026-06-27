/**
 * Widget CRM Service Tests
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

describe('Widget CRM Service', () => {
  let crmService;
  let app;

  beforeAll(async () => {
    const module = await import('../index.js');
    crmService = module;
    app = module.app;
  });

  describe('CRM Configuration', () => {
    test('should create HubSpot CRM configuration', () => {
      const config = crmService.createCRMConfig({
        type: 'hubspot',
        name: 'Test HubSpot',
        apiKey: 'test-key',
      });

      expect(config).toBeDefined();
      expect(config.id).toBeDefined();
      expect(config.type).toBe('hubspot');
      expect(config.name).toBe('Test HubSpot');
      expect(config.enabled).toBe(true);
      expect(config.syncSettings).toBeDefined();
    });

    test('should create Salesforce CRM configuration', () => {
      const config = crmService.createCRMConfig({
        type: 'salesforce',
        name: 'Test Salesforce',
        accessToken: 'test-token',
        instanceUrl: 'https://test.salesforce.com',
      });

      expect(config).toBeDefined();
      expect(config.type).toBe('salesforce');
      expect(config.instanceUrl).toBe('https://test.salesforce.com');
    });

    test('should get CRM configuration by type', () => {
      crmService.createCRMConfig({
        type: 'hubspot',
        name: 'Get By Type Test',
        apiKey: 'key',
        enabled: true,
      });

      const config = crmService.getCRMConfigByType('hubspot');
      expect(config).toBeDefined();
      expect(config.type).toBe('hubspot');
    });

    test('should get all CRM configurations', () => {
      const configs = crmService.getAllCRMConfigs();
      expect(Array.isArray(configs)).toBe(true);
    });

    test('should update CRM configuration', () => {
      const config = crmService.createCRMConfig({
        type: 'hubspot',
        name: 'Update Test',
        apiKey: 'key',
        enabled: false,
      });

      const updated = crmService.updateCRMConfig(config.id, {
        enabled: true,
        name: 'Updated Name',
      });

      expect(updated).toBeDefined();
      expect(updated.enabled).toBe(true);
      expect(updated.name).toBe('Updated Name');
    });
  });

  describe('Contact Management', () => {
    test('should create a local contact', () => {
      const contact = crmService.createLocalContact({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        company: 'Test Corp',
        visitorId: 'visitor-123',
      });

      expect(contact).toBeDefined();
      expect(contact.id).toBeDefined();
      expect(contact.email).toBe('test@example.com');
      expect(contact.firstName).toBe('John');
      expect(contact.ltv).toBe(0);
    });

    test('should get contact by ID', () => {
      const created = crmService.createLocalContact({
        email: 'get@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      const retrieved = crmService.getContact(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved.email).toBe('get@example.com');
    });

    test('should get contact by email', () => {
      crmService.createLocalContact({
        email: 'unique@example.com',
        firstName: 'Unique',
        lastName: 'User',
      });

      const contact = crmService.getContactByEmail('unique@example.com');
      expect(contact).toBeDefined();
      expect(contact.firstName).toBe('Unique');
    });

    test('should update contact', () => {
      const contact = crmService.createLocalContact({
        email: 'update@example.com',
        firstName: 'Before',
        lastName: 'Update',
      });

      const updated = crmService.updateContact(contact.id, {
        firstName: 'After',
        ltv: 1000,
      });

      expect(updated).toBeDefined();
      expect(updated.firstName).toBe('After');
      expect(updated.ltv).toBe(1000);
    });

    test('should set LTV on contact creation', () => {
      const contact = crmService.createLocalContact({
        email: 'ltv@example.com',
        firstName: 'LTV',
        lastName: 'User',
        ltv: 500,
      });

      expect(contact.ltv).toBe(500);
    });
  });

  describe('Deal Management', () => {
    test('should create a local deal', () => {
      const deal = crmService.createLocalDeal({
        name: 'Test Deal',
        amount: 5000,
        stage: 'proposal',
        contactId: 'contact-123',
      });

      expect(deal).toBeDefined();
      expect(deal.id).toBeDefined();
      expect(deal.name).toBe('Test Deal');
      expect(deal.amount).toBe(5000);
      expect(deal.stage).toBe('proposal');
    });

    test('should get deal by ID', () => {
      const created = crmService.createLocalDeal({
        name: 'Get Deal Test',
        amount: 1000,
      });

      const retrieved = crmService.getDeal(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('Get Deal Test');
    });

    test('should update deal', () => {
      const deal = crmService.createLocalDeal({
        name: 'Before Deal',
        amount: 500,
        stage: 'lead',
      });

      const updated = crmService.updateDeal(deal.id, {
        name: 'After Deal',
        amount: 1000,
        stage: 'won',
      });

      expect(updated).toBeDefined();
      expect(updated.name).toBe('After Deal');
      expect(updated.amount).toBe(1000);
      expect(updated.stage).toBe('won');
    });
  });

  describe('Visitor Management', () => {
    test('should get or create visitor', () => {
      const visitor = crmService.getOrCreateVisitor('new-visitor', {
        email: 'visitor@example.com',
        firstName: 'Visitor',
        lastName: 'User',
      });

      expect(visitor).toBeDefined();
      expect(visitor.id).toBe('new-visitor');
      expect(visitor.email).toBe('visitor@example.com');
    });

    test('should update existing visitor', () => {
      const visitor = crmService.getOrCreateVisitor('existing-visitor', {
        email: 'existing@example.com',
        firstName: 'Original',
      });

      const updated = crmService.getOrCreateVisitor('existing-visitor', {
        firstName: 'Updated',
        lastName: 'Name',
      });

      expect(updated.id).toBe('existing-visitor');
    });

    test('should get visitor by ID', () => {
      crmService.getOrCreateVisitor('get-visitor', {
        email: 'get@example.com',
      });

      const visitor = crmService.getVisitor('get-visitor');
      expect(visitor).toBeDefined();
      expect(visitor.email).toBe('get@example.com');
    });
  });

  describe('CRM Types', () => {
    test('should have correct CRM types', () => {
      const types = crmService.CRM_TYPES;

      expect(types.HUBSPOT).toBe('hubspot');
      expect(types.SALESFORCE).toBe('salesforce');
    });
  });

  describe('HTTP Endpoints', () => {
    const request = require('supertest');

    test('GET /health should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('widget-crm');
    });

    test('GET /ready should return ready status', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body.ready).toBe(true);
    });

    test('POST /api/crm/config should create CRM config', async () => {
      const response = await request(app)
        .post('/api/crm/config')
        .send({
          type: 'hubspot',
          name: 'HTTP Test Config',
          apiKey: 'test-key',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.config).toBeDefined();
    });

    test('GET /api/crm/config should return all configs', async () => {
      const response = await request(app).get('/api/crm/config');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.configs)).toBe(true);
    });

    test('POST /api/crm/contact should create contact', async () => {
      const response = await request(app)
        .post('/api/crm/contact')
        .send({
          email: 'http-test@example.com',
          firstName: 'HTTP',
          lastName: 'Test',
          phone: '9876543210',
          company: 'HTTP Corp',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.contact).toBeDefined();
      expect(response.body.contact.email).toBe('http-test@example.com');
    });

    test('POST /api/crm/contact should validate email', async () => {
      const response = await request(app)
        .post('/api/crm/contact')
        .send({
          email: 'invalid-email',
          firstName: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    test('GET /api/crm/contact/:id should get contact', async () => {
      const createResponse = await request(app)
        .post('/api/crm/contact')
        .send({
          email: 'get-test@example.com',
          firstName: 'Get',
          lastName: 'Test',
        });

      const contactId = createResponse.body.contact.id;

      const response = await request(app).get(`/api/crm/contact/${contactId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.contact.id).toBe(contactId);
    });

    test('GET /api/crm/contact/email/:email should get contact by email', async () => {
      const response = await request(app)
        .get('/api/crm/contact/email/get-test@example.com');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.contact.email).toBe('get-test@example.com');
    });

    test('PATCH /api/crm/contact/:id should update contact', async () => {
      const createResponse = await request(app)
        .post('/api/crm/contact')
        .send({
          email: 'patch-test@example.com',
          firstName: 'Before',
          lastName: 'Patch',
        });

      const contactId = createResponse.body.contact.id;

      const response = await request(app)
        .patch(`/api/crm/contact/${contactId}`)
        .send({ firstName: 'After', ltv: 500 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.contact.firstName).toBe('After');
      expect(response.body.contact.ltv).toBe(500);
    });

    test('POST /api/crm/deal should create deal', async () => {
      const response = await request(app)
        .post('/api/crm/deal')
        .send({
          name: 'HTTP Deal Test',
          amount: 10000,
          stage: 'negotiation',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.deal).toBeDefined();
      expect(response.body.deal.name).toBe('HTTP Deal Test');
    });

    test('GET /api/crm/deal/:id should get deal', async () => {
      const createResponse = await request(app)
        .post('/api/crm/deal')
        .send({
          name: 'Get Deal Test',
          amount: 5000,
        });

      const dealId = createResponse.body.deal.id;

      const response = await request(app).get(`/api/crm/deal/${dealId}`);

      expect(response.status).toBe(200);
      expect(response.body.deal.id).toBe(dealId);
    });

    test('GET /api/crm/status should return CRM status', async () => {
      const response = await request(app).get('/api/crm/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBeDefined();
      expect(typeof response.body.status.totalContacts).toBe('number');
      expect(Array.isArray(response.body.status.crms)).toBe(true);
    });

    test('POST /api/crm/sync/:visitorId should sync visitor', async () => {
      const response = await request(app)
        .post('/api/crm/sync/test-visitor-123')
        .send({
          email: 'sync@example.com',
          firstName: 'Sync',
          lastName: 'Test',
          company: 'Sync Corp',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.contact).toBeDefined();
    });

    test('404 for unknown routes', async () => {
      const response = await request(app).get('/unknown/route');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not found');
    });
  });
});
