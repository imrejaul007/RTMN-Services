import { describe, it, expect } from 'vitest';

// Memory Twin Constants
const MEMORY_TYPES = ['fact', 'experience', 'preference', 'context'];
const MEMORY_SOURCES = ['user', 'system', 'interaction', 'document', 'event'];
const MEMORY_TIERS = ['short_term', 'long_term', 'archived'];

describe('Memory Twin', () => {
  describe('Memory Types', () => {
    it('should have all memory types', () => {
      expect(MEMORY_TYPES).toContain('fact');
      expect(MEMORY_TYPES).toContain('experience');
      expect(MEMORY_TYPES).toContain('preference');
      expect(MEMORY_TYPES).toContain('context');
    });

    it('should have 4 memory types', () => {
      expect(MEMORY_TYPES).toHaveLength(4);
    });
  });

  describe('Memory Sources', () => {
    it('should have all memory sources', () => {
      MEMORY_SOURCES.forEach(source => {
        expect(['user', 'system', 'interaction', 'document', 'event']).toContain(source);
      });
    });
  });

  describe('Memory Tier Classification', () => {
    const getMemoryTier = (accessFrequency: number, ageInDays: number, importance: number): string => {
      const score = accessFrequency * 2 + importance - ageInDays * 0.1;
      if (score > 100 || (accessFrequency > 10 && ageInDays < 30)) return 'short_term';
      if (score > 0 || ageInDays < 365) return 'long_term';
      return 'archived';
    };

    it('should classify frequently accessed memories as short_term', () => {
      expect(getMemoryTier(20, 5, 80)).toBe('short_term');
    });

    it('should classify old low-importance memories as archived', () => {
      expect(getMemoryTier(1, 400, 10)).toBe('archived');
    });

    it('should classify moderate memories as long_term', () => {
      expect(getMemoryTier(5, 100, 50)).toBe('long_term');
    });
  });

  describe('Memory Confidence Calculation', () => {
    const calculateConfidence = (
      sourceReliability: number,
      reinforcementCount: number,
      contradictionCount: number
    ): number => {
      let confidence = sourceReliability;
      confidence += Math.min(20, reinforcementCount * 5);
      confidence -= Math.min(30, contradictionCount * 15);
      return Math.max(0, Math.min(100, confidence));
    };

    it('should increase confidence with reinforcement', () => {
      const base = calculateConfidence(60, 0, 0);
      const reinforced = calculateConfidence(60, 3, 0);
      expect(reinforced).toBeGreaterThan(base);
    });

    it('should decrease confidence with contradictions', () => {
      const base = calculateConfidence(80, 0, 0);
      const contradicted = calculateConfidence(80, 0, 2);
      expect(contradicted).toBeLessThan(base);
    });

    it('should cap at 100', () => {
      expect(calculateConfidence(100, 10, 0)).toBe(100);
    });

    it('should floor at 0', () => {
      expect(calculateConfidence(20, 0, 5)).toBe(0);
    });
  });

  describe('Memory Search Scoring', () => {
    const scoreSearchResult = (memory: { content: string; tags: string[] }, query: string): number => {
      const q = query.toLowerCase();
      let score = 0;
      if (memory.content.toLowerCase().includes(q)) score += 10;
      if (memory.tags.some(t => t.toLowerCase().includes(q))) score += 5;
      return score;
    };

    it('should score content matches higher than tag matches', () => {
      const memory = { content: 'Meeting with John tomorrow', tags: ['meeting', 'john'] };
      const contentScore = scoreSearchResult(memory, 'meeting');
      const tagScore = scoreSearchResult(memory, 'john');
      expect(contentScore).toBe(10);
      expect(tagScore).toBe(5);
    });

    it('should return 0 for no match', () => {
      const memory = { content: 'Project deadline Friday', tags: ['project'] };
      expect(scoreSearchResult(memory, 'budget')).toBe(0);
    });
  });

  describe('Memory Consolidation', () => {
    const consolidateMemories = (memories: Array<{ content: string; confidence: number; type: string }>): {
      consolidated: number;
      discarded: number;
      avgConfidence: number;
    } => {
      const similar = new Map<string, { count: number; totalConfidence: number }>();

      memories.forEach(m => {
        const key = m.content.substring(0, 20).toLowerCase();
        const existing = similar.get(key) || { count: 0, totalConfidence: 0 };
        existing.count++;
        existing.totalConfidence += m.confidence;
        similar.set(key, existing);
      });

      const consolidated = Array.from(similar.values()).filter(v => v.count > 1).length;
      const discarded = memories.length - consolidated;
      const avgConfidence = memories.length > 0
        ? memories.reduce((sum, m) => sum + m.confidence, 0) / memories.length
        : 0;

      return { consolidated, discarded, avgConfidence };
    };

    it('should identify similar memories for consolidation', () => {
      const memories = [
        { content: 'Meeting scheduled', confidence: 80, type: 'fact' },
        { content: 'Meeting rescheduled', confidence: 90, type: 'fact' },
        { content: 'Call at 3pm', confidence: 70, type: 'fact' }
      ];
      const result = consolidateMemories(memories);
      expect(result.consolidated).toBe(1); // Meeting vs Meeting
      expect(result.discarded).toBe(2);
    });
  });

  describe('Memory Expiration', () => {
    const shouldExpire = (createdAt: string, confidence: number, accessCount: number): boolean => {
      const age = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const lowConfidenceExpiry = confidence < 30 && age > 90;
      const unusedExpiry = accessCount === 0 && age > 180;
      const archivedTier = confidence < 20 && age > 365;
      return lowConfidenceExpiry || unusedExpiry || archivedTier;
    };

    it('should expire low confidence old memories', () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
      expect(shouldExpire(oldDate, 20, 0)).toBe(true);
    });

    it('should not expire high confidence recent memories', () => {
      const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      expect(shouldExpire(recentDate, 90, 10)).toBe(false);
    });

    it('should expire unused memories after 180 days', () => {
      const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
      expect(shouldExpire(oldDate, 50, 0)).toBe(true);
    });
  });

  describe('Memory Importance Scoring', () => {
    const calculateImportance = (
      emotionalSignificance: number,
      relevanceToGoals: number,
      frequencyOfRecall: number,
      businessImpact: number
    ): number => {
      return Math.round(
        emotionalSignificance * 0.15 +
        relevanceToGoals * 0.30 +
        frequencyOfRecall * 0.25 +
        businessImpact * 0.30
      );
    };

    it('should weight goals and business impact heavily', () => {
      const highBusiness = calculateImportance(20, 90, 10, 90);
      const highEmotional = calculateImportance(90, 20, 10, 20);
      expect(highBusiness).toBeGreaterThan(highEmotional);
    });

    it('should return score between 0 and 100', () => {
      const score = calculateImportance(50, 50, 50, 50);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Cross-Reference Generation', () => {
    const generateCrossReferences = (memories: Array<{ tags: string[]; content: string }>): string[] => {
      const tagMap = new Map<string, number>();

      memories.forEach(m => {
        m.tags.forEach(tag => {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
        });
      });

      return Array.from(tagMap.entries())
        .filter(([_, count]) => count > 1)
        .map(([tag]) => tag)
        .sort();
    };

    it('should identify tags shared across multiple memories', () => {
      const memories = [
        { tags: ['project', 'deadline'], content: 'Project deadline tomorrow' },
        { tags: ['project', 'status'], content: 'Project status update' },
        { tags: ['meeting', 'notes'], content: 'Meeting notes' }
      ];
      const refs = generateCrossReferences(memories);
      expect(refs).toContain('project');
      expect(refs).not.toContain('meeting');
    });

    it('should return empty for unique tags', () => {
      const memories = [
        { tags: ['alpha'], content: 'Alpha info' },
        { tags: ['beta'], content: 'Beta info' }
      ];
      expect(generateCrossReferences(memories)).toHaveLength(0);
    });
  });
});
