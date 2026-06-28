import { describe, it, expect, vi } from 'vitest';
vi.mock('@rtmn/shared/auth', () => ({ requireAuth: (_req: any, _res: any, next: () => void) => next() }));

interface Value { id: string; name: string; description: string; priority: number; active: boolean; examples: string[]; color: string; icon?: string; createdAt: string; }
interface AlignmentScore { userId: string; valueId: string; score: number; date: string; evidence?: string; }

// Calculate overall alignment
function calculateAlignment(scores: AlignmentScore[]): { average: number; byValue: Record<string, number> } {
  const byValue: Record<string, number> = {};
  const values = new Set<string>();
  for (const s of scores) values.add(s.valueId);
  for (const v of values) {
    const valueScores = scores.filter(s => s.valueId === v);
    byValue[v] = valueScores.reduce((sum, s) => sum + s.score, 0) / valueScores.length;
  }
  const average = scores.length > 0 ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : 0;
  return { average, byValue };
}

describe('CultureOS — Values', () => {
  const values: Value[] = [
    { id: 'v1', name: 'Customer First', description: 'Priority', priority: 1, active: true, examples: ['Support'], color: '#0066FF', createdAt: '' },
    { id: 'v2', name: 'Innovation', description: 'Change', priority: 2, active: true, examples: ['Hackathons'], color: '#FF6B35', createdAt: '' },
    { id: 'v3', name: 'Transparency', description: 'Open', priority: 3, active: false, examples: ['All-hands'], color: '#00AA66', createdAt: '' },
  ];

  it('defaults to active', () => {
    expect(values[0].active).toBe(true);
  });

  it('sorts by priority ascending', () => {
    const sorted = [...values].sort((a, b) => a.priority - b.priority);
    expect(sorted[0].name).toBe('Customer First');
    expect(sorted[2].name).toBe('Transparency');
  });

  it('filters active values', () => {
    const active = values.filter(v => v.active);
    expect(active).toHaveLength(2);
  });
});

describe('CultureOS — Alignment Scores', () => {
  it('calculates overall average', () => {
    const scores: AlignmentScore[] = [
      { userId: 'u1', valueId: 'v1', score: 80, date: '' },
      { userId: 'u2', valueId: 'v1', score: 90, date: '' },
      { userId: 'u1', valueId: 'v2', score: 70, date: '' },
    ];
    const result = calculateAlignment(scores);
    expect(result.average).toBe(80);
  });

  it('calculates per-value average', () => {
    const scores: AlignmentScore[] = [
      { userId: 'u1', valueId: 'v1', score: 60, date: '' },
      { userId: 'u2', valueId: 'v1', score: 80, date: '' },
      { userId: 'u1', valueId: 'v2', score: 90, date: '' },
    ];
    const result = calculateAlignment(scores);
    expect(result.byValue['v1']).toBe(70);
    expect(result.byValue['v2']).toBe(90);
  });

  it('handles empty scores', () => {
    const result = calculateAlignment([]);
    expect(result.average).toBe(0);
    expect(Object.keys(result.byValue)).toHaveLength(0);
  });
});