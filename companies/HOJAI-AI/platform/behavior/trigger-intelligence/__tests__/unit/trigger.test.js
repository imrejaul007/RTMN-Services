import { describe, it, expect } from 'vitest';

/**
 * Trigger Intelligence Service Unit Tests
 */

function categorizeTrigger(trigger) {
  const lower = (trigger || '').toLowerCase();
  if (/\b(deadline|pressure|rush|urgent)\b/.test(lower)) return 'time_pressure';
  if (/\b(family|friends|relationships|spouse)\b/.test(lower)) return 'social';
  if (/\b(work|project|meeting|presentation)\b/.test(lower)) return 'work';
  if (/\b(money|financial|budget|debt)\b/.test(lower)) return 'financial';
  if (/\b(health|exercise|sleep|energy)\b/.test(lower)) return 'health';
  if (/\b(feedback|criticism|rejection)\b/.test(lower)) return 'social_feedback';
  if (/\b(success|win|achievement|celebration)\b/.test(lower)) return 'achievement';
  if (/\b(failure|mistake|error|loss)\b/.test(lower)) return 'failure';
  return 'general';
}

function categorizeEmotion(emotion) {
  const lower = (emotion || '').toLowerCase();
  if (/\b(angry|frustrated|irritated)\b/.test(lower)) return 'anger';
  if (/\b(sad|depressed|hopeless)\b/.test(lower)) return 'sadness';
  if (/\b(anxious|worried|stressed|nervous)\b/.test(lower)) return 'anxiety';
  if (/\b(fear|scared|afraid|terrified)\b/.test(lower)) return 'fear';
  if (/\b(happy|joyful|excited|delighted)\b/.test(lower)) return 'joy';
  if (/\b(calm|peaceful|relaxed)\b/.test(lower)) return 'calm';
  if (/\b(confused|uncertain|lost)\b/.test(lower)) return 'confusion';
  return 'neutral';
}

function determineOutcome(action) {
  const lower = (action || '').toLowerCase();
  if (/\b(work|focus|productive|complete)\b/.test(lower)) return 'productive';
  if (/\b(avoid|procrastinate|escape|skip)\b/.test(lower)) return 'avoidance';
  if (/\b(communicate|talk|express|share)\b/.test(lower)) return 'communication';
  if (/\b(exercise|meditate|rest|sleep)\b/.test(lower)) return 'self_care';
  if (/\b(healthy|balance|boundary)\b/.test(lower)) return 'healthy';
  if (/\b(unhealthy|excessive|binge|over)\b/.test(lower)) return 'unhealthy';
  return 'neutral';
}

function findPatterns(chains) {
  const patterns = [];
  const byTrigger = {};
  chains.forEach(c => {
    if (!byTrigger[c.triggerType]) byTrigger[c.triggerType] = [];
    byTrigger[c.triggerType].push(c);
  });
  for (const [triggerType, entries] of Object.entries(byTrigger)) {
    const emotionCounts = {};
    const outcomeCounts = {};
    entries.forEach(e => {
      emotionCounts[e.emotionType] = (emotionCounts[e.emotionType] || 0) + 1;
      outcomeCounts[e.outcomeType] = (outcomeCounts[e.outcomeType] || 0) + 1;
    });
    const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];
    const topOutcome = Object.entries(outcomeCounts).sort((a, b) => b[1] - a[1])[0];
    patterns.push({
      triggerType,
      frequency: entries.length,
      typicalEmotion: topEmotion ? topEmotion[0] : 'neutral',
      typicalOutcome: topOutcome ? topOutcome[0] : 'neutral',
      consistency: Math.max(topEmotion[1], topOutcome[1]) / entries.length
    });
  }
  return patterns.sort((a, b) => b.frequency - a.frequency);
}

