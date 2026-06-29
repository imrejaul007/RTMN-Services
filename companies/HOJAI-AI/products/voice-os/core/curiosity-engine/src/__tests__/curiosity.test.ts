/**
 * Curiosity Engine Tests
 */

import { describe, it, expect } from "vitest";
import { questionGenerator } from "../services/questionGenerator.js";

describe("QuestionGenerator", () => {
  it("generates follow-up questions", () => {
    const question = questionGenerator.generateFollowUp({
      userId: "user1",
      recentTopics: ["startup"],
      currentTopic: "startup",
      conversationDepth: 2,
      userInterests: ["tech"],
      relationshipType: "friend",
      timeSinceLastQuestion: 30000,
    });
    expect(question.question).toBeDefined();
    expect(question.type).toBe("follow_up");
    expect(question.depth).toBe(3);
  });

  it("generates exploration questions at low depth", () => {
    const question = questionGenerator.generateFollowUp({
      userId: "user1",
      recentTopics: ["travel"],
      currentTopic: "travel",
      conversationDepth: 1,
      userInterests: [],
      relationshipType: "friend",
      timeSinceLastQuestion: 30000,
    });
    expect(question.type).toBe("exploration");
  });

  it("generates reflection questions at high depth", () => {
    const question = questionGenerator.generateFollowUp({
      userId: "user1",
      recentTopics: ["career"],
      currentTopic: "career",
      conversationDepth: 5,
      userInterests: ["growth"],
      relationshipType: "friend",
      timeSinceLastQuestion: 30000,
    });
    expect(question.type).toBe("reflection");
  });

  it("generates clarification questions", () => {
    const question = questionGenerator.generateClarification(
      {
        userId: "user1",
        recentTopics: [],
        currentTopic: "work",
        conversationDepth: 2,
        userInterests: [],
        relationshipType: "colleague",
        timeSinceLastQuestion: 30000,
      },
      "that thing we discussed"
    );
    expect(question.type).toBe("clarification");
    expect(question.question).toContain("I want to make sure I understand");
  });
});

import { topicExplorer } from "../services/topicExplorer.js";

describe("TopicExplorer", () => {
  it("starts topic exploration", () => {
    const exploration = topicExplorer.startExploration("work");
    expect(exploration.topic).toBe("work");
    expect(exploration.subTopics.length).toBeGreaterThan(0);
  });

  it("gets related topics", () => {
    const related = topicExplorer.getRelatedTopics("technology");
    expect(related.length).toBeGreaterThan(0);
  });

  it("increments question count", () => {
    topicExplorer.startExploration("health");
    topicExplorer.incrementQuestions("health");
    const exploration = topicExplorer.getExploration("health");
    expect(exploration?.questionsAsked).toBe(1);
  });
});

import { voiceCuriosityEngine } from "../index.js";

describe("VoiceCuriosityEngine", () => {
  it("asks next question", async () => {
    const question = voiceCuriosityEngine.askNextQuestion({
      userId: "user1",
      recentTopics: ["project"],
      currentTopic: "project",
      conversationDepth: 2,
      userInterests: [],
      relationshipType: "colleague",
      timeSinceLastQuestion: 60000,
    });
    expect(question).not.toBeNull();
    expect(question?.question).toBeDefined();
  });

  it("does not ask too many questions", async () => {
    const question = voiceCuriosityEngine.askNextQuestion({
      userId: "user1",
      recentTopics: ["project"],
      currentTopic: "project",
      conversationDepth: 6, // Too deep
      userInterests: [],
      relationshipType: "colleague",
      timeSinceLastQuestion: 60000,
    });
    expect(question).toBeNull();
  });
});