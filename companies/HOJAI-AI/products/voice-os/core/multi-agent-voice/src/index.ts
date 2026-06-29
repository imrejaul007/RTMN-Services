/**
 * Voice Multi-Agent Network
 * Orchestrate agents via voice commands
 */

import { agentRouter } from "./services/agentRouter.js";
import { responseAggregator } from "./services/responseAggregator.js";
import type {
  VoiceAgent,
  VoiceCommand,
  AgentResponse,
  OrchestratedResponse,
  AgentType,
} from "./types/index.js";

export class VoiceMultiAgentNetwork {
  /**
   * Execute voice command across agents
   */
  async executeCommand(command: VoiceCommand): Promise<OrchestratedResponse> {
    // Route to appropriate agents
    const agents = agentRouter.routeCommand(command);

    if (agents.length === 0) {
      return {
        id: command.id,
        responses: [],
        summary: "I couldn't find the right agent for that task.",
        totalConfidence: 0,
      };
    }

    // Execute on each agent (simulated)
    const responses = await Promise.all(
      agents.map((agent) => this.executeOnAgent(agent, command))
    );

    // Aggregate responses
    return responseAggregator.aggregate(responses);
  }

  /**
   * Execute on single agent
   */
  private async executeOnAgent(
    agent: VoiceAgent,
    command: VoiceCommand
  ): Promise<AgentResponse> {
    // In production, this would call actual agent APIs
    // For now, simulate response
    return {
      agentId: agent.id,
      agentName: agent.name,
      response: this.generateResponse(agent, command),
      status: "success",
      confidence: 0.9,
      actions: this.extractActions(agent, command),
    };
  }

  /**
   * Generate agent response
   */
  private generateResponse(agent: VoiceAgent, command: VoiceCommand): string {
    const intent = command.intent.toLowerCase();

    if (intent.includes("reduce") || intent.includes("cut")) {
      return `I've ${intent.includes("spending") ? "identified areas to reduce spending" : "found ways to optimize"} through ${agent.name}.`;
    }

    if (intent.includes("find") || intent.includes("search")) {
      return `${agent.name} found relevant results for your query.`;
    }

    if (intent.includes("negotiate") || intent.includes("renegotiate")) {
      return `${agent.name} is ready to start negotiations.`;
    }

    if (intent.includes("report") || intent.includes("summary")) {
      return `${agent.name} has prepared the report you requested.`;
    }

    return `${agent.name} has processed your request.`;
  }

  /**
   * Extract actions from command
   */
  private extractActions(agent: VoiceAgent, command: VoiceCommand): string[] {
    const actions: string[] = [];
    const text = command.text.toLowerCase();

    if (text.includes("send")) {
      actions.push(`Sending message via ${agent.name}`);
    }
    if (text.includes("create") || text.includes("make")) {
      actions.push(`Creating item via ${agent.name}`);
    }
    if (text.includes("find") || text.includes("search")) {
      actions.push(`Searching via ${agent.name}`);
    }

    return actions;
  }

  /**
   * Register a new agent
   */
  registerAgent(
    id: string,
    name: string,
    type: AgentType,
    capabilities: string[]
  ): void {
    agentRouter.registerAgent({
      id,
      name,
      type,
      capabilities,
      active: true,
    });
  }

  /**
   * Get all available agents
   */
  getAgents(): VoiceAgent[] {
    return agentRouter.getAllAgents();
  }

  /**
   * Create voice command from text
   */
  createCommand(text: string, userId: string): VoiceCommand {
    const intent = this.detectIntent(text);
    const targetAgents = this.detectTargetAgents(text);

    return {
      id: `cmd_${Date.now()}`,
      text,
      userId,
      intent,
      targetAgents,
      priority: this.detectPriority(text),
    };
  }

  /**
   * Detect intent from text
   */
  private detectIntent(text: string): string {
    const lower = text.toLowerCase();

    const intents = [
      ["reduce", "cut", "decrease", "optimize"],
      ["increase", "grow", "scale", "expand"],
      ["find", "search", "discover", "explore"],
      ["create", "make", "build", "generate"],
      ["negotiate", "discuss", "talk", "communicate"],
      ["report", "summary", "overview", "status"],
      ["schedule", "book", "plan", "organize"],
      ["pay", "invoice", "bill", "charge"],
    ];

    for (const [intent, keywords] of intents) {
      if (keywords.some((k) => lower.includes(k))) {
        return intent;
      }
    }

    return "general";
  }

  /**
   * Detect target agents
   */
  private detectTargetAgents(text: string): AgentType[] {
    const lower = text.toLowerCase();
    const agents: AgentType[] = [];

    if (lower.includes("sales") || lower.includes("leads") || lower.includes("customers")) {
      agents.push("sales");
    }
    if (lower.includes("marketing") || lower.includes("campaign") || lower.includes("ads")) {
      agents.push("marketing");
    }
    if (lower.includes("finance") || lower.includes("budget") || lower.includes("payment")) {
      agents.push("finance");
    }
    if (lower.includes("operation") || lower.includes("supply") || lower.includes("logistics")) {
      agents.push("operations");
    }
    if (lower.includes("supplier") || lower.includes("vendor") || lower.includes("merchand")) {
      agents.push("supplier");
    }

    if (agents.length === 0) {
      agents.push("personal");
    }

    return agents;
  }

  /**
   * Detect priority
   */
  private detectPriority(text: string): "low" | "medium" | "high" {
    const lower = text.toLowerCase();
    if (lower.includes("urgent") || lower.includes("asap") || lower.includes("immediately")) {
      return "high";
    }
    if (lower.includes("when you have time") || lower.includes("no rush")) {
      return "low";
    }
    return "medium";
  }
}

export const voiceMultiAgentNetwork = new VoiceMultiAgentNetwork();
export default voiceMultiAgentNetwork;