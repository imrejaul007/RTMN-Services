/**
 * Multi-Agent Voice Network
 */

export interface VoiceAgent {
  id: string;
  name: string;
  type: string;
  capabilities: string[];
  active: boolean;
}

export interface VoiceCommand {
  id: string;
  text: string;
  userId: string;
  intent: string;
  targetAgents: string[];
  priority: string;
}

export interface AgentResponse {
  agentId: string;
  agentName: string;
  response: string;
  status: string;
  confidence: number;
}

export interface OrchestratedResponse {
  id: string;
  responses: AgentResponse[];
  summary: string;
  totalConfidence: number;
}

export class MultiAgentNetwork {
  private agents: Map<string, VoiceAgent> = new Map();

  constructor() {
    // Default agents
    this.registerAgent({ id: "personal", name: "Personal Assistant", type: "personal", capabilities: ["reminders", "calendar"], active: true });
    this.registerAgent({ id: "sales", name: "Sales Agent", type: "sales", capabilities: ["leads", "deals"], active: true });
    this.registerAgent({ id: "marketing", name: "Marketing Agent", type: "marketing", capabilities: ["campaigns", "content"], active: true });
    this.registerAgent({ id: "finance", name: "Finance Agent", type: "finance", capabilities: ["invoices", "payments"], active: true });
    this.registerAgent({ id: "operations", name: "Operations Agent", type: "operations", capabilities: ["logistics", "supply"], active: true });
  }

  registerAgent(agent: VoiceAgent): void {
    this.agents.set(agent.id, agent);
  }

  createCommand(text: string, userId: string): VoiceCommand {
    const intent = this.detectIntent(text);
    const agents = this.detectAgents(text);

    return {
      id: `cmd_${Date.now()}`,
      text,
      userId,
      intent,
      targetAgents: agents,
      priority: /urgent|immediate/i.test(text) ? "high" : "medium",
    };
  }

  async executeCommand(command: VoiceCommand): Promise<OrchestratedResponse> {
    const responses: AgentResponse[] = [];

    for (const agentType of command.targetAgents) {
      const agent = Array.from(this.agents.values()).find(a => a.type === agentType);
      if (agent) {
        responses.push({
          agentId: agent.id,
          agentName: agent.name,
          response: this.generateResponse(agent.type, command.text),
          status: "success",
          confidence: 0.9,
        });
      }
    }

    return {
      id: command.id,
      responses,
      summary: responses.map(r => `${r.agentName}: ${r.response}`).join(". "),
      totalConfidence: responses.length > 0 ? 0.9 : 0,
    };
  }

  private detectIntent(text: string): string {
    if (/reduce|cut|decrease/i.test(text)) return "optimize";
    if (/find|search|discover/i.test(text)) return "search";
    if (/create|build|make/i.test(text)) return "create";
    if (/negotiate|renegotiate/i.test(text)) return "negotiate";
    if (/report|summary|status/i.test(text)) return "report";
    return "general";
  }

  private detectAgents(text: string): string[] {
    const agents: string[] = [];
    const lower = text.toLowerCase();

    if (/sales|leads|deals|customers/i.test(lower)) agents.push("sales");
    if (/marketing|campaigns|ads|brand/i.test(lower)) agents.push("marketing");
    if (/finance|invoice|budget|money/i.test(lower)) agents.push("finance");
    if (/operations|supply|logistics|shipping/i.test(lower)) agents.push("operations");
    if (agents.length === 0) agents.push("personal");

    return agents;
  }

  private generateResponse(agentType: string, commandText: string): string {
    switch (agentType) {
      case "sales":
        return "I've found relevant leads and opportunities for you.";
      case "marketing":
        return "Campaign insights are ready. Want me to pull up the metrics?";
      case "finance":
        return "Financial overview prepared. Key numbers highlighted.";
      case "operations":
        return "Supply chain status updated. All systems operational.";
      default:
        return "I've processed your request. Let me know if you need anything else.";
    }
  }
}

export const voiceMultiAgentNetwork = new MultiAgentNetwork();