/**
 * Unit tests for Benchmark Database
 */
import { describe, it, expect } from 'vitest';

const BENCHMARKS = {
  ecommerce: {
    conversion: { avg: 2.8, range: [2.1, 3.8] },
    cartAbandonment: { avg: 70, range: [65, 75] },
    roas: { avg: 4.0, range: [3.0, 5.0] }
  },
  restaurant: {
    avgOrderValue: { avg: 450, range: [350, 550] },
    repeatRate: { avg: 40, range: [35, 45] }
  }
};

function compareToBenchmark(industry, metric, value) {
  const bench = BENCHMARKS[industry]?.[metric];
  if (!bench) return null;

  const gap = value - bench.avg;
  const percent = Math.round((gap / bench.avg) * 100);
  const inRange = value >= bench.range[0] && value <= bench.range[1];

  return {
    yourValue: value,
    industryAvg: bench.avg,
    gap,
    gapPercent: percent,
    inRange,
    verdict: inRange ? 'average' : gap > 0 ? 'above_average' : 'below_average'
  };
}

function rankIndustries(metrics) {
  return Object.entries(metrics)
    .map(([industry, data]) => ({ industry, score: data.conversion || data.avg || 0 }))
    .sort((a, b) => b.score - a.score);
}

describe('Benchmark Database', () => {
  it('should compare e-commerce conversion', () => {
    const result = compareToBenchmark('ecommerce', 'conversion', 3.5);
    expect(result.yourValue).toBe(3.5);
    expect(result.industryAvg).toBe(2.8);
    expect(result.inRange).toBe(true);
  });

  it('should detect below-average performance', () => {
    const result = compareToBenchmark('ecommerce', 'conversion', 1.5);
    expect(result.verdict).toBe('below_average');
    expect(result.gapPercent).toBeLessThan(0);
  });

  it('should handle unknown benchmarks', () => {
    expect(compareToBenchmark('unknown', 'conversion', 3.0)).toBeNull();
    expect(compareToBenchmark('ecommerce', 'unknown', 3.0)).toBeNull();
  });

  it('should rank industries', () => {
    const metrics = {
      ecommerce: { conversion: 3.5 },
      restaurant: { conversion: 45 }
    };
    const ranked = rankIndustries(metrics);
    expect(ranked[0].industry).toBe('ecommerce');
  });
});
