/**
 * Humor Engine Tests
 */

import { describe, it, expect } from "vitest";
import { humorDetector } from "../services/humorDetector.js";

describe("HumorDetector", () => {
  it("detects joke patterns", () => {
    const result = humorDetector.detectHumor("That's so funny!");
    expect(result.detected).toBe(true);
    expect(result.type).toBe("joke");
  });

  it("detects sarcasm", () => {
    const result = humorDetector.detectHumor("Oh great, another meeting");
    expect(result.detected).toBe(true);
    expect(result.type).toBe("sarcasm");
  });

  it("detects self-deprecating humor", () => {
    const result = humorDetector.detectHumor("I am so stupid sometimes");
    expect(result.detected).toBe(true);
    expect(result.type).toBe("self-deprecating");
  });

  it("returns no humor for normal text", () => {
    const result = humorDetector.detectHumor("The meeting is at 3pm");
    expect(result.detected).toBe(false);
  });

  it("checks mood suitability", () => {
    expect(humorDetector.isMoodSuitableForHumor("happy")).toBe(true);
    expect(humorDetector.isMoodSuitableForHumor("sad")).toBe(false);
    expect(humorDetector.isMoodSuitableForHumor("stressed")).toBe(false);
  });
});

import { laughTracker } from "../services/laughTracker.js";

describe("LaughTracker", () => {
  it("detects laughter in text", () => {
    expect(laughTracker.detectLaughter("haha that's funny")).toBe(true);
    expect(laughTracker.detectLaughter("haha lol")).toBe(true);
    expect(laughTracker.detectLaughter("See you tomorrow")).toBe(false);
  });

  it("tracks laughter patterns", () => {
    laughTracker.trackLaugh("user1", new Date());
    const pattern = laughTracker.getPattern("user1");
    expect(pattern.frequency).toBeDefined();
  });
});

import { voiceHumorEngine } from "../index.js";

describe("VoiceHumorEngine", () => {
  it("processes humor attempts", async () => {
    const response = await voiceHumorEngine.processHumor("That's hilarious!", {
      userId: "user1",
      relationshipId: "friend1",
      conversationHistory: [],
      timeOfDay: "afternoon",
      userMood: "happy",
      culturalContext: "western",
    });
    expect(response.humor).toBeDefined();
  });

  it("handles non-humorous input", async () => {
    const response = await voiceHumorEngine.processHumor("The sky is blue", {
      userId: "user1",
      relationshipId: "friend1",
      conversationHistory: [],
      timeOfDay: "afternoon",
      userMood: "neutral",
      culturalContext: "western",
    });
    expect(response.humor).toBe("none");
  });

  it("adds inside jokes", () => {
    const joke = voiceHumorEngine.addInsideJoke(
      "friend1",
      "Remember when we got lost?",
      "trip to paris"
    );
    expect(joke.id).toBeDefined();
    expect(joke.content).toContain("Remember");
  });
});