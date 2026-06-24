/**
 * @hojai/sutar SDK
 *
 * Client for the SUTAR agent runtime. Wraps 7+ SUTAR services into a
 * single ergonomic client. Built on top of @hojai/foundation.
 *
 * @example
 * ```ts
 * import { Sutar } from '@hojai/sutar';
 *
 * const sutar = new Sutar({ apiKey, baseUrl });
 *
 * // Create an agent
 * const agent = await sutar.agent.create({
 *   type: 'merchant',
 *   businessId: 'b-1',
 *   businessName: 'Maya Collective',
 *   industry: 'fashion'
 * });
 *
 * // Run a task on the agent
 * const task = await sutar.agent.runTask(agent.id, {
 *   type: 'negotiate-rfq',
 *   input: { product: 'shoes', quantity: 100 }
 * });
 *
 * // Orchestrate multiple agents
 * const result = await sutar.orchestration.run({
 *   pattern: 'sequential',
 *   steps: [
 *     { id: 's1', agentRole: 'merchant', input: { action: 'search' } },
 *     { id: 's2', agentRole: 'logistics', input: { action: 'quote' } }
 *   ],
 *   initialInput: { product: 'shoes' }
 * });
 *
 * // Use ACP to message another agent
 * await sutar.acp.send({
 *   type: 'OFFER',
 *   sender: 'agent-maya-1',
 *   receiver: 'agent-supplier-42',
 *   payload: { product: 'shoes', quantity: 100, price: 50 }
 * });
 * ```
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { AgentClient } from './agent.js';
import { OrchestrationClient } from './orchestration.js';
import { MarketplaceClient } from './marketplace.js';
import { ContractClient } from './contracts.js';
import { LearningClient } from './learning.js';
import { ACPClient } from './acp.js';

export type { HojaiConfig } from './foundation-config.js';
export { resolveConfig } from './foundation-config.js';
export { AgentClient } from './agent.js';
export { OrchestrationClient } from './orchestration.js';
export { MarketplaceClient } from './marketplace.js';
export { ContractClient } from './contracts.js';
export { LearningClient } from './learning.js';
export { ACPClient } from './acp.js';

export type {
  Agent,
  AgentType,
  AgentStatus,
  AgentTask,
  CreateAgentRequest
} from './agent.js';

export type {
  OrchestrationRequest,
  OrchestrationResult,
  OrchestrationStep,
  OrchestrationPattern
} from './orchestration.js';

export type {
  AgentListing,
  InstallRequest,
  InstallResult,
  ReviewRequest
} from './marketplace.js';

export type {
  Contract,
  ContractStatus,
  Party,
  Condition,
  Action,
  CreateContractRequest
} from './contracts.js';

export type {
  LearningEvent,
  LearningEventType,
  LearningStats,
  LearningFeedback
} from './learning.js';

export type {
  ACPMessage,
  ACPMessageType,
  SendMessageRequest,
  NegotiationRequest,
  NegotiationResult
} from './acp.js';

/**
 * Main SUTAR client
 *
 * Provides a unified interface to all SUTAR services.
 */
export class Sutar {
  public readonly agent: AgentClient;
  public readonly orchestration: OrchestrationClient;
  public readonly marketplace: MarketplaceClient;
  public readonly contracts: ContractClient;
  public readonly learning: LearningClient;
  public readonly acp: ACPClient;
  public readonly config: ReturnType<typeof resolveConfig>;

  constructor(config: HojaiConfig) {
    this.config = resolveConfig(config);
    this.agent = new AgentClient(this.config);
    this.orchestration = new OrchestrationClient(this.config);
    this.marketplace = new MarketplaceClient(this.config);
    this.contracts = new ContractClient(this.config);
    this.learning = new LearningClient(this.config);
    this.acp = new ACPClient(this.config);
  }
}

export default Sutar;
