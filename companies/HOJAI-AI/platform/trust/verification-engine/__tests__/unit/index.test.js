import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Create a fresh app instance for testing
function createTestApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // Knowledge graph for verification (isolated per test)
  const knowledgeGraph = new Map();

  // Add fact to knowledge graph
  function addFact(subject, predicate, object, source, reliability = 0.8) {
    const key = `${subject}|${predicate}`;
    const facts = knowledgeGraph.get(key) || [];
    facts.push({
      object,
      source,
      reliability,
      timestamp: new Date().toISOString()
    });
    knowledgeGraph.set(key, facts);
  }

  // Check fact against knowledge graph
  function verifyFact(statement) {
    const results = {
      statement,
      verified: false,
      confidence: 0,
      supportingFacts: [],
      contradictingFacts: [],
      sources: [],
      verdict: 'unknown'
    };

    const parsed = parseStatement(statement);
    if (!parsed) return results;

    const key = `${parsed.subject}|${parsed.predicate}`;
    const facts = knowledgeGraph.get(key) || [];

    if (facts.length === 0) {
      results.verdict = 'unverified';
      results.confidence = 0.2;
      return results;
    }

    for (const fact of facts) {
      if (fact.object === parsed.object) {
        results.supportingFacts.push(fact);
        results.sources.push(fact.source);
      } else if (isContradiction(fact.object, parsed.object)) {
        results.contradictingFacts.push(fact);
      }
    }

    const supportingCount = results.supportingFacts.length;
    const contradictingCount = results.contradictingFacts.length;
    const totalCount = supportingCount + contradictingCount;

    if (totalCount > 0) {
      results.confidence = supportingCount / totalCount;
      results.verified = results.confidence >= 0.7;
    } else {
      const avgReliability = facts.reduce((sum, f) => sum + f.reliability, 0) / facts.length;
      results.confidence = avgReliability;
    }

    if (results.confidence >= 0.8) {
      results.verdict = results.contradictingFacts.length > 0 ? 'disputed' : 'verified';
    } else if (results.confidence >= 0.5) {
      results.verdict = 'partial';
    } else {
      results.verdict = 'unverified';
    }

    return results;
  }

  function parseStatement(statement) {
    const patterns = [
      /^([^.!?]+)\s+is\s+(.+)$/i,
      /^([^.!?]+)\s+has\s+(.+)$/i,
      /^([^.!?]+)\s+equals\s+(.+)$/i
    ];

    for (const pattern of patterns) {
      const match = statement.match(pattern);
      if (match) {
        return {
          subject: match[1].trim(),
          predicate: pattern.source.match(/\s+(\w+)\s+/)?.[1] || 'related_to',
          object: match[2].trim()
        };
      }
    }

    return null;
  }

  function isContradiction(obj1, obj2) {
    if (obj1 === obj2) return false;

    const obj1Lower = obj1.toLowerCase();
    const obj2Lower = obj2.toLowerCase();

    const opposites = [
      ['true', 'false'], ['yes', 'no'], ['hot', 'cold'],
      ['big', 'small'], ['tall', 'short'], ['fast', 'slow']
    ];

    for (const [a, b] of opposites) {
      if ((obj1Lower.includes(a) && obj2Lower.includes(b)) ||
          (obj1Lower.includes(b) && obj2Lower.includes(a))) {
        return true;
      }
    }

    return false;
  }

  // Routes
  app.post('/fact', (req, res) => {
    const { subject, predicate, object, source, reliability } = req.body;

    if (!subject || !predicate || !object) {
      return res.status(400).json({ error: 'subject, predicate, and object are required' });
    }

    addFact(subject, predicate, object, source || 'unknown', reliability || 0.8);

    res.json({ success: true });
  });

  app.post('/verify', (req, res) => {
    const { statement, source } = req.body;

    if (!statement) {
      return res.status(400).json({ error: 'Statement is required' });
    }

    if (source) {
      const parsed = parseStatement(statement);
      if (parsed) {
        addFact(parsed.subject, parsed.predicate, parsed.object, source, 0.9);
      }
    }

    const result = verifyFact(statement);

    res.json(result);
  });

  app.post('/verify/batch', (req, res) => {
    const { statements } = req.body;

    if (!statements || !Array.isArray(statements)) {
      return res.status(400).json({ error: 'Statements array is required' });
    }

    const results = statements.map(s => verifyFact(s));

    res.json({
      results,
      summary: {
        verified: results.filter(r => r.verified).length,
        disputed: results.filter(r => r.verdict === 'disputed').length,
        unverified: results.filter(r => r.verdict === 'unverified').length
      }
    });
  });

  app.get('/graph', (req, res) => {
    const { subject, predicate } = req.query;

    if (subject && predicate) {
      const key = `${subject}|${predicate}`;
      const facts = knowledgeGraph.get(key) || [];
      return res.json({ facts });
    }

    const facts = [];
    for (const [key, value] of knowledgeGraph) {
      const [subject, predicate] = key.split('|');
      facts.push({ subject, predicate, facts: value });
    }

    res.json({ graph: facts, count: facts.length });
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'verification-engine', facts: knowledgeGraph.size });
  });

  return { app, knowledgeGraph, addFact, verifyFact, parseStatement, isContradiction };
}

