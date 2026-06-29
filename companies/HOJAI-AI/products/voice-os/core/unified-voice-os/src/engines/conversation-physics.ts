/**
 * Conversation Physics Engine
 */

export interface ConversationTurn {
  speaker: "user" | "assistant";
  text: string;
  timestamp: Date;
}

export interface SilenceSignal {
  duration: number;
  meaning: "thinking" | "confusion" | "distraction" | "abandoned";
}

export interface TurnState {
  shouldSpeak: boolean;
  backchannel?: string;
  pauseMs: number;
  interrupt: boolean;
}

export class ConversationPhysicsEngine {
  private turns: ConversationTurn[] = [];
  private silenceThreshold = 3000; // 3 seconds

  manageTurn(userText: string, history: ConversationTurn[]): TurnState {
    const lastAssistantTurn = history.filter(t => t.speaker === "assistant").pop();

    // Calculate silence duration if there's a gap
    let pauseMs = 0;
    if (lastAssistantTurn) {
      const gap = Date.now() - lastAssistantTurn.timestamp.getTime();
      if (gap > this.silenceThreshold) {
        pauseMs = Math.min(gap, 5000);
      }
    }

    // Check for silence signals
    const silence = this.detectSilence(userText);

    // Generate backchannel
    let backchannel: string | undefined;
    if (silence && silence.meaning === "thinking") {
      const channels = ["Mm-hmm...", "Right...", "I see...", "Got it"];
      backchannel = channels[Math.floor(Math.random() * channels.length)];
    }

    return {
      shouldSpeak: true,
      backchannel,
      pauseMs,
      interrupt: false,
    };
  }

  detectSilence(text: string): SilenceSignal | null {
    // Very short response might indicate distraction
    if (text.length < 10) {
      return { duration: 0, meaning: "distraction" };
    }
    return null;
  }

  shouldContinueConversation(): boolean {
    return this.turns.length < 20;
  }
}

export const voiceConversationPhysics = new ConversationPhysicsEngine();