/**
 * Human Presence Engine
 */

export interface PresenceContext {
  timeOfDay: string;
  location?: string;
  activity?: string;
  device?: string;
}

export type PresenceState = "focused" | "commuting" | "meeting" | "relaxing" | "working" | "sleeping";

export class HumanPresenceEngine {
  analyze(context: PresenceContext): PresenceState {
    const hour = new Date().getHours();

    // Time-based detection
    if (hour >= 22 || hour < 6) return "sleeping";
    if (context.activity === "driving") return "commuting";
    if (context.activity === "meeting") return "meeting";
    if (context.activity === "work") return "working";
    if (context.location === "home") return "relaxing";

    return "focused";
  }

  adaptResponse(state: PresenceState, response: string): string {
    switch (state) {
      case "commuting":
        return "Keep it short. " + response.slice(0, 50) + "...";
      case "meeting":
        return "[silent] " + response;
      case "sleeping":
        return "I noticed you might be sleeping. ";
      default:
        return response;
    }
  }
}

export const voiceHumanPresence = new HumanPresenceEngine();