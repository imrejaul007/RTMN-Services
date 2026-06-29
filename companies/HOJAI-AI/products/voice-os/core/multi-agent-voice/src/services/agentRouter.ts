/**
 * Agent Router
 * Routes voice commands to appropriate agents
 */

import { VoiceAgent, AgentType, VoiceCommand } from "../types/index.js";

// Default agents
const DEFAULT_AGENTS: VoiceAgent[] = [
  { id: "personal", name: "Personal Assistant", type: "personal", capabilities: ["calendar", "reminders", "tasks"], active: true },
  { id: "company", name: "Company Manager", type: "company", capabilities: ["hr", "operations", "finance"], active: true },
  { id: "sales", name: "Sales Agent", type: "sales", capabilities: ["leads", "deals", "customers"], active: true },
  { id: "marketing", name: "Marketing Agent", type: "marketing", capabilities: ["campaigns", "content", "social"], active: true },
  { id: "finance", name: "Finance Agent", type: "finance", capabilities: ["invoices", "payments", "reports"], active: true },
  { id: "operations", name: "Operations Agent", type: "operations", capabilities: ["logistics", "inventory", "suppliers"], active: true },
];

export class AgentRouter {
  private agents: Map<string, VoiceAgent> = new Map();

  constructor() {
    DEFAULT_AGENTS.forEach((agent) => this.agents.set(agent.id, agent));
  }

  /**
   * Register an agent
   */
  registerAgent(agent: VoiceAgent): void {
    this.agents.set(agent.id, agent);
  }

  /**
   * Route command to agents
   */
  routeCommand(command: VoiceCommand): VoiceAgent[] {
    const matched: VoiceAgent[] = [];

    // Check each agent's capabilities
    for (const agent of this.agents.values()) {
      if (!agent.active) continue;

      const matches = command.targetAgents.some((t) => agent.type === t) ||
        agent.capabilities.some((cap) => command.text.toLowerCase().includes(cap));

      if (matches) {
        matched.push(agent);
      }
    }

    // If no specific match, use personal assistant
    if (matched.length === 0) {
      const personal = this.agents.get("personal");
      if (personal) matched.push(personal);
    }

    return matched;
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string): VoiceAgent | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all agents
   */
  getAllAgents(): VoiceAgent[] {
    return Array.from(this.agents.values()).filter((a) => a.active);
  }
}

export const agentRouter = new AgentRouter();