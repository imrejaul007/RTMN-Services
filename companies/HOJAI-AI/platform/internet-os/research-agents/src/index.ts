/**
 * HOJAI Research Agents Index
 *
 * Exports all research agents and provides a unified orchestrator.
 *
 * Agents use the InternetOS API to call actors and skills.
 * Reports are stored in MemoryOS and alerts dispatched via Webhook Bus.
 */

import { MarketResearcher } from './agents/market-researcher.js';
import { CompetitorResearcher } from './agents/competitor-researcher.js';
import { ProcurementResearcher } from './agents/procurement-researcher.js';
import { ResearchAgent } from './base/research-agent.js';
import type { ResearchAgentConfig, ResearchReport } from './base/research-agent.js';
import type { MarketResearchInput } from './agents/market-researcher.js';
import type { CompetitorResearchInput } from './agents/competitor-researcher.js';
import type { ProcurementResearchInput, SupplierLead } from './agents/procurement-researcher.js';

export {
  ResearchAgent,
  MarketResearcher,
  CompetitorResearcher,
  ProcurementResearcher,
};

export type {
  ResearchAgentConfig,
  ResearchReport,
  MarketResearchInput,
  CompetitorResearchInput,
  ProcurementResearchInput,
  SupplierLead,
};

/**
 * Research Department Orchestrator
 * Coordinates multiple research agents
 */
export class ResearchDepartment {
  private agents: Map<string, ResearchAgent> = new Map();
  private reports: any[] = [];

  constructor() {
    // Register default agents
    this.registerAgent(new MarketResearcher());
    this.registerAgent(new CompetitorResearcher());
    this.registerAgent(new ProcurementResearcher());
  }

  registerAgent(agent: ResearchAgent): void {
    this.agents.set(agent.getType(), agent);
  }

  getAgent(type: string): ResearchAgent | undefined {
    return this.agents.get(type);
  }

  listAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Run a research report
   */
  async runResearch(type: string, input: any): Promise<any> {
    const agent = this.agents.get(type);
    if (!agent) throw new Error(`Unknown research agent: ${type}`);

    const report = await agent.run(input);
    this.reports.push(report);
    return report;
  }

  /**
   * Run all agents
   */
  async runAll(inputs: Record<string, any> = {}): Promise<any[]> {
    const results = [];
    for (const [type, agent] of this.agents.entries()) {
      const input = inputs[type];
      if (input) {
        const report = await agent.run(input);
        results.push(report);
      }
    }
    return results;
  }

  /**
   * Get all reports
   */
  getReports(limit = 100): any[] {
    return this.reports.slice(-limit);
  }
}

export const researchDepartment = new ResearchDepartment();
export default researchDepartment;