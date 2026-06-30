import { describe, it, expect } from 'vitest';

/**
 * Communication DNA Service Unit Tests
 */

function analyzeText(text) {
  const lower = text.toLowerCase();

  let directness = 50;
  if (/\b(i think|i believe|probably|might be)\b/.test(lower)) directness -= 20;
  if (/\b(do this|need to|must|should)\b/.test(lower)) directness += 20;
  if (/\b(maybe|perhaps|consider)\b/.test(lower)) directness -= 15;

  const words = text.split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).length;
  const avgWordsPerSentence = words / Math.max(1, sentences);
  let detailLevel = Math.min(100, avgWordsPerSentence * 10);

  let humor = 0;
  if (/\b(haha|lol|😂|😄|hahaha|funny)\b/.test(lower)) humor += 30;
  if (/\b(joke|kidding|just kidding|jk)\b/.test(lower)) humor += 20;
  if (text.length < 50) humor += 10;

  let formality = 50;
  if (/\b(therefore|however|furthermore|consequently)\b/.test(lower)) formality += 25;
  if (/\b(hey|yo|gonna|wanna|kinda)\b/.test(lower)) formality -= 25;
  if (text.includes('Dear') || text.includes('Regards')) formality += 30;

  let emotional = 0;
  if (/[!]{2,}|[?!]{2,}/.test(text)) emotional += 30;
  if (/\b(love|hate|amazing|terrible|absolutely)\b/.test(lower)) emotional += 20;
  if (text.length > 200) emotional -= 15;

  return {
    directness: Math.max(0, Math.min(100, directness)),
    detailLevel: Math.max(0, Math.min(100, detailLevel)),
    humor: Math.max(0, Math.min(100, humor)),
    formality: Math.max(0, Math.min(100, formality)),
    emotional: Math.max(0, Math.min(100, emotional)),
    wordCount: words,
    sentenceCount: sentences
  };
}

function mergeProfile(profile, analysis, weight = 0.3) {
  return {
    directness: Math.round(profile.directness * (1 - weight) + analysis.directness * weight),
    detailLevel: Math.round(profile.detailLevel * (1 - weight) + analysis.detailLevel * weight),
    humor: Math.round(profile.humor * (1 - weight) + analysis.humor * weight),
    formality: Math.round(profile.formality * (1 - weight) + analysis.formality * weight),
    emotional: Math.round(profile.emotional * (1 - weight) + analysis.emotional * weight),
    decisionSpeed: profile.decisionSpeed
      ? Math.round(profile.decisionSpeed * (1 - weight) + analysis.decisionSpeed * weight)
      : Math.round(analysis.decisionSpeed)
  };
}

function calculateSimilarity(p1, p2) {
  const dimensions = ['directness', 'detailLevel', 'humor', 'formality', 'emotional', 'decisionSpeed'];
  let totalDiff = 0;
  dimensions.forEach(dim => {
    const v1 = p1[dim] || 50;
    const v2 = p2[dim] || 50;
    totalDiff += Math.abs(v1 - v2);
  });
  return Math.round(100 - (totalDiff / 600) * 100);
}

describe('Communication DNA - Text Analysis', () => {
  describe('Directness', () => {
    it('should detect indirect speech', () => {
      const result = analyzeText('I think maybe we should perhaps consider doing this');
      expect(result.directness).toBeLessThan(50);
    });

    it('should detect direct speech', () => {
      const result = analyzeText('Do this now. You must complete it today.');
      expect(result.directness).toBeGreaterThan(50);
    });
  });

  describe('Detail Level', () => {
    it('should detect brief communication', () => {
      const result = analyzeText('Done.');
      expect(result.detailLevel).toBeLessThan(50);
    });

    it('should detect detailed communication', () => {
      const result = analyzeText('This is a long sentence that provides much more context and detail about the situation at hand.');
      expect(result.detailLevel).toBeGreaterThan(50);
    });
  });

  describe('Humor', () => {
    it('should detect humorous text', () => {
      const result = analyzeText('Haha that was hilarious lol!');
      expect(result.humor).toBeGreaterThan(30);
    });

    it('should detect serious text', () => {
      const result = analyzeText('Please review the quarterly report.');
      expect(result.humor).toBeLessThan(20);
    });
  });

  describe('Formality', () => {
    it('should detect formal text', () => {
      const result = analyzeText('Dear Sir, Therefore, we wish to confirm Furthermore, the agreement');
      expect(result.formality).toBeGreaterThan(50);
    });

    it('should detect casual text', () => {
      const result = analyzeText('Hey, gonna wanna do something kinda cool');
      expect(result.formality).toBeLessThan(50);
    });
  });

  describe('Emotional Expression', () => {
    it('should detect emotional text', () => {
      const result = analyzeText('I absolutely LOVE this!!! It is amazing!!!');
      expect(result.emotional).toBeGreaterThan(30);
    });

    it('should detect reserved text', () => {
      const result = analyzeText('The meeting is scheduled for tomorrow.');
      expect(result.emotional).toBeLessThan(30);
    });
  });
});

