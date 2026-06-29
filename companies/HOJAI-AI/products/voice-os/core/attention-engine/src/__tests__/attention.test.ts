/**
 * Attention Engine Tests
 */

import { describe, it, expect } from "vitest";
import { distractionDetector } from "../services/distractionDetector.js";

describe("DistractionDetector", () => {
  it("detects energy drop from slow speech", () => {
    const signals = distractionDetector.detect({
      userId: "user1",
      speakingSpeed: 60, // Slow
      pausesCount: 2,
      energyLevel: 5,
      interruptions: 0,
      topicCoherence: 0.8,
    });
    const severity = distractionDetector.getSeverity(signals);
    expect(severity).toBeDefined();
  });

  it("detects wandering from low coherence", () => {
    const signals = distractionDetector.detect({
      userId: "user1",
      speakingSpeed: 100,
      pausesCount: 2,
      energyLevel: 5,
      interruptions: 0,
      topicCoherence: 0.3, // Low
    });
    expect(signals.some((s) => s.type === "wandering")).toBe(true);
  });

  it("returns empty signals for focused user", () => {
    const signals = distractionDetector.detect({
      userId: "user1",
      speakingSpeed: 150,
      pausesCount: 1,
      energyLevel: 8,
      interruptions: 0,
      topicCoherence: 0.9,
    });
    expect(signals.length).toBe(0);
  });
});

import { engagementEngine } from "../services/engagementEngine.js";

describe("EngagementEngine", () => {
  it("determines focused state", () => {
    const { state, confidence } = engagementEngine.determineState([], {
      energyLevel: 8,
      speakingSpeed: 150,
      wandering: false,
      overloaded: false,
    });
    expect(state).toBe("focused");
  });

  it("determines bored state for low energy", () => {
    const { state } = engagementEngine.determineState([], {
      energyLevel: 3,
      speakingSpeed: 100,
      wandering: false,
      overloaded: false,
    });
    expect(state).toBe("bored");
  });

  it("generates engagement responses", () => {
    expect(engagementEngine.getEngagementResponse("distracted")).toBeDefined();
    expect(engagementEngine.getEngagementResponse("confused")).toBeDefined();
  });
});

import { voiceAttentionEngine } from "../index.js";

describe("VoiceAttentionEngine", () => {
  it("analyzes attention", () => {
    const metrics = voiceAttentionEngine.analyzeAttention({
      userId: "user1",
      speakingSpeed: 130,
      pausesCount: 2,
      energyLevel: 7,
      interruptions: 0,
      topicCoherence: 0.8,
    });
    expect(metrics.state).toBeDefined();
    expect(metrics.confidence).toBeGreaterThan(0);
  });

  it("determines response length based on attention", () => {
    const shortResponse = voiceAttentionEngine.getResponseLength({
      state: "distracted",
      confidence: 0.8,
      signals: [],
      duration: 10,
      trend: "stable",
    });
    expect(shortResponse).toBe("short");
  });
});