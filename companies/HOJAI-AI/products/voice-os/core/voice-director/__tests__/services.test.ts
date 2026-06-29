/**
 * Voice Director - Service Tests
 */

import { describe, it, expect } from 'vitest';
import { DirectiveGenerator } from '../src/services/directiveGenerator.js';
import { SpeechMarkup } from '../src/services/speechMarkup.js';
import type { VoiceDirective } from '../src/types/index.js';

describe('DirectiveGenerator', () => {
  describe('generate', () => {
    it('should generate directive for excited emotion', () => {
      const directive = DirectiveGenerator.generate('excited');

      expect(directive.emotion).toBe('excited');
      expect(directive.pace).toBeGreaterThan(1.0);
      expect(directive.energy).toBe('high');
    });

    it('should generate directive for sad emotion', () => {
      const directive = DirectiveGenerator.generate('sad');

      expect(directive.emotion).toBe('concerned');
      expect(directive.pace).toBeLessThan(1.0);
      expect(directive.energy).toBe('low');
    });

    it('should generate directive for happy emotion', () => {
      const directive = DirectiveGenerator.generate('happy');

      expect(directive.emotion).toBe('happy');
      expect(directive.smile).toBe(true);
    });

    it('should apply mother relationship warmth', () => {
      const directive = DirectiveGenerator.generate('calm', 'mother');

      expect(directive.warmth).toBeGreaterThan(0.5);
    });

    it('should apply friend personality mode', () => {
      const directive = DirectiveGenerator.generate('excited', undefined, 'friend');

      expect(directive.emotion).toBe('excited');
      expect(directive.formality).toBeLessThan(0.5);
    });

    it('should adjust pace for night time', () => {
      const dayDirective = DirectiveGenerator.generate('calm', undefined, undefined, { timeOfDay: 'morning' });
      const nightDirective = DirectiveGenerator.generate('calm', undefined, undefined, { timeOfDay: 'night' });

      expect(nightDirective.pace).toBeLessThan(dayDirective.pace);
    });

    it('should increase pace for urgent context', () => {
      const normalDirective = DirectiveGenerator.generate('calm', undefined, undefined, { urgency: 'low' });
      const urgentDirective = DirectiveGenerator.generate('calm', undefined, undefined, { urgency: 'high' });

      expect(urgentDirective.pace).toBeGreaterThan(normalDirective.pace);
    });

    it('should set soft volume for sad emotion', () => {
      const directive = DirectiveGenerator.generate('sadness');

      expect(directive.volume).toBe('soft');
    });

    it('should set loud volume for excited emotion', () => {
      const directive = DirectiveGenerator.generate('excited');

      expect(directive.volume).toBe('loud');
    });

    it('should include warm expressions for warm emotion', () => {
      const directive = DirectiveGenerator.generate('warm');

      expect(directive.expressions).toContain('WARM');
      expect(directive.expressions).toContain('SMILE');
    });

    it('should include expressions for celebratory emotion', () => {
      const directive = DirectiveGenerator.generate('celebratory');

      expect(directive.expressions).toContain('EXCITED');
      expect(directive.expressions).toContain('SMILE');
    });

    it('should return default directive for unknown emotion', () => {
      const directive = DirectiveGenerator.generate('some-unknown-emotion');

      expect(directive.emotion).toBe('calm');
    });
  });
});

describe('SpeechMarkup', () => {
  const mockDirective: VoiceDirective = {
    emotion: 'happy',
    pace: 1.0,
    volume: 'normal',
    pauseBeforeMs: 200,
    pauseAfterMs: 250,
    emphasis: ['congratulations'],
    expressions: ['SMILE'],
    smile: true,
    energy: 'medium',
    warmth: 0.7,
    formality: 0.5
  };

  describe('generateBlueprint', () => {
    it('should generate blueprint with timing info', () => {
      const blueprint = SpeechMarkup.generateBlueprint('Congratulations, you did it!', mockDirective);

      expect(blueprint.text).toBe('Congratulations, you did it!');
      expect(blueprint.directive).toEqual(mockDirective);
      expect(blueprint.timing.estimatedDurationMs).toBeGreaterThan(0);
    });

    it('should include pause points for punctuation', () => {
      const blueprint = SpeechMarkup.generateBlueprint('Hello, how are you? I am fine.', mockDirective);

      expect(blueprint.timing.pausePoints.length).toBeGreaterThan(0);
    });

    it('should include meta info', () => {
      const blueprint = SpeechMarkup.generateBlueprint('Test text', mockDirective, {
        relationship: 'friend',
        originalEmotion: 'happy'
      });

      expect(blueprint.meta.relationship).toBe('friend');
      expect(blueprint.meta.originalEmotion).toBe('happy');
    });
  });

  describe('toSSML', () => {
    it('should generate valid SSML markup', () => {
      const blueprint = SpeechMarkup.generateBlueprint('Hello world', mockDirective);
      const ssml = SpeechMarkup.toSSML(blueprint);

      expect(ssml).toContain('<speak>');
      expect(ssml).toContain('</speak>');
      expect(ssml).toContain('Hello world');
    });

    it('should include break tags for pauses', () => {
      const blueprint = SpeechMarkup.generateBlueprint('Hello, world', mockDirective);
      const ssml = SpeechMarkup.toSSML(blueprint);

      expect(ssml).toContain('<break');
    });

    it('should escape XML special characters', () => {
      const blueprint = SpeechMarkup.generateBlueprint('Less than < greater than >', mockDirective);
      const ssml = SpeechMarkup.toSSML(blueprint);

      expect(ssml).toContain('&lt;');
      expect(ssml).toContain('&gt;');
    });
  });

  describe('toTimedText', () => {
    it('should include SMILE marker', () => {
      const blueprint = SpeechMarkup.generateBlueprint('Congratulations!', mockDirective);
      const timed = SpeechMarkup.toTimedText(blueprint);

      expect(timed).toContain('[SMILE]');
    });

    it('should include expression markers', () => {
      const directiveWithExpr: VoiceDirective = {
        ...mockDirective,
        expressions: ['EXCITED', 'BREATH']
      };
      const blueprint = SpeechMarkup.generateBlueprint('Amazing!', directiveWithExpr);
      const timed = SpeechMarkup.toTimedText(blueprint);

      expect(timed).toContain('[EXCITED]');
      expect(timed).toContain('[BREATH]');
    });
  });

  describe('toJsonDirective', () => {
    it('should generate JSON directive with prosody info', () => {
      const blueprint = SpeechMarkup.generateBlueprint('Test', mockDirective);
      const json = SpeechMarkup.toJsonDirective(blueprint) as Record<string, unknown>;

      expect(json).toHaveProperty('text');
      expect(json).toHaveProperty('emotion');
      expect(json).toHaveProperty('prosody');
      expect(json).toHaveProperty('pauses');
    });

    it('should include emotion in output', () => {
      const blueprint = SpeechMarkup.generateBlueprint('Test', mockDirective);
      const json = SpeechMarkup.toJsonDirective(blueprint) as Record<string, unknown>;

      expect(json.emotion).toBe('happy');
    });
  });
});
