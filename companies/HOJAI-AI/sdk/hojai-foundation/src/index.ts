/**
 * HOJAI Foundation SDK
 *
 * Unified client for building HOJAI-native applications. Wraps CorpID,
 * MemoryOS, TwinOS, SADA (Trust), FlowOS, and PolicyOS into a single
 * ergonomic client. Designed for both TypeScript and JavaScript projects.
 *
 * @example
 * ```ts
 * import { Hojai } from '@hojai/foundation';
 *
 * const hojai = new Hojai({ apiKey: process.env.HOJAI_KEY });
 *
 * // CorpID
 * const company = await hojai.corpId.create({
 *   type: 'company',
 *   metadata: { name: 'Maya Collective', country: 'IN' }
 * });
 *
 * // Memory
 * await hojai.memory.write({
 *   type: 'preferences',
 *   scope: { ownerId: company.id, ownerType: 'company' },
 *   content: { preferredCategories: ['restaurant', 'fashion'] }
 * });
 *
 * // Twin
 * const customerTwin = await hojai.twin.create({
 *   type: 'customer',
 *   ownerCorpId: company.id,
 *   attributes: { name: 'Alice' }
 * });
 *
 * // Flow
 * const flow = await hojai.flow.create({
 *   name: 'onboard-customer',
 *   trigger: 'manual',
 *   steps: [
 *     { id: 's1', type: 'skill', name: 'send-welcome', config: { skillId: 'send-email' } },
 *     { id: 's2', type: 'agent', name: 'verify', config: { agentRole: 'verification' } }
 *   ]
 * });
 *
 * // Policy check
 * const decision = await hojai.policy.evaluate({
 *   action: 'send_data_to_third_party',
 *   context: { recipient: 'analytics-co' },
 *   corpId: company.id
 * });
 *
 * // Trust check
 * const trust = await hojai.trust.getScore('corp-id-xyz');
 * if (trust.overall > 0.8) { // proceed }
 * ```
 */

import type { HojaiConfig } from './config.js';
import { resolveConfig } from './config.js';
import { CorpIDClient } from './corp-id.js';
import { MemoryClient } from './memory.js';
import { TwinClient } from './twin.js';
import { TrustClient } from './trust.js';
import { FlowClient } from './flow.js';
import { PolicyClient } from './policy.js';

export type { HojaiConfig } from './config.js';
export { resolveConfig } from './config.js';
export { CorpIDClient } from './corp-id.js';
export { MemoryClient } from './memory.js';
export { TwinClient } from './twin.js';
export { TrustClient } from './trust.js';
export { FlowClient } from './flow.js';
export { PolicyClient } from './policy.js';

export type {
  CorpID,
  CorpIDType,
  CorpIDStatus,
  CorpIDMetadata,
  CreateCorpIDRequest,
  VerifyCorpIDRequest
} from './corp-id.js';

export type {
  Memory,
  MemoryType,
  WriteMemoryRequest,
  SearchMemoryRequest
} from './memory.js';

export type {
  Twin,
  TwinType,
  TwinEvent,
  CreateTwinRequest,
  UpdateTwinRequest
} from './twin.js';

export type {
  TrustScore,
  VerifyRequest,
  VerifyResult
} from './trust.js';

export type {
  Flow,
  FlowStep,
  FlowStepType,
  CreateFlowRequest,
  RunFlowRequest,
  RunFlowResult
} from './flow.js';

export type {
  Policy,
  PolicyRule,
  PolicyAction,
  CreatePolicyRequest,
  EvaluateRequest,
  EvaluateResult
} from './policy.js';

/**
 * Main HOJAI Foundation client
 *
 * Provides a unified interface to all HOJAI Foundation services.
 * Each service is exposed as a property of the client.
 */
export class Hojai {
  public readonly corpId: CorpIDClient;
  public readonly memory: MemoryClient;
  public readonly twin: TwinClient;
  public readonly trust: TrustClient;
  public readonly flow: FlowClient;
  public readonly policy: PolicyClient;
  public readonly config: ReturnType<typeof resolveConfig>;

  constructor(config: HojaiConfig) {
    this.config = resolveConfig(config);
    this.corpId = new CorpIDClient(this.config);
    this.memory = new MemoryClient(this.config);
    this.twin = new TwinClient(this.config);
    this.trust = new TrustClient(this.config);
    this.flow = new FlowClient(this.config);
    this.policy = new PolicyClient(this.config);
  }
}

/**
 * Default export
 */
export default Hojai;
