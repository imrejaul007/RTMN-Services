/**
 * Conflict Engine Tests
 */

import { describe, it, expect } from "vitest";
import { disagreementDetector } from "../services/disagreementDetector.js";

describe("DisagreementDetector", () => {
  it("detects unrealistic claims", () => {
    const signal = disagreementDetector.detect("This is guaranteed to work 100%");
    expect(signal).not.toBeNull();
    expect(signal?.type).toBe("unrealistic");
    expect(signal?.severity).toBe("medium");
  });

  it("detects harmful suggestions", () => {
    const signal = disagreementDetector.detect("Let's burn all our savings");
    expect(signal).not.toBeNull();
    expect(signal?.type).toBe("harmful");
    expect(signal?.severity).toBe("high");
  });

  it("detects risky patterns", () => {
    const signal = disagreementDetector.detect("I'll invest all my savings");
    expect(signal).not.toBeNull();
    expect(signal?.type).toBe("risky");
  });

  it("detects contradictions", () => {
    const signal = disagreementDetector.detectContradiction(
      "Yes, let's do it",
      "No, I don't want to"
    );
    expect(signal).not.toBeNull();
    expect(signal?.type).toBe("contradictory");
  });

  it("returns null for normal statements", () => {
    const signal = disagreementDetector.detect("The meeting is at 3pm");
    expect(signal).toBeNull();
  });
});

import { perspectiveProvider } from "../services/perspectiveProvider.js";

describe("PerspectiveProvider", () => {
  it("challenges harmful statements empathetically", () => {
    const response = perspectiveProvider.challengeRespectfully(
      { type: "harmful", severity: "high", message: "That's risky", alternative: "Consider options" },
      { priorities: [], principles: [], longTermGoals: ["stability"], shortTermGoals: [] }
    );
    expect(response.shouldChallenge).toBe(true);
    expect(response.approach).toBe("empathetic");
  });

  it("challenges unrealistic claims gently", () => {
    const response = perspectiveProvider.challengeRespectfully(
      { type: "unrealistic", severity: "medium", message: "That may be optimistic" },
      { priorities: [], principles: [], longTermGoals: [], shortTermGoals: [] }
    );
    expect(response.shouldChallenge).toBe(true);
    expect(response.approach).toBe("gentle");
  });
});

import { voiceConflictEngine } from "../index.js";

describe("VoiceConflictEngine", () => {
  it("processes statements for disagreement", () => {
    const response = voiceConflictEngine.processStatement(
      "I'll work 20 hours every day",
      "user1"
    );
    expect(response.shouldChallenge).toBe(true);
  });

  it("does not challenge normal statements", () => {
    const response = voiceConflictEngine.processStatement(
      "The weather is nice today",
      "user1"
    );
    expect(response.shouldChallenge).toBe(false);
  });

  it("updates user values", () => {
    voiceConflictEngine.updateUserValues("user1", {
      priorities: ["family"],
      longTermGoals: ["retire early"],
    });
    const values = voiceConflictEngine.getUserValues("user1");
    expect(values.priorities).toContain("family");
    expect(values.longTermGoals).toContain("retire early");
  });
});