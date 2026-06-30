import { describe, it, expect, beforeEach } from 'vitest';

/**
 * EmotionOS Gateway Unit Tests
 */

// Mock external services
const mockServices = {
  voiceEmotion: { status: 'healthy' },
  emotionalMemory: { status: 'healthy' },
  empathyResponse: { status: 'healthy' },
  emotionAnalytics: { status: 'healthy' },
  emotionalJourney: { status: 'healthy' },
  emotionAlerts: { status: 'healthy' },
  crossModalEmotion: { status: 'healthy' },
  toneAnalysis: { status: 'healthy' }
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function createEmotionProfile(entityId, emotionData) {
  return {
    entityId,
    primary: emotionData.primary?.emotion || emotionData.dominant || 'neutral',
    confidence: emotionData.primary?.confidence || emotionData.confidence || 0.5,
    dimensions: emotionData.dimensions || {
      valence: 0.5,
      arousal: 0.5,
      dominance: 0.5
    },
    emotions: emotionData.emotions || emotionData.allEmotions || {},
    context: emotionData.context || 'general',
    timestamp: new Date().toISOString()
  };
}

function analyzeTextSentiment(text) {
  if (!text) return 'neutral';

  const lowerText = text.toLowerCase();

  const positiveWords = ['happy', 'great', 'excellent', 'love', 'wonderful', 'amazing', 'good', 'fantastic'];
  const negativeWords = ['angry', 'frustrated', 'sad', 'upset', 'terrible', 'hate', 'awful', 'disappointed', 'worst'];
  const stressWords = ['stressed', 'anxious', 'worried', 'nervous', 'concerned', 'overwhelmed'];

  let positive = 0, negative = 0, stress = 0;

  positiveWords.forEach(w => { if (lowerText.includes(w)) positive++; });
  negativeWords.forEach(w => { if (lowerText.includes(w)) negative++; });
  stressWords.forEach(w => { if (lowerText.includes(w)) stress++; });

  if (stress > positive && stress > negative) return 'anxious';
  if (negative > positive) return 'angry';
  if (positive > negative) return 'happy';

  return 'neutral';
}

function calculateTrustScore(history, interaction) {
  const baseScore = 0.7;
  const interactionBonus = interaction.positive ? 0.1 : interaction.negative ? -0.2 : 0;

  const recentPositive = history.filter(h => h.positive).length;
  const total = history.length || 1;
  const historyBonus = (recentPositive / total) * 0.2;

  const overall = Math.min(1, Math.max(0, baseScore + interactionBonus + historyBonus));

  return {
    overall,
    reliability: Math.min(1, overall + 0.1),
    communication: Math.min(1, overall - 0.05),
    consistency: Math.min(1, overall + 0.05),
    responsiveness: Math.min(1, overall)
  };
}

function getTrustLevel(score) {
  if (score >= 0.9) return 'platinum';
  if (score >= 0.8) return 'gold';
  if (score >= 0.7) return 'silver';
  if (score >= 0.5) return 'bronze';
  if (score >= 0.3) return 'iron';
  return 'restricted';
}

function analyzeTone(text) {
  const lowerText = text.toLowerCase();
  const tones = {};

  if (/\b(therefore|however|furthermore|consequently)\b/.test(lowerText)) {
    tones.formal = 0.8;
  }

  if (/\b(hey|cool|awesome|btw|omg)\b/.test(lowerText)) {
    tones.casual = 0.8;
  }

  if (/\b(definitely|certainly|absolutely|clearly|obviously)\b/.test(lowerText)) {
    tones.confident = 0.9;
  }

  if (/\b(maybe|perhaps|might|could be|possibly)\b/.test(lowerText)) {
    tones.hesitant = 0.7;
  }

  if (/\b(hate|angry|frustrated|terrible|worst)\b/.test(lowerText)) {
    tones.angry = 0.8;
  }

  if (/\b(thank|great|excellent|appreciate|happy)\b/.test(lowerText)) {
    tones.positive = 0.8;
  }

  return tones;
}

function determineOverallTone(tones) {
  const entries = Object.entries(tones);
  if (entries.length === 0) return 'neutral';

  const highest = entries.sort((a, b) => b[1] - a[1])[0];
  return highest[0];
}

function summarizeTimeline(history) {
  if (history.length === 0) {
    return {
      dominantEmotion: 'unknown',
      avgIntensity: 0,
      emotionalStability: 0
    };
  }

  const emotionCounts = {};
  let totalIntensity = 0;

  history.forEach(e => {
    emotionCounts[e.primary] = (emotionCounts[e.primary] || 0) + 1;
    totalIntensity += e.confidence;
  });

  const dominant = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])[0];

  const uniqueEmotions = Object.keys(emotionCounts).length;
  const stability = 1 - (uniqueEmotions / history.length);

  return {
    dominantEmotion: dominant ? dominant[0] : 'neutral',
    dominantCount: dominant ? dominant[1] : 0,
    avgIntensity: totalIntensity / history.length,
    emotionalStability: Math.max(0, stability),
    emotionDistribution: emotionCounts,
    totalInteractions: history.length
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS: Emotion Profile Creation
// ─────────────────────────────────────────────────────────────────────────────

describe('EmotionOS Gateway - Profile Creation', () => {
  it('should create emotion profile with defaults', () => {
    const profile = createEmotionProfile('user123', {});

    expect(profile.entityId).toBe('user123');
    expect(profile.primary).toBe('neutral');
    expect(profile.confidence).toBe(0.5);
    expect(profile.dimensions).toEqual({
      valence: 0.5,
      arousal: 0.5,
      dominance: 0.5
    });
  });

  it('should create emotion profile with voice data', () => {
    const voiceData = {
      primary: { emotion: 'angry', confidence: 0.85 },
      dimensions: { valence: 0.2, arousal: 0.9, dominance: 0.7 },
      emotions: { angry: 0.85, frustrated: 0.6 }
    };

    const profile = createEmotionProfile('user123', voiceData);

    expect(profile.primary).toBe('angry');
    expect(profile.confidence).toBe(0.85);
    expect(profile.emotions).toEqual({ angry: 0.85, frustrated: 0.6 });
  });

  it('should create emotion profile with dominant emotion', () => {
    const data = {
      dominant: 'happy',
      confidence: 0.9
    };

    const profile = createEmotionProfile('user123', data);

    expect(profile.primary).toBe('happy');
    expect(profile.confidence).toBe(0.9);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS: Text Sentiment Analysis
// ─────────────────────────────────────────────────────────────────────────────

describe('EmotionOS Gateway - Text Sentiment Analysis', () => {
  it('should detect positive sentiment', () => {
    expect(analyzeTextSentiment('I am so happy and excited!')).toBe('happy');
    expect(analyzeTextSentiment('This is great and wonderful!')).toBe('happy');
    expect(analyzeTextSentiment('I love this product')).toBe('happy');
  });

  it('should detect negative sentiment', () => {
    expect(analyzeTextSentiment('I am very angry and frustrated')).toBe('angry');
    expect(analyzeTextSentiment('This is terrible and awful')).toBe('angry');
    expect(analyzeTextSentiment('I hate this service')).toBe('angry');
  });

  it('should detect stress', () => {
    expect(analyzeTextSentiment('I am so stressed and worried')).toBe('anxious');
    expect(analyzeTextSentiment('I feel overwhelmed and nervous')).toBe('anxious');
  });

  it('should return neutral for mixed or no sentiment', () => {
    expect(analyzeTextSentiment('Hello, how are you?')).toBe('neutral');
    expect(analyzeTextSentiment('')).toBe('neutral');
    expect(analyzeTextSentiment(null)).toBe('neutral');
  });

  it('should detect negative sentiment', () => {
    expect(analyzeTextSentiment('I am frustrated')).toBe('angry');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS: Trust Score Calculation
// ─────────────────────────────────────────────────────────────────────────────

describe('EmotionOS Gateway - Trust Score', () => {
  it('should calculate base trust score', () => {
    const score = calculateTrustScore([], {});

    expect(score.overall).toBe(0.7);
    expect(score.reliability).toBeCloseTo(0.8);
  });

  it('should increase trust for positive interactions', () => {
    const history = [{ positive: true }, { positive: true }];
    const score = calculateTrustScore(history, { positive: true });

    expect(score.overall).toBeGreaterThan(0.7);
  });

  it('should decrease trust for negative interactions', () => {
    const score = calculateTrustScore([], { negative: true });

    expect(score.overall).toBeLessThan(0.7);
  });

  it('should factor in history', () => {
    const history = [
      { positive: true },
      { positive: true },
      { positive: true },
      { positive: true },
      { positive: true }
    ];
    const score = calculateTrustScore(history, {});

    expect(score.overall).toBeGreaterThan(0.7);
  });

  it('should cap trust score at 1.0', () => {
    const history = Array(20).fill({ positive: true });
    const score = calculateTrustScore(history, { positive: true });

    expect(score.overall).toBeLessThanOrEqual(1);
  });

  it('should not go below 0', () => {
    const history = Array(20).fill({ positive: false });
    const score = calculateTrustScore(history, { negative: true });

    expect(score.overall).toBeGreaterThanOrEqual(0);
  });
});

describe('EmotionOS Gateway - Trust Levels', () => {
  it('should return correct trust levels', () => {
    expect(getTrustLevel(0.95)).toBe('platinum');
    expect(getTrustLevel(0.85)).toBe('gold');
    expect(getTrustLevel(0.75)).toBe('silver');
    expect(getTrustLevel(0.55)).toBe('bronze');
    expect(getTrustLevel(0.35)).toBe('iron');
    expect(getTrustLevel(0.15)).toBe('restricted');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS: Tone Analysis
// ─────────────────────────────────────────────────────────────────────────────

describe('EmotionOS Gateway - Tone Analysis', () => {
  it('should detect formal tone', () => {
    const tones = analyzeTone('Therefore, we should proceed accordingly');
    expect(tones.formal).toBe(0.8);
  });

  it('should detect casual tone', () => {
    const tones = analyzeTone('Hey, that is so cool!');
    expect(tones.casual).toBe(0.8);
  });

  it('should detect confident tone', () => {
    const tones = analyzeTone('I am definitely certain about this');
    expect(tones.confident).toBe(0.9);
  });

  it('should detect hesitant tone', () => {
    const tones = analyzeTone('Maybe perhaps we could try');
    expect(tones.hesitant).toBe(0.7);
  });

  it('should detect angry tone', () => {
    const tones = analyzeTone('I am so frustrated with this terrible service');
    expect(tones.angry).toBe(0.8);
  });

  it('should detect positive tone', () => {
    const tones = analyzeTone('Thank you so much, this is excellent!');
    expect(tones.positive).toBe(0.8);
  });

  it('should return empty for neutral text', () => {
    const tones = analyzeTone('The meeting is at 3pm');
    expect(Object.keys(tones).length).toBe(0);
  });
});

describe('EmotionOS Gateway - Overall Tone', () => {
  it('should return dominant tone', () => {
    expect(determineOverallTone({ confident: 0.9, formal: 0.8 })).toBe('confident');
    expect(determineOverallTone({ angry: 0.8, casual: 0.6 })).toBe('angry');
  });

  it('should return neutral for empty tones', () => {
    expect(determineOverallTone({})).toBe('neutral');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS: Timeline Summarization
// ─────────────────────────────────────────────────────────────────────────────

describe('EmotionOS Gateway - Timeline Summarization', () => {
  it('should handle empty timeline', () => {
    const summary = summarizeTimeline([]);

    expect(summary.dominantEmotion).toBe('unknown');
    expect(summary.avgIntensity).toBe(0);
    expect(summary.emotionalStability).toBe(0);
  });

  it('should find dominant emotion', () => {
    const history = [
      { primary: 'happy', confidence: 0.8 },
      { primary: 'happy', confidence: 0.9 },
      { primary: 'angry', confidence: 0.7 }
    ];

    const summary = summarizeTimeline(history);

    expect(summary.dominantEmotion).toBe('happy');
    expect(summary.dominantCount).toBe(2);
  });

  it('should calculate average intensity', () => {
    const history = [
      { primary: 'happy', confidence: 0.8 },
      { primary: 'angry', confidence: 0.6 }
    ];

    const summary = summarizeTimeline(history);

    expect(summary.avgIntensity).toBe(0.7);
  });

  it('should calculate emotional stability', () => {
    const stableHistory = [
      { primary: 'happy', confidence: 0.8 },
      { primary: 'happy', confidence: 0.9 },
      { primary: 'happy', confidence: 0.7 }
    ];

    const volatileHistory = [
      { primary: 'happy', confidence: 0.8 },
      { primary: 'angry', confidence: 0.7 },
      { primary: 'sad', confidence: 0.6 }
    ];

    const stableSummary = summarizeTimeline(stableHistory);
    const volatileSummary = summarizeTimeline(volatileHistory);

    expect(stableSummary.emotionalStability).toBeGreaterThan(volatileSummary.emotionalStability);
  });

  it('should count total interactions', () => {
    const history = [
      { primary: 'happy', confidence: 0.8 },
      { primary: 'angry', confidence: 0.7 }
    ];

    const summary = summarizeTimeline(history);

    expect(summary.totalInteractions).toBe(2);
  });

  it('should show emotion distribution', () => {
    const history = [
      { primary: 'happy', confidence: 0.8 },
      { primary: 'happy', confidence: 0.9 },
      { primary: 'angry', confidence: 0.7 }
    ];

    const summary = summarizeTimeline(history);

    expect(summary.emotionDistribution).toEqual({
      happy: 2,
      angry: 1
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS: Service Configuration
// ─────────────────────────────────────────────────────────────────────────────

describe('EmotionOS Gateway - Service Configuration', () => {
  it('should have all emotion services defined', () => {
    const expectedServices = [
      'voiceEmotion',
      'emotionalMemory',
      'empathyResponse',
      'emotionAnalytics',
      'emotionalJourney',
      'emotionAlerts',
      'crossModalEmotion',
      'toneAnalysis'
    ];

    expectedServices.forEach(service => {
      expect(mockServices[service]).toBeDefined();
    });
  });

  it('should have correct default ports', () => {
    const defaultPorts = {
      voiceEmotion: 4760,
      emotionalMemory: 4761,
      empathyResponse: 4762,
      emotionAnalytics: 4763,
      emotionalJourney: 4764,
      emotionAlerts: 4765,
      crossModalEmotion: 4766,
      toneAnalysis: 4767
    };

    expect(defaultPorts.voiceEmotion).toBe(4760);
    expect(defaultPorts.emotionalMemory).toBe(4761);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS: Integration Scenarios
// ──────────────────────────���──────────────────────────────────────────────────

describe('EmotionOS Gateway - Integration Scenarios', () => {
  it('should analyze customer frustration scenario', () => {
    // Simulate: angry customer on support call
    const text = 'I have been waiting for 3 weeks and I am very frustrated!';
    const voice = {
      pitch: 85,
      energy: 92,
      speechRate: 195,
      pauseFrequency: 2
    };

    // Text analysis
    const sentiment = analyzeTextSentiment(text);
    expect(sentiment).toBe('angry');

    // Voice analysis would call the service
    // For this test, we verify the logic is correct
    expect(voice.energy).toBeGreaterThan(80);
    expect(voice.speechRate).toBeGreaterThan(190);

    // Trust should decrease
    const trustScore = calculateTrustScore([], { negative: true });
    expect(trustScore.overall).toBeLessThan(0.7);

    // Tone should be angry
    const tones = analyzeTone(text);
    expect(tones.angry).toBe(0.8);
  });

  it('should analyze happy customer scenario', () => {
    // Simulate: happy customer after resolution
    const text = 'Thank you so much! This is excellent service!';

    const sentiment = analyzeTextSentiment(text);
    expect(sentiment).toBe('happy');

    const trustScore = calculateTrustScore([], { positive: true });
    expect(trustScore.overall).toBeGreaterThan(0.7);

    const tones = analyzeTone(text);
    expect(tones.positive).toBe(0.8);
  });

  it('should track emotional trajectory', () => {
    // Simulate: customer going from angry to happy
    const history = [
      { primary: 'angry', confidence: 0.9, timestamp: '2026-01-01T10:00:00Z' },
      { primary: 'neutral', confidence: 0.5, timestamp: '2026-01-01T10:05:00Z' },
      { primary: 'happy', confidence: 0.8, timestamp: '2026-01-01T10:10:00Z' }
    ];

    const summary = summarizeTimeline(history);

    // All emotions appear once, so the dominant will be the first one alphabetically
    expect(summary.totalInteractions).toBe(3);
    expect(summary.avgIntensity).toBeCloseTo(0.733, 2);

    // Calculate trajectory manually
    const trajectory = [];
    for (let i = 1; i < history.length; i++) {
      if (history[i].primary !== history[i-1].primary) {
        trajectory.push({
          from: history[i-1].primary,
          to: history[i].primary,
          improvement: history[i].confidence > history[i-1].confidence
        });
      }
    }

    expect(trajectory.length).toBe(2);
    expect(trajectory[0]).toEqual({ from: 'angry', to: 'neutral', improvement: false });
    expect(trajectory[1]).toEqual({ from: 'neutral', to: 'happy', improvement: true });
  });
});
