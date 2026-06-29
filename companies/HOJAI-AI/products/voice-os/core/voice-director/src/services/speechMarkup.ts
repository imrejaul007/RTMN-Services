/**
 * Speech Markup Service
 * ====================
 * Converts text + voice directive into TTS-ready markup with pauses, emphasis, and expressions.
 */

import type { VoiceDirective, VoiceExpression, PausePoint, ExpressionTiming, VoiceBlueprint } from '../types/index.js';

export class SpeechMarkup {
  /**
   * Generate complete voice blueprint from text and directive
   */
  static generateBlueprint(
    text: string,
    directive: VoiceDirective,
    meta?: {
      relationship?: string;
      context?: string;
      originalEmotion?: string;
    }
  ): VoiceBlueprint {
    // Calculate pause points
    const pausePoints = this.calculatePausePoints(text, directive);

    // Calculate expression timings
    const expressionTimings = this.calculateExpressionTimings(text, directive, pausePoints);

    // Estimate duration
    const estimatedDurationMs = this.estimateDuration(text, directive, pausePoints);

    return {
      text,
      directive,
      timing: {
        estimatedDurationMs,
        pausePoints,
        expressionTimings
      },
      meta: {
        relationship: meta?.relationship,
        context: meta?.context,
        originalEmotion: meta?.originalEmotion,
        generatedAt: Date.now()
      }
    };
  }

  /**
   * Convert blueprint to SSML (Speech Synthesis Markup Language)
   */
  static toSSML(blueprint: VoiceBlueprint): string {
    const { text, directive, timing } = blueprint;

    // Build SSML with pauses and expressions
    let ssml = '<speak>';

    // Add namespace and voice attributes
    ssml += `<voice`;

    // Add emotion-based voice adjustment hints as prosody
    const prosody = this.getProsodyTags(directive);
    if (prosody) {
      ssml += `><prosody ${prosody}>`;
    }

    // Process text with pauses and expressions
    let processedText = text;
    const segments: { text: string; pauseAfter?: number; expression?: VoiceExpression }[] = [];

    let lastPos = 0;
    const sortedPauses = [...timing.pausePoints].sort((a, b) => a.position - b.position);
    const sortedExpressions = [...timing.expressionTimings].sort((a, b) => a.startPosition - b.startPosition);

    // Build segments
    for (const pause of sortedPauses) {
      if (pause.position > lastPos) {
        segments.push({
          text: text.substring(lastPos, pause.position),
          pauseAfter: pause.durationMs,
          expression: sortedExpressions.find(e => e.startPosition === pause.position)?.expression
        });
        lastPos = pause.position;
      }
    }

    // Add remaining text
    if (lastPos < text.length) {
      segments.push({ text: text.substring(lastPos) });
    }

    // Build SSML
    for (const segment of segments) {
      // Add expression marker if present
      if (segment.expression) {
        ssml += this.getExpressionMarker(segment.expression);
      }

      // Add text
      ssml += this.escapeXml(segment.text);

      // Add pause
      if (segment.pauseAfter && segment.pauseAfter > 0) {
        ssml += `<break time="${segment.pauseAfter}ms"/>`;
      }
    }

    // Close prosody tag if opened
    if (this.getProsodyTags(directive)) {
      ssml += '</prosody></voice>';
    }

    ssml += '</speak>';

    return ssml;
  }

  /**
   * Convert blueprint to plain text with timing markers (for simple TTS)
   */
  static toTimedText(blueprint: VoiceBlueprint): string {
    const { text, directive, timing } = blueprint;

    let result = text;
    const markers: string[] = [];

    // Add pre-text markers
    if (directive.smile) {
      markers.push('[SMILE]');
    }
    if (directive.expressions.includes('WARM')) {
      markers.push('[WARM]');
    }

    // Add expression markers
    for (const expr of directive.expressions) {
      if (!markers.includes(`[${expr}]`)) {
        markers.push(`[${expr}]`);
      }
    }

    // Build result with timing markers
    result = markers.join(' ') + ' ' + result;

    // Add pause markers
    for (const pause of timing.pausePoints) {
      if (pause.durationMs >= 300) {
        const pauseText = pause.durationMs >= 1000
          ? `[PAUSE ${Math.round(pause.durationMs / 1000)}s]`
          : `[PAUSE ${pause.durationMs}ms]`;
        // Insert at approximate position (this is simplified)
        const words = result.split(' ');
        const wordIndex = Math.floor((pause.position / text.length) * words.length);
        if (wordIndex < words.length) {
          words.splice(wordIndex, 0, pauseText);
          result = words.join(' ');
        }
      }
    }

    // Add post-text markers
    if (directive.expressions.includes('SIGH')) {
      result += ' [SIGH]';
    }
    if (directive.expressions.includes('BREATH')) {
      result += ' [BREATH]';
    }

    return result;
  }

  /**
   * Generate JSON directive for custom TTS integration
   */
  static toJsonDirective(blueprint: VoiceBlueprint): object {
    return {
      text: blueprint.text,
      emotion: blueprint.directive.emotion,
      prosody: {
        rate: `${Math.round(blueprint.directive.pace * 100)}%`,
        volume: this.volumeToSsml(blueprint.directive.volume),
        pitch: this.getPitchAdjustment(blueprint.directive.emotion)
      },
      pauses: blueprint.timing.pausePoints.map(p => ({
        after: p.position,
        duration: p.durationMs,
        type: p.reason
      })),
      expressions: blueprint.timing.expressionTimings.map(e => ({
        type: e.expression,
        start: e.startPosition,
        duration: e.durationMs
      })),
      modifiers: {
        smile: blueprint.directive.smile,
        warmth: blueprint.directive.warmth,
        emphasis: blueprint.directive.emphasis
      }
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Calculate pause points from text punctuation and emotion
   */
  private static calculatePausePoints(
    text: string,
    directive: VoiceDirective
  ): PausePoint[] {
    const pausePoints: PausePoint[] = [];

    // Punctuation-based pauses
    const patterns = [
      { regex: /[.!?]/g, duration: directive.pauseAfterMs, reason: 'period' as const },
      { regex: /[,]/g, duration: Math.round(directive.pauseAfterMs * 0.5), reason: 'comma' as const },
      { regex: /[;]/g, duration: Math.round(directive.pauseAfterMs * 0.7), reason: 'comma' as const },
      { regex: /[—–-]/g, duration: directive.pauseAfterMs * 1.5, reason: 'correction' as const }
    ];

    for (const { regex, duration, reason } of patterns) {
      let match;
      while ((match = regex.exec(text)) !== null) {
        pausePoints.push({
          position: match.index + match[0].length,
          durationMs: Math.round(duration),
          reason
        });
      }
    }

    // Add emotional pauses
    if (['sadness', 'empathetic', 'concerned', 'reflective'].includes(directive.emotion)) {
      // Add a pause after the first sentence if emotion warrants it
      const firstSentenceEnd = text.search(/[.!?]/);
      if (firstSentenceEnd > 0 && firstSentenceEnd < text.length - 1) {
        pausePoints.push({
          position: firstSentenceEnd + 1,
          durationMs: directive.pauseBeforeMs,
          reason: 'emotional'
        });
      }
    }

    // Sort by position
    pausePoints.sort((a, b) => a.position - b.position);

    // Remove duplicate positions (keep longest pause)
    const deduped: PausePoint[] = [];
    for (const point of pausePoints) {
      const existing = deduped.find(p => p.position === point.position);
      if (existing) {
        existing.durationMs = Math.max(existing.durationMs, point.durationMs);
      } else {
        deduped.push(point);
      }
    }

    return deduped;
  }

  /**
   * Calculate expression timings
   */
  private static calculateExpressionTimings(
    text: string,
    directive: VoiceDirective,
    pausePoints: PausePoint[]
  ): ExpressionTiming[] {
    const timings: ExpressionTiming[] = [];

    for (const expression of directive.expressions) {
      // Position expressions at natural points in the text
      const durationMs = this.getExpressionDuration(expression);

      // Find a good position based on expression type
      let startPosition = 0;

      switch (expression) {
        case 'SMILE':
        case 'WARM':
        case 'SOFT_LAUGH':
        case 'CHUCKLE':
          // Start at the beginning
          startPosition = 0;
          break;
        case 'BREATH':
          // After first few words
          const words = text.split(' ');
          startPosition = text.indexOf(words[Math.min(3, words.length - 1)]);
          break;
        case 'EXCITED':
        case 'EMPHATIC':
          // Emphasize key words - find exclamation or important words
          const exclaimMatch = text.match(/[!]/);
          startPosition = exclaimMatch ? exclaimMatch.index : 0;
          break;
        case 'PAUSE':
          // Use pause points
          const pausePoint = pausePoints.find(p => p.reason === 'period');
          startPosition = pausePoint ? pausePoint.position : text.length / 2;
          break;
        default:
          startPosition = 0;
      }

      timings.push({
        expression,
        startPosition: Math.max(0, startPosition),
        durationMs
      });
    }

    return timings;
  }

  /**
   * Estimate total speech duration
   */
  private static estimateDuration(
    text: string,
    directive: VoiceDirective,
    pausePoints: PausePoint[]
  ): number {
    // Average speaking rate: ~150 words per minute at pace 1.0
    const wordsPerMinute = 150 * directive.pace;
    const wordCount = text.split(/\s+/).length;
    const speechDuration = (wordCount / wordsPerMinute) * 60 * 1000;

    // Add pause durations
    const pauseDuration = pausePoints.reduce((sum, p) => sum + p.durationMs, 0);

    // Add pre/post pauses from directive
    const directivePauses = directive.pauseBeforeMs + directive.pauseAfterMs;

    return Math.round(speechDuration + pauseDuration + directivePauses);
  }

  /**
   * Get prosody tags for SSML
   */
  private static getProsodyTags(directive: VoiceDirective): string | null {
    const rate = `${Math.round(directive.pace * 100)}%`;
    const volume = this.volumeToSsml(directive.volume);
    const pitch = this.getPitchAdjustment(directive.emotion);

    // Only add if non-default
    if (rate !== '100%' || volume !== 'medium' || pitch !== 'default') {
      return `rate="${rate}" volume="${volume}" pitch="${pitch}"`;
    }

    return null;
  }

  /**
   * Convert volume level to SSML
   */
  private static volumeToSsml(volume: string): string {
    const mapping: Record<string, string> = {
      very_soft: 'x-soft',
      soft: 'soft',
      normal: 'medium',
      loud: 'loud',
      very_loud: 'x-loud'
    };
    return mapping[volume] || 'medium';
  }

  /**
   * Get pitch adjustment based on emotion
   */
  private static getPitchAdjustment(emotion: string): string {
    const mapping: Record<string, string> = {
      excited: '+10%',
      celebratory: '+15%',
      sad: '-10%',
      whispering: '-20%',
      serious: '-5%',
      playful: '+5%'
    };
    return mapping[emotion] || 'default';
  }

  /**
   * Get expression marker for SSML
   */
  private static getExpressionMarker(expression: VoiceExpression): string {
    const markers: Record<VoiceExpression, string> = {
      SOFT_LAUGH: '<audio src="laugh-soft.wav"/>',
      CHUCKLE: '<audio src="chuckle.wav"/>',
      SMILE: '<mark name="smile"/>',
      WHISPER: '<prosody volume="x-soft" rate="slow">',
      BREATH: '<audio src="breath.wav"/>',
      EXCITED: '<prosody pitch="+10%" rate="fast">',
      SERIOUS: '<prosody pitch="-5%">',
      THOUGHTFUL: '<prosody rate="slow">',
      WARM: '<prosody volume="soft">',
      CONCERNED: '<prosody pitch="-5%" volume="soft">',
      EMPHATIC: '<prosody pitch="+5%" volume="loud">',
      PAUSE: '<break time="500ms"/>',
      SIGH: '<audio src="sigh.wav"/>',
      HESITATION: '<break time="200ms"/>'
    };
    return markers[expression] || '';
  }

  /**
   * Escape XML special characters
   */
  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Get expression duration
   */
  private static getExpressionDuration(expression: VoiceExpression): number {
    const durations: Record<VoiceExpression, number> = {
      SOFT_LAUGH: 500,
      CHUCKLE: 400,
      SMILE: 0, // Non-audio
      WHISPER: 0, // Applied to surrounding text
      BREATH: 300,
      EXCITED: 0, // Applied to surrounding text
      SERIOUS: 0, // Applied to surrounding text
      THOUGHTFUL: 0, // Applied to surrounding text
      WARM: 0, // Applied to surrounding text
      CONCERNED: 0, // Applied to surrounding text
      EMPHATIC: 0, // Applied to surrounding text
      PAUSE: 500,
      SIGH: 600,
      HESITATION: 200
    };
    return durations[expression] || 0;
  }
}
