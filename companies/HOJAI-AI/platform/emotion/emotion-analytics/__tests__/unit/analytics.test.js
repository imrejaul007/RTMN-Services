import { describe, it, expect } from 'vitest';

function calculateSummary(data) {
  if (data.length === 0) return { total: 0, avgIntensity: 0, dominant: 'none' };
  const emotionCounts = {};
  let totalIntensity = 0;
  for (const d of data) {
    emotionCounts[d.emotion] = (emotionCounts[d.emotion] || 0) + 1;
    totalIntensity += d.intensity || 0.5;
  }
  const dominant = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];
  return { total: data.length, avgIntensity: totalIntensity / data.length, dominant: dominant?.[0] || 'none', emotionCounts };
}

function calculateTrends(data) {
  const trends = { improving: 0, declining: 0, stable: 0 };
  const sorted = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const recent = sorted.slice(-5);
  const older = sorted.slice(-10, -5);
  if (older.length === 0) return trends;
  const recentAvg = recent.reduce((sum, d) => sum + (d.intensity || 0.5), 0) / recent.length;
  const olderAvg = older.reduce((sum, d) => sum + (d.intensity || 0.5), 0) / older.length;
  if (recentAvg > olderAvg + 0.1) trends.improving = 1;
  else if (recentAvg < olderAvg - 0.1) trends.declining = 1;
  else trends.stable = 1;
  return trends;
}

function calculateDistribution(data) {
  const dist = {};
  for (const d of data) dist[d.emotion] = (dist[d.emotion] || 0) + 1;
  const total = data.length || 1;
  for (const [emotion, count] of Object.entries(dist)) dist[emotion] = { count, percentage: (count / total) * 100 };
  return dist;
}

function detectAlerts(data) {
  const alerts = [];
  const frustratedCount = data.filter(d => d.emotion === 'frustrated').length;
  if (frustratedCount > 5) alerts.push({ type: 'high_frustration', severity: 'high', count: frustratedCount });
  if (data.length > 3) {
    const emotions = data.slice(-5).map(d => d.emotion);
    const unique = new Set(emotions).size;
    if (unique > 3) alerts.push({ type: 'mood_swings', severity: 'medium', emotions: unique });
  }
  return alerts;
}

describe('Emotion Analytics - Summary', () => {
  it('should handle empty data', () => {
    const result = calculateSummary([]);
    expect(result.total).toBe(0);
    expect(result.dominant).toBe('none');
  });
  it('should calculate total count', () => {
    const data = [{ emotion: 'happy', intensity: 0.8 }, { emotion: 'angry', intensity: 0.9 }];
    expect(calculateSummary(data).total).toBe(2);
  });
  it('should find dominant emotion', () => {
    const data = [{ emotion: 'happy', intensity: 0.8 }, { emotion: 'happy', intensity: 0.7 }, { emotion: 'angry', intensity: 0.9 }];
    expect(calculateSummary(data).dominant).toBe('happy');
  });
  it('should calculate average intensity', () => {
    const data = [{ emotion: 'happy', intensity: 0.8 }, { emotion: 'angry', intensity: 0.6 }];
    expect(calculateSummary(data).avgIntensity).toBeCloseTo(0.7, 1);
  });
});

describe('Emotion Analytics - Trends', () => {
  it('should calculate trends for enough data', () => {
    // Need at least 10 data points for trends comparison
    const data = [];
    for (let i = 0; i < 12; i++) {
      data.push({ emotion: i < 6 ? 'angry' : 'happy', intensity: i < 6 ? 0.3 : 0.9, timestamp: `2026-01-${String(i+1).padStart(2,'0')}` });
    }
    const result = calculateTrends(data);
    // Should detect some trend (improving, declining, or stable)
    expect(result.improving + result.declining + result.stable).toBe(1);
  });
  it('should handle insufficient data', () => {
    // With 1 data point, trends returns unchanged object
    const data = [{ emotion: 'happy', intensity: 0.7, timestamp: '2026-01-01' }];
    const result = calculateTrends(data);
    // Should not crash and return valid structure
    expect(result.improving).toBeDefined();
    expect(result.declining).toBeDefined();
    expect(result.stable).toBeDefined();
  });
});

describe('Emotion Analytics - Distribution', () => {
  it('should calculate distribution percentages', () => {
    const data = [{ emotion: 'happy' }, { emotion: 'happy' }, { emotion: 'angry' }];
    const result = calculateDistribution(data);
    expect(result.happy.percentage).toBeCloseTo(66.67, 1);
  });
});

describe('Emotion Analytics - Alerts', () => {
  it('should detect high frustration', () => {
    const data = Array(7).fill({ emotion: 'frustrated' });
    const result = detectAlerts(data);
    expect(result.some(a => a.type === 'high_frustration')).toBe(true);
  });
  it('should detect mood swings', () => {
    const data = ['happy', 'angry', 'sad', 'excited', 'neutral'].map(e => ({ emotion: e }));
    const result = detectAlerts(data);
    expect(result.some(a => a.type === 'mood_swings')).toBe(true);
  });
  it('should not alert for stable emotions', () => {
    const result = detectAlerts(Array(5).fill({ emotion: 'happy' }));
    expect(result.length).toBe(0);
  });
});