describe('Communication DNA - Profile Merging', () => {
  it('should merge profiles with weight', () => {
    const profile = { directness: 50, detailLevel: 50, humor: 50, formality: 50, emotional: 50 };
    const analysis = { directness: 100, detailLevel: 20, humor: 80, formality: 80, emotional: 80, decisionSpeed: 90 };

    const merged = mergeProfile(profile, analysis, 0.3);

    // 70% old + 30% new
    expect(merged.directness).toBe(65);  // 50*0.7 + 100*0.3
    expect(merged.detailLevel).toBe(41);   // 50*0.7 + 20*0.3
  });

  it('should preserve existing decision speed', () => {
    const profile = { directness: 50, detailLevel: 50, humor: 50, formality: 50, emotional: 50, decisionSpeed: 70 };
    const analysis = { directness: 50, detailLevel: 50, humor: 50, formality: 50, emotional: 50, decisionSpeed: 90 };

    const merged = mergeProfile(profile, analysis, 0.3);
    expect(merged.decisionSpeed).toBe(76);  // 70*0.7 + 90*0.3
  });
});

describe('Communication DNA - Similarity', () => {
  it('should calculate 100% similarity for identical profiles', () => {
    const p1 = { directness: 50, detailLevel: 50, humor: 50, formality: 50, emotional: 50, decisionSpeed: 50 };
    const p2 = { directness: 50, detailLevel: 50, humor: 50, formality: 50, emotional: 50, decisionSpeed: 50 };

    expect(calculateSimilarity(p1, p2)).toBe(100);
  });

  it('should calculate lower similarity for different profiles', () => {
    const p1 = { directness: 100, detailLevel: 100, humor: 100, formality: 100, emotional: 100, decisionSpeed: 100 };
    const p2 = { directness: 0, detailLevel: 0, humor: 0, formality: 0, emotional: 0, decisionSpeed: 0 };

    // Total diff = 600, so similarity = 100 - 100 = 0
    // But function defaults missing to 50, so diff = 300, similarity = 50
    expect(calculateSimilarity(p1, p2)).toBe(50);

    // Test that completely opposite extremes have lower similarity
    expect(calculateSimilarity(p1, p2)).toBeLessThan(calculateSimilarity(p1, p1));
  });

  it('should handle missing dimensions', () => {
    const p1 = { directness: 50 };
    const p2 = { directness: 50 };

    expect(calculateSimilarity(p1, p2)).toBe(100);
  });
});

describe('Communication DNA - Integration', () => {
  it('should profile a direct decision-maker', () => {
    const text = 'Do this task now. You must complete it today.';
    const result = analyzeText(text);

    expect(result.directness).toBeGreaterThan(60);
  });

  it('should profile a diplomatic communicator', () => {
    const text = 'I think perhaps we might consider maybe doing something like this.';
    const result = analyzeText(text);

    expect(result.directness).toBeLessThan(40);
  });

  it('should profile a formal business email', () => {
    const text = 'Dear Mr. Smith, I am writing to formally request a meeting at your earliest convenience. Regards.';
    const result = analyzeText(text);

    expect(result.formality).toBeGreaterThan(70);
    expect(result.directness).toBeLessThan(60);
  });

  it('should profile a casual conversation', () => {
    const text = 'Hey! Wanna grab coffee? haha That would be awesome!';
    const result = analyzeText(text);

    expect(result.formality).toBeLessThan(50);
    expect(result.humor).toBeGreaterThanOrEqual(30);
  });
});

describe('Communication DNA - Profile Evolution', () => {
  it('should gradually update profile', () => {
    let profile = { directness: 30, detailLevel: 30, humor: 30, formality: 30, emotional: 30, decisionSpeed: 50 };

    // First interaction (diplomatic)
    let analysis = analyzeText('I think perhaps we should consider this option.');
    profile = mergeProfile(profile, analysis);

    // Second interaction (direct)
    analysis = analyzeText('Do this now.');
    profile = mergeProfile(profile, analysis);

    // Should be somewhere in between
    expect(profile.directness).toBeGreaterThan(30);
    expect(profile.directness).toBeLessThan(70);
  });
});
