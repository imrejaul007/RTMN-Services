/**
 * Multi-Agent Voice Network Tests
 */

import { describe, it, expect } from "vitest";
import { agentRouter } from "../services/agentRouter.js";

describe("AgentRouter", () => {
  it("routes sales commands to sales agent", () => {
    const agents = agentRouter.routeCommand({
      id: "cmd1",
      text: "Find me new sales leads",
      userId: "user1",
      intent: "find_leads",
      targetAgents: ["sales"],
      priority: "medium",
    });
    expect(agents.some((a) => a.type === "sales")).toBe(true);
  });

  it("routes marketing commands to marketing agent", () => {
    const agents = agentRouter.routeCommand({
      id: "cmd1",
      text: "Start a marketing campaign",
      userId: "user1",
      intent: "campaign",
      targetAgents: ["marketing"],
      priority: "medium",
    });
    expect(agents.some((a) => a.type === "marketing")).toBe(true);
  });

  it("defaults to personal agent for unknown commands", () => {
    const agents = agentRouter.routeCommand({
      id: "cmd1",
      text: "What's the weather?",
      userId: "user1",
      intent: "general",
      targetAgents: [],
      priority: "low",
    });
    expect(agents.length).toBeGreaterThan(0);
  });

  it("registers custom agents", () => {
    agentRouter.registerAgent({
      id: "custom_agent",
      name: "Custom Agent",
      type: "department",
      capabilities: ["custom_task"],
      active: true,
    });
    const agent = agentRouter.getAgent("custom_agent");
    expect(agent).toBeDefined();
    expect(agent?.name).toBe("Custom Agent");
  });
});

import { responseAggregator } from "../services/responseAggregator.js";

describe("ResponseAggregator", () => {
  it("aggregates single response", () => {
    const aggregated = responseAggregator.aggregate([
      {
        agentId: "sales",
        agentName: "Sales Agent",
        response: "Found 10 new leads",
        status: "success",
        confidence: 0.9,
      },
    ]);
    expect(aggregated.summary).toContain("Found 10 new leads");
    expect(aggregated.totalConfidence).toBe(0.9);
  });

  it("aggregates multiple responses", () => {
    const aggregated = responseAggregator.aggregate([
      {
        agentId: "sales",
        agentName: "Sales Agent",
        response: "Leads found",
        status: "success",
        confidence: 0.9,
      },
      {
        agentId: "marketing",
        agentName: "Marketing Agent",
        response: "Campaign started",
        status: "success",
        confidence: 0.85,
      },
    ]);
    expect(aggregated.responses.length).toBe(2);
    expect(aggregated.totalConfidence).toBeGreaterThan(0.8);
  });

  it("handles failed responses", () => {
    const aggregated = responseAggregator.aggregate([]);
    expect(aggregated.summary).toContain("couldn't complete");
    expect(aggregated.totalConfidence).toBe(0);
  });
});

import { voiceMultiAgentNetwork } from "../index.js";

describe("VoiceMultiAgentNetwork", () => {
  it("creates voice commands from text", () => {
    const command = voiceMultiAgentNetwork.createCommand(
      "Reduce our marketing spending by 20%",
      "user1"
    );
    expect(command.text).toContain("marketing");
    expect(command.intent).toBe("reduce");
    expect(command.targetAgents).toContain("marketing");
  });

  it("executes multi-agent commands", async () => {
    const result = await voiceMultiAgentNetwork.executeCommand({
      id: "cmd1",
      text: "Negotiate with our suppliers",
      userId: "user1",
      intent: "negotiate",
      targetAgents: ["operations"],
      priority: "high",
    });
    expect(result.responses.length).toBeGreaterThan(0);
    expect(result.summary).toBeDefined();
  });

  it("gets available agents", () => {
    const agents = voiceMultiAgentNetwork.getAgents();
    expect(agents.length).toBeGreaterThan(0);
    expect(agents.some((a) => a.type === "personal")).toBe(true);
  });
});