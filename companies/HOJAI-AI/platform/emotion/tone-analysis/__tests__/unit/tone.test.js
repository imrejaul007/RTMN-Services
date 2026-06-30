import { describe, it, expect } from 'vitest';

const SALES_TONES = {
  opening: ['hello', 'hi', 'good morning', 'how are you'],
  qualification: ['need', 'looking for', 'budget', 'timeline', 'decision'],
  objection: ['but', 'however', 'concern', 'worry', 'expensive', 'too much'],
  negotiation: ['discount', 'price', 'deal', 'offer', 'compromise'],
  closing: ['great', 'perfect', 'deal', "let's do it", 'sign'],
  rapport: ['understand', 'appreciate', 'helpful', 'great talking', 'enjoyed']
};

function analyzeTone(conversation) {
  const results = { overallTone: 'neutral', tones: {}, sentiment: 'neutral', engagement: 0, objections: [], opportunities: [] };
  const text = conversation.toLowerCase();
  for (const [tone, keywords] of Object.entries(SALES_TONES)) {
    const matches = keywords.filter(k => text.includes(k)).length;
    results.tones[tone] = matches;
  }
  const positive = ['great', 'perfect', 'excellent', 'love', 'fantastic'];
  const negative = ['concern', 'worry', 'expensive', 'too much', 'but'];
  let posCount = 0, negCount = 0;
  for (const word of positive) if (text.includes(word)) posCount++;
  for (const word of negative) if (text.includes(word)) negCount++;
  results.sentiment = posCount > negCount ? 'positive' : posCount < negCount ? 'negative' : 'neutral';
  if (results.tones.objection > 0) results.objections.push('Price objection detected');
  if (results.tones.objection > 2) results.objections.push('Multiple objections - may need escalation');
  if (results.tones.closing > 0) results.opportunities.push('Closing opportunity detected');
  if (results.tones.rapport > 2) results.engagement = 0.8;
  else if (results.tones.rapport > 0) results.engagement = 0.5;
  return results;
}

describe('Tone Analysis - Sales Tones', () => {
  it('should detect opening tone', () => {
    const result = analyzeTone('Hello, good morning! How are you today?');
    expect(result.tones.opening).toBeGreaterThan(0);
  });
  it('should detect qualification keywords', () => {
    const result = analyzeTone('I am looking for a solution with a budget of $5000');
    expect(result.tones.qualification).toBeGreaterThan(0);
  });
  it('should detect objection tone', () => {
    const result = analyzeTone('I like it but I am worried about the price');
    expect(result.tones.objection).toBeGreaterThan(0);
  });
  it('should detect negotiation tone', () => {
    const result = analyzeTone('Can you offer a discount on the price?');
    expect(result.tones.negotiation).toBeGreaterThan(0);
  });
  it('should detect closing signals', () => {
    const result = analyzeTone('Great, perfect! Lets do it!');
    expect(result.tones.closing).toBeGreaterThan(0);
  });
  it('should detect rapport building', () => {
    const result = analyzeTone('I understand and appreciate your time. Great talking with you!');
    expect(result.tones.rapport).toBeGreaterThan(0);
  });
});

describe('Tone Analysis - Sentiment', () => {
  it('should detect positive sentiment', () => {
    const result = analyzeTone('This is great and perfect and excellent!');
    expect(result.sentiment).toBe('positive');
  });
  it('should detect negative sentiment', () => {
    const result = analyzeTone('I have a concern and I am worried about the expensive price');
    expect(result.sentiment).toBe('negative');
  });
  it('should detect neutral sentiment', () => {
    const result = analyzeTone('The meeting is scheduled for tomorrow');
    expect(result.sentiment).toBe('neutral');
  });
});

describe('Tone Analysis - Objections', () => {
  it('should flag single objection', () => {
    const result = analyzeTone('I like it but it is expensive');
    expect(result.objections.length).toBeGreaterThan(0);
  });
  it('should flag multiple objections', () => {
    const result = analyzeTone('I like it but however I am worried about the expensive price and too much cost');
    expect(result.objections.length).toBeGreaterThan(1);
  });
  it('should detect closing opportunity', () => {
    const result = analyzeTone('Great, perfect! Lets do it!');
    expect(result.opportunities.length).toBeGreaterThan(0);
  });
});

describe('Tone Analysis - Engagement', () => {
  it('should detect high engagement', () => {
    const result = analyzeTone('I understand and appreciate your help. Great talking with you and enjoyed this conversation!');
    expect(result.engagement).toBe(0.8);
  });
  it('should detect medium engagement', () => {
    const result = analyzeTone('I understand and appreciate your time');
    expect(result.engagement).toBe(0.5);
  });
});

describe('Tone Analysis - Integration', () => {
  it('should analyze complete sales conversation', () => {
    const conversation = 'Hello! I am looking for a new software. I like it but I am worried about the price. Great talking with you!';
    const result = analyzeTone(conversation);
    expect(result.tones.opening).toBeGreaterThan(0);
    expect(result.tones.qualification).toBeGreaterThan(0);
    expect(result.tones.objection).toBeGreaterThan(0);
  });
});
