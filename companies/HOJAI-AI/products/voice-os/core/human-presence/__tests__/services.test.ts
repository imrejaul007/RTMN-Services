/**
 * Human Presence Engine - Service Tests
 */

import { describe, it, expect } from 'vitest';
import { PresenceDetector } from '../src/services/presenceDetector.js';

describe('PresenceDetector', () => {
  describe('detectState', () => {
    it('should detect focused state in meeting', () => {
      const state = PresenceDetector.detectState(
        { calendarStatus: 'in-meeting' },
        70,
        80
      );

      expect(state).toBe('focused');
    });

    it('should detect tired state with low energy', () => {
      const state = PresenceDetector.detectState(
        {},
        20,
        60
      );

      expect(state).toBe('tired');
    });

    it('should detect distracted state with low attention', () => {
      const state = PresenceDetector.detectState(
        {},
        60,
        30
      );

      expect(state).toBe('distracted');
    });

    it('should detect relaxed state at night', () => {
      const state = PresenceDetector.detectState(
        {},
        50,
        70
      );

      expect(state).toBeTruthy();
    });
  });

  describe('calculateEnergy', () => {
    it('should calculate energy from speaking pace', () => {
      const energy = PresenceDetector.calculateEnergy({
        speakingPace: 160
      });

      expect(energy.mental).toBe('high');
    });

    it('should calculate energy from pause frequency', () => {
      const energy = PresenceDetector.calculateEnergy({
        pauseFrequency: 8
      });

      expect(energy.physical).toBeTruthy();
    });

    it('should handle empty signals', () => {
      const energy = PresenceDetector.calculateEnergy({});

      expect(energy.score).toBeGreaterThan(0);
    });
  });

  describe('generateAdaptation', () => {
    it('should generate adaptation for tired user', () => {
      const presence = {
        userId: 'user-1',
        state: 'tired' as const,
        energy: {
          mental: 'low' as const,
          physical: 'low' as const,
          emotional: 'medium' as const,
          social: 'medium' as const,
          overall: 'low' as const,
          score: 25,
          trend: 'stable' as const,
          lastUpdated: new Date().toISOString()
        },
        attention: {
          level: 60,
          focus: 60,
          distractions: 2,
          lastFocused: new Date().toISOString(),
          focusDuration: 300,
          pattern: 'engaged' as const
        },
        curiosity: {
          level: 50,
          topics: [],
          questionsAsked: 0,
          deepDives: 0,
          pattern: 'engaged' as const
        },
        humor: {
          level: 50,
          jokesMade: 0,
          laughterDetected: 0,
          appropriateTopics: [],
          inappropriateTopics: [],
          pattern: 'neutral' as const
        },
        conflict: {
          level: 0,
          disagreementDetected: false,
          topicsOfDisagreement: [],
          responseStyle: 'collaborating' as const,
          openness: 80
        },
        context: {},
        lastUpdated: new Date().toISOString(),
        confidence: 70
      };

      const adaptation = PresenceDetector.generateAdaptation(presence);

      expect(adaptation.responsePace).toBeLessThan(120);
      expect(adaptation.responseLength).toBeTruthy();
      expect(adaptation.humor).toBe('none');
    });

    it('should generate adaptation for focused office worker', () => {
      const presence = {
        userId: 'user-1',
        state: 'focused' as const,
        energy: {
          mental: 'high' as const,
          physical: 'high' as const,
          emotional: 'medium' as const,
          social: 'medium' as const,
          overall: 'high' as const,
          score: 85,
          trend: 'stable' as const,
          lastUpdated: new Date().toISOString()
        },
        attention: {
          level: 90,
          focus: 95,
          distractions: 0,
          lastFocused: new Date().toISOString(),
          focusDuration: 1800,
          pattern: 'deep-focus' as const
        },
        curiosity: {
          level: 70,
          topics: [],
          questionsAsked: 5,
          deepDives: 3,
          pattern: 'exploratory' as const
        },
        humor: {
          level: 30,
          jokesMade: 0,
          laughterDetected: 0,
          appropriateTopics: [],
          inappropriateTopics: [],
          pattern: 'serious' as const
        },
        conflict: {
          level: 0,
          disagreementDetected: false,
          topicsOfDisagreement: [],
          responseStyle: 'collaborating' as const,
          openness: 80
        },
        context: {
          location: 'office' as const,
          socialContext: 'colleagues' as const
        },
        lastUpdated: new Date().toISOString(),
        confidence: 85
      };

      const adaptation = PresenceDetector.generateAdaptation(presence);

      expect(adaptation.formality).toBeGreaterThan(0.5);
      expect(adaptation.interruptions).toBe('none');
      expect(adaptation.emotion).toBe('professional');
    });
  });

  describe('detectAttentionPattern', () => {
    it('should detect scattered attention', () => {
      const pattern = PresenceDetector.detectAttentionPattern(12, 2, 5);

      expect(pattern).toBe('scattered');
    });

    it('should detect deep focus', () => {
      const pattern = PresenceDetector.detectAttentionPattern(1, 5, 1);

      expect(pattern).toBe('deep-focus');
    });
  });

  describe('detectCuriosity', () => {
    it('should detect exploratory curiosity', () => {
      const pattern = PresenceDetector.detectCuriosity(8, 5, 6);

      expect(pattern).toBe('exploratory');
    });

    it('should detect passive state', () => {
      const pattern = PresenceDetector.detectCuriosity(0, 0, 1);

      expect(pattern).toBe('passive');
    });
  });
});
