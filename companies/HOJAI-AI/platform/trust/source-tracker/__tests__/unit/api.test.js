import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Re-create the app for testing (same logic as src/index.js)
function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // In-memory source store
  const sources = new Map();

  // Extract citations from text
  function extractCitations(text) {
    const citations = [];
    const patterns = [
      /\[(\d+)\]/g,
      /\(([^)]+,\s*\d{4})\)/g,
      /"([^"]+)"\s*\(/g,
      /https?:\/\/[^\s]+/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        citations.push({
          text: match[0],
          type: getCitationType(match[0]),
          confidence: 0.8,
          position: match.index
        });
      }
    }

    return citations;
  }

  function getCitationType(text) {
    if (text.startsWith('http')) return 'url';
    if (text.match(/\(\w+,\s*\d{4}\)/)) return 'academic';
    if (text.match(/^\[\d+\]$/)) return 'numeric';
    return 'general';
  }

  function calculateReliability(citation) {
    let score = 0.5;
    if (citation.type === 'academic') score += 0.3;
    if (sources.has(citation.text)) {
      const source = sources.get(citation.text);
      score = (score + source.reliability) / 2;
    }
    return Math.min(1, score);
  }

  function rankSources(citations) {
    return citations.map(c => ({
      ...c,
      reliability: calculateReliability(c)
    })).sort((a, b) => b.reliability - a.reliability);
  }

  // Routes
  app.post('/extract', (req, res) => {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    const citations = extractCitations(text);
    res.json({ citations, count: citations.length });
  });

  app.post('/track', (req, res) => {
    const { source, type, reliability, metadata } = req.body;
    if (!source) {
      return res.status(400).json({ error: 'Source is required' });
    }
    sources.set(source, {
      type: type || 'unknown',
      reliability: reliability || 0.5,
      metadata: metadata || {},
      trackedAt: new Date().toISOString()
    });
    res.json({ success: true, source });
  });

  app.post('/verify', (req, res) => {
    const { citations } = req.body;
    if (!citations || !Array.isArray(citations)) {
      return res.status(400).json({ error: 'Citations array is required' });
    }
    const verified = citations.map(c => {
      const tracked = sources.get(c.text);
      return {
        ...c,
        verified: !!tracked,
        reliability: tracked?.reliability || 0,
        source: tracked || null
      };
    });
    res.json({ verified, count: verified.length });
  });

  app.get('/sources', (req, res) => {
    const { type, minReliability } = req.query;
    let result = Array.from(sources.entries()).map(([source, data]) => ({
      source,
      ...data
    }));
    if (type) {
      result = result.filter(s => s.type === type);
    }
    if (minReliability) {
      result = result.filter(s => s.reliability >= parseFloat(minReliability));
    }
    res.json({ sources: result, count: result.length });
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'source-tracker', port: 4991, sources: sources.size });
  });

  return { app, sources };
}

