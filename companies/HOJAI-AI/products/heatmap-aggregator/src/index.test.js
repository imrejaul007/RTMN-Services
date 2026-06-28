/**
 * Unit tests for Heatmap Aggregator
 */
import { describe, it, expect } from 'vitest';

function aggregateClicks(clicks) {
  const map = {};
  for (const click of clicks) {
    const key = `${click.x},${click.y}`;
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map).map(([pos, count]) => {
    const [x, y] = pos.split(',').map(Number);
    return { x, y, count, intensity: Math.min(1, count / 10) };
  });
}

function aggregateScroll(depths) {
  if (!depths.length) return { avgDepth: 0, maxDepth: 0 };
  return {
    avgDepth: depths.reduce((a, b) => a + b, 0) / depths.length,
    maxDepth: Math.max(...depths)
  };
}

function calculateEngagement(scrollDepth, timeOnPage, clicks) {
  const scrollScore = Math.min(100, scrollDepth * 1.5);
  const timeScore = Math.min(100, timeOnPage / 60 * 30);
  const clickScore = Math.min(100, clicks.length * 10);
  return Math.round((scrollScore + timeScore + clickScore) / 3);
}

describe('Heatmap Aggregator', () => {
  it('should aggregate click positions', () => {
    const clicks = [
      { x: 100, y: 200 }, { x: 100, y: 200 }, { x: 150, y: 250 }
    ];
    const result = aggregateClicks(clicks);
    expect(result.find(r => r.x === 100 && r.y === 200)?.count).toBe(2);
    expect(result.find(r => r.x === 150 && r.y === 250)?.count).toBe(1);
  });

  it('should calculate click intensity', () => {
    const clicks = Array(10).fill({ x: 100, y: 200 });
    const result = aggregateClicks(clicks);
    expect(result[0].intensity).toBe(1); // max at 10+ clicks
  });

  it('should aggregate scroll depth', () => {
    const depths = [25, 50, 75, 100];
    const result = aggregateScroll(depths);
    expect(result.avgDepth).toBe(62.5);
    expect(result.maxDepth).toBe(100);
  });

  it('should handle empty scroll data', () => {
    const result = aggregateScroll([]);
    expect(result.avgDepth).toBe(0);
  });

  it('should calculate engagement score', () => {
    const score = calculateEngagement(75, 120, [{ x: 100, y: 200 }]);
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should cap engagement at 100', () => {
    const score = calculateEngagement(100, 300, [{ x: 100, y: 200 }]);
    expect(score).toBe(100);
  });
});
