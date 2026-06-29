/**
 * Unified Voice OS Integration Tests
 * Tests all 12 engines working together
 */

import { describe, it, expect } from "vitest";

// Import engines
import { voiceConversationPhysics } from "../src/engines/conversation-physics.js";
import { voiceDirector } from "../src/engines/voice-director.js";
import { voiceHumanPresence } from "../src/engines/human-presence.js";
import { voiceIdentity } from "../src/engines/voice-identity.js";
import { voiceHumanGrowth } from "../src/engines/human-growth.js";
import { voiceHumorEngine } from "../src/engines/humor.js";
import { voiceCuriosityEngine } from "../src/engines/curiosity.js";
import { voiceAttentionEngine } from "../src/engines/attention.js";
import { voiceSocialIntelligence } from "../src/engines/social-intelligence.js";
import { voiceConflictEngine } from "../src/engines/conflict.js";
import { voiceMultiAgentNetwork } from "../src/engines/multi-agent.js";

describe("Unified Voice OS - All 12 Engines", () => {
  describe("Conversation Physics Engine", () => {
    it("manages turn-taking", () => {
      const state = voiceConversationPhysics.manageTurn("Hello", []);
      expect(state.shouldSpeak).toBe(true);
      expect(state.pauseMs).toBeGreaterThanOrEqual(0);
    });

    it("detects silence signals", () => {
      const signal = voiceConversationPhysics.detectSilence("Ok");
      expect(signal).toBeDefined();
    });
  });

  describe("Voice Director Engine", () => {
    it("generates voice directives", () => {
      const directives = voiceDirector.generateDirectives({
        emotion: "excited",
        content: "Congratulations on your achievement!",
        context: { formality: "casual", warmth: 8 },
      });
      expect(directives.pace).toBeGreaterThan(1);
      expect(directives.smile).toBe(true);
    });

    it("adapts volume based on emotion", () => {
      const whisper = voiceDirector.generateDirectives({
        emotion: "whisper",
        content: "Secret",
        context: { formality: "intimate", warmth: 10 },
      });
      expect(whisper.volume).toBe("soft");
    });
  });

  describe("Human Presence Engine", () => {
    it("detects presence states", () => {
      const state = voiceHumanPresence.analyze({
        timeOfDay: "night",
        activity: "sleeping",
      });
      expect(state).toBe("sleeping");
    });

    it("adapts responses for commuting", () => {
      const response = voiceHumanPresence.adaptResponse(
        "commuting",
        "Your sales report is ready."
      );
      expect(response).toContain("short");
    });
  });

  describe("Voice Identity Engine", () => {
    it("manages consent", () => {
      voiceIdentity.consent("user1", "personal_assistant");
      expect(voiceIdentity.hasConsent("user1", "personal_assistant")).toBe(true);
    });

    it("verifies voice prints", () => {
      const verified = voiceIdentity.verify("user1", "a".repeat(150));
      expect(verified).toBe(true);
    });
  });

  describe("Human Growth Engine", () => {
    it("tracks skills", () => {
      voiceHumanGrowth.trackSkill("user1", "negotiation", 5);
      const progress = voiceHumanGrowth.getProgress("user1");
      expect(progress.skills.some(s => s.skill === "negotiation")).toBe(true);
    });
  });

  describe("Humor Engine", () => {
    it("detects humor", async () => {
      const response = await voiceHumorEngine.processHumor("That's hilarious!", {
        userId: "user1",
        relationshipId: "friend",
        conversationHistory: [],
        timeOfDay: "afternoon",
        userMood: "happy",
        culturalContext: "western",
      });
      expect(response.humor).toBe("matching");
    });

    it("adds inside jokes", async () => {
      const joke = await voiceHumorEngine.addInsideJoke(
        "friend1",
        "Remember when we got lost?"
      );
      expect(joke.id).toBeDefined();
    });
  });

  describe("Curiosity Engine", () => {
    it("decides when to ask questions", () => {
      const should = voiceCuriosityEngine.shouldAskQuestion({
        userId: "user1",
        recentTopics: [],
        currentTopic: "project",
        conversationDepth: 2,
        userInterests: [],
        relationshipType: "friend",
        timeSinceLastQuestion: 60000,
      });
      expect(should).toBe(true);
    });

    it("generates follow-up questions", () => {
      const question = voiceCuriosityEngine.askNextQuestion({
        userId: "user1",
        recentTopics: [],
        currentTopic: "startup",
        conversationDepth: 3,
        userInterests: [],
        relationshipType: "friend",
        timeSinceLastQuestion: 60000,
      });
      expect(question.question).toBeDefined();
    });
  });

  describe("Attention Engine", () => {
    it("analyzes attention", () => {
      const metrics = voiceAttentionEngine.analyzeAttention({
        userId: "user1",
        speakingSpeed: 60,
        pausesCount: 8,
        energyLevel: 3,
        interruptions: 1,
        topicCoherence: 0.9,
      });
      expect(metrics.state).toBeDefined();
    });

    it("adapts response length", () => {
      const length = voiceAttentionEngine.getResponseLength({
        state: "distracted",
        confidence: 0.8,
        signals: [],
        duration: 10,
        trend: "stable",
      });
      expect(length).toBe("short");
    });
  });

  describe("Social Intelligence", () => {
    it("gets communication styles", () => {
      const style = voiceSocialIntelligence.getCommunicationStyle("boss");
      expect(style.formality).toBe("formal");
    });

    it("adds shared memories", () => {
      voiceSocialIntelligence.addSharedMemory("friend1", "Paris trip", "excited");
      const memories = voiceSocialIntelligence.getSharedMemories("friend1", 5);
      expect(memories.some(m => m.content.includes("Paris"))).toBe(true);
    });

    it("detects humor appropriateness", () => {
      const humor = voiceSocialIntelligence.shouldUseHumor("friend", "happy");
      expect(humor).toBe(true);
    });
  });

  describe("Conflict Engine", () => {
    it("detects unrealistic claims", () => {
      const conflict = voiceConflictEngine.processStatement(
        "This is guaranteed 100% success",
        "user1"
      );
      expect(conflict.shouldChallenge).toBe(true);
      expect(conflict.approach).toBe("gentle");
    });

    it("detects harmful patterns", () => {
      const conflict = voiceConflictEngine.processStatement(
        "Let's burn all our savings",
        "user1"
      );
      expect(conflict.shouldChallenge).toBe(true);
      expect(conflict.approach).toBe("empathetic");
    });
  });

  describe("Multi-Agent Network", () => {
    it("creates commands", () => {
      const command = voiceMultiAgentNetwork.createCommand(
        "Reduce marketing spending by 20%",
        "user1"
      );
      expect(command.intent).toBe("optimize");
      expect(command.targetAgents).toContain("marketing");
    });

    it("executes multi-agent commands", async () => {
      const command = voiceMultiAgentNetwork.createCommand(
        "Find me sales leads",
        "user1"
      );
      const result = await voiceMultiAgentNetwork.executeCommand(command);
      expect(result.responses.length).toBeGreaterThan(0);
      expect(result.summary).toContain("Sales");
    });

    it("orchestrates multiple agents", async () => {
      const command = voiceMultiAgentNetwork.createCommand(
        "Start marketing campaign and find leads",
        "user1"
      );
      const result = await voiceMultiAgentNetwork.executeCommand(command);
      expect(result.responses.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe("End-to-End Voice Scenarios", () => {
  it("handles happy friend conversation", async () => {
    // Step 1: Presence
    const presence = voiceHumanPresence.analyze({
      timeOfDay: "evening",
      activity: "relaxing",
    });

    // Step 2: Social style
    const social = voiceSocialIntelligence.getCommunicationStyle("friend");

    // Step 3: Humor
    const humor = await voiceHumorEngine.processHumor("Haha that's so funny!", {
      userId: "user1",
      relationshipId: "friend",
      conversationHistory: [],
      timeOfDay: "evening",
      userMood: "happy",
      culturalContext: "western",
    });

    // Step 4: Voice directives
    const directives = voiceDirector.generateDirectives({
      emotion: "happy",
      content: "Let's plan something fun!",
      context: { formality: "casual", warmth: social.warmth },
    });

    expect(humor.humor).toBe("matching");
    expect(directives.pace).toBeGreaterThan(1);
  });

  it("handles stressed boss conversation", () => {
    // Presence
    const presence = voiceHumanPresence.analyze({
      timeOfDay: "morning",
      activity: "meeting",
    });

    // Social style
    const social = voiceSocialIntelligence.getCommunicationStyle("boss");

    // Conflict detection
    const conflict = voiceConflictEngine.processStatement(
      "We should risk everything on this",
      "user1"
    );

    // Attention
    const attention = voiceAttentionEngine.analyzeAttention({
      userId: "user1",
      speakingSpeed: 150,
      pausesCount: 2,
      energyLevel: 8,
      interruptions: 0,
      topicCoherence: 0.9,
    });

    // Voice directives
    const directives = voiceDirector.generateDirectives({
      emotion: "professional",
      content: "The quarterly report is ready",
      context: { formality: "formal", warmth: social.warmth },
    });

    expect(conflict.shouldChallenge).toBe(true);
    expect(attention.state).toBe("focused");
    expect(directives.volume).toBe("normal");
  });
});