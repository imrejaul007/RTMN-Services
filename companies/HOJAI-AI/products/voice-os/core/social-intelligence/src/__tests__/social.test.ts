/**
 * Social Intelligence Tests
 */

import { describe, it, expect } from "vitest";
import { relationshipClassifier } from "../services/relationshipClassifier.js";

describe("RelationshipClassifier", () => {
  it("classifies mother relationship", () => {
    const type = relationshipClassifier.classify(["Mom called today"]);
    expect(type).toBe("mother");
  });

  it("classifies boss relationship", () => {
    const type = relationshipClassifier.classify(["My boss wants a report"]);
    expect(type).toBe("boss");
  });

  it("classifies friend relationship", () => {
    const type = relationshipClassifier.classify(["Hung out with my bro"]);
    expect(type).toBe("friend");
  });

  it("defaults to acquaintance", () => {
    const type = relationshipClassifier.classify(["Met someone at event"]);
    expect(type).toBe("acquaintance");
  });

  it("gets default style for relationship", () => {
    const style = relationshipClassifier.getDefaultStyle("mother");
    expect(style.formality).toBe("intimate");
    expect(style.warmth).toBe(9);
    expect(style.topics).toContain("family");
  });

  it("gets professional style for boss", () => {
    const style = relationshipClassifier.getDefaultStyle("boss");
    expect(style.formality).toBe("formal");
    expect(style.vocabulary).toBe("professional");
  });
});

import { communicationStyleAdapter } from "../services/communicationStyle.js";

describe("CommunicationStyleAdapter", () => {
  it("generates appropriate greetings", () => {
    expect(communicationStyleAdapter.getGreeting("mother")).toContain("Hey");
    expect(communicationStyleAdapter.getGreeting("boss")).toContain("Good");
  });

  it("checks humor appropriateness", () => {
    const style = {
      formality: "intimate",
      warmth: 8,
      humor: 7,
      directness: 6,
      empathy: 9,
      vocabulary: "colloquial" as const,
      topics: [],
      avoidTopics: [],
    };
    expect(communicationStyleAdapter.shouldUseHumor(style, "happy")).toBe(true);
    expect(communicationStyleAdapter.shouldUseHumor(style, "sad")).toBe(false);
  });

  it("checks topic appropriateness", () => {
    const style = {
      formality: "formal",
      warmth: 5,
      humor: 3,
      directness: 6,
      empathy: 6,
      vocabulary: "professional" as const,
      topics: [],
      avoidTopics: ["personal"],
    };
    expect(communicationStyleAdapter.isTopicAppropriate("personal", style)).toBe(false);
    expect(communicationStyleAdapter.isTopicAppropriate("metrics", style)).toBe(true);
  });
});

import { voiceSocialIntelligence } from "../index.js";

describe("VoiceSocialIntelligence", () => {
  it("creates relationship profile", () => {
    const profile = voiceSocialIntelligence.getProfile("mom_user");
    expect(profile.type).toBeDefined();
    expect(profile.style).toBeDefined();
  });

  it("adds shared memories", () => {
    voiceSocialIntelligence.addSharedMemory("friend1", "We went to Paris", "excited");
    const memories = voiceSocialIntelligence.getSharedMemories("friend1");
    expect(memories.length).toBeGreaterThan(0);
    expect(memories[0].content).toContain("Paris");
  });

  it("updates trust level", () => {
    voiceSocialIntelligence.updateTrustLevel("colleague1", 2);
    const profile = voiceSocialIntelligence.getProfile("colleague1");
    expect(profile.trustLevel).toBeGreaterThan(5);
  });
});