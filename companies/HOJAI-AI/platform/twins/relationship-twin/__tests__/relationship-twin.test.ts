import { describe, it, expect } from 'vitest';

// Relationship Twin Constants
const RELATIONSHIP_TYPES = ['internal', 'external', 'customer', 'partner', 'vendor'];
const INTERACTION_TYPES = ['meeting', 'call', 'email', 'chat'];
const CONTACT_FREQUENCIES = ['daily', 'weekly', 'monthly', 'rarely'];
const RELATIONSHIP_STRENGTHS = ['weak', 'moderate', 'strong'];
const EDGE_TYPES = ['collaborates', 'reports-to', 'manages', 'influences', 'mentors'];
const SENTIMENTS = ['positive', 'negative', 'neutral'];

describe('Relationship Twin', () => {
  describe('Relationship Types', () => {
    it('should have all relationship types', () => {
      expect(RELATIONSHIP_TYPES).toContain('internal');
      expect(RELATIONSHIP_TYPES).toContain('external');
      expect(RELATIONSHIP_TYPES).toContain('customer');
      expect(RELATIONSHIP_TYPES).toContain('partner');
      expect(RELATIONSHIP_TYPES).toContain('vendor');
    });

    it('should have 5 relationship types', () => {
      expect(RELATIONSHIP_TYPES).toHaveLength(5);
    });
  });

  describe('Interaction Types', () => {
    it('should have all interaction types', () => {
      INTERACTION_TYPES.forEach(type => {
        expect(['meeting', 'call', 'email', 'chat']).toContain(type);
      });
    });
  });

  describe('Contact Frequency', () => {
    it('should have all contact frequencies', () => {
      expect(CONTACT_FREQUENCIES).toContain('daily');
      expect(CONTACT_FREQUENCIES).toContain('weekly');
      expect(CONTACT_FREQUENCIES).toContain('monthly');
      expect(CONTACT_FREQUENCIES).toContain('rarely');
    });
  });

  describe('Relationship Strengths', () => {
    it('should have all relationship strengths', () => {
      expect(RELATIONSHIP_STRENGTHS).toContain('weak');
      expect(RELATIONSHIP_STRENGTHS).toContain('moderate');
      expect(RELATIONSHIP_STRENGTHS).toContain('strong');
    });
  });

  describe('Edge Types', () => {
    it('should have all edge types', () => {
      expect(EDGE_TYPES).toContain('collaborates');
      expect(EDGE_TYPES).toContain('reports-to');
      expect(EDGE_TYPES).toContain('manages');
      expect(EDGE_TYPES).toContain('influences');
      expect(EDGE_TYPES).toContain('mentors');
    });
  });

  describe('Sentiments', () => {
    it('should have all sentiments', () => {
      expect(SENTIMENTS).toContain('positive');
      expect(SENTIMENTS).toContain('negative');
      expect(SENTIMENTS).toContain('neutral');
    });
  });

  describe('Relationship Strength Calculation', () => {
    const calculateStrength = (
      trust: number,
      sentiment: number,
      contactFrequency: string,
      interactionCount: number
    ): string => {
      const freqScore = contactFrequency === 'daily' ? 4 :
                       contactFrequency === 'weekly' ? 3 :
                       contactFrequency === 'monthly' ? 2 : 1;
      const score = (trust * 0.3) + (sentiment * 0.25 * 100) + (freqScore * 10) + (Math.min(interactionCount, 50) * 0.5);

      if (score > 80) return 'strong';
      if (score > 40) return 'moderate';
      return 'weak';
    };

    it('should return strong for high trust and frequent contact', () => {
      expect(calculateStrength(90, 0.8, 'daily', 100)).toBe('strong');
    });

    it('should return weak for low trust and rare contact', () => {
      expect(calculateStrength(20, -0.3, 'rarely', 2)).toBe('weak');
    });

    it('should return moderate for average values', () => {
      const strength = calculateStrength(50, 0, 'weekly', 20);
      expect(strength).toBe('moderate');
    });
  });

  describe('Influence Calculation', () => {
    const calculateInfluence = (
      networkSize: number,
      crossFunctionalConnections: number,
      keyTopicsCount: number,
      sentiment: number
    ): number => {
      const baseScore = Math.min(50, networkSize * 0.5);
      const diversityBonus = Math.min(25, crossFunctionalConnections * 5);
      const expertiseBonus = Math.min(15, keyTopicsCount * 3);
      const sentimentBonus = sentiment > 0 ? 10 : sentiment < 0 ? -10 : 0;

      return Math.max(0, Math.min(100, baseScore + diversityBonus + expertiseBonus + sentimentBonus));
    };

    it('should calculate high influence for well-connected person', () => {
      const influence = calculateInfluence(50, 10, 8, 0.8);
      expect(influence).toBeGreaterThan(80);
    });

    it('should calculate low influence for isolated person', () => {
      const influence = calculateInfluence(5, 1, 2, 0.1);
      expect(influence).toBeLessThan(30);
    });

    it('should cap at 100', () => {
      expect(calculateInfluence(100, 20, 15, 1)).toBe(100);
    });
  });

  describe('Sentiment Update', () => {
    const updateSentiment = (current: number, newSentiment: string): number => {
      const sentimentValue = newSentiment === 'positive' ? 1 :
                           newSentiment === 'negative' ? -1 : 0;
      return (current + sentimentValue) / 2;
    };

    it('should increase positive sentiment', () => {
      const newSentiment = updateSentiment(0.5, 'positive');
      expect(newSentiment).toBe(0.75);
    });

    it('should decrease negative sentiment', () => {
      const newSentiment = updateSentiment(0.5, 'negative');
      expect(newSentiment).toBe(0);
    });

    it('should keep neutral sentiment unchanged', () => {
      const newSentiment = updateSentiment(0.7, 'neutral');
      expect(newSentiment).toBe(0.35);
    });

    it('should handle edge cases', () => {
      expect(updateSentiment(1, 'positive')).toBe(1);
      expect(updateSentiment(-1, 'negative')).toBe(-1);
    });
  });

  describe('Contact Frequency Update', () => {
    const updateFrequency = (
      interactionCount: number,
      daysSinceFirst: number
    ): string => {
      const interactionsPerDay = interactionCount / Math.max(1, daysSinceFirst);

      if (interactionsPerDay >= 1) return 'daily';
      if (interactionsPerDay >= 1/7) return 'weekly';
      if (interactionsPerDay >= 1/30) return 'monthly';
      return 'rarely';
    };

    it('should return daily for very frequent interactions', () => {
      expect(updateFrequency(30, 10)).toBe('daily');
    });

    it('should return weekly for moderate interactions', () => {
      expect(updateFrequency(10, 60)).toBe('weekly');
    });

    it('should return monthly for occasional interactions', () => {
      expect(updateFrequency(3, 90)).toBe('monthly');
    });

    it('should return rarely for sparse interactions', () => {
      expect(updateFrequency(1, 100)).toBe('rarely');
    });
  });

  describe('Trust Calculation', () => {
    const calculateTrust = (
      followThroughRate: number,
      avgResponseTime: number, // in hours
      conflictResolutionScore: number,
      consistencyScore: number
    ): number => {
      const followThroughScore = followThroughRate * 30;
      const responseScore = Math.max(0, 25 - (avgResponseTime / 2));
      const conflictScore = conflictResolutionScore * 20;
      const consistencyScoreCalc = consistencyScore * 25;

      return Math.max(0, Math.min(100, followThroughScore + responseScore + conflictScore + consistencyScoreCalc));
    };

    it('should calculate high trust for reliable person', () => {
      const trust = calculateTrust(0.95, 2, 0.9, 0.85);
      expect(trust).toBeGreaterThan(85);
    });

    it('should calculate low trust for unreliable person', () => {
      const trust = calculateTrust(0.4, 72, 0.3, 0.4);
      expect(trust).toBeLessThan(40);
    });
  });

  describe('Network Diversity Score', () => {
    const calculateNetworkDiversity = (connections: Array<{ type: string }>): number => {
      const uniqueTypes = new Set(connections.map(c => c.type));
      const diversityRatio = uniqueTypes.size / RELATIONSHIP_TYPES.length;
      return Math.round(diversityRatio * 100);
    };

    it('should return 100 for connections to all types', () => {
      const connections = RELATIONSHIP_TYPES.map(type => ({ type }));
      expect(calculateNetworkDiversity(connections)).toBe(100);
    });

    it('should return lower score for homogeneous network', () => {
      const connections = [
        { type: 'internal' },
        { type: 'internal' },
        { type: 'internal' }
      ];
      expect(calculateNetworkDiversity(connections)).toBe(20); // 1/5 types
    });
  });

  describe('Relationship Health Score', () => {
    const calculateHealthScore = (
      trust: number,
      sentiment: number,
      strength: string,
      daysSinceLastContact: number
    ): number => {
      let score = trust * 0.3 + sentiment * 100 * 0.2;

      if (strength === 'strong') score += 30;
      else if (strength === 'moderate') score += 15;

      // Stale relationship penalty
      if (daysSinceLastContact > 30) score -= 20;
      else if (daysSinceLastContact > 14) score -= 10;

      return Math.max(0, Math.min(100, score));
    };

    it('should score high for strong active relationships', () => {
      const score = calculateHealthScore(90, 0.8, 'strong', 3);
      expect(score).toBeGreaterThan(80);
    });

    it('should penalize stale relationships', () => {
      const staleScore = calculateHealthScore(80, 0.6, 'strong', 45);
      const freshScore = calculateHealthScore(80, 0.6, 'strong', 5);
      expect(staleScore).toBeLessThan(freshScore);
    });
  });

  describe('Interaction Outcome Analysis', () => {
    const analyzeOutcome = (
      interactions: Array<{ outcome?: string; sentiment?: string }>
    ): { positive: number; neutral: number; negative: number; successRate: number } => {
      let positive = 0, neutral = 0, negative = 0;

      interactions.forEach(i => {
        if (i.sentiment === 'positive') positive++;
        else if (i.sentiment === 'negative') negative++;
        else neutral++;
      });

      const successRate = interactions.length > 0
        ? Math.round(((positive + neutral * 0.5) / interactions.length) * 100)
        : 0;

      return { positive, neutral, negative, successRate };
    };

    it('should analyze interaction outcomes correctly', () => {
      const interactions = [
        { sentiment: 'positive' },
        { sentiment: 'positive' },
        { sentiment: 'negative' },
        { sentiment: 'neutral' }
      ];
      const result = analyzeOutcome(interactions);
      expect(result.positive).toBe(2);
      expect(result.negative).toBe(1);
      expect(result.neutral).toBe(1);
      expect(result.successRate).toBe(62); // (2 + 0.5*1) / 4 = 62.5%
    });

    it('should handle empty interactions', () => {
      const result = analyzeOutcome([]);
      expect(result.successRate).toBe(0);
    });
  });

  describe('Key Topics Extraction', () => {
    const extractKeyTopics = (
      interactions: Array<{ subject?: string; outcome?: string }>
    ): string[] => {
      const topicCounts = new Map<string, number>();

      interactions.forEach(i => {
        const text = `${i.subject || ''} ${i.outcome || ''}`.toLowerCase();
        const words = text.split(/\s+/).filter(w => w.length > 3);
        words.forEach(word => {
          topicCounts.set(word, (topicCounts.get(word) || 0) + 1);
        });
      });

      return Array.from(topicCounts.entries())
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([topic]) => topic);
    };

    it('should extract recurring topics', () => {
      const interactions = [
        { subject: 'Project deadline discussion', outcome: 'Deadline extended' },
        { subject: 'Project status update', outcome: 'On track' },
        { subject: 'Budget review', outcome: 'Approved' }
      ];
      const topics = extractKeyTopics(interactions);
      expect(topics).toContain('project');
      expect(topics).toContain('deadline');
    });
  });
});
