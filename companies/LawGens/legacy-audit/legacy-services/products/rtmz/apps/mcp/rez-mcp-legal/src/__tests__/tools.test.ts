import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocking
import { toolHandlers } from '../tools.js';

describe('Legal AI MCP Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyze_document', () => {
    it('should analyze a document', async () => {
      const result = await toolHandlers.analyze_document({});

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.source).toBe('mock');
      expect(parsed.analysis).toBeDefined();
      expect(parsed.analysis.documentId).toBeDefined();
    });

    it('should include key entities', async () => {
      const result = await toolHandlers.analyze_document({});
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.analysis.keyEntities).toBeInstanceOf(Array);
      expect(parsed.analysis.keyEntities.length).toBeGreaterThan(0);
    });
  });

  describe('extract_clauses', () => {
    it('should extract clauses from document', async () => {
      const result = await toolHandlers.extract_clauses({
        documentId: 'DOC_123',
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.clauses).toBeInstanceOf(Array);
      expect(parsed.summary.totalClauses).toBeGreaterThan(0);
    });

    it('should categorize risk levels', async () => {
      const result = await toolHandlers.extract_clauses({
        documentId: 'DOC_123',
      });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.summary.highRisk).toBeDefined();
      expect(parsed.summary.mediumRisk).toBeDefined();
      expect(parsed.summary.lowRisk).toBeDefined();
    });
  });

  describe('assess_risk', () => {
    it('should assess document risk', async () => {
      const result = await toolHandlers.assess_risk({
        documentId: 'DOC_123',
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.assessment).toBeDefined();
    });
  });

  describe('check_compliance', () => {
    it('should check compliance', async () => {
      const result = await toolHandlers.check_compliance({
        documentId: 'DOC_123',
        framework: 'GDPR',
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.compliance).toBeDefined();
    });

    it('should handle missing framework', async () => {
      const result = await toolHandlers.check_compliance({
        documentId: 'DOC_123',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.compliance).toBeDefined();
    });
  });

  describe('ask_question', () => {
    it('should answer legal questions', async () => {
      const result = await toolHandlers.ask_question({
        question: 'What are the termination clauses?',
        context: 'Service Agreement',
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.answer).toBeDefined();
    });

    it('should handle general questions', async () => {
      const result = await toolHandlers.ask_question({
        question: 'What is GDPR?',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.answer).toBeDefined();
    });
  });
});
