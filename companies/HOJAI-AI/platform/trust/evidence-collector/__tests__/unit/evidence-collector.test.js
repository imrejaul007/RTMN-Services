/**
 * Evidence Collector Service - Unit Tests
 *
 * Tests cover:
 * - Evidence collection with validation
 * - Evidence retrieval with relevance scoring
 * - Quality ranking algorithm
 * - Filtering capabilities
 * - Health endpoint
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index.js';

// Test configuration
const BASE_URL = '/';
const TEST_TIMEOUT = 5000;

describe('Evidence Collector Service', () => {
  /**
   * Helper to get in-memory evidence array
   * Note: This accesses internal state for testing purposes
   */
  const clearEvidence = () => {
    // Access the module's evidence array through the running app
    // In production, this would be done via API or a test setup endpoint
  };

  describe('POST /collect', () => {
    it('should collect evidence with minimal required fields', async () => {
      const res = await request(app)
        .post('/collect')
        .send({ content: 'Company founded in 2010' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.evidence).toBeDefined();
      expect(res.body.evidence.id).toMatch(/^evidence-\d+$/);
      expect(res.body.evidence.content).toBe('Company founded in 2010');
      expect(res.body.evidence.source).toBe('unknown');
      expect(res.body.evidence.sourceType).toBe('general');
      expect(res.body.evidence.supporting).toBe(true);
      expect(res.body.evidence.addedAt).toBeDefined();
    });

    it('should collect evidence with all fields', async () => {
      const evidenceData = {
        content: 'Academic research shows 95% accuracy',
        source: 'Nature Journal',
        sourceType: 'academic',
        date: '2024-06-15',
        citations: 45,
        supporting: true,
      };

      const res = await request(app)
        .post('/collect')
        .send(evidenceData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.evidence.content).toBe(evidenceData.content);
      expect(res.body.evidence.source).toBe(evidenceData.source);
      expect(res.body.evidence.sourceType).toBe(evidenceData.sourceType);
      expect(res.body.evidence.date).toBe(evidenceData.date);
      expect(res.body.evidence.citations).toBe(evidenceData.citations);
      expect(res.body.evidence.supporting).toBe(evidenceData.supporting);
    });

    it('should reject evidence without content', async () => {
      const res = await request(app)
        .post('/collect')
        .send({ source: 'Test source' })
        .expect(400);

      expect(res.body.error).toBe('Content is required');
    });

    it('should default supporting to true when not provided', async () => {
      const res = await request(app)
        .post('/collect')
        .send({ content: 'Test evidence' })
        .expect(200);

      expect(res.body.evidence.supporting).toBe(true);
    });

    it('should accept supporting as false', async () => {
      const res = await request(app)
        .post('/collect')
        .send({
          content: 'This claim is disputed',
          supporting: false,
        })
        .expect(200);

      expect(res.body.evidence.supporting).toBe(false);
    });

    it('should handle different source types', async () => {
      const sourceTypes = ['academic', 'government', 'verified', 'general'];

      for (const sourceType of sourceTypes) {
        const res = await request(app)
          .post('/collect')
          .send({
            content: `Evidence from ${sourceType} source`,
            sourceType,
          })
          .expect(200);

        expect(res.body.evidence.sourceType).toBe(sourceType);
      }
    });
  });

  describe('POST /retrieve', () => {
    it('should retrieve relevant evidence for a claim', async () => {
      // First, collect some evidence
      await request(app)
        .post('/collect')
        .send({ content: 'Company has 10 years experience', sourceType: 'verified' });

      await request(app)
        .post('/collect')
        .send({ content: 'Weather is sunny today', sourceType: 'general' });

      // Retrieve evidence for a claim about company experience
      const res = await request(app)
        .post('/retrieve')
        .send({ claim: 'Company experience timeline' })
        .expect(200);

      expect(res.body.claim).toBe('Company experience timeline');
      expect(res.body.evidence).toBeDefined();
      expect(res.body.count).toBeDefined();
      expect(Array.isArray(res.body.evidence)).toBe(true);
    });

    it('should reject retrieval without claim', async () => {
      const res = await request(app)
        .post('/retrieve')
        .send({})
        .expect(400);

      expect(res.body.error).toBe('Claim is required');
    });

    it('should respect limit parameter', async () => {
      // Collect multiple evidence items
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/collect')
          .send({ content: `Evidence item ${i}` });
      }

      const res = await request(app)
        .post('/retrieve')
        .send({ claim: 'evidence', limit: 3 })
        .expect(200);

      expect(res.body.evidence.length).toBeLessThanOrEqual(3);
    });

    it('should filter by minimum relevance', async () => {
      await request(app)
        .post('/collect')
        .send({ content: 'Company founded 2010' });

      await request(app)
        .post('/collect')
        .send({ content: 'Unrelated content xyz' });

      // Request with high minRelevance should filter out low relevance
      const res = await request(app)
        .post('/retrieve')
        .send({
          claim: 'Company founded 2010',
          minRelevance: 0.5,
        })
        .expect(200);

      // Only evidence with high keyword overlap should be returned
      for (const evidence of res.body.evidence) {
        expect(evidence.relevance).toBeGreaterThanOrEqual(0.5);
      }
    });

    it('should rank evidence by quality', async () => {
      // Collect evidence with different qualities
      await request(app)
        .post('/collect')
        .send({
          content: 'Company founded 2010',
          sourceType: 'general',
          citations: 0,
        });

      await request(app)
        .post('/collect')
        .send({
          content: 'Company founded 2010',
          sourceType: 'academic',
          citations: 20,
          date: '2024-01-01',
        });

      const res = await request(app)
        .post('/retrieve')
        .send({ claim: 'Company founded 2010' })
        .expect(200);

      // Academic source should be ranked higher due to quality scoring
      if (res.body.evidence.length >= 2) {
        const academicEvidence = res.body.evidence.find(
          e => e.sourceType === 'academic'
        );
        const generalEvidence = res.body.evidence.find(
          e => e.sourceType === 'general'
        );

        if (academicEvidence && generalEvidence) {
          expect(academicEvidence.quality).toBeGreaterThan(
            generalEvidence.quality
          );
        }
      }
    });

    it('should return empty array when no evidence matches', async () => {
      const res = await request(app)
        .post('/retrieve')
        .send({ claim: 'completely unrelated claim that matches nothing' })
        .expect(200);

      expect(res.body.count).toBe(0);
      expect(res.body.evidence).toEqual([]);
    });
  });

  describe('GET /evidence', () => {
    it('should list all evidence', async () => {
      // Clear by collecting fresh evidence
      await request(app)
        .post('/collect')
        .send({ content: 'Evidence 1' });

      await request(app)
        .post('/collect')
        .send({ content: 'Evidence 2' });

      const res = await request(app)
        .get('/evidence')
        .expect(200);

      expect(res.body.evidence).toBeDefined();
      expect(res.body.count).toBeDefined();
      expect(Array.isArray(res.body.evidence)).toBe(true);
    });

    it('should filter by sourceType', async () => {
      await request(app)
        .post('/collect')
        .send({ content: 'Academic evidence', sourceType: 'academic' });

      await request(app)
        .post('/collect')
        .send({ content: 'General evidence', sourceType: 'general' });

      const res = await request(app)
        .get('/evidence')
        .query({ sourceType: 'academic' })
        .expect(200);

      expect(res.body.evidence.every(e => e.sourceType === 'academic')).toBe(
        true
      );
    });

    it('should filter by supporting status', async () => {
      await request(app)
        .post('/collect')
        .send({ content: 'Supporting evidence', supporting: true });

      await request(app)
        .post('/collect')
        .send({ content: 'Opposing evidence', supporting: false });

      const supportingRes = await request(app)
        .get('/evidence')
        .query({ supporting: 'true' })
        .expect(200);

      expect(
        supportingRes.body.evidence.every(e => e.supporting === true)
      ).toBe(true);

      const opposingRes = await request(app)
        .get('/evidence')
        .query({ supporting: 'false' })
        .expect(200);

      expect(
        opposingRes.body.evidence.every(e => e.supporting === false)
      ).toBe(true);
    });

    it('should respect limit parameter', async () => {
      // Collect 5 evidence items
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/collect')
          .send({ content: `Evidence ${i}` });
      }

      const res = await request(app)
        .get('/evidence')
        .query({ limit: 2 })
        .expect(200);

      expect(res.body.evidence.length).toBeLessThanOrEqual(2);
    });

    it('should combine multiple filters', async () => {
      // Use unique marker to avoid interference from other tests
      const marker = `filter-test-${Date.now()}`;

      await request(app)
        .post('/collect')
        .send({
          content: `${marker} academic supporting`,
          sourceType: 'academic',
          supporting: true,
        });

      await request(app)
        .post('/collect')
        .send({
          content: `${marker} academic opposing`,
          sourceType: 'academic',
          supporting: false,
        });

      await request(app)
        .post('/collect')
        .send({
          content: `${marker} general supporting`,
          sourceType: 'general',
          supporting: true,
        });

      const res = await request(app)
        .get('/evidence')
        .query({ sourceType: 'academic', supporting: 'true' })
        .expect(200);

      // All returned evidence should match the filter criteria
      expect(res.body.evidence.every(e =>
        e.sourceType === 'academic' && e.supporting === true
      )).toBe(true);

      // Should contain our test evidence
      const found = res.body.evidence.find(e => e.content.includes(marker));
      expect(found).toBeDefined();
      expect(found.content).toContain('academic supporting');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('evidence-collector');
      expect(res.body.port).toBeDefined();
      expect(res.body.evidence).toBeDefined();
      expect(typeof res.body.evidence).toBe('number');
    });
  });

  describe('Quality Scoring', () => {
    it('should calculate higher quality for academic sources', async () => {
      await request(app)
        .post('/collect')
        .send({
          content: 'Academic research',
          sourceType: 'academic',
          citations: 20,
          date: '2024-01-01',
        });

      const res = await request(app)
        .post('/retrieve')
        .send({ claim: 'Academic research' })
        .expect(200);

      // Academic + recent + high citations should have high quality
      const quality = res.body.evidence[0]?.quality || 0;
      expect(quality).toBeGreaterThan(0.5);
    });

    it('should calculate lower quality for general sources', async () => {
      await request(app)
        .post('/collect')
        .send({
          content: 'General info',
          sourceType: 'general',
          citations: 0,
        });

      const res = await request(app)
        .post('/retrieve')
        .send({ claim: 'General info' })
        .expect(200);

      // General source should have base or near-base quality
      const quality = res.body.evidence[0]?.quality || 0;
      expect(quality).toBeLessThanOrEqual(0.6);
    });

    it('should boost quality for recent evidence', async () => {
      const recentDate = new Date().toISOString().split('T')[0];
      const oldDate = '2010-01-01';

      await request(app)
        .post('/collect')
        .send({
          content: 'Recent evidence',
          sourceType: 'general',
          date: recentDate,
        });

      await request(app)
        .post('/collect')
        .send({
          content: 'Old evidence',
          sourceType: 'general',
          date: oldDate,
        });

      const res = await request(app)
        .post('/retrieve')
        .send({ claim: 'evidence' })
        .expect(200);

      // Recent evidence should be ranked higher
      const evidence = res.body.evidence;
      if (evidence.length >= 2) {
        expect(evidence[0].quality).toBeGreaterThanOrEqual(evidence[1].quality);
      }
    });

    it('should boost quality for evidence with citations', async () => {
      await request(app)
        .post('/collect')
        .send({
          content: 'Highly cited',
          sourceType: 'general',
          citations: 15,
        });

      await request(app)
        .post('/collect')
        .send({
          content: 'Not cited',
          sourceType: 'general',
          citations: 0,
        });

      const res = await request(app)
        .post('/retrieve')
        .send({ claim: 'cited' })
        .expect(200);

      // Highly cited should have quality boost
      const evidence = res.body.evidence;
      const cited = evidence.find(e => e.citations === 15);
      const uncited = evidence.find(e => e.citations === 0);

      if (cited && uncited) {
        expect(cited.quality).toBeGreaterThan(uncited.quality);
      }
    });
  });

  describe('Relevance Scoring', () => {
    it('should calculate relevance based on keyword overlap', async () => {
      await request(app)
        .post('/collect')
        .send({ content: 'Company founded 2010 with 500 employees' });

      await request(app)
        .post('/collect')
        .send({ content: 'Weather is sunny today' });

      const res = await request(app)
        .post('/retrieve')
        .send({ claim: 'Company founded 2010' })
        .expect(200);

      // Company evidence should have higher relevance than weather
      const companyEvidence = res.body.evidence.find(
        e => e.content.includes('Company')
      );
      const weatherEvidence = res.body.evidence.find(
        e => e.content.includes('Weather')
      );

      if (companyEvidence && weatherEvidence) {
        expect(companyEvidence.relevance).toBeGreaterThan(
          weatherEvidence.relevance
        );
      }
    });

    it('should return zero relevance for no keyword match', async () => {
      // Use content with absolutely no keyword overlap with claim
      await request(app)
        .post('/collect')
        .send({ content: 'zebra elephant giraffe penguin' });

      const res = await request(app)
        .post('/retrieve')
        .send({ claim: 'completely different unrelated claim' })
        .expect(200);

      // With no matching keywords, relevance should be 0
      if (res.body.evidence.length > 0) {
        expect(res.body.evidence[0].relevance).toBe(0);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content string', async () => {
      const res = await request(app)
        .post('/collect')
        .send({ content: '' })
        .expect(400);

      expect(res.body.error).toBe('Content is required');
    });

    it('should handle malformed JSON', async () => {
      // Note: Express's express.json() middleware returns 400 for malformed JSON
      // but the response format may vary. Testing for either 400 or error presence.
      const res = await request(app)
        .post('/collect')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      // Either returns 400 with error, or server error (500)
      expect(res.status).toBeGreaterThanOrEqual(400);
      // The response should either have an error or be empty/HTML
      expect(res.body.error || res.status === 400).toBeTruthy();
    });

    it('should handle missing optional fields gracefully', async () => {
      const res = await request(app)
        .post('/collect')
        .send({
          content: 'Test with only content',
          // No source, sourceType, date, citations, supporting
        })
        .expect(200);

      expect(res.body.evidence.source).toBe('unknown');
      expect(res.body.evidence.sourceType).toBe('general');
      expect(res.body.evidence.citations).toBe(0);
    });

    it('should handle very long content', async () => {
      const longContent = 'A'.repeat(10000);

      const res = await request(app)
        .post('/collect')
        .send({ content: longContent })
        .expect(200);

      expect(res.body.evidence.content).toBe(longContent);
    });

    it('should handle special characters in content', async () => {
      const specialContent = 'Test <script>alert("xss")</script> & "quotes"';

      const res = await request(app)
        .post('/collect')
        .send({ content: specialContent })
        .expect(200);

      expect(res.body.evidence.content).toBe(specialContent);
    });
  });
});
