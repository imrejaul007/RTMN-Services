import { describe, it, expect, vi } from 'vitest';
vi.mock('@rtmn/shared/auth', () => ({ requireAuth: (_req: any, _res: any, next: () => void) => next() }));

// Memory creation
function createMemory(workflowId: string, context: string): { id: string; workflowId: string; context: string } {
  return { id: 'mem_' + Math.random().toString(36).slice(2, 10), workflowId, context };
}

// Pattern detection
function detectPatterns(memories: { context: string }[]): string[] {
  const patterns: string[] = [];
  const contexts = memories.map(m => m.context);
  for (const c of contexts) {
    if (c.includes('error') || c.includes('fail')) patterns.push('error');
    if (c.includes('success') || c.includes('complete')) patterns.push('success');
  }
  return [...new Set(patterns)];
}

// Learning confidence
function calculateConfidence(learnings: { confidence: number }[]): number {
  if (learnings.length === 0) return 0;
  const sum = learnings.reduce((s, l) => s + l.confidence, 0);
  return Math.round((sum / learnings.length) * 100) / 100;
}

describe('Workflow Memory — Memory Creation', () => {
  it('creates memory with required fields', () => {
    const mem = createMemory('wf-1', 'task completed successfully');
    expect(mem.workflowId).toBe('wf-1');
    expect(mem.context).toBe('task completed successfully');
    expect(mem.id).toMatch(/^mem_/);
  });

  it('generates unique IDs', () => {
    const mem1 = createMemory('wf-1', 'a');
    const mem2 = createMemory('wf-1', 'b');
    expect(mem1.id).not.toBe(mem2.id);
  });
});

describe('Workflow Memory — Pattern Detection', () => {
  it('detects error patterns', () => {
    const memories = [
      { context: 'task failed with error' },
      { context: 'error occurred' },
      { context: 'success' },
    ];
    const patterns = detectPatterns(memories);
    expect(patterns).toContain('error');
    expect(patterns).toContain('success');
  });

  it('returns unique patterns', () => {
    const memories = [
      { context: 'error' },
      { context: 'error' },
      { context: 'error' },
    ];
    const patterns = detectPatterns(memories);
    expect(patterns).toHaveLength(1);
  });

  it('handles empty memories', () => {
    expect(detectPatterns([])).toHaveLength(0);
  });
});

describe('Workflow Memory — Learning Confidence', () => {
  it('calculates average confidence', () => {
    const learnings = [{ confidence: 0.8 }, { confidence: 0.9 }, { confidence: 0.7 }];
    expect(calculateConfidence(learnings)).toBe(0.8);
  });

  it('handles single learning', () => {
    expect(calculateConfidence([{ confidence: 0.95 }])).toBe(0.95);
  });

  it('handles empty learnings', () => {
    expect(calculateConfidence([])).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    const learnings = [{ confidence: 0.333 }, { confidence: 0.333 }, { confidence: 0.333 }];
    expect(calculateConfidence(learnings)).toBe(0.33);
  });
});
