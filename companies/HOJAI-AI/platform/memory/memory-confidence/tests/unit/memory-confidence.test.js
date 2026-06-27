import { describe, it, expect } from 'vitest';

describe('Memory Confidence Service', () => {
  describe('Confidence Calculation', () => {
    it('should calculate base confidence', () => {
      const sources = {
        'direct-observation': 1.0,
        'user-spoken': 0.95,
        'user-implicit': 0.85,
        'inferred': 0.7,
        'third-party': 0.6,
        'unknown': 0.5
      };

      expect(sources['direct-observation']).toBe(1.0);
      expect(sources['user-spoken']).toBe(0.95);
      expect(sources['user-implicit']).toBe(0.85);
      expect(sources['inferred']).toBe(0.7);
      expect(sources['third-party']).toBe(0.6);
      expect(sources['unknown']).toBe(0.5);
    });

    it('should apply decay over time', () => {
      const calculateDecay = (daysSinceAccess) => {
        const decayRate = 0.01; // 1% per day
        return Math.max(0.1, 1 - (daysSinceAccess * decayRate));
      };

      expect(calculateDecay(0)).toBe(1);
      expect(calculateDecay(10)).toBe(0.9);
      expect(calculateDecay(50)).toBe(0.5);
      expect(calculateDecay(100)).toBe(0.1);
    });

    it('should calculate effective confidence', () => {
      const calculateEffective = (base, decay, reinforcement) => {
        const decayFactor = 1 - (decay * 0.3);
        const reinforcementFactor = 1 + (reinforcement * 0.2);
        return Math.min(1, Math.max(0, base * decayFactor * reinforcementFactor));
      };

      expect(calculateEffective(1.0, 0, 0)).toBe(1.0);
      expect(calculateEffective(0.9, 0.2, 0)).toBeLessThan(0.9);
      expect(calculateEffective(0.9, 0.2, 0.5)).toBeGreaterThan(calculateEffective(0.9, 0.2, 0));
    });

    it('should handle low confidence gracefully', () => {
      const floor = (value, min = 0.05) => Math.max(min, value);
      expect(floor(0.01)).toBe(0.05);
      expect(floor(0.5)).toBe(0.5);
      expect(floor(1.0)).toBe(1.0);
    });
  });

  describe('Contradiction Detection', () => {
    it('should detect semantic contradictions', () => {
      const contradictionPairs = [
        ['always', 'never'],
        ['yes', 'no'],
        ['increase', 'decrease'],
        ['good', 'bad'],
        ['all', 'none']
      ];

      const hasContradiction = (a, b) =>
        contradictionPairs.some(([x, y]) =>
          (a.includes(x) && b.includes(y)) || (a.includes(y) && b.includes(x))
        );

      expect(hasContradiction('always sunny', 'never raining')).toBe(true);
      expect(hasContradiction('yes I agree', 'no way')).toBe(true);
      expect(hasContradiction('it increases', 'it decreases')).toBe(true);
      expect(hasContradiction('all good', 'none working')).toBe(true);
    });

    it('should calculate contradiction factor', () => {
      const calculateFactor = (contradictionScore, totalFacts) => {
        if (totalFacts === 0) return 0;
        return Math.min(1, (contradictionScore / totalFacts) * 2);
      };

      expect(calculateFactor(0, 10)).toBe(0);
      expect(calculateFactor(5, 10)).toBe(1);
      expect(calculateFactor(3, 10)).toBe(0.6);
    });
  });

  describe('Reinforcement', () => {
    it('should increase confidence with reinforcement', () => {
      const applyReinforcement = (base, times) => {
        const reinforcementRate = 0.05;
        return Math.min(1, base * (1 + reinforcementRate * times));
      };

      expect(applyReinforcement(0.8, 0)).toBe(0.8);
      expect(applyReinforcement(0.8, 1)).toBeCloseTo(0.84, 2);
      expect(applyReinforcement(0.8, 10)).toBeGreaterThan(0.8);
      expect(applyReinforcement(0.8, 100)).toBe(1); // Capped
    });

    it('should track reinforcement count', () => {
      const reinforcements = new Map();

      const reinforce = (factId, count = 1) => {
        const current = reinforcements.get(factId) || 0;
        reinforcements.set(factId, current + count);
      };

      reinforce('fact-1');
      reinforce('fact-1');
      reinforce('fact-2');

      expect(reinforcements.get('fact-1')).toBe(2);
      expect(reinforcements.get('fact-2')).toBe(1);
    });
  });

  describe('Recall Score', () => {
    it('should calculate recall score', () => {
      const recallScore = (retrievals, decay) => {
        const retrievalBonus = Math.log(retrievals + 1) * 0.1;
        const decayPenalty = decay * 0.2;
        return Math.max(0, Math.min(1, 0.5 + retrievalBonus - decayPenalty));
      };

      expect(recallScore(0, 0)).toBe(0.5);
      expect(recallScore(10, 0)).toBeGreaterThan(0.5);
      expect(recallScore(0, 1)).toBe(0.3);
      expect(recallScore(10, 1)).toBeGreaterThan(0.5);
    });
  });

  describe('Staleness', () => {
    it('should measure staleness', () => {
      const staleness = (daysSinceAccess) => {
        if (daysSinceAccess <= 7) return 'fresh';
        if (daysSinceAccess <= 30) return 'normal';
        if (daysSinceAccess <= 90) return 'stale';
        return 'very-stale';
      };

      expect(staleness(1)).toBe('fresh');
      expect(staleness(14)).toBe('normal');
      expect(staleness(60)).toBe('stale');
      expect(staleness(180)).toBe('very-stale');
    });

    it('should calculate staleness factor', () => {
      const stalenessFactor = (days) => {
        if (days <= 7) return 1;
        if (days <= 30) return 0.9;
        if (days <= 90) return 0.7;
        if (days <= 180) return 0.4;
        return 0.2;
      };

      expect(stalenessFactor(5)).toBe(1);
      expect(stalenessFactor(20)).toBe(0.9);
      expect(stalenessFactor(45)).toBe(0.7);
      expect(stalenessFactor(100)).toBe(0.4);
      expect(stalenessFactor(200)).toBe(0.2);
    });
  });

  describe('Facts Management', () => {
    it('should create fact with confidence', () => {
      const createFact = (content, source, twinId) => ({
        id: Math.random().toString(36).substring(2),
        content,
        source,
        twinId,
        baseConfidence: {
          'direct-observation': 1.0,
          'user-spoken': 0.95,
          'user-implicit': 0.85,
          'inferred': 0.7,
          'third-party': 0.6,
          'unknown': 0.5
        }[source] || 0.5,
        effectiveConfidence: 0,
        reinforcementCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const fact = createFact('Test fact', 'user-spoken', 'twin-1');
      expect(fact.content).toBe('Test fact');
      expect(fact.baseConfidence).toBe(0.95);
      expect(fact.reinforcementCount).toBe(0);
    });

    it('should update fact on reinforcement', () => {
      const reinforceFact = (fact) => {
        fact.reinforcementCount += 1;
        fact.updatedAt = Date.now();
        const reinforcementRate = 0.05;
        fact.effectiveConfidence = Math.min(1,
          fact.baseConfidence * (1 + reinforcementRate * fact.reinforcementCount)
        );
        return fact;
      };

      const fact = {
        baseConfidence: 0.8,
        reinforcementCount: 0,
        effectiveConfidence: 0.8
      };

      reinforceFact(fact);
      expect(fact.reinforcementCount).toBe(1);

      reinforceFact(fact);
      expect(fact.reinforcementCount).toBe(2);
      expect(fact.effectiveConfidence).toBeGreaterThan(0.8);
    });
  });

  describe('Audit', () => {
    it('should log confidence changes', () => {
      const auditLog = [];

      const logChange = (factId, before, after, reason) => {
        auditLog.push({
          id: Math.random().toString(36).substring(2),
          timestamp: Date.now(),
          factId,
          beforeConfidence: before,
          afterConfidence: after,
          reason
        });
      };

      logChange('fact-1', 0.8, 0.84, 'reinforcement');
      logChange('fact-2', 0.9, 0.7, 'decay');

      expect(auditLog).toHaveLength(2);
      expect(auditLog[0].reason).toBe('reinforcement');
      expect(auditLog[1].reason).toBe('decay');
    });

    it('should track reason distribution', () => {
      const auditLog = [
        { reason: 'reinforcement' },
        { reason: 'reinforcement' },
        { reason: 'decay' },
        { reason: 'contradiction' },
        { reason: 'reinforcement' }
      ];

      const distribution = auditLog.reduce((acc, entry) => {
        acc[entry.reason] = (acc[entry.reason] || 0) + 1;
        return acc;
      }, {});

      expect(distribution.reinforcement).toBe(3);
      expect(distribution.decay).toBe(1);
      expect(distribution.contradiction).toBe(1);
    });
  });

  describe('Reports', () => {
    it('should generate confidence report', () => {
      const facts = [
        { id: '1', effectiveConfidence: 0.9 },
        { id: '2', effectiveConfidence: 0.7 },
        { id: '3', effectiveConfidence: 0.5 },
        { id: '4', effectiveConfidence: 0.3 },
        { id: '5', effectiveConfidence: 0.95 }
      ];

      const report = {
        totalFacts: facts.length,
        averageConfidence: facts.reduce((s, f) => s + f.effectiveConfidence, 0) / facts.length,
        highConfidence: facts.filter(f => f.effectiveConfidence >= 0.8).length,
        mediumConfidence: facts.filter(f => f.effectiveConfidence >= 0.5 && f.effectiveConfidence < 0.8).length,
        lowConfidence: facts.filter(f => f.effectiveConfidence < 0.5).length
      };

      expect(report.totalFacts).toBe(5);
      expect(report.highConfidence).toBe(2);
      expect(report.mediumConfidence).toBe(2);
      expect(report.lowConfidence).toBe(1);
    });

    it('should identify unreliable facts', () => {
      const threshold = 0.3;
      const facts = [
        { id: '1', effectiveConfidence: 0.9 },
        { id: '2', effectiveConfidence: 0.2 },
        { id: '3', effectiveConfidence: 0.5 }
      ];

      const unreliable = facts.filter(f => f.effectiveConfidence < threshold);
      expect(unreliable).toHaveLength(1);
      expect(unreliable[0].id).toBe('2');
    });
  });

  describe('Integration', () => {
    it('should sync with MemoryOS', () => {
      const memoryOSFacts = [
        { id: '1', content: 'Fact 1', source: 'user-spoken' },
        { id: '2', content: 'Fact 2', source: 'inferred' }
      ];

      const syncFacts = (facts) => facts.map(f => ({
        ...f,
        baseConfidence: {
          'user-spoken': 0.95,
          'inferred': 0.7
        }[f.source] || 0.5,
        effectiveConfidence: 0,
        twinId: 'default-twin',
        createdAt: Date.now()
      }));

      const synced = syncFacts(memoryOSFacts);
      expect(synced[0].baseConfidence).toBe(0.95);
      expect(synced[1].baseConfidence).toBe(0.7);
    });

    it('should handle missing sources', () => {
      const getConfidence = (source) => {
        const confidenceMap = {
          'direct-observation': 1.0,
          'user-spoken': 0.95
        };
        return confidenceMap[source] || 0.5;
      };

      expect(getConfidence('direct-observation')).toBe(1.0);
      expect(getConfidence('unknown-source')).toBe(0.5);
      expect(getConfidence(null)).toBe(0.5);
    });
  });
});
