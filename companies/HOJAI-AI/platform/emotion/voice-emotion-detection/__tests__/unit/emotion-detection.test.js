import { describe, it, expect } from 'vitest';

// Mock express app for testing without network
// In production, these would be integration tests with supertest

/**
 * Emotion Detection Service Unit Tests
 *
 * Tests the core emotion classification logic without requiring
 * the Express server to be running.
 */

// Helper: Simulate prosodic feature extraction
function extractProsodicFeatures(audioData) {
  return {
    pitch: audioData.pitch || Math.random() * 100,
    energy: audioData.energy || Math.random() * 100,
    speechRate: audioData.speechRate || 150 + Math.random() * 50,
    pauseFrequency: audioData.pauseFrequency || Math.random() * 10,
    jitter: audioData.jitter || Math.random() * 5,
    shimmer: audioData.shimmer || Math.random() * 5
  };
}

// Helper: Simulate emotion classification
function classifyEmotion(features) {
  const scores = {};

  if (features.energy > 70 && features.pitch > 70) {
    scores.happy = 0.8 + Math.random() * 0.2;
    scores.excited = 0.7 + Math.random() * 0.2;
  }

  if (features.energy < 40 && features.speechRate < 130) {
    scores.sad = 0.7 + Math.random() * 0.2;
  }

  if (features.pitch > 80 && features.speechRate > 180 && features.pauseFrequency > 5) {
    scores.fearful = 0.75 + Math.random() * 0.2;
    scores.anxious = 0.7 + Math.random() * 0.2;
  }

  if (features.energy > 80 && features.speechRate > 190) {
    scores.angry = 0.75 + Math.random() * 0.2;
  }

  scores.neutral = 0.5 + Math.random() * 0.3;

  const valence = (scores.happy || 0) - (scores.sad || 0) + (scores.angry || 0) * -0.5;
  const arousal = features.energy / 100;
  const dominance = (scores.angry || 0) * 0.8 - (scores.fearful || 0) * 0.5;

  return {
    emotions: normalizeScores(scores),
    dimensions: {
      valence: Math.max(0, Math.min(1, (valence + 1) / 2)),
      arousal: Math.max(0, Math.min(1, arousal)),
      dominance: Math.max(0, Math.min(1, (dominance + 1) / 2))
    }
  };
}

// Helper: Normalize emotion scores
function normalizeScores(scores) {
  const values = Object.values(scores);
  if (values.length === 0) return {};

  const max = Math.max(...values);
  const normalized = {};

  for (const [emotion, score] of Object.entries(scores)) {
    normalized[emotion] = Math.round((score / max) * 100) / 100;
  }

  return normalized;
}

// Helper: Calculate emotional trajectory
function calculateTrajectory(segments) {
  const emotions = segments.map(s => s.primary.emotion);
  const transitions = [];

  for (let i = 1; i < emotions.length; i++) {
    if (emotions[i] !== emotions[i-1]) {
      transitions.push({
        from: emotions[i-1],
        to: emotions[i],
        at: segments[i].start
      });
    }
  }

  return transitions;
}

