/**
 * Response Aggregator
 * Combines agent responses into unified voice
 */

import { AgentResponse, OrchestratedResponse } from "../types/index.js";

export class ResponseAggregator {
  /**
   * Aggregate multiple agent responses
   */
  aggregate(responses: AgentResponse[]): OrchestratedResponse {
    const successful = responses.filter((r) => r.status === "success");
    const failed = responses.filter((r) => r.status === "failed");

    // Calculate overall confidence
    const totalConfidence = successful.length > 0
      ? successful.reduce((sum, r) => sum + r.confidence, 0) / successful.length
      : 0;

    // Generate summary
    const summary = this.generateSummary(successful, failed);

    return {
      id: `orch_${Date.now()}`,
      responses: successful,
      summary,
      totalConfidence,
    };
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(successful: AgentResponse[], failed: AgentResponse[]): string {
    if (successful.length === 0) {
      return "I couldn't complete that task. Would you like me to try a different approach?";
    }

    if (successful.length === 1) {
      return successful[0].response;
    }

    // Multiple agents responded
    const responses = successful.map((r) => `${r.agentName}: ${r.response}`);
    return responses.join(". ") + ".";
  }

  /**
   * Format actions for voice
   */
  formatActions(responses: AgentResponse[]): string[] {
    const actions: string[] = [];

    for (const response of responses) {
      if (response.actions) {
        actions.push(...response.actions.map((a) => `${response.agentName}: ${a}`));
      }
    }

    return actions;
  }
}

export const responseAggregator = new ResponseAggregator();