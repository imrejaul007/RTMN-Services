/**
 * Voice Director Engine
 */

export interface VoiceDirective {
  emotion: string;
  pace: number;
  volume: "soft" | "normal" | "loud";
  pauses: number;
  emphasis: string[];
  smile: boolean;
}

export interface SpeechContext {
  emotion: string;
  content: string;
  context: {
    formality: string;
    warmth: number;
  };
}

export class VoiceDirectorEngine {
  generateDirectives(context: SpeechContext): VoiceDirective {
    // Adjust based on emotion
    const pace = context.emotion === "excited" ? 1.2 :
                 context.emotion === "calm" ? 0.8 : 1.0;

    const volume: "soft" | "normal" | "loud" =
      context.emotion === "whisper" ? "soft" :
      context.emotion === "excited" ? "loud" : "normal";

    // Add pauses for emphasis
    const pauses = context.context.formality === "intimate" ? 3 : 2;

    // Smile for warm conversations
    const smile = context.context.warmth > 7;

    // Extract emphasis words
    const emphasis = this.extractEmphasis(context.content);

    return {
      emotion: context.emotion,
      pace,
      volume,
      pauses,
      emphasis,
      smile,
    };
  }

  private extractEmphasis(text: string): string[] {
    // Find important words (simplified)
    const important = ["achievement", "milestone", "important", "congratulations", "sorry", "thank"];
    return important.filter(w => text.toLowerCase().includes(w));
  }
}

export const voiceDirector = new VoiceDirectorEngine();