/**
 * Tests for Emotion Detector
 */

import { describe, it, expect, beforeEach } from 'vitest';

const EmotionDetector = require('../../src/core/emotionDetector');

describe('EmotionDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new EmotionDetector({ logger: { info: () => {} } });
  });

  describe('analyze()', () => {
    it('should detect anger in hostile messages', () => {
      const result = detector.analyze('This is RIDICULOUS!! I am furious!');
      expect(result.primary).toBe('anger');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should detect sadness in condolence messages', () => {
      const result = detector.analyze('Sorry to hear about your loss. My condolences.');
      expect(result.primary).toBe('sadness');
    });

    it('should detect confusion in uncertain messages', () => {
      const result = detector.analyze('I am confused. What do you mean??');
      expect(result.primary).toBe('confusion');
    });

    it('should detect urgency in ASAP messages', () => {
      const result = detector.analyze('This is urgent! Need it ASAP!');
      expect(result.primary).toBe('urgency');
    });

    it('should detect happiness in thank-you messages', () => {
      const result = detector.analyze('Thank you so much! This is amazing! ❤️');
      expect(result.primary).toBe('happiness');
    });

    it('should return "none" for neutral messages', () => {
      const result = detector.analyze('Hello, how are you?');
      expect(result.primary).toBe('none');
      expect(result.confidence).toBe(0);
    });

    it('should handle emoji detection', () => {
      const result = detector.analyze('I am so angry 😡');
      expect(result.scores.anger).toBeGreaterThan(0);
    });

    it('should return scores for all emotions', () => {
      const result = detector.analyze('Some text');
      expect(result.scores).toHaveProperty('anger');
      expect(result.scores).toHaveProperty('sadness');
      expect(result.scores).toHaveProperty('confusion');
      expect(result.scores).toHaveProperty('urgency');
      expect(result.scores).toHaveProperty('happiness');
    });
  });

  describe('detectBehaviorSignals()', () => {
    it('should detect stuck behavior with long typing', () => {
      const signals = detector.detectBehaviorSignals({ typingDuration: 40000 });
      expect(signals.stuck).toBe(true);
    });

    it('should detect confused behavior with many pauses', () => {
      const signals = detector.detectBehaviorSignals({ pauseCount: 7 });
      expect(signals.confused).toBe(true);
    });

    it('should detect busy during work hours', () => {
      const signals = detector.detectBehaviorSignals({});
      const hour = new Date().getHours();
      if (hour >= 9 && hour <= 11) {
        expect(signals.busy).toBe(true);
      }
    });
  });

  describe('suggestEmotionButton()', () => {
    it('should suggest Calm This Down for anger', () => {
      const emotionResult = { primary: 'anger', confidence: 0.8 };
      const button = detector.suggestEmotionButton(emotionResult, {});
      expect(button).not.toBeNull();
      expect(button.button).toBe('😡 Calm This Down');
      expect(button.action).toBe('calm_this_down');
    });

    it('should suggest Say Something Nice for sadness', () => {
      const emotionResult = { primary: 'sadness', confidence: 0.7 };
      const button = detector.suggestEmotionButton(emotionResult, {});
      expect(button.button).toBe('💝 Say Something Nice');
    });

    it('should suggest What Should I Reply for stuck behavior', () => {
      const button = detector.suggestEmotionButton({}, { stuck: true });
      expect(button.button).toBe('🤔 What Should I Reply?');
    });

    it('should suggest Quick Reply for busy behavior', () => {
      const button = detector.suggestEmotionButton({}, { busy: true });
      expect(button.button).toBe('⚡ Quick Reply');
    });

    it('should return null for normal messages', () => {
      const button = detector.suggestEmotionButton({ primary: 'none', confidence: 0 }, {});
      expect(button).toBeNull();
    });
  });

  describe('generateReply()', () => {
    it('should generate 3 de-escalation replies for anger', async () => {
      const result = await detector.generateReply('anger', 'This is unacceptable!');
      expect(result.replies).toHaveLength(3);
      expect(result.replies[0]).toBeTruthy();
    });

    it('should generate 3 empathetic replies for sadness', async () => {
      const result = await detector.generateReply('sadness', 'Sorry for your loss');
      expect(result.replies).toHaveLength(3);
    });

    it('should generate 3 short replies for urgency', async () => {
      const result = await detector.generateReply('urgency', 'Need this ASAP');
      expect(result.replies).toHaveLength(3);
      result.replies.forEach(r => {
        expect(r.length).toBeLessThanOrEqual(60); // Short
      });
    });
  });

  describe('getStats()', () => {
    it('should track analysis count', () => {
      detector.analyze('Some text');
      detector.analyze('Another text');
      const stats = detector.getStats();
      expect(stats.totalAnalyses).toBe(2);
    });
  });
});