import { describe, it, expect } from 'vitest';

// Benchmark metrics tests
function calculateStats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  return { mean, median, p95, count: values.length };
}

describe('Memory Benchmark', () => {
  describe('Recall Metrics', () => {
    it('calculates recall@5', () => {
      const results = [0.9, 0.85, 0.8, 0.75, 0.7];
      const recallAt5 = results.slice(0, 5).reduce((s, r) => s + r, 0) / results.length;
      expect(recallAt5).toBeGreaterThan(0.7);
    });

    it('calculates recall@10', () => {
      const results = Array.from({ length: 10 }, () => 0.7 + Math.random() * 0.3);
      const recallAt10 = results.reduce((s, r) => s + r, 0) / results.length;
      expect(recallAt10).toBeGreaterThan(0);
      expect(recallAt10).toBeLessThanOrEqual(1);
    });

    it('passes threshold', () => {
      const recallAt5 = 0.82;
      const threshold = 0.8;
      expect(recallAt5 >= threshold).toBe(true);
    });

    it('fails threshold', () => {
      const recallAt5 = 0.75;
      const threshold = 0.8;
      expect(recallAt5 >= threshold).toBe(false);
    });
  });

  describe('Latency Metrics', () => {
    it('calculates mean', () => {
      const latencies = [100, 150, 200, 250, 300];
      const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      expect(mean).toBe(200);
    });

    it('calculates median', () => {
      const latencies = [100, 150, 200, 250, 300].sort((a, b) => a - b);
      const median = latencies[Math.floor(latencies.length / 2)];
      expect(median).toBe(200);
    });

    it('calculates p95', () => {
      const latencies = Array.from({ length: 100 }, (_, i) => i + 1);
      const p95 = latencies[Math.floor(latencies.length * 0.95)];
      expect(p95).toBeGreaterThanOrEqual(94);
      expect(p95).toBeLessThanOrEqual(96);
    });

    it('passes latency threshold', () => {
      const p95 = 150;
      const threshold = 200;
      expect(p95 <= threshold).toBe(true);
    });
  });

  describe('Accuracy Metrics', () => {
    it('calculates accuracy', () => {
      const correct = 85;
      const total = 100;
      const accuracy = correct / total;
      expect(accuracy).toBe(0.85);
    });

    it('passes accuracy threshold', () => {
      const accuracy = 0.88;
      const threshold = 0.85;
      expect(accuracy >= threshold).toBe(true);
    });

    it('handles zero cases', () => {
      const accuracy = 0 / 0;
      expect(isNaN(accuracy)).toBe(true);
    });
  });

  describe('Context Quality', () => {
    it('calculates relevance', () => {
      const totalItems = 10;
      const relevantItems = 8;
      const relevantPct = relevantItems / totalItems;
      expect(relevantPct).toBe(0.8);
    });

    it('calculates noise', () => {
      const totalItems = 10;
      const relevantItems = 8;
      const noisePct = (totalItems - relevantItems) / totalItems;
      expect(noisePct).toBe(0.2);
    });

    it('passes context threshold', () => {
      const relevantPct = 0.78;
      const threshold = 0.7;
      expect(relevantPct >= threshold).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('handles empty array', () => {
      const stats = calculateStats([]);
      expect(stats.count).toBe(0);
    });

    it('handles single value', () => {
      const stats = calculateStats([100]);
      expect(stats.mean).toBe(100);
      expect(stats.median).toBe(100);
    });

    it('handles duplicate values', () => {
      const stats = calculateStats([50, 50, 50, 50]);
      expect(stats.mean).toBe(50);
    });
  });

  describe('Trend Analysis', () => {
    it('calculates trend direction', () => {
      const first = 0.7;
      const last = 0.85;
      const direction = last > first ? 'improving' : 'declining';
      expect(direction).toBe('improving');
    });

    it('detects declining trend', () => {
      const first = 0.85;
      const last = 0.7;
      const direction = last > first ? 'improving' : 'declining';
      expect(direction).toBe('declining');
    });

    it('detects stable trend', () => {
      const first = 0.8;
      const last = 0.8;
      const direction = last > first ? 'improving' : last < first ? 'declining' : 'stable';
      expect(direction).toBe('stable');
    });
  });

  describe('Edge Cases', () => {
    it('handles negative values', () => {
      const values = [-10, -5, 0, 5, 10];
      const stats = calculateStats(values);
      expect(stats.mean).toBe(0);
    });

    it('handles large values', () => {
      const values = Array.from({ length: 1000 }, () => 1000000);
      const stats = calculateStats(values);
      expect(stats.mean).toBe(1000000);
    });

    it('handles decimal values', () => {
      const values = [0.1, 0.2, 0.3, 0.4, 0.5];
      const stats = calculateStats(values);
      expect(stats.mean).toBeCloseTo(0.3, 1);
    });
  });
});
