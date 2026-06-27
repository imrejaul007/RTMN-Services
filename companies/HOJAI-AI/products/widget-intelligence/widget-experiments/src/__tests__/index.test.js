/**
 * Widget Experiments Service Tests
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

describe('Widget Experiments Service', () => {
  let experimentsService;
  let app;

  beforeAll(async () => {
    const module = await import('../index.js');
    experimentsService = module;
    app = module.app;
  });

  describe('Experiment Management', () => {
    test('should create an experiment', () => {
      const experiment = experimentsService.createExperiment({
        name: 'Test Experiment',
        description: 'A test experiment',
        hypothesis: 'Changing the button color will increase conversions',
        metric: 'conversion',
      });

      expect(experiment).toBeDefined();
      expect(experiment.id).toBeDefined();
      expect(experiment.name).toBe('Test Experiment');
      expect(experiment.status).toBe('draft');
    });

    test('should get experiment by ID', () => {
      const created = experimentsService.createExperiment({
        name: 'Get Test Experiment',
      });

      const retrieved = experimentsService.getExperiment(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
    });

    test('should update experiment', () => {
      const experiment = experimentsService.createExperiment({
        name: 'Before Update',
      });

      const updated = experimentsService.updateExperiment(experiment.id, {
        name: 'After Update',
        description: 'New description',
      });

      expect(updated.name).toBe('After Update');
      expect(updated.description).toBe('New description');
    });

    test('should start experiment', () => {
      const experiment = experimentsService.createExperiment({
        name: 'Start Test',
      });

      const started = experimentsService.startExperiment(experiment.id);
      expect(started.status).toBe('running');
      expect(started.startedAt).toBeDefined();
    });

    test('should pause experiment', () => {
      const experiment = experimentsService.createExperiment({
        name: 'Pause Test',
      });
      experimentsService.startExperiment(experiment.id);

      const paused = experimentsService.pauseExperiment(experiment.id);
      expect(paused.status).toBe('paused');
    });

    test('should complete experiment', () => {
      const experiment = experimentsService.createExperiment({
        name: 'Complete Test',
      });
      experimentsService.startExperiment(experiment.id);

      const completed = experimentsService.completeExperiment(experiment.id);
      expect(completed.status).toBe('completed');
      expect(completed.endedAt).toBeDefined();
    });
  });

  describe('Variant Management', () => {
    test('should create variant for experiment', () => {
      const experiment = experimentsService.createExperiment({
        name: 'Variant Test',
      });

      const variant = experimentsService.createVariant(experiment.id, {
        name: 'Control',
        description: 'Control group',
      });

      expect(variant).toBeDefined();
      expect(variant.isControl).toBe(true);
      expect(variant.index).toBe(0);
    });

    test('should create treatment variant', () => {
      const experiment = experimentsService.createExperiment({
        name: 'Treatment Test',
      });

      experimentsService.createVariant(experiment.id, { name: 'Control' });
      const treatment = experimentsService.createVariant(experiment.id, {
        name: 'Treatment A',
        description: 'New color scheme',
      });

      expect(treatment.isControl).toBe(false);
      expect(treatment.index).toBe(1);
    });

    test('should get experiment variants', () => {
      const experiment = experimentsService.createExperiment({
        name: 'Get Variants Test',
      });

      experimentsService.createVariant(experiment.id, { name: 'Control' });
      experimentsService.createVariant(experiment.id, { name: 'Treatment' });

      const variants = experimentsService.getExperimentVariants(experiment.id);
      expect(variants.length).toBe(2);
      expect(variants[0].isControl).toBe(true);
    });

    test('should update variant', () => {
      const experiment = experimentsService.createExperiment({
        name: 'Update Variant Test',
      });

      const variant = experimentsService.createVariant(experiment.id, { name: 'Before' });

      const updated = experimentsService.updateVariant(variant.id, {
        name: 'After',
        description: 'Updated description',
      });

      expect(updated.name).toBe('After');
      expect(updated.description).toBe('Updated description');
    });
  });

  describe('Traffic Assignment', () => {
    test('should assign visitor to variant', () => {
      const experiment = experimentsService.createExperiment({
        name: 'Assignment Test',
      });
      experimentsService.startExperiment(experiment.id);
      experimentsService.createVariant(experiment.id, { name: 'Control' });

      const assignment = experimentsService.assignVisitor(experiment.id, 'visitor-123');
      expect(assignment).toBeDefined();
      expect(assignment.visitorId).toBe('visitor-123');
      expect(assignment.experimentId).toBe(experiment.id);
    });

    test('should return same assignment for same visitor', () => {
      const experiment = experimentsService.createExperiment({
        name: 'Consistent Assignment Test',
      });
      experimentsService.startExperiment(experiment.id);
      experimentsService.createVariant(experiment.id, { name: 'Control' });

      const assignment1 = experimentsService.assignVisitor(experiment.id, 'consistent-visitor');
      const assignment2 = experimentsService.assignVisitor(experiment.id, 'consistent-visitor');

      expect(assignment1.variantId).toBe(assignment2.variantId);
    });

    test('should get visitor assignment', () => {
      const experiment = experimentsService.createExperiment({
        name: 'Get Assignment Test',
      });
      experimentsService.startExperiment(experiment.id);
      experimentsService.createVariant(experiment.id, { name: 'Control' });

      experimentsService.assignVisitor(experiment.id, 'get-assignment-visitor');
      const assignment = experimentsService.getVisitorAssignment(experiment.id, 'get-assignment-visitor');

      expect(assignment).toBeDefined();
      expect(assignment.visitorId).toBe('get-assignment-visitor');
    });
  });

  describe('Conversion Tracking', () => {
    test('should track conversion', () => {
      const experiment = experimentsService.createExperiment({
        name: 'Conversion Test',
      });
      experimentsService.startExperiment(experiment.id);
      experimentsService.createVariant(experiment.id, { name: 'Control' });
      experimentsService.assignVisitor(experiment.id, 'conversion-visitor');

      const conversion = experimentsService.trackConversion(experiment.id, 'conversion-visitor', 99.99);

      expect(conversion).toBeDefined();
      expect(conversion.value).toBe(99.99);
      expect(conversion.visitorId).toBe('conversion-visitor');
    });

    test('should update variant stats on conversion', () => {
      const experiment = experimentsService.createExperiment({
        name: 'Stats Test',
      });
      experimentsService.startExperiment(experiment.id);
      const variant = experimentsService.createVariant(experiment.id, { name: 'Control' });
      experimentsService.assignVisitor(experiment.id, 'stats-visitor');

      experimentsService.trackConversion(experiment.id, 'stats-visitor', 50);

      const updatedVariant = experimentsService.getVariant(variant.id);
      expect(updatedVariant.conversions).toBe(1);
      expect(updatedVariant.revenue).toBe(50);
    });
  });

  describe('Statistical Significance', () => {
    test('should calculate statistical significance', () => {
      const experiment = experimentsService.createExperiment({
        name: 'Significance Test',
      });
      experimentsService.startExperiment(experiment.id);
      experimentsService.createVariant(experiment.id, { name: 'Control' });
      experimentsService.createVariant(experiment.id, { name: 'Treatment' });

      // Simulate some visitors and conversions
      for (let i = 0; i < 100; i++) {
        experimentsService.assignVisitor(experiment.id, `sig-visitor-${i}`);
      }

      for (let i = 0; i < 100; i++) {
        experimentsService.trackConversion(experiment.id, `sig-visitor-${i}`);
      }

      const significance = experimentsService.calculateStatisticalSignificance(experiment.id);
      expect(significance).toBeDefined();
      expect(significance.control).toBeDefined();
    });

    test('should calculate minimum sample size', () => {
      const sampleSize = experimentsService.calculateMinimumSampleSize(0.1, 0.2);

      expect(sampleSize).toBeGreaterThan(0);
    });
  });

  describe('HTTP Endpoints', () => {
    const request = require('supertest');

    test('GET /health should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('widget-experiments');
    });

    test('GET /ready should return ready status', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body.ready).toBe(true);
    });

    test('POST /api/experiments should create experiment', async () => {
      const response = await request(app)
        .post('/api/experiments')
        .send({
          name: 'HTTP Test Experiment',
          hypothesis: 'Testing via HTTP',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.experiment).toBeDefined();
    });

    test('GET /api/experiments should list experiments', async () => {
      const response = await request(app).get('/api/experiments');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.experiments)).toBe(true);
    });

    test('GET /api/experiments/:id should get experiment', async () => {
      const createResponse = await request(app)
        .post('/api/experiments')
        .send({ name: 'Get Test' });

      const experimentId = createResponse.body.experiment.id;

      const response = await request(app).get(`/api/experiments/${experimentId}`);

      expect(response.status).toBe(200);
      expect(response.body.experiment.id).toBe(experimentId);
    });

    test('POST /api/experiments/:id/start should start experiment', async () => {
      const createResponse = await request(app)
        .post('/api/experiments')
        .send({ name: 'Start Test' });

      const experimentId = createResponse.body.experiment.id;

      const response = await request(app).post(`/api/experiments/${experimentId}/start`);

      expect(response.status).toBe(200);
      expect(response.body.experiment.status).toBe('running');
    });

    test('POST /api/experiments/:id/variant should create variant', async () => {
      const createResponse = await request(app)
        .post('/api/experiments')
        .send({ name: 'Variant Test' });

      const experimentId = createResponse.body.experiment.id;

      const response = await request(app)
        .post(`/api/experiments/${experimentId}/variant`)
        .send({ name: 'HTTP Variant' });

      expect(response.status).toBe(201);
      expect(response.body.variant).toBeDefined();
    });

    test('POST /api/experiments/:id/assign should assign visitor', async () => {
      const createResponse = await request(app)
        .post('/api/experiments')
        .send({ name: 'Assignment Test' });

      const experimentId = createResponse.body.experiment.id;

      await request(app).post(`/api/experiments/${experimentId}/start`);
      await request(app)
        .post(`/api/experiments/${experimentId}/variant`)
        .send({ name: 'Control' });

      const response = await request(app)
        .post(`/api/experiments/${experimentId}/assign`)
        .send({ visitorId: 'http-assign-visitor' });

      expect(response.status).toBe(200);
      expect(response.body.assignment).toBeDefined();
    });

    test('POST /api/experiments/:id/conversion should track conversion', async () => {
      const createResponse = await request(app)
        .post('/api/experiments')
        .send({ name: 'Conversion Test' });

      const experimentId = createResponse.body.experiment.id;

      await request(app).post(`/api/experiments/${experimentId}/start`);
      await request(app)
        .post(`/api/experiments/${experimentId}/variant`)
        .send({ name: 'Control' });
      await request(app)
        .post(`/api/experiments/${experimentId}/assign`)
        .send({ visitorId: 'http-conversion-visitor' });

      const response = await request(app)
        .post(`/api/experiments/${experimentId}/conversion`)
        .send({ visitorId: 'http-conversion-visitor', value: 49.99 });

      expect(response.status).toBe(201);
      expect(response.body.conversion).toBeDefined();
    });

    test('POST /api/experiments/sample-size should calculate sample size', async () => {
      const response = await request(app)
        .post('/api/experiments/sample-size')
        .send({
          baselineRate: 0.1,
          minimumDetectableEffect: 0.2,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.sampleSize).toBeGreaterThan(0);
    });

    test('404 for unknown routes', async () => {
      const response = await request(app).get('/unknown/route');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not found');
    });
  });
});