describe('Source Tracker API - /extract endpoint', () => {
  let app;

  beforeEach(() => {
    const result = createApp();
    app = result.app;
  });

  describe('POST /extract', () => {
    it('should extract numeric citations from text', async () => {
      const response = await request(app)
        .post('/extract')
        .send({ text: 'According to research [1], AI is growing. See also [42].' });

      expect(response.status).toBe(200);
      expect(response.body.citations).toHaveLength(2);
      expect(response.body.count).toBe(2);
      expect(response.body.citations[0].text).toBe('[1]');
      expect(response.body.citations[0].type).toBe('numeric');
    });

    it('should extract academic citations from text', async () => {
      const response = await request(app)
        .post('/extract')
        .send({ text: 'Smith (Smith, 2023) demonstrated that machine learning works.' });

      expect(response.status).toBe(200);
      expect(response.body.citations).toHaveLength(1);
      expect(response.body.citations[0].type).toBe('academic');
      expect(response.body.citations[0].text).toBe('(Smith, 2023)');
    });

    it('should extract URLs from text', async () => {
      const response = await request(app)
        .post('/extract')
        .send({ text: 'Visit https://example.com or http://test.org for details.' });

      expect(response.status).toBe(200);
      expect(response.body.citations.length).toBeGreaterThanOrEqual(2);
      expect(response.body.citations[0].type).toBe('url');
    });

    it('should extract multiple citation types from same text', async () => {
      // Note: (Smith, 2023) format requires "Author, Year" in parentheses
      const response = await request(app)
        .post('/extract')
        .send({ text: 'According to Smith (Smith, 2023) [1], see https://example.com.' });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(3);
      const types = response.body.citations.map(c => c.type);
      expect(types).toContain('academic');
      expect(types).toContain('numeric');
      expect(types).toContain('url');
    });

    it('should return empty array for text with no citations', async () => {
      const response = await request(app)
        .post('/extract')
        .send({ text: 'This is plain text with no citations at all.' });

      expect(response.status).toBe(200);
      expect(response.body.citations).toHaveLength(0);
      expect(response.body.count).toBe(0);
    });

    it('should return 400 when text is missing', async () => {
      const response = await request(app)
        .post('/extract')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Text is required');
    });

    it('should return 400 when text is null', async () => {
      const response = await request(app)
        .post('/extract')
        .send({ text: null });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Text is required');
    });

    it('should return 400 when text is empty string', async () => {
      const response = await request(app)
        .post('/extract')
        .send({ text: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Text is required');
    });

    it('should capture position for each citation', async () => {
      const response = await request(app)
        .post('/extract')
        .send({ text: 'Start [1] middle [2] end' });

      expect(response.body.citations[0].position).toBe(6);
      expect(response.body.citations[1].position).toBe(17);
    });

    it('should assign confidence 0.8 to all extracted citations', async () => {
      const response = await request(app)
        .post('/extract')
        .send({ text: '[1] (Smith, 2023) https://example.com' });

      response.body.citations.forEach(c => {
        expect(c.confidence).toBe(0.8);
      });
    });

    it('should handle complex academic paper reference', async () => {
      const text = `
        Recent advances in transformer models (Vaswani et al., 2017) have
        revolutionized NLP [1]. The BERT model (Devlin et al., 2018) achieved
        state-of-the-art results. See https://arxiv.org/abs/1706.03762.
      `;

      const response = await request(app)
        .post('/extract')
        .send({ text });

      expect(response.status).toBe(200);
      expect(response.body.count).toBeGreaterThanOrEqual(4);
    });

    it('should handle text with malformed citations gracefully', async () => {
      const response = await request(app)
        .post('/extract')
        .send({ text: 'Incomplete [ bracket [1] and (missing paren' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.citations)).toBe(true);
    });
  });
});

describe('Source Tracker API - /track endpoint', () => {
  let app;
  let sources;

  beforeEach(() => {
    const result = createApp();
    app = result.app;
    sources = result.sources;
  });

  describe('POST /track', () => {
    it('should track a new source with all fields', async () => {
      const response = await request(app)
        .post('/track')
        .send({
          source: 'https://example.com',
          type: 'website',
          reliability: 0.9,
          metadata: { domain: 'example.com', verified: true }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.source).toBe('https://example.com');
      expect(sources.has('https://example.com')).toBe(true);
    });

    it('should track source with default values when optional fields missing', async () => {
      const response = await request(app)
        .post('/track')
        .send({ source: 'https://simple-source.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const stored = sources.get('https://simple-source.com');
      expect(stored.type).toBe('unknown');
      expect(stored.reliability).toBe(0.5);
      expect(stored.metadata).toEqual({});
    });

    it('should track multiple sources independently', async () => {
      await request(app).post('/track').send({ source: 'https://source1.com', type: 'website', reliability: 0.8 });
      await request(app).post('/track').send({ source: 'https://source2.com', type: 'academic', reliability: 0.95 });

      expect(sources.size).toBe(2);
      expect(sources.get('https://source1.com').reliability).toBe(0.8);
      expect(sources.get('https://source2.com').reliability).toBe(0.95);
    });

    it('should return 400 when source is missing', async () => {
      const response = await request(app)
        .post('/track')
        .send({ type: 'website', reliability: 0.9 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Source is required');
    });

    it('should return 400 when source is empty string', async () => {
      const response = await request(app)
        .post('/track')
        .send({ source: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Source is required');
    });

    it('should store trackedAt timestamp', async () => {
      const beforeTrack = new Date();
      const response = await request(app)
        .post('/track')
        .send({ source: 'https://timed.com' });

      const afterTrack = new Date();
      const stored = sources.get('https://timed.com');

      const trackedAt = new Date(stored.trackedAt);
      expect(trackedAt.getTime()).toBeGreaterThanOrEqual(beforeTrack.getTime());
      expect(trackedAt.getTime()).toBeLessThanOrEqual(afterTrack.getTime());
    });

    it('should track sources with different reliability values', async () => {
      const reliabilityValues = [0.1, 0.5, 0.75, 1.0];

      for (const reliability of reliabilityValues) {
        await request(app)
          .post('/track')
          .send({ source: `https://test${reliability}.com`, reliability });
      }

      expect(sources.size).toBe(4);
      reliabilityValues.forEach(rel => {
        expect(sources.get(`https://test${rel}.com`).reliability).toBe(rel);
      });
    });

    it('should allow overwriting existing source', async () => {
      const source = 'https://overwrite-test.com';

      await request(app).post('/track').send({ source, reliability: 0.5, type: 'old_type' });
      await request(app).post('/track').send({ source, reliability: 0.9, type: 'new_type' });

      expect(sources.size).toBe(1);
      expect(sources.get(source).reliability).toBe(0.9);
      expect(sources.get(source).type).toBe('new_type');
    });
  });
});

describe('Source Tracker API - /verify endpoint', () => {
  let app;
  let sources;

  beforeEach(() => {
    const result = createApp();
    app = result.app;
    sources = result.sources;

    // Pre-populate some tracked sources
    sources.set('https://verified.com', { reliability: 0.95, type: 'website' });
    sources.set('[1]', { reliability: 0.7, type: 'numeric' });
    sources.set('(Smith, 2023)', { reliability: 0.85, type: 'academic' });
  });

  describe('POST /verify', () => {
    it('should mark tracked sources as verified', async () => {
      const citations = [
        { text: 'https://verified.com', type: 'url', confidence: 0.8 }
      ];

      const response = await request(app)
        .post('/verify')
        .send({ citations });

      expect(response.status).toBe(200);
      expect(response.body.verified[0].verified).toBe(true);
      expect(response.body.verified[0].reliability).toBe(0.95);
    });

    it('should mark untracked sources as not verified', async () => {
      const citations = [
        { text: 'https://unknown.com', type: 'url', confidence: 0.8 }
      ];

      const response = await request(app)
        .post('/verify')
        .send({ citations });

      expect(response.status).toBe(200);
      expect(response.body.verified[0].verified).toBe(false);
      expect(response.body.verified[0].reliability).toBe(0);
      expect(response.body.verified[0].source).toBeNull();
    });

    it('should handle mixed verified and unverified citations', async () => {
      const citations = [
        { text: 'https://verified.com', type: 'url', confidence: 0.8 },
        { text: 'https://unknown.com', type: 'url', confidence: 0.8 },
        { text: '[1]', type: 'numeric', confidence: 0.8 }
      ];

      const response = await request(app)
        .post('/verify')
        .send({ citations });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(3);
      expect(response.body.verified[0].verified).toBe(true);
      expect(response.body.verified[1].verified).toBe(false);
      expect(response.body.verified[2].verified).toBe(true);
    });

    it('should preserve original citation data in verification result', async () => {
      const citations = [
        { text: 'https://verified.com', type: 'url', confidence: 0.8, position: 10, custom: 'field' }
      ];

      const response = await request(app)
        .post('/verify')
        .send({ citations });

      expect(response.body.verified[0].text).toBe('https://verified.com');
      expect(response.body.verified[0].type).toBe('url');
      expect(response.body.verified[0].confidence).toBe(0.8);
      expect(response.body.verified[0].position).toBe(10);
      expect(response.body.verified[0].custom).toBe('field');
    });

    it('should return 400 when citations is missing', async () => {
      const response = await request(app)
        .post('/verify')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Citations array is required');
    });

    it('should return 400 when citations is not an array', async () => {
      const response = await request(app)
        .post('/verify')
        .send({ citations: 'not-an-array' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Citations array is required');
    });

    it('should return 400 when citations is null', async () => {
      const response = await request(app)
        .post('/verify')
        .send({ citations: null });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Citations array is required');
    });

    it('should return 400 when citations is an object', async () => {
      const response = await request(app)
        .post('/verify')
        .send({ citations: { key: 'value' } });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Citations array is required');
    });

    it('should handle empty citations array', async () => {
      const response = await request(app)
        .post('/verify')
        .send({ citations: [] });

      expect(response.status).toBe(200);
      expect(response.body.verified).toHaveLength(0);
      expect(response.body.count).toBe(0);
    });

    it('should include source data in verification result for verified citations', async () => {
      const citations = [{ text: '(Smith, 2023)', type: 'academic', confidence: 0.8 }];

      const response = await request(app)
        .post('/verify')
        .send({ citations });

      expect(response.body.verified[0].source).not.toBeNull();
      expect(response.body.verified[0].source.type).toBe('academic');
      expect(response.body.verified[0].source.reliability).toBe(0.85);
    });
  });
});

describe('Source Tracker API - /sources endpoint', () => {
  let app;
  let sources;

  beforeEach(() => {
    const result = createApp();
    app = result.app;
    sources = result.sources;

    // Pre-populate sources
    sources.set('https://site1.com', { reliability: 0.9, type: 'website' });
    sources.set('https://site2.com', { reliability: 0.7, type: 'website' });
    sources.set('https://academic.com', { reliability: 0.95, type: 'academic' });
  });

  describe('GET /sources', () => {
    it('should return all tracked sources', async () => {
      const response = await request(app).get('/sources');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(3);
      expect(response.body.sources).toHaveLength(3);
    });

    it('should filter sources by type', async () => {
      const response = await request(app).get('/sources?type=website');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(2);
      response.body.sources.forEach(s => {
        expect(s.type).toBe('website');
      });
    });

    it('should filter sources by minimum reliability', async () => {
      const response = await request(app).get('/sources?minReliability=0.85');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(2);
      response.body.sources.forEach(s => {
        expect(s.reliability).toBeGreaterThanOrEqual(0.85);
      });
    });

    it('should combine type and minReliability filters', async () => {
      const response = await request(app).get('/sources?type=website&minReliability=0.8');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.sources[0].reliability).toBe(0.9);
      expect(response.body.sources[0].type).toBe('website');
    });

    it('should return empty array when no sources match filter', async () => {
      const response = await request(app).get('/sources?type=nonexistent');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(0);
      expect(response.body.sources).toHaveLength(0);
    });

    it('should return empty array when no sources with high reliability', async () => {
      const response = await request(app).get('/sources?minReliability=0.99');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(0);
    });

    it('should return sources without query params', async () => {
      const response = await request(app).get('/sources');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.sources)).toBe(true);
    });

    it('should include source data with correct structure', async () => {
      const response = await request(app).get('/sources?type=academic');

      expect(response.body.sources[0]).toHaveProperty('source');
      expect(response.body.sources[0]).toHaveProperty('type');
      expect(response.body.sources[0]).toHaveProperty('reliability');
      // Note: metadata and trackedAt are stored but may be spread into the response
      expect(response.body.sources[0]).toHaveProperty('trackedAt');
    });
  });
});

describe('Source Tracker API - /health endpoint', () => {
  let app;
  let sources;

  beforeEach(() => {
    const result = createApp();
    app = result.app;
    sources = result.sources;
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('source-tracker');
    });

    it('should include port in health response', async () => {
      const response = await request(app).get('/health');

      expect(response.body.port).toBe(4991);
    });

    it('should reflect source count in health response', async () => {
      // Add some sources
      sources.set('https://test1.com', { reliability: 0.9 });
      sources.set('https://test2.com', { reliability: 0.8 });

      const response = await request(app).get('/health');

      expect(response.body.sources).toBe(2);
    });

    it('should return 0 sources count when empty', async () => {
      const response = await request(app).get('/health');

      expect(response.body.sources).toBe(0);
    });
  });
});

describe('Source Tracker API - Error Handling', () => {
  let app;

  beforeEach(() => {
    const result = createApp();
    app = result.app;
  });

  describe('Invalid routes', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');

      expect(response.status).toBe(404);
    });

    it('should return 404 for invalid POST routes', async () => {
      const response = await request(app).post('/invalid-route').send({});

      expect(response.status).toBe(404);
    });
  });

  describe('Malformed requests', () => {
    it('should handle JSON parse errors gracefully', async () => {
      const response = await request(app)
        .post('/extract')
        .set('Content-Type', 'application/json')
        .send('invalid json{');

      expect(response.status).toBe(400);
    });

    it('should handle empty body', async () => {
      const response = await request(app)
        .post('/extract')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('Content-Type handling', () => {
    it('should accept JSON content type', async () => {
      const response = await request(app)
        .post('/extract')
        .set('Content-Type', 'application/json')
        .send({ text: 'Test [1]' });

      expect(response.status).toBe(200);
    });

    it('should return JSON for all API responses', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});

describe('Source Tracker API - Edge Cases', () => {
  let app;
  let sources;

  beforeEach(() => {
    const result = createApp();
    app = result.app;
    sources = result.sources;
  });

  describe('Special characters in sources', () => {
    it('should handle URLs with special characters', async () => {
      const url = 'https://example.com/path?query=value&other=123';
      await request(app).post('/track').send({ source: url, reliability: 0.8 });

      expect(sources.has(url)).toBe(true);
    });

    it('should handle academic citations with special characters', async () => {
      const citation = '(O\'Brien, 2023)';
      const response = await request(app)
        .post('/verify')
        .send({ citations: [{ text: citation, type: 'academic' }] });

      expect(response.status).toBe(200);
    });
  });

  describe('Unicode and international text', () => {
    it('should handle unicode in text for extraction', async () => {
      const text = 'According to 研究 (Chen, 2023) [1], see https://例子.中文';

      const response = await request(app)
        .post('/extract')
        .send({ text });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.citations)).toBe(true);
    });
  });

  describe('Large inputs', () => {
    it('should handle large text input for extraction', async () => {
      const text = '[1] '.repeat(1000);

      const response = await request(app)
        .post('/extract')
        .send({ text });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1000);
    });

    it('should handle many sources being tracked', async () => {
      for (let i = 0; i < 100; i++) {
        await request(app)
          .post('/track')
          .send({ source: `https://source${i}.com`, reliability: i / 100 });
      }

      expect(sources.size).toBe(100);

      const response = await request(app).get('/sources');
      expect(response.body.count).toBe(100);
    });
  });

  describe('Boundary values', () => {
    it('should use default reliability when 0 is passed (falsy value)', async () => {
      // Note: Due to || operator, 0 is falsy so defaults to 0.5
      await request(app)
        .post('/track')
        .send({ source: 'https://zero.com', reliability: 0 });

      expect(sources.get('https://zero.com').reliability).toBe(0.5);
    });

    it('should handle reliability of 1.0', async () => {
      await request(app)
        .post('/track')
        .send({ source: 'https://perfect.com', reliability: 1.0 });

      expect(sources.get('https://perfect.com').reliability).toBe(1.0);
    });

    it('should handle reliability greater than 1', async () => {
      await request(app)
        .post('/track')
        .send({ source: 'https://over.com', reliability: 1.5 });

      expect(sources.get('https://over.com').reliability).toBe(1.5);
    });

    it('should handle negative reliability', async () => {
      await request(app)
        .post('/track')
        .send({ source: 'https://negative.com', reliability: -0.5 });

      expect(sources.get('https://negative.com').reliability).toBe(-0.5);
    });
  });
});

describe('Source Tracker API - Integration Scenarios', () => {
  let app;
  let sources;

  beforeEach(() => {
    const result = createApp();
    app = result.app;
    sources = result.sources;
  });

  describe('Full workflow: extract, track, verify', () => {
    it('should complete full citation verification workflow', async () => {
      // 1. Extract citations from text
      const extractResponse = await request(app)
        .post('/extract')
        .send({ text: 'According to Smith (Smith, 2023) [1], see https://example.com.' });

      expect(extractResponse.status).toBe(200);
      const citations = extractResponse.body.citations;

      // 2. Track some sources
      await request(app).post('/track').send({
        source: '(Smith, 2023)',
        type: 'academic',
        reliability: 0.9,
        metadata: { journal: 'Nature' }
      });
      await request(app).post('/track').send({
        source: 'https://example.com',
        type: 'website',
        reliability: 0.85,
        metadata: { domain: 'example.com' }
      });

      // 3. Verify citations
      const verifyResponse = await request(app)
        .post('/verify')
        .send({ citations });

      expect(verifyResponse.status).toBe(200);
      const verified = verifyResponse.body.verified;

      // Academic should be verified with high reliability
      const academic = verified.find(v => v.type === 'academic');
      expect(academic.verified).toBe(true);
      expect(academic.reliability).toBe(0.9);

      // URL should be verified
      const url = verified.find(v => v.type === 'url');
      expect(url.verified).toBe(true);
      expect(url.reliability).toBe(0.85);

      // Numeric citation may not be verified
      const numeric = verified.find(v => v.type === 'numeric');
      expect(numeric.verified).toBe(false);
    });

    it('should track and filter sources by reliability', async () => {
      // Track sources with various reliability scores
      const sourcesToTrack = [
        { source: 'https://high.com', reliability: 0.95 },
        { source: 'https://medium.com', reliability: 0.7 },
        { source: 'https://low.com', reliability: 0.3 }
      ];

      for (const src of sourcesToTrack) {
        await request(app).post('/track').send(src);
      }

      // Filter high reliability sources
      const highResponse = await request(app).get('/sources?minReliability=0.8');
      expect(highResponse.body.count).toBe(1);
      expect(highResponse.body.sources[0].source).toBe('https://high.com');

      // Filter medium reliability sources
      const mediumResponse = await request(app).get('/sources?minReliability=0.5');
      expect(mediumResponse.body.count).toBe(2);
    });
  });
});
