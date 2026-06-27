import { describe, it, expect } from 'vitest';

// Mock constants from knowledge-twin
const KNOWLEDGE_TYPES = ['procedural', 'declarative', 'tacit', 'explicit'];
const KNOWLEDGE_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];
const KNOWLEDGE_SOURCES = ['document', 'training', 'experience', 'certification'];
const PRIORITY_LEVELS = ['low', 'medium', 'high', 'critical'];
const EXPERTISE_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert', 'thought-leader'];

describe('Knowledge Twin', () => {
  describe('Knowledge Types', () => {
    it('should have all knowledge types', () => {
      expect(KNOWLEDGE_TYPES).toContain('procedural');
      expect(KNOWLEDGE_TYPES).toContain('declarative');
      expect(KNOWLEDGE_TYPES).toContain('tacit');
      expect(KNOWLEDGE_TYPES).toContain('explicit');
    });

    it('should have 4 knowledge types', () => {
      expect(KNOWLEDGE_TYPES).toHaveLength(4);
    });
  });

  describe('Knowledge Levels', () => {
    it('should have all proficiency levels', () => {
      expect(KNOWLEDGE_LEVELS).toContain('beginner');
      expect(KNOWLEDGE_LEVELS).toContain('intermediate');
      expect(KNOWLEDGE_LEVELS).toContain('advanced');
      expect(KNOWLEDGE_LEVELS).toContain('expert');
    });

    it('should have 4 proficiency levels', () => {
      expect(KNOWLEDGE_LEVELS).toHaveLength(4);
    });
  });

  describe('Knowledge Sources', () => {
    it('should have all knowledge sources', () => {
      expect(KNOWLEDGE_SOURCES).toContain('document');
      expect(KNOWLEDGE_SOURCES).toContain('training');
      expect(KNOWLEDGE_SOURCES).toContain('experience');
      expect(KNOWLEDGE_SOURCES).toContain('certification');
    });
  });

  describe('Priority Levels', () => {
    it('should have all priority levels', () => {
      PRIORITY_LEVELS.forEach(level => {
        expect(['low', 'medium', 'high', 'critical']).toContain(level);
      });
    });
  });

  describe('Expertise Levels', () => {
    it('should have all expertise levels including thought-leader', () => {
      expect(EXPERTISE_LEVELS).toContain('thought-leader');
      expect(EXPERTISE_LEVELS).toHaveLength(5);
    });
  });

  describe('Knowledge Node Validation', () => {
    const validateKnowledgeNode = (node: {
      concept?: string;
      type?: string;
      category?: string;
      level?: string;
      confidence?: number;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!node.concept) {
        errors.push('concept is required');
      }

      if (node.type && !KNOWLEDGE_TYPES.includes(node.type)) {
        errors.push(`Invalid knowledge type: ${node.type}`);
      }

      if (node.level && !KNOWLEDGE_LEVELS.includes(node.level)) {
        errors.push(`Invalid level: ${node.level}`);
      }

      if (node.confidence !== undefined && (node.confidence < 0 || node.confidence > 100)) {
        errors.push('confidence must be between 0 and 100');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct knowledge node', () => {
      const result = validateKnowledgeNode({
        concept: 'TypeScript',
        type: 'explicit',
        category: 'programming',
        level: 'advanced',
        confidence: 85
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require concept', () => {
      const result = validateKnowledgeNode({ type: 'explicit' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('concept is required');
    });

    it('should reject invalid knowledge type', () => {
      const result = validateKnowledgeNode({ concept: 'Test', type: 'invalid' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid knowledge type: invalid');
    });

    it('should reject invalid level', () => {
      const result = validateKnowledgeNode({ concept: 'Test', level: 'master' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid level: master');
    });

    it('should reject invalid confidence', () => {
      const result = validateKnowledgeNode({ concept: 'Test', confidence: 150 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('confidence must be between 0 and 100');
    });
  });

  describe('Expertise Validation', () => {
    const validateExpertise = (expertise: {
      domain?: string;
      level?: string;
      yearsExperience?: number;
      confidence?: number;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!expertise.domain) {
        errors.push('domain is required');
      }

      if (expertise.level && !EXPERTISE_LEVELS.includes(expertise.level)) {
        errors.push(`Invalid expertise level: ${expertise.level}`);
      }

      if (expertise.yearsExperience !== undefined && expertise.yearsExperience < 0) {
        errors.push('yearsExperience cannot be negative');
      }

      if (expertise.confidence !== undefined && (expertise.confidence < 0 || expertise.confidence > 100)) {
        errors.push('confidence must be between 0 and 100');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct expertise', () => {
      const result = validateExpertise({
        domain: 'Software Engineering',
        level: 'expert',
        yearsExperience: 10,
        confidence: 95
      });
      expect(result.valid).toBe(true);
    });

    it('should require domain', () => {
      const result = validateExpertise({ level: 'expert' });
      expect(result.valid).toBe(false);
    });
  });

  describe('Knowledge Gap Validation', () => {
    const validateKnowledgeGap = (gap: {
      topic?: string;
      priority?: string;
      currentLevel?: string;
      desiredLevel?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!gap.topic) {
        errors.push('topic is required');
      }

      if (gap.priority && !PRIORITY_LEVELS.includes(gap.priority)) {
        errors.push(`Invalid priority: ${gap.priority}`);
      }

      if (gap.currentLevel && !KNOWLEDGE_LEVELS.includes(gap.currentLevel) && gap.currentLevel !== 'none') {
        errors.push(`Invalid current level: ${gap.currentLevel}`);
      }

      if (gap.desiredLevel && !EXPERTISE_LEVELS.includes(gap.desiredLevel)) {
        errors.push(`Invalid desired level: ${gap.desiredLevel}`);
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct gap', () => {
      const result = validateKnowledgeGap({
        topic: 'Machine Learning',
        priority: 'high',
        currentLevel: 'beginner',
        desiredLevel: 'advanced'
      });
      expect(result.valid).toBe(true);
    });

    it('should require topic', () => {
      const result = validateKnowledgeGap({ priority: 'high' });
      expect(result.valid).toBe(false);
    });

    it('should accept "none" as current level', () => {
      const result = validateKnowledgeGap({ topic: 'New Topic', currentLevel: 'none' });
      expect(result.valid).toBe(true);
    });
  });

  describe('Knowledge Query Scoring', () => {
    const calculateRelevanceScore = (node: {
      concept: string;
      description: string;
      tags: string[];
      category: string;
    }, query: string): number => {
      const q = query.toLowerCase();
      let score = 0;

      if (node.concept.toLowerCase().includes(q)) score += 10;
      if (node.description.toLowerCase().includes(q)) score += 5;
      if (node.tags.some(t => t.toLowerCase().includes(q))) score += 3;
      if (node.category.toLowerCase().includes(q)) score += 2;

      return score;
    };

    it('should give highest score for concept match', () => {
      const node = {
        concept: 'TypeScript',
        description: 'A typed superset of JavaScript',
        tags: ['programming', 'javascript'],
        category: 'languages'
      };
      const score = calculateRelevanceScore(node, 'typescript');
      expect(score).toBe(10);
    });

    it('should give medium score for description match', () => {
      const node = {
        concept: 'Python',
        description: 'A programming language',
        tags: ['programming'],
        category: 'languages'
      };
      const score = calculateRelevanceScore(node, 'programming');
      expect(score).toBe(7); // 5 (description) + 2 (category)
    });

    it('should give lower score for tag match only', () => {
      const node = {
        concept: 'React',
        description: 'A UI library',
        tags: ['frontend', 'javascript'],
        category: 'frameworks'
      };
      const score = calculateRelevanceScore(node, 'javascript');
      expect(score).toBe(3); // 3 (tag) only
    });

    it('should return 0 for no match', () => {
      const node = {
        concept: 'SQL',
        description: 'Database language',
        tags: ['database'],
        category: 'languages'
      };
      const score = calculateRelevanceScore(node, 'python');
      expect(score).toBe(0);
    });
  });

  describe('Confidence Calculation', () => {
    const calculateNodeConfidence = (
      usageCount: number,
      teachingAbility: number,
      isVerified: boolean,
      yearsOfKnowledge: number
    ): number => {
      let confidence = 30; // Base

      // Usage factor
      confidence += Math.min(20, usageCount * 2);

      // Teaching ability
      confidence += Math.round(teachingAbility * 0.2);

      // Verification bonus
      if (isVerified) confidence += 15;

      // Experience bonus
      confidence += Math.min(15, yearsOfKnowledge * 3);

      return Math.min(100, confidence);
    };

    it('should calculate high confidence for experienced verified expert', () => {
      const confidence = calculateNodeConfidence(50, 90, true, 10);
      expect(confidence).toBe(100);
    });

    it('should calculate medium confidence for new node', () => {
      const confidence = calculateNodeConfidence(5, 50, false, 1);
      expect(confidence).toBeLessThan(60);
    });

    it('should cap at 100', () => {
      const confidence = calculateNodeConfidence(100, 100, true, 20);
      expect(confidence).toBe(100);
    });
  });

  describe('Knowledge Stats', () => {
    const calculateKnowledgeStats = (nodes: Array<{
      category: string;
      confidence: number;
      level: string;
    }>) => {
      const categories = [...new Set(nodes.map(n => n.category))];
      const avgConfidence = nodes.length > 0
        ? nodes.reduce((sum, n) => sum + n.confidence, 0) / nodes.length
        : 0;

      const levelDistribution = nodes.reduce((acc, n) => {
        acc[n.level] = (acc[n.level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalNodes: nodes.length,
        categories: categories.length,
        avgConfidence: Math.round(avgConfidence),
        levelDistribution
      };
    };

    it('should calculate correct stats', () => {
      const nodes = [
        { category: 'programming', confidence: 90, level: 'expert' },
        { category: 'programming', confidence: 70, level: 'intermediate' },
        { category: 'design', confidence: 60, level: 'advanced' }
      ];
      const stats = calculateKnowledgeStats(nodes);
      expect(stats.totalNodes).toBe(3);
      expect(stats.categories).toBe(2);
      expect(stats.avgConfidence).toBe(73);
      expect(stats.levelDistribution['expert']).toBe(1);
    });

    it('should handle empty nodes', () => {
      const stats = calculateKnowledgeStats([]);
      expect(stats.totalNodes).toBe(0);
      expect(stats.categories).toBe(0);
      expect(stats.avgConfidence).toBe(0);
    });
  });

  describe('Skill Gap Priority', () => {
    const calculateGapPriority = (
      currentLevel: string,
      desiredLevel: string,
      businessImpact: number
    ): string => {
      const levels = ['beginner', 'intermediate', 'advanced', 'expert', 'thought-leader'];
      const gap = levels.indexOf(desiredLevel) - levels.indexOf(currentLevel);

      if (gap >= 2 || businessImpact > 8) return 'critical';
      if (gap >= 1 || businessImpact > 5) return 'high';
      if (gap > 0 || businessImpact > 2) return 'medium';
      return 'low';
    };

    it('should return critical for large gap with high impact', () => {
      expect(calculateGapPriority('beginner', 'expert', 9)).toBe('critical');
    });

    it('should return high for single level gap', () => {
      expect(calculateGapPriority('intermediate', 'advanced', 6)).toBe('high');
    });

    it('should return medium for small gap', () => {
      expect(calculateGapPriority('advanced', 'expert', 3)).toBe('medium');
    });

    it('should return low for no gap', () => {
      expect(calculateGapPriority('expert', 'expert', 1)).toBe('low');
    });
  });
});
