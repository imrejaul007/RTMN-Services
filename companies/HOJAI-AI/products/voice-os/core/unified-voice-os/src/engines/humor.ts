/**
 * Humor Engine
 */

import type { HumorContext, HumorResponse, InsideJoke } from "./types.js";

export class HumorEngine {
  private jokes: Map<string, InsideJoke[]> = new Map();

  async processHumor(text: string, context: HumorContext): Promise<HumorResponse> {
    const lower = text.toLowerCase();

    // Detect humor patterns
    if (/\b(haha|funny|joke)\b/.test(lower)) {
      return { humor: "matching", message: "That's hilarious!", timing: 300 };
    }
    if (/yeah (right|sure)/.test(lower)) {
      return { humor: "none", timing: 0 };
    }

    return { humor: "none", timing: 0 };
  }

  addInsideJoke(relationshipId: string, content: string): InsideJoke {
    const joke = {
      id: `j_${Date.now()}`,
      relationshipId,
      content,
      context: "",
      createdAt: new Date(),
      usageCount: 0,
      lastUsed: new Date(),
      tags: [],
    };
    const existing = this.jokes.get(relationshipId) || [];
    existing.push(joke);
    this.jokes.set(relationshipId, existing);
    return joke;
  }
}

export const voiceHumorEngine = new HumorEngine();