/**
 * Unit tests for Voice Widget
 */
import { describe, it, expect } from 'vitest';

function mapLanguageToSpeech(lang) {
  const map = {
    'en': 'en-IN', 'en-IN': 'en-IN',
    'hi': 'hi-IN', 'hi-IN': 'hi-IN',
    'ta': 'ta-IN', 'ta-IN': 'ta-IN',
    'te': 'te-IN', 'te-IN': 'te-IN',
    'ml': 'ml-IN', 'ml-IN': 'ml-IN',
    'bn': 'bn-IN', 'bn-IN': 'bn-IN'
  };
  return map[lang] || 'en-IN';
}

function routeIVR(input, menu) {
  const dtmf = input?.dtmf;
  if (dtmf && menu[dtmf]) return menu[dtmf];
  return menu['0']; // default to operator
}

function estimateSpeechDuration(text, wpm = 150) {
  const words = text.split(/\s+/).length;
  return Math.ceil((words / wpm) * 60);
}

describe('Voice Widget', () => {
  it('should map Indian languages correctly', () => {
    expect(mapLanguageToSpeech('en')).toBe('en-IN');
    expect(mapLanguageToSpeech('hi')).toBe('hi-IN');
    expect(mapLanguageToSpeech('ta')).toBe('ta-IN');
  });

  it('should default to English for unknown', () => {
    expect(mapLanguageToSpeech('fr')).toBe('en-IN');
    expect(mapLanguageToSpeech('unknown')).toBe('en-IN');
  });

  it('should route IVR by DTMF', () => {
    const menu = {
      '1': 'sales', '2': 'support', '3': 'tracking', '0': 'operator'
    };
    expect(routeIVR({ dtmf: '1' }, menu)).toBe('sales');
    expect(routeIVR({ dtmf: '3' }, menu)).toBe('tracking');
    expect(routeIVR({}, menu)).toBe('operator');
  });

  it('should estimate speech duration', () => {
    const text = 'Welcome to our automated assistant. How can I help you today?';
    const duration = estimateSpeechDuration(text);
    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThan(30);
  });
});
