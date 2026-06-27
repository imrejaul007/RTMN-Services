import { describe, it, expect, beforeEach } from 'vitest';

const SUGGESTION_TYPES = { PERFORMANCE: 'performance', COST: 'cost', RELIABILITY: 'reliability' };
const PRIORITY = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high' };

const createService = () => {
  const patterns = new Map();

  const analyzeWorkflow = (workflowId, def) => {
    const nodes = def?.nodes || [];
    const analysis = { workflowId, score: 100, issues: [], suggestions: [], metrics: {} };

    if (nodes.length > 20) {
      analysis.score -= 10;
      analysis.issues.push({ type: 'complexity' });
      analysis.suggestions.push({ type: SUGGESTION_TYPES.PERFORMANCE, priority: PRIORITY.MEDIUM, title: 'Reduce complexity' });
    }

    const noErrorHandling = nodes.filter(n => !n.errorHandling && n.type === 'task');
    if (noErrorHandling.length > 0) {
      analysis.score -= 15;
      analysis.issues.push({ type: 'error_handling' });
    }

    const apiSteps = nodes.filter(n => n.type === 'api');
    if (apiSteps.length > 5) {
      analysis.suggestions.push({ type: SUGGESTION_TYPES.COST, priority: PRIORITY.MEDIUM });
    }

    analysis.metrics = {
      nodeCount: nodes.length,
      estimatedDuration: nodes.reduce((sum, n) => sum + (n.estimatedDuration || 100), 0),
      estimatedCost: nodes.reduce((sum, n) => sum + (n.estimatedCost || 0.001), 0),
    };

    return analysis;
  };

  const autoHeal = (workflowId, error) => {
    const heals = [];
    if (error.type === 'timeout') {
      heals.push({ action: 'add_timeout', confidence: 0.9 });
      heals.push({ action: 'increase_retry', confidence: 0.85 });
    }
    if (error.type === 'api_error') {
      heals.push({ action: 'add_circuit_breaker', confidence: 0.8 });
    }
    if (error.type === 'validation_error') {
      heals.push({ action: 'add_validation', confidence: 0.95 });
    }
    return { workflowId, heals };
  };

  const optimizeForPerformance = (def) => {
    const changes = [];
    const parallelizable = def?.nodes?.filter(n => !n.dependencies?.length && n.type === 'task') || [];
    if (parallelizable.length > 1) {
      changes.push({ type: 'parallelization', impact: '60% faster' });
    }
    const cacheable = def?.nodes?.filter(n => ['api', 'http'].includes(n.type)) || [];
    if (cacheable.length > 0) {
      changes.push({ type: 'caching', impact: '40% faster' });
    }
    return { changes };
  };

  const optimizeForCost = (def) => {
    const changes = [];
    const apiCalls = def?.nodes?.filter(n => n.type === 'api') || [];
    if (apiCalls.length > 5) {
      changes.push({ type: 'batch_apis', impact: '50% cost reduction' });
    }
    return { changes, estimatedSavings: changes.length * 0.1 };
  };

  const learnFromExecution = (execution) => {
    const patternId = `${execution.workflowId}_${execution.status}`;
    if (!patterns.has(patternId)) {
      patterns.set(patternId, { id: patternId, workflowId: execution.workflowId, status: execution.status, occurrences: 0, avgDuration: 0 });
    }
    const pattern = patterns.get(patternId);
    pattern.occurrences++;
    pattern.avgDuration = (pattern.avgDuration * (pattern.occurrences - 1) + (execution.duration || 0)) / pattern.occurrences;
    return pattern;
  };

  const getPatterns = (workflowId) => {
    const result = [];
    for (const p of patterns.values()) {
      if (!workflowId || p.workflowId === workflowId) result.push(p);
    }
    return result;
  };

  return { analyzeWorkflow, autoHeal, optimizeForPerformance, optimizeForCost, learnFromExecution, getPatterns, patterns };
};