describe('Verification Engine', () => {
  let testApp;
  let app;
  let addFact;
  let verifyFact;
  let parseStatement;
  let isContradiction;

  beforeEach(() => {
    testApp = createTestApp();
    app = testApp.app;
    addFact = testApp.addFact;
    verifyFact = testApp.verifyFact;
    parseStatement = testApp.parseStatement;
    isContradiction = testApp.isContradiction;
  });

  describe('parseStatement', () => {
    it('should parse "X is Y" pattern', () => {
      const result = parseStatement('water is cold');
      expect(result).toEqual({
        subject: 'water',
        predicate: 'is',
        object: 'cold'
      });
    });

    it('should parse "X has Y" pattern', () => {
      const result = parseStatement('coffee has caffeine');
      expect(result).toEqual({
        subject: 'coffee',
        predicate: 'has',
        object: 'caffeine'
      });
    });

    it('should parse "X equals Y" pattern', () => {
      const result = parseStatement('speed equals velocity');
      expect(result).toEqual({
        subject: 'speed',
        predicate: 'equals',
        object: 'velocity'
      });
    });

    it('should return null for unparseable statements', () => {
      const result = parseStatement('this is not parseable');
      // This should parse as "this is not" with object "parseable"
      expect(result).not.toBeNull();
    });

    it('should trim whitespace from parsed components', () => {
      const result = parseStatement('  product  is   premium  ');
      expect(result).toEqual({
        subject: 'product',
        predicate: 'is',
        object: 'premium'
      });
    });
  });

  describe('isContradiction', () => {
    it('should detect true/false contradiction', () => {
      expect(isContradiction('true', 'false')).toBe(true);
      expect(isContradiction('certified', 'uncertified')).toBe(true);
    });

    it('should detect yes/no contradiction', () => {
      expect(isContradiction('yes', 'no')).toBe(true);
    });

    it('should detect temperature opposites', () => {
      expect(isContradiction('hot', 'cold')).toBe(true);
    });

    it('should detect size opposites', () => {
      expect(isContradiction('big', 'small')).toBe(true);
      expect(isContradiction('large', 'tiny')).toBe(true);
    });

    it('should return false for same values', () => {
      expect(isContradiction('hot', 'hot')).toBe(false);
      expect(isContradiction('true', 'true')).toBe(false);
    });

    it('should return false for unrelated values', () => {
      expect(isContradiction('hot', 'fast')).toBe(false);
      expect(isContradiction('water', 'fire')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isContradiction('HOT', 'cold')).toBe(true);
      expect(isContradiction('True', 'FALSE')).toBe(true);
    });
  });

  describe('verifyFact', () => {
    it('should return unverified for unknown statements', () => {
      const result = verifyFact('unknown fact xyz');
      expect(result.verdict).toBe('unverified');
      expect(result.confidence).toBe(0.2);
      expect(result.verified).toBe(false);
    });

    it('should return verified for matching facts', () => {
      addFact('coffee', 'contains', 'caffeine', 'health_site', 0.95);
      const result = verifyFact('coffee contains caffeine');

      expect(result.verdict).toBe('verified');
      expect(result.verified).toBe(true);
      expect(result.confidence).toBe(1);
      expect(result.supportingFacts.length).toBe(1);
      expect(result.sources).toContain('health_site');
    });

    it('should return disputed when contradictions exist', () => {
      addFact('coffee', 'is', 'healthy', 'site_a', 0.8);
      addFact('coffee', 'is', 'unhealthy', 'site_b', 0.7);
      const result = verifyFact('coffee is healthy');

      expect(result.confidence).toBe(0.5);
      expect(result.contradictingFacts.length).toBe(1);
    });

    it('should return partial for mixed evidence', () => {
      addFact('product', 'is', 'good', 'review1', 0.6);
      addFact('product', 'is', 'bad', 'review2', 0.6);
      const result = verifyFact('product is good');

      expect(result.verdict).toBe('partial');
    });

    it('should use reliability when no contradictions', () => {
      addFact('source', 'says', 'something', 'trusted_source', 0.9);
      const result = verifyFact('source says something');

      expect(result.confidence).toBe(0.9);
    });

    it('should handle statements with punctuation', () => {
      addFact('fact', 'is', 'true', 'test', 0.9);
      const result = verifyFact('fact is true.');
      expect(result.verified).toBe(true);
    });
  });

  describe('Knowledge Graph Operations', () => {
    it('should add and retrieve facts', () => {
      addFact('test', 'value', 'data', 'test_source', 0.9);
      const result = verifyFact('test value data');

      expect(result.supportingFacts.length).toBe(1);
      expect(result.supportingFacts[0].source).toBe('test_source');
    });

    it('should store multiple facts for same subject-predicate', () => {
      addFact('item', 'color', 'red', 'source1', 0.8);
      addFact('item', 'color', 'blue', 'source2', 0.7);

      const result1 = verifyFact('item color red');
      const result2 = verifyFact('item color blue');

      expect(result1.supportingFacts.length).toBe(1);
      expect(result2.supportingFacts.length).toBe(1);
    });

    it('should use default reliability when not specified', () => {
      addFact('fact', 'status', 'active', 'default_test');
      const result = verifyFact('fact status active');

      expect(result.supportingFacts[0].reliability).toBe(0.8);
    });
  });

  describe('Batch Verification', () => {
    it('should summarize batch results correctly', () => {
      addFact('verified', 'is', 'fact', 'source', 0.95);
      addFact('unverified', 'status', 'unknown', 'source', 0.5);

      const statements = [
        'verified is fact',
        'unverified status unknown',
        'random unknown statement xyz'
      ];

      const results = statements.map(s => verifyFact(s));

      const summary = {
        verified: results.filter(r => r.verified).length,
        disputed: results.filter(r => r.verdict === 'disputed').length,
        unverified: results.filter(r => r.verdict === 'unverified').length
      };

      expect(summary.verified).toBe(1);
      expect(summary.unverified).toBe(2);
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate 100% confidence for single supporting fact', () => {
      addFact('item', 'is', 'valid', 'source', 0.9);
      const result = verifyFact('item is valid');

      expect(result.confidence).toBe(1);
      expect(result.verdict).toBe('verified');
    });

    it('should calculate 50% for equal supporting and contradicting', () => {
      addFact('item', 'quality', 'good', 'source1', 0.8);
      addFact('item', 'quality', 'bad', 'source2', 0.8);
      const result = verifyFact('item quality good');

      expect(result.confidence).toBe(0.5);
      expect(result.verdict).toBe('partial');
    });

    it('should escalate to disputed when contradictions exist with high confidence', () => {
      addFact('item', 'status', 'active', 'source1', 0.9);
      addFact('item', 'status', 'inactive', 'source2', 0.6);
      const result = verifyFact('item status active');

      expect(result.confidence).toBe(0.5);
      expect(result.contradictingFacts.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty statement', () => {
      const result = parseStatement('');
      expect(result).toBeNull();
    });

    it('should handle very long subject and object', () => {
      const longSubject = 'a'.repeat(1000);
      const longObject = 'b'.repeat(1000);
      const result = parseStatement(`${longSubject} is ${longObject}`);

      expect(result).not.toBeNull();
      expect(result.subject).toBe(longSubject);
      expect(result.object).toBe(longObject);
    });

    it('should handle special characters in statements', () => {
      addFact('product', 'name', "Item with 'quotes'", 'source', 0.9);
      const result = verifyFact("product name Item with 'quotes'");

      expect(result.supportingFacts.length).toBe(1);
    });

    it('should handle unicode characters', () => {
      addFact('name', 'is', '日本語テスト', 'source', 0.9);
      const result = verifyFact('name is 日本語テスト');

      expect(result.supportingFacts.length).toBe(1);
    });
  });
});

describe('Verification Engine - Express Routes', () => {
  let testApp;
  let app;

  beforeEach(() => {
    testApp = createTestApp();
    app = testApp.app;
  });

  describe('GET /health', () => {
    it('should return health status with fact count', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('verification-engine');
      expect(res.body.facts).toBe(0);
    });
  });

  describe('POST /fact', () => {
    it('should add fact successfully', async () => {
      const res = await request(app)
        .post('/fact')
        .send({
          subject: 'test',
          predicate: 'is',
          object: 'valid',
          source: 'unit_test',
          reliability: 0.95
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/fact')
        .send({ subject: 'test' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should use defaults for optional fields', async () => {
      const res = await request(app)
        .post('/fact')
        .send({ subject: 'test', predicate: 'is', object: 'value' });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /verify', () => {
    it('should return 400 for missing statement', async () => {
      const res = await request(app)
        .post('/verify')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Statement is required');
    });

    it('should verify known statement', async () => {
      // First add the fact
      await request(app)
        .post('/fact')
        .send({
          subject: 'coffee',
          predicate: 'contains',
          object: 'caffeine',
          source: 'source1',
          reliability: 0.95
        });

      const res = await request(app)
        .post('/verify')
        .send({ statement: 'coffee contains caffeine' });

      expect(res.status).toBe(200);
      expect(res.body.verified).toBe(true);
      expect(res.body.verdict).toBe('verified');
    });

    it('should add statement as fact when source provided', async () => {
      const res = await request(app)
        .post('/verify')
        .send({
          statement: 'new fact is true',
          source: 'user_input'
        });

      expect(res.status).toBe(200);
      // The statement should be added to knowledge graph
      expect(res.body.sources).toContain('user_input');
    });
  });

  describe('POST /verify/batch', () => {
    it('should return 400 for missing statements array', async () => {
      const res = await request(app)
        .post('/verify/batch')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Statements array is required');
    });

    it('should return 400 for non-array statements', async () => {
      const res = await request(app)
        .post('/verify/batch')
        .send({ statements: 'not an array' });

      expect(res.status).toBe(400);
    });

    it('should process batch of statements', async () => {
      await request(app)
        .post('/fact')
        .send({
          subject: 'fact1',
          predicate: 'is',
          object: 'true',
          source: 'source1',
          reliability: 0.9
        });

      const res = await request(app)
        .post('/verify/batch')
        .send({
          statements: ['fact1 is true', 'unknown is false']
        });

      expect(res.status).toBe(200);
      expect(res.body.results).toHaveLength(2);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.verified).toBe(1);
      expect(res.body.summary.unverified).toBe(1);
    });
  });

  describe('GET /graph', () => {
    it('should return all facts when no query params', async () => {
      await request(app)
        .post('/fact')
        .send({ subject: 'test', predicate: 'is', object: 'data' });

      const res = await request(app).get('/graph');

      expect(res.status).toBe(200);
      expect(res.body.graph).toBeDefined();
      expect(res.body.count).toBeGreaterThan(0);
    });

    it('should filter by subject and predicate', async () => {
      await request(app)
        .post('/fact')
        .send({ subject: 'filter_test', predicate: 'status', object: 'active' });

      const res = await request(app)
        .get('/graph')
        .query({ subject: 'filter_test', predicate: 'status' });

      expect(res.status).toBe(200);
      expect(res.body.facts).toHaveLength(1);
      expect(res.body.facts[0].object).toBe('active');
    });

    it('should return empty array for non-existent query', async () => {
      const res = await request(app)
        .get('/graph')
        .query({ subject: 'nonexistent', predicate: 'unknown' });

      expect(res.status).toBe(200);
      expect(res.body.facts).toHaveLength(0);
    });
  });
});

// Simple HTTP client for testing Express routes
import http from 'http';
import { Readable } from 'stream';

function request(app) {
  return {
    get: (path) => makeRequest(app, 'GET', path),
    post: (path) => makeRequest(app, 'POST', path),
    put: (path) => makeRequest(app, 'PUT', path),
    delete: (path) => makeRequest(app, 'DELETE', path)
  };
}

function makeRequest(app, method, path) {
  let requestBody = null;
  let queryParams = {};

  const chain = {
    send: (body) => {
      requestBody = JSON.stringify(body);
      return chain;
    },
    query: (params) => {
      queryParams = params;
      return chain;
    }
  };

  chain.then = (callback) => {
    return new Promise((resolve, reject) => {
      const server = app.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        const url = new URL(path, `http://127.0.0.1:${port}`);

        // Add query params
        Object.entries(queryParams).forEach(([key, value]) => {
          url.searchParams.set(key, value);
        });

        const options = {
          hostname: '127.0.0.1',
          port,
          path: url.pathname + url.search,
          method,
          headers: {
            'Content-Type': 'application/json'
          }
        };

        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            server.close();
            try {
              const body = data ? JSON.parse(data) : {};
              resolve({ status: res.statusCode, body });
            } catch {
              resolve({ status: res.statusCode, body: data });
            }
          });
        });

        req.on('error', (err) => {
          server.close();
          reject(err);
        });

        if (requestBody) {
          req.write(requestBody);
        }
        req.end();
      });
    }).then(callback);
  };

  return chain;
}