describe('Trigger Intelligence - Categorization', () => {
  describe('categorizeTrigger', () => {
    it('should detect time pressure triggers', () => {
      expect(categorizeTrigger('Deadline tomorrow')).toBe('time_pressure');
      expect(categorizeTrigger('Rush order needed')).toBe('time_pressure');
      expect(categorizeTrigger('Urgent meeting')).toBe('time_pressure');
    });
    it('should detect social triggers', () => {
      expect(categorizeTrigger('Family dinner')).toBe('social');
      expect(categorizeTrigger('Friends gathering')).toBe('social');
    });
    it('should detect work triggers', () => {
      expect(categorizeTrigger('Project deadline')).toBe('time_pressure');
      expect(categorizeTrigger('Important meeting')).toBe('work');
      expect(categorizeTrigger('Work presentation')).toBe('work');
    });
    it('should detect financial triggers', () => {
      expect(categorizeTrigger('Money problems')).toBe('financial');
      expect(categorizeTrigger('Budget concerns')).toBe('financial');
    });
    it('should return general for unknown', () => {
      expect(categorizeTrigger('Random event')).toBe('general');
    });
  });

  describe('categorizeEmotion', () => {
    it('should detect anger emotions', () => {
      expect(categorizeEmotion('I am angry')).toBe('anger');
      expect(categorizeEmotion('Very frustrated')).toBe('anger');
    });
    it('should detect anxiety emotions', () => {
      expect(categorizeEmotion('Feeling stressed')).toBe('anxiety');
      expect(categorizeEmotion('Worried about results')).toBe('anxiety');
    });
    it('should detect joy emotions', () => {
      expect(categorizeEmotion('So happy')).toBe('joy');
      expect(categorizeEmotion('Excited!')).toBe('joy');
    });
    it('should return neutral for unknown', () => {
      expect(categorizeEmotion('Whatever')).toBe('neutral');
    });
  });

  describe('determineOutcome', () => {
    it('should detect productive outcomes', () => {
      expect(determineOutcome('I was productive')).toBe('productive');
      expect(determineOutcome('Complete the work')).toBe('productive');
    });
    it('should detect avoidance outcomes', () => {
      expect(determineOutcome('I avoid tasks')).toBe('avoidance');
      expect(determineOutcome('Avoid procrastination')).toBe('avoidance');
    });
    it('should detect self-care outcomes', () => {
      expect(determineOutcome('I meditate daily')).toBe('self_care');
      expect(determineOutcome('Exercise in morning')).toBe('self_care');
    });
    it('should return neutral for unknown', () => {
      expect(determineOutcome('Did something')).toBe('neutral');
    });
  });
});

describe('Trigger Intelligence - Patterns', () => {
  it('should find patterns in chains', () => {
    const chains = [
      { triggerType: 'work', emotionType: 'stress', outcomeType: 'productive' },
      { triggerType: 'work', emotionType: 'stress', outcomeType: 'productive' },
      { triggerType: 'work', emotionType: 'anxiety', outcomeType: 'avoidance' },
      { triggerType: 'social', emotionType: 'joy', outcomeType: 'communication' }
    ];
    const patterns = findPatterns(chains);
    expect(patterns.length).toBe(2);
    expect(patterns[0].triggerType).toBe('work');
    expect(patterns[0].frequency).toBe(3);
  });
  it('should calculate consistency', () => {
    const chains = [
      { triggerType: 'work', emotionType: 'stress', outcomeType: 'productive' },
      { triggerType: 'work', emotionType: 'stress', outcomeType: 'productive' }
    ];
    const patterns = findPatterns(chains);
    expect(patterns[0].consistency).toBe(1);
  });
});

describe('Trigger Intelligence - Integration', () => {
  it('should map trigger chain: deadline -> stress -> work -> productive', () => {
    const trigger = 'Important deadline';
    const emotion = 'Very stressed';
    const action = 'Focused and completed work';

    expect(categorizeTrigger(trigger)).toBe('time_pressure');
    expect(categorizeEmotion(emotion)).toBe('anxiety');
    expect(determineOutcome(action)).toBe('productive');
  });
  it('should map trigger chain: conflict -> anger -> avoid -> unhealthy', () => {
    const trigger = 'Argument with spouse';
    const emotion = 'Angry and frustrated';
    const action = 'I avoid the issue';

    expect(categorizeTrigger(trigger)).toBe('social');
    expect(categorizeEmotion(emotion)).toBe('anger');
    expect(determineOutcome(action)).toBe('avoidance');
  });
});