describe('AI Optimizer', () => {
  let service;

  beforeEach(() => { service = createService(); });

  describe('analyzeWorkflow', () => {
    it('should analyze simple workflow with high score', () => {
      const def = { nodes: [{ id: 'step1', type: 'task', errorHandling: true }] };
      const analysis = service.analyzeWorkflow('wf-1', def);
      expect(analysis.score).toBe(100);
      expect(analysis.issues.length).toBe(0);
    });

    it('should detect complex workflows', () => {
      const nodes = Array.from({ length: 25 }, (_, i) => ({ id: `step${i}`, type: 'task' }));
      const analysis = service.analyzeWorkflow('wf-1', { nodes });
      expect(analysis.score).toBeLessThan(100);
      expect(analysis.issues.some(i => i.type === 'complexity')).toBe(true);
    });

    it('should flag missing error handling', () => {
      const nodes = [{ id: 'step1', type: 'task' }, { id: 'step2', type: 'task' }];
      const analysis = service.analyzeWorkflow('wf-1', { nodes });
      expect(analysis.issues.some(i => i.type === 'error_handling')).toBe(true);
    });

    it('should not penalize nodes with error handling', () => {
      const nodes = [{ id: 'step1', type: 'task', errorHandling: true }];
      const analysis = service.analyzeWorkflow('wf-1', { nodes });
      expect(analysis.issues.filter(i => i.type === 'error_handling').length).toBe(0);
    });

    it('should suggest optimization for many API calls', () => {
      const nodes = Array.from({ length: 10 }, (_, i) => ({ id: `step${i}`, type: 'api' }));
      const analysis = service.analyzeWorkflow('wf-1', { nodes });
      expect(analysis.suggestions.some(s => s.type === SUGGESTION_TYPES.COST)).toBe(true);
    });

    it('should calculate metrics', () => {
      const nodes = [
        { id: 'step1', estimatedDuration: 100, estimatedCost: 0.01 },
        { id: 'step2', estimatedDuration: 200, estimatedCost: 0.02 },
      ];
      const analysis = service.analyzeWorkflow('wf-1', { nodes });
      expect(analysis.metrics.nodeCount).toBe(2);
      expect(analysis.metrics.estimatedDuration).toBe(300);
      expect(analysis.metrics.estimatedCost).toBeCloseTo(0.03);
    });
  });

  describe('autoHeal', () => {
    it('should heal timeout errors', () => {
      const heal = service.autoHeal('wf-1', { type: 'timeout', message: 'Request timeout' });
      expect(heal.heals.some(h => h.action === 'add_timeout')).toBe(true);
      expect(heal.heals.some(h => h.action === 'increase_retry')).toBe(true);
    });

    it('should heal API errors', () => {
      const heal = service.autoHeal('wf-1', { type: 'api_error', message: 'API failed' });
      expect(heal.heals.some(h => h.action === 'add_circuit_breaker')).toBe(true);
    });

    it('should heal validation errors', () => {
      const heal = service.autoHeal('wf-1', { type: 'validation_error', message: 'Invalid input' });
      expect(heal.heals.some(h => h.action === 'add_validation')).toBe(true);
    });

    it('should provide high confidence for validation fixes', () => {
      const heal = service.autoHeal('wf-1', { type: 'validation_error' });
      const validation = heal.heals.find(h => h.action === 'add_validation');
      expect(validation.confidence).toBeGreaterThan(0.9);
    });

    it('should return empty heals for unknown error type', () => {
      const heal = service.autoHeal('wf-1', { type: 'unknown_error' });
      expect(heal.heals.length).toBe(0);
    });
  });

  describe('optimizeForPerformance', () => {
    it('should suggest parallelization', () => {
      const nodes = [
        { id: 'step1', type: 'task' },
        { id: 'step2', type: 'task' },
        { id: 'step3', type: 'task' },
      ];
      const result = service.optimizeForPerformance({ nodes });
      expect(result.changes.some(c => c.type === 'parallelization')).toBe(true);
    });

    it('should suggest caching for API calls', () => {
      const nodes = [{ id: 'api1', type: 'api' }, { id: 'api2', type: 'http' }];
      const result = service.optimizeForPerformance({ nodes });
      expect(result.changes.some(c => c.type === 'caching')).toBe(true);
    });

    it('should not suggest for single step', () => {
      const nodes = [{ id: 'step1', type: 'task' }];
      const result = service.optimizeForPerformance({ nodes });
      expect(result.changes.length).toBe(0);
    });
  });

  describe('optimizeForCost', () => {
    it('should suggest batching for many API calls', () => {
      const nodes = Array.from({ length: 10 }, (_, i) => ({ id: `api${i}`, type: 'api' }));
      const result = service.optimizeForCost({ nodes });
      expect(result.changes.some(c => c.type === 'batch_apis')).toBe(true);
    });

    it('should calculate savings', () => {
      const nodes = Array.from({ length: 10 }, (_, i) => ({ id: `api${i}`, type: 'api' }));
      const result = service.optimizeForCost({ nodes });
      expect(result.estimatedSavings).toBeGreaterThan(0);
    });
  });

  describe('learnFromExecution', () => {
    it('should learn from successful execution', () => {
      const pattern = service.learnFromExecution({ workflowId: 'wf-1', status: 'completed', duration: 1000 });
      expect(pattern.occurrences).toBe(1);
      expect(pattern.avgDuration).toBe(1000);
    });

    it('should accumulate patterns', () => {
      service.learnFromExecution({ workflowId: 'wf-1', status: 'completed', duration: 1000 });
      service.learnFromExecution({ workflowId: 'wf-1', status: 'completed', duration: 1500 });
      const pattern = service.learnFromExecution({ workflowId: 'wf-1', status: 'completed', duration: 1200 });
      expect(pattern.occurrences).toBe(3);
      expect(pattern.avgDuration).toBeCloseTo(1233, 0);
    });

    it('should separate patterns by status', () => {
      service.learnFromExecution({ workflowId: 'wf-1', status: 'completed', duration: 1000 });
      service.learnFromExecution({ workflowId: 'wf-1', status: 'failed', duration: 500 });
      const patterns = service.getPatterns('wf-1');
      expect(patterns.length).toBe(2);
    });
  });

  describe('getPatterns', () => {
    it('should return all patterns when no filter', () => {
      service.learnFromExecution({ workflowId: 'wf-1', status: 'completed', duration: 1000 });
      service.learnFromExecution({ workflowId: 'wf-2', status: 'completed', duration: 2000 });
      const patterns = service.getPatterns();
      expect(patterns.length).toBe(2);
    });

    it('should filter by workflowId', () => {
      service.learnFromExecution({ workflowId: 'wf-1', status: 'completed', duration: 1000 });
      service.learnFromExecution({ workflowId: 'wf-2', status: 'completed', duration: 2000 });
      const patterns = service.getPatterns('wf-1');
      expect(patterns.length).toBe(1);
      expect(patterns[0].workflowId).toBe('wf-1');
    });
  });

  describe('integration', () => {
    it('should analyze, heal, and optimize workflow', () => {
      // Analyze
      const nodes = [
        { id: 'step1', type: 'task' },
        { id: 'step2', type: 'api' },
        { id: 'step3', type: 'api' },
        { id: 'step4', type: 'api' },
        { id: 'step5', type: 'api' },
        { id: 'step6', type: 'api' },
      ];
      const analysis = service.analyzeWorkflow('wf-1', { nodes });
      expect(analysis.score).toBeLessThan(100);

      // Heal
      const heal = service.autoHeal('wf-1', { type: 'timeout' });
      expect(heal.heals.length).toBeGreaterThan(0);

      // Learn
      service.learnFromExecution({ workflowId: 'wf-1', status: 'completed', duration: 5000 });
      const patterns = service.getPatterns('wf-1');
      expect(patterns.length).toBe(1);
    });
  });
});