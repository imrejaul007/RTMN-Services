/**
 * SUTAR Decision Engine - Multi-Option Ranker Unit Tests (Phase B.2)
 */

import { describe, it, expect } from 'vitest';
import {
  rankOptions,
  rankerDiagnostics,
  DEFAULT_WEIGHTS,
  type RankableOption,
} from '../../src/services/optionRanker.js';

describe('rankOptions — basics', () => {
  it('ranks 3 options across all 4 dimensions', () => {
    const options: RankableOption[] = [
      { id: 'a', name: 'A', cost: 10, time: 5,  risk: 20, trust: 80 },
      { id: 'b', name: 'B', cost: 20, time: 10, risk: 30, trust: 70 },
      { id: 'c', name: 'C', cost: 5,  time: 8,  risk: 25, trust: 90 },
    ];
    const r = rankOptions(options);
    expect(r.ranked).toHaveLength(3);
    // 'a' wins: best time (5) and best risk (20); 'c' is best on cost (5) and trust (90).
    // With default weights (cost=0.3, time=0.2, risk=0.3, trust=0.2), a's score = 0.8, c's = 0.73.
    expect(r.winner.id).toBe('a');
    expect(r.winner.rank).toBe(1);
    expect(r.dimensionsUsed).toEqual(['cost', 'time', 'risk', 'trust']);
  });

  it('produces descending score order', () => {
    const options: RankableOption[] = [
      { id: 'x', name: 'X', cost: 10, risk: 50, trust: 50 },
      { id: 'y', name: 'Y', cost: 20, risk: 30, trust: 70 },
      { id: 'z', name: 'Z', cost: 30, risk: 10, trust: 90 },
    ];
    const r = rankOptions(options);
    for (let i = 0; i < r.ranked.length - 1; i++) {
      expect(r.ranked[i].score).toBeGreaterThanOrEqual(r.ranked[i + 1].score);
    }
    // Ranks should be 1, 2, 3
    expect(r.ranked.map(o => o.rank)).toEqual([1, 2, 3]);
  });

  it('uses default weights when none provided', () => {
    const r = rankOptions([
      { id: 'a', name: 'A', cost: 10, time: 5,  risk: 20, trust: 80 },
      { id: 'b', name: 'B', cost: 20, time: 10, risk: 30, trust: 70 },
    ]);
    expect(r.weights).toEqual(DEFAULT_WEIGHTS);
  });

  it('echoes metadata in the result', () => {
    const r = rankOptions([
      { id: 'a', name: 'A', cost: 10, trust: 90, metadata: { source: 'manual' } },
      { id: 'b', name: 'B', cost: 20, trust: 80, metadata: { source: 'api' } },
    ]);
    expect(r.ranked[0].metadata).toEqual({ source: 'manual' });
  });
});

describe('rankOptions — dimension handling', () => {
  it('handles missing dimensions per option (skips them in that option score)', () => {
    // 'a' has only cost; 'b' has cost+trust
    const r = rankOptions([
      { id: 'a', name: 'Only cost', cost: 5 },
      { id: 'b', name: 'Cost + trust', cost: 20, trust: 95 },
    ]);
    expect(r.dimensionsUsed).toEqual(['cost', 'trust']);
    expect(r.ranked).toHaveLength(2);
    // 'a' is best on cost (lower=1.0), 'b' is best on trust (higher=1.0).
    // With default weights, 'a' (cost=0.3) + 'b' (trust=0.2) → both get partial
    // credit on their known dims. Should not throw.
  });

  it('handles missing dimensions across ALL options (throws)', () => {
    expect(() => rankOptions([
      { id: 'a', name: 'Nothing' },
      { id: 'b', name: 'Still nothing' },
    ])).toThrow(/at least one dimension/);
  });

  it('handles single dimension across all options', () => {
    // Trust-only ranking
    const r = rankOptions([
      { id: 'a', name: 'Low trust',  trust: 30 },
      { id: 'b', name: 'High trust', trust: 90 },
    ]);
    expect(r.winner.id).toBe('b');
    expect(r.dimensionsUsed).toEqual(['trust']);
  });

  it('handles all-equal values (all options get 1.0 on that dim)', () => {
    const r = rankOptions([
      { id: 'a', name: 'A', cost: 10, trust: 50 },
      { id: 'b', name: 'B', cost: 10, trust: 50 },
    ]);
    // Both score 1.0 → tied → tie-break by id (a < b)
    expect(r.winner.id).toBe('a');
    expect(r.confidence).toBe(0); // no spread
  });
});

describe('rankOptions — weights', () => {
  it('normalizes custom weights to sum=1 across used dimensions', () => {
    const r = rankOptions(
      [
        { id: 'a', name: 'A', cost: 10, trust: 80 },
        { id: 'b', name: 'B', cost: 20, trust: 90 },
      ],
      { cost: 1, trust: 1, time: 1, risk: 1 } // 4 equal weights, but only 2 dims used
    );
    expect(r.weights.cost + r.weights.trust).toBeCloseTo(1.0, 5);
  });

  it('rejects negative weights and treats them as 0', () => {
    const r = rankOptions(
      [
        { id: 'a', name: 'A', cost: 10, trust: 80 },
        { id: 'b', name: 'B', cost: 20, trust: 90 },
      ],
      { cost: -1, trust: 1, time: 1, risk: 1 }
    );
    // cost weight is 0, so trust dominates. 'b' has higher trust → wins.
    expect(r.winner.id).toBe('b');
  });

  it('lets weight of one dimension dominate the ranking', () => {
    const r = rankOptions(
      [
        { id: 'a', name: 'Cheap',   cost: 1,  risk: 100, trust: 0 },
        { id: 'b', name: 'Expensive', cost: 100, risk: 0,   trust: 100 },
      ],
      { cost: 0, time: 0, risk: 0, trust: 1 } // trust only
    );
    expect(r.winner.id).toBe('b');
  });
});

describe('rankOptions — confidence', () => {
  it('returns 0 confidence when all options tie', () => {
    const r = rankOptions([
      { id: 'a', name: 'A', cost: 10, time: 5, risk: 20, trust: 80 },
      { id: 'b', name: 'B', cost: 10, time: 5, risk: 20, trust: 80 },
    ]);
    expect(r.confidence).toBe(0);
  });

  it('returns high confidence when options are clearly separated', () => {
    const r = rankOptions([
      { id: 'a', name: 'A', cost: 1,   risk: 1,  trust: 100 },
      { id: 'b', name: 'B', cost: 100, risk: 100, trust: 1 },
    ]);
    expect(r.confidence).toBeGreaterThan(0.7);
  });

  it('confidence is in [0, 1]', () => {
    const r = rankOptions([
      { id: 'a', name: 'A', cost: 1, trust: 99 },
      { id: 'b', name: 'B', cost: 2, trust: 98 },
      { id: 'c', name: 'C', cost: 3, trust: 97 },
    ]);
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });
});

describe('rankOptions — input validation', () => {
  it('throws on fewer than 2 options', () => {
    expect(() => rankOptions([{ id: 'a', name: 'A', cost: 1 }])).toThrow(/at least 2/);
  });

  it('throws on missing option id', () => {
    expect(() => rankOptions([
      { name: 'A', cost: 1 } as any,
      { name: 'B', cost: 2 } as any,
    ])).toThrow(/every option must have an id/);
  });

  it('throws on non-array input', () => {
    expect(() => rankOptions(null as any)).toThrow(/array/);
  });
});

describe('rankOptions — per-dimension breakdown', () => {
  it('exposes normalized values, weights, and contributions', () => {
    const r = rankOptions([
      { id: 'a', name: 'A', cost: 10, time: 5, risk: 20, trust: 80 },
      { id: 'b', name: 'B', cost: 20, time: 10, risk: 30, trust: 70 },
    ]);
    const a = r.ranked.find(o => o.id === 'a')!;
    // a is best on cost (lower), time (lower), AND risk (lower). All normalized=1.0.
    expect(a.breakdown.cost.normalized).toBe(1.0);
    expect(a.breakdown.time.normalized).toBe(1.0);
    expect(a.breakdown.risk.normalized).toBe(1.0);
    // a is better on trust (higher). So normalized=1.0.
    expect(a.breakdown.trust.normalized).toBe(1.0);
  });

  it('contribution = normalized * weight', () => {
    const r = rankOptions([
      { id: 'a', name: 'A', cost: 1, trust: 99 },
      { id: 'b', name: 'B', cost: 99, trust: 1 },
    ]);
    const a = r.ranked.find(o => o.id === 'a')!;
    // 'a' is best on both. So cost.normalized=1, trust.normalized=1, weight=0.3/0.2 default
    expect(a.breakdown.cost.contribution).toBeCloseTo(a.breakdown.cost.normalized * a.breakdown.cost.weight, 5);
    expect(a.breakdown.trust.contribution).toBeCloseTo(a.breakdown.trust.normalized * a.breakdown.trust.weight, 5);
  });
});

describe('rankOptions — determinism', () => {
  it('returns identical results on repeated calls', () => {
    const options: RankableOption[] = [
      { id: 'a', name: 'A', cost: 5, time: 3, risk: 10, trust: 90 },
      { id: 'b', name: 'B', cost: 15, time: 8, risk: 25, trust: 75 },
      { id: 'c', name: 'C', cost: 25, time: 12, risk: 40, trust: 60 },
    ];
    const r1 = rankOptions(options);
    const r2 = rankOptions(options);
    expect(r1.ranked.map(o => o.id)).toEqual(r2.ranked.map(o => o.id));
    expect(r1.winner.id).toBe(r2.winner.id);
    expect(r1.confidence).toBe(r2.confidence);
  });
});

describe('rankerDiagnostics', () => {
  it('reports healthy for a sane input', () => {
    const d = rankerDiagnostics();
    expect(d.healthy).toBe(true);
    expect(d.checks.produces_winner.pass).toBe(true);
  });
});
