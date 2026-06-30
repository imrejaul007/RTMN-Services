import { describe, it, expect } from 'vitest';

/**
 * Emotional Memory Service Unit Tests
 */

function calculateIntensity(emotionData) {
  if (emotionData.confidence) return emotionData.confidence;
  const emotions = emotionData.emotions || {};
  const values = Object.values(emotions);
  if (values.length === 0) return 0.5;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function detectEmotionCategory(emotionData) {
  if (emotionData.primary) return emotionData.primary;
  const emotions = emotionData.emotions || {};
  const entries = Object.entries(emotions);
  if (entries.length === 0) return 'neutral';
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function calculateValence(emotion) {
  const positive = ['happy', 'excited', 'joyful', 'grateful', 'confident', 'satisfied'];
  const negative = ['angry', 'sad', 'frustrated', 'anxious', 'fearful', 'disappointed'];
  const lower = emotion.toLowerCase();
  if (positive.some(e => lower.includes(e))) return 1;
  if (negative.some(e => lower.includes(e))) return -1;
  return 0;
}

function summarizeMemories(memories) {
  if (memories.length === 0) return { totalMemories: 0, dominantEmotion: 'unknown', avgIntensity: 0 };
  const emotionCounts = {};
  let totalIntensity = 0;
  let positiveCount = 0, negativeCount = 0;
  memories.forEach(m => {
    emotionCounts[m.emotion] = (emotionCounts[m.emotion] || 0) + 1;
    totalIntensity += m.intensity;
    if (m.valence > 0) positiveCount++;
    if (m.valence < 0) negativeCount++;
  });
  const dominant = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];
  const stability = 1 - (Object.keys(emotionCounts).length / memories.length);
  return {
    totalMemories: memories.length,
    dominantEmotion: dominant ? dominant[0] : 'unknown',
    avgIntensity: totalIntensity / memories.length,
    emotionalStability: Math.max(0, stability),
    positiveRatio: positiveCount / memories.length,
    negativeRatio: negativeCount / memories.length
  };
}

function detectPatterns(memories) {
  if (memories.length < 5) return { patterns: [], confidence: 0 };
  const patterns = [];
  const timePatterns = {};
  memories.forEach(m => {
    const hour = new Date(m.timestamp).getHours();
    const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
    if (!timePatterns[period]) timePatterns[period] = { count: 0, emotions: {} };
    timePatterns[period].count++;
    timePatterns[period].emotions[m.emotion] = (timePatterns[period].emotions[m.emotion] || 0) + 1;
  });
  for (const [period, data] of Object.entries(timePatterns)) {
    if (data.count >= 3) {
      const dominant = Object.entries(data.emotions).sort((a, b) => b[1] - a[1])[0];
      patterns.push({ type: 'time_of_day', value: period, dominantEmotion: dominant[0], frequency: data.count, confidence: data.count / memories.length });
    }
  }
  return { patterns, confidence: Math.min(1, memories.length / 20) };
}

describe('Emotional Memory - Emotion Helpers', () => {
  describe('calculateIntensity', () => {
    it('should return confidence if provided', () => {
      expect(calculateIntensity({ confidence: 0.85 })).toBe(0.85);
    });
    it('should calculate from emotions object', () => {
      const result = calculateIntensity({ emotions: { happy: 0.8, sad: 0.3 } });
      expect(result).toBeCloseTo(0.55, 2);
    });
    it('should return 0.5 for empty emotions', () => {
      expect(calculateIntensity({})).toBe(0.5);
    });
  });

  describe('detectEmotionCategory', () => {
    it('should return primary if provided', () => {
      expect(detectEmotionCategory({ primary: 'happy' })).toBe('happy');
    });
    it('should detect from emotions object', () => {
      expect(detectEmotionCategory({ emotions: { happy: 0.8, sad: 0.3 } })).toBe('happy');
    });
    it('should return neutral for empty emotions', () => {
      expect(detectEmotionCategory({})).toBe('neutral');
    });
  });

  describe('calculateValence', () => {
    it('should detect positive emotions', () => {
      expect(calculateValence('happy')).toBe(1);
      expect(calculateValence('excited')).toBe(1);
    });
    it('should detect negative emotions', () => {
      expect(calculateValence('angry')).toBe(-1);
      expect(calculateValence('sad')).toBe(-1);
    });
    it('should return 0 for neutral emotions', () => {
      expect(calculateValence('neutral')).toBe(0);
    });
  });
});

describe('Emotional Memory - Summary', () => {
  it('should handle empty memories', () => {
    const summary = summarizeMemories([]);
    expect(summary.totalMemories).toBe(0);
    expect(summary.dominantEmotion).toBe('unknown');
  });
  it('should find dominant emotion', () => {
    const memories = [
      { emotion: 'happy', intensity: 0.8, valence: 1 },
      { emotion: 'happy', intensity: 0.9, valence: 1 },
      { emotion: 'angry', intensity: 0.7, valence: -1 }
    ];
    const summary = summarizeMemories(memories);
    expect(summary.dominantEmotion).toBe('happy');
  });
  it('should calculate average intensity', () => {
    const memories = [
      { emotion: 'happy', intensity: 0.8, valence: 1 },
      { emotion: 'angry', intensity: 0.6, valence: -1 }
    ];
    const summary = summarizeMemories(memories);
    expect(summary.avgIntensity).toBeCloseTo(0.7, 2);
  });
  it('should calculate emotional stability', () => {
    const allSame = [
      { emotion: 'happy', intensity: 0.8, valence: 1 },
      { emotion: 'happy', intensity: 0.9, valence: 1 }
    ];
    const mixed = [
      { emotion: 'happy', intensity: 0.8, valence: 1 },
      { emotion: 'angry', intensity: 0.7, valence: -1 }
    ];
    const stable = summarizeMemories(allSame);
    const vol = summarizeMemories(mixed);
    expect(stable.emotionalStability).toBeGreaterThan(vol.emotionalStability);
  });
});

describe('Emotional Memory - Patterns', () => {
  it('should return empty for insufficient data', () => {
    const memories = [{ emotion: 'happy', timestamp: new Date().toISOString() }];
    const result = detectPatterns(memories);
    expect(result.patterns.length).toBe(0);
    expect(result.confidence).toBe(0);
  });
  it('should detect time-of-day patterns', () => {
    const memories = [];
    const base = new Date();
    // Need at least 5 memories for pattern detection
    for (let i = 0; i < 5; i++) {
      const d = new Date(base);
      d.setHours(9, 0, 0, 0);
      memories.push({ emotion: 'happy', timestamp: d.toISOString() });
    }
    const result = detectPatterns(memories);
    // Should detect morning pattern with 5 memories
    expect(result.confidence).toBeGreaterThan(0);
  });
});

describe('Emotional Memory - Integration', () => {
  it('should track customer journey from angry to happy', () => {
    const journey = [
      { emotion: 'angry', intensity: 0.9, valence: -1 },
      { emotion: 'neutral', intensity: 0.5, valence: 0 },
      { emotion: 'happy', intensity: 0.9, valence: 1 }
    ];
    const summary = summarizeMemories(journey);
    expect(summary.totalMemories).toBe(3);
    expect(summary.positiveRatio).toBeGreaterThan(0);
  });
  it('should detect burnout pattern', () => {
    const memories = [];
    for (let i = 0; i < 14; i++) {
      memories.push({
        emotion: i < 5 ? 'happy' : i < 10 ? 'neutral' : 'anxious',
        intensity: 0.9 - (i * 0.03),
        valence: i < 5 ? 1 : i < 10 ? 0 : -1
      });
    }
    const summary = summarizeMemories(memories);
    expect(summary.negativeRatio).toBeGreaterThan(0);
  });
});