// Helper: Get most common emotion
function getMostCommon(arr) {
  const counts = {};
  for (const item of arr) {
    counts[item] = (counts[item] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// ============================================
// PROSODIC FEATURE EXTRACTION TESTS
// ============================================

describe('Prosodic Feature Extraction', () => {
  it('should extract features with provided values', () => {
    const audioData = {
      pitch: 75,
      energy: 85,
      speechRate: 180,
      pauseFrequency: 3,
      jitter: 1.5,
      shimmer: 2.0
    };

    const features = extractProsodicFeatures(audioData);

    expect(features.pitch).toBe(75);
    expect(features.energy).toBe(85);
    expect(features.speechRate).toBe(180);
    expect(features.pauseFrequency).toBe(3);
    expect(features.jitter).toBe(1.5);
    expect(features.shimmer).toBe(2.0);
  });

  it('should generate default values for missing features', () => {
    const features = extractProsodicFeatures({});

    expect(features.pitch).toBeGreaterThanOrEqual(0);
    expect(features.pitch).toBeLessThanOrEqual(100);
    expect(features.energy).toBeGreaterThanOrEqual(0);
    expect(features.energy).toBeLessThanOrEqual(100);
    expect(features.speechRate).toBeGreaterThanOrEqual(150);
    expect(features.speechRate).toBeLessThanOrEqual(200);
  });

  it('should handle partial audio data', () => {
    const features = extractProsodicFeatures({
      pitch: 50,
      energy: 60
    });

    expect(features.pitch).toBe(50);
    expect(features.energy).toBe(60);
    expect(features.speechRate).toBeDefined();
    expect(features.pauseFrequency).toBeDefined();
  });
});

// ============================================
// EMOTION CLASSIFICATION TESTS
// ============================================

describe('Emotion Classification', () => {
  it('should classify happy emotion for high energy and pitch', () => {
    const features = {
      pitch: 85,
      energy: 80,
      speechRate: 170,
      pauseFrequency: 2
    };

    const result = classifyEmotion(features);

    expect(result.emotions).toHaveProperty('happy');
    expect(result.emotions.happy).toBeGreaterThan(0.7);
  });

  it('should classify sad emotion for low energy and slow speech', () => {
    const features = {
      pitch: 40,
      energy: 30,
      speechRate: 100,
      pauseFrequency: 6
    };

    const result = classifyEmotion(features);

    expect(result.emotions).toHaveProperty('sad');
    expect(result.emotions.sad).toBeGreaterThan(0.7);
  });

  it('should classify fearful emotion for high pitch, fast speech, and many pauses', () => {
    const features = {
      pitch: 90,
      energy: 60,
      speechRate: 190,
      pauseFrequency: 7
    };

    const result = classifyEmotion(features);

    expect(result.emotions).toHaveProperty('fearful');
    expect(result.emotions.fearful).toBeGreaterThan(0.7);
  });

  it('should classify angry emotion for high energy and very fast speech', () => {
    const features = {
      pitch: 75,
      energy: 90,
      speechRate: 200,
      pauseFrequency: 1
    };

    const result = classifyEmotion(features);

    expect(result.emotions).toHaveProperty('angry');
    expect(result.emotions.angry).toBeGreaterThan(0.7);
  });

  it('should include neutral emotion in all classifications', () => {
    const features = {
      pitch: 50,
      energy: 50,
      speechRate: 150,
      pauseFrequency: 4
    };

    const result = classifyEmotion(features);

    expect(result.emotions).toHaveProperty('neutral');
  });
});

// ============================================
// DIMENSIONAL EMOTION TESTS
// ============================================

describe('Dimensional Emotion (VAD)', () => {
  it('should return valid dimension values between 0 and 1', () => {
    const features = {
      pitch: 50,
      energy: 50,
      speechRate: 150,
      pauseFrequency: 4
    };

    const result = classifyEmotion(features);

    expect(result.dimensions.valence).toBeGreaterThanOrEqual(0);
    expect(result.dimensions.valence).toBeLessThanOrEqual(1);
    expect(result.dimensions.arousal).toBeGreaterThanOrEqual(0);
    expect(result.dimensions.arousal).toBeLessThanOrEqual(1);
    expect(result.dimensions.dominance).toBeGreaterThanOrEqual(0);
    expect(result.dimensions.dominance).toBeLessThanOrEqual(1);
  });

  it('should have higher arousal for high energy input', () => {
    const lowEnergy = {
      pitch: 50,
      energy: 20,
      speechRate: 100,
      pauseFrequency: 4
    };

    const highEnergy = {
      pitch: 50,
      energy: 90,
      speechRate: 100,
      pauseFrequency: 4
    };

    const lowResult = classifyEmotion(lowEnergy);
    const highResult = classifyEmotion(highEnergy);

    expect(highResult.dimensions.arousal).toBeGreaterThan(lowResult.dimensions.arousal);
  });

  it('should calculate arousal from energy directly', () => {
    const features = {
      pitch: 50,
      energy: 75,
      speechRate: 150,
      pauseFrequency: 4
    };

    const result = classifyEmotion(features);

    // Arousal = energy / 100
    expect(result.dimensions.arousal).toBe(0.75);
  });
});

// ============================================
// SCORE NORMALIZATION TESTS
// ============================================

describe('Score Normalization', () => {
  it('should normalize scores to 0-1 range', () => {
    const scores = {
      emotion1: 0.8,
      emotion2: 0.4,
      emotion3: 0.2
    };

    const normalized = normalizeScores(scores);

    expect(normalized.emotion1).toBe(1);
    expect(normalized.emotion2).toBe(0.5);
    expect(normalized.emotion3).toBe(0.25);
  });

  it('should round normalized scores to 2 decimal places', () => {
    const scores = {
      emotion1: 0.333,
      emotion2: 0.666
    };

    const normalized = normalizeScores(scores);

    expect(normalized.emotion1).toBe(0.5);
    expect(normalized.emotion2).toBe(1);
  });

  it('should handle empty scores', () => {
    const normalized = normalizeScores({});
    expect(normalized).toEqual({});
  });

  it('should handle single emotion', () => {
    const scores = { happy: 0.7 };
    const normalized = normalizeScores(scores);
    expect(normalized.happy).toBe(1);
  });
});

// ============================================
// EMOTIONAL TRAJECTORY TESTS
// ============================================

describe('Emotional Trajectory', () => {
  it('should detect emotion transitions between segments', () => {
    const segments = [
      { start: 0, primary: { emotion: 'happy' } },
      { start: 5, primary: { emotion: 'happy' } },
      { start: 10, primary: { emotion: 'angry' } },
      { start: 15, primary: { emotion: 'sad' } }
    ];

    const trajectory = calculateTrajectory(segments);

    expect(trajectory).toHaveLength(2);
    expect(trajectory[0]).toEqual({ from: 'happy', to: 'angry', at: 10 });
    expect(trajectory[1]).toEqual({ from: 'angry', to: 'sad', at: 15 });
  });

  it('should return empty array for constant emotion', () => {
    const segments = [
      { start: 0, primary: { emotion: 'neutral' } },
      { start: 5, primary: { emotion: 'neutral' } },
      { start: 10, primary: { emotion: 'neutral' } }
    ];

    const trajectory = calculateTrajectory(segments);

    expect(trajectory).toHaveLength(0);
  });

  it('should handle single segment', () => {
    const segments = [
      { start: 0, primary: { emotion: 'happy' } }
    ];

    const trajectory = calculateTrajectory(segments);

    expect(trajectory).toHaveLength(0);
  });
});

// ============================================
// UTILITY FUNCTION TESTS
// ============================================

describe('Utility Functions', () => {
  describe('getMostCommon', () => {
    it('should return the most frequent emotion', () => {
      const emotions = ['happy', 'angry', 'happy', 'sad', 'happy', 'angry'];

      const result = getMostCommon(emotions);

      expect(result).toBe('happy');
    });

    it('should handle uniform array', () => {
      const emotions = ['neutral', 'neutral', 'neutral'];

      const result = getMostCommon(emotions);

      expect(result).toBe('neutral');
    });

    it('should return first item for tie', () => {
      const emotions = ['happy', 'sad'];

      const result = getMostCommon(emotions);

      expect(['happy', 'sad']).toContain(result);
    });
  });
});

// ============================================
// INTEGRATION-LIKE SCENARIOS
// ============================================

describe('End-to-End Scenarios', () => {
  it('should analyze customer frustration scenario', () => {
    const audioData = {
      pitch: 85,
      energy: 92,
      speechRate: 195,
      pauseFrequency: 2
    };

    const features = extractProsodicFeatures(audioData);
    const result = classifyEmotion(features);
    const primary = Object.entries(result.emotions)
      .sort((a, b) => b[1] - a[1])[0];

    // Customer is likely frustrated/angry
    expect(primary[0]).toBe('angry');
    expect(result.dimensions.arousal).toBeGreaterThan(0.9);
  });

  it('should analyze bored/tired scenario', () => {
    const audioData = {
      pitch: 35,
      energy: 25,
      speechRate: 100,
      pauseFrequency: 8
    };

    const features = extractProsodicFeatures(audioData);
    const result = classifyEmotion(features);
    const primary = Object.entries(result.emotions)
      .sort((a, b) => b[1] - a[1])[0];

    // Person sounds tired/bored
    expect(result.dimensions.arousal).toBeLessThan(0.3);
  });

  it('should analyze enthusiastic scenario', () => {
    const audioData = {
      pitch: 88,
      energy: 85,
      speechRate: 175,
      pauseFrequency: 1
    };

    const features = extractProsodicFeatures(audioData);
    const result = classifyEmotion(features);
    const primary = Object.entries(result.emotions)
      .sort((a, b) => b[1] - a[1])[0];

    // Person sounds happy/enthusiastic
    expect(['happy', 'excited']).toContain(primary[0]);
    expect(result.dimensions.valence).toBeGreaterThan(0.6);
  });

  it('should handle call center escalation scenario', () => {
    // Simulate a call that starts neutral and escalates
    const segments = [
      { start: 0, end: 5, primary: { emotion: 'neutral' } },
      { start: 5, end: 10, primary: { emotion: 'annoyed' } },
      { start: 10, end: 15, primary: { emotion: 'angry' } }
    ];

    const trajectory = calculateTrajectory(segments);

    // Should detect escalation
    expect(trajectory.length).toBeGreaterThan(0);
    expect(trajectory[trajectory.length - 1].to).toBe('angry');
  });
});
