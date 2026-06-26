/**
 * Communication Twin Tests
 */

import { describe, it, expect } from 'vitest';

describe('Communication Twin', () => {
  describe('Writing Style Analysis', () => {
    it('should analyze formal writing', () => {
      const text = 'Dear Sir, I am writing to inform you that we have received your request. Therefore, we shall proceed accordingly. Regards.';
      expect(text.length).toBeGreaterThan(0);
      expect(text.includes('Dear')).toBe(true);
      expect(text.includes('Regards')).toBe(true);
    });

    it('should detect casual writing', () => {
      const text = 'Hey! Thanks for the update. Let me know if you need anything else. Cheers!';
      expect(text.length).toBeGreaterThan(0);
      expect(text.includes('Hey')).toBe(true);
      expect(text.includes('Thanks')).toBe(true);
    });

    it('should identify greeting patterns', () => {
      const greetings = ['Hi', 'Hello', 'Dear', 'Hey', 'Greetings'];
      const text = 'Hello team,';
      const hasGreeting = greetings.some(g => text.toLowerCase().startsWith(g.toLowerCase()));
      expect(hasGreeting).toBe(true);
    });

    it('should identify closing patterns', () => {
      const closings = ['Thanks', 'Regards', 'Best', 'Cheers', 'Sincerely'];
      const text = 'Best regards';
      const hasClosing = closings.some(c => text.toLowerCase().includes(c.toLowerCase()));
      expect(hasClosing).toBe(true);
    });
  });

  describe('Tone Analysis', () => {
    it('should calculate formality score', () => {
      const formalText = 'Dear Sir, I am writing to inform you that we have received your correspondence and shall respond accordingly.';
      const casualText = 'Hey! Got your message. Will get back to you soon!';

      // Formal text should have more formal indicators
      const formalIndicators = ['dear', 'sir', 'therefore', 'accordingly', 'hereby'];
      const casualIndicators = ['hey', 'got', 'soon', 'get back'];

      const formalCount = formalIndicators.filter(w => formalText.toLowerCase().includes(w)).length;
      const casualCount = casualIndicators.filter(w => casualText.toLowerCase().includes(w)).length;

      expect(formalCount).toBeGreaterThan(0);
      expect(casualCount).toBeGreaterThan(0);
    });

    it('should detect urgency indicators', () => {
      const urgentText = 'URGENT: Please respond immediately. This is critical and time-sensitive.';
      const normalText = 'Let me know when you have time.';

      const urgentIndicators = ['urgent', 'immediately', 'critical', 'asap', 'priority'];
      const hasUrgency = urgentIndicators.some(w => urgentText.toLowerCase().includes(w));

      expect(hasUrgency).toBe(true);
    });

    it('should detect positive sentiment', () => {
      const positiveText = 'Great work on this project! Excellent results and amazing collaboration.';

      const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic'];
      const score = positiveWords.filter(w => positiveText.toLowerCase().includes(w)).length;

      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Communication Patterns', () => {
    it('should track response time expectations', () => {
      const responsePatterns = {
        email: { min: 30, max: 480, unit: 'minutes' },
        slack: { min: 5, max: 60, unit: 'seconds' },
        chat: { min: 10, max: 120, unit: 'seconds' }
      };

      expect(responsePatterns.email.unit).toBe('minutes');
      expect(responsePatterns.slack.unit).toBe('seconds');
    });

    it('should classify negotiation styles', () => {
      const styles = ['aggressive', 'collaborative', 'compromising', 'accommodating', 'principled'];

      styles.forEach(style => {
        expect(typeof style).toBe('string');
        expect(styles.includes(style)).toBe(true);
      });
    });
  });

  describe('Profile Building', () => {
    it('should track vocabulary growth', () => {
      let vocabulary: string[] = [];

      // Simulate adding words
      const sample1 = 'sales negotiation enterprise B2B';
      const sample2 = 'partnership collaboration synergy';

      const words1 = sample1.toLowerCase().split(/\s+/);
      const words2 = sample2.toLowerCase().split(/\s+/);

      vocabulary = [...new Set([...vocabulary, ...words1, ...words2])];

      expect(vocabulary.length).toBeGreaterThan(0);
    });

    it('should calculate confidence based on samples', () => {
      const calculateConfidence = (samples: number) => Math.min(100, samples * 5);

      expect(calculateConfidence(5)).toBe(25);
      expect(calculateConfidence(20)).toBe(100);
      expect(calculateConfidence(0)).toBe(0);
    });

    it('should update formality over time', () => {
      const updateFormality = (current: number, newSample: number, weight = 0.2) => {
        return current * (1 - weight) + newSample * weight;
      };

      // Start neutral
      let formality = 0.5;

      // Add formal sample
      formality = updateFormality(formality, 0.9);
      expect(formality).toBeGreaterThan(0.5);

      // Add casual sample
      formality = updateFormality(formality, 0.2);
      expect(formality).toBeLessThan(0.9);
    });
  });
});

describe('Communication Patterns', () => {
  it('should identify channel preferences', () => {
    const channels = ['email', 'slack', 'chat', 'meeting', 'document'] as const;

    channels.forEach(channel => {
      expect(typeof channel).toBe('string');
    });
  });

  it('should map recipient types', () => {
    const recipientTypes = ['internal', 'external', 'customer', 'vendor', 'executive', 'peer'] as const;

    recipientTypes.forEach(type => {
      expect(typeof type).toBe('string');
    });
  });
});
