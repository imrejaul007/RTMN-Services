/**
 * @hojai/memory SDK — Memory Layer (4 services + the underlying MemoryOS).
 *
 * @example
 * ```ts
 * import { Memory } from '@hojai/memory';
 *
 * const mem = new Memory({ apiKey, baseUrl: 'https://api.hojai.ai' });
 *
 * // 1. Write a memory
 * await mem.os.create({ ownerId: 'u-1', type: 'episodic', content: 'Met Sarah at HOJAI meetup' });
 *
 * // 2. Search across all tiers
 * const hits = await mem.os.search({ ownerId: 'u-1', q: 'meetup' });
 *
 * // 3. Compose LLM context
 * const ctx = await mem.context.compose({ ownerId: 'u-1', query: 'What is Sarah interested in?', maxTokens: 2000 });
 *
 * // 4. Bind a twin to its memory partition
 * await mem.bridge.bind('customer-twin-1', { kind: 'episodic', partitionId: 'p-1' });
 *
 * // 5. Get confidence report for the twin
 * const report = await mem.confidence.getReport('customer-twin-1');
 * ```
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { MemoryOsClient, type MemoryEntry, type MemoryType, type CreateMemoryRequest } from './os.js';
import { MemoryNetworkClient, type MemoryTier, type AggregateRequest, type PropagationRule } from './network.js';
import { MemoryConfidenceClient, type Fact, type CreateFactRequest, type ConfidenceReport } from './confidence.js';
import { TwinMemoryBridgeClient, type Binding, type MemoryKind, type MemoryStat } from './bridge.js';
import { MemoryContextEngineClient, type ComposeContextRequest, type ComposedContext, type ContextItem } from './context.js';
import { MEMORY_PORTS, type MemoryUnit, type TierStats } from './types.js';

export type { HojaiConfig } from './foundation-config.js';
export { resolveConfig } from './foundation-config.js';
export { MemoryOsClient, type MemoryEntry, type MemoryType, type CreateMemoryRequest } from './os.js';
export { MemoryNetworkClient, type MemoryTier, type AggregateRequest, type PropagationRule } from './network.js';
export { MemoryConfidenceClient, type Fact, type CreateFactRequest, type ConfidenceReport } from './confidence.js';
export { TwinMemoryBridgeClient, type Binding, type MemoryKind, type MemoryStat } from './bridge.js';
export { MemoryContextEngineClient, type ComposeContextRequest, type ComposedContext, type ContextItem } from './context.js';
export { MEMORY_PORTS, type MemoryUnit, type TierStats } from './types.js';

/**
 * Main Memory SDK client (facade)
 *
 * 5 sub-clients wrapping the 4 memory-layer services + the underlying
 * MemoryOS dumb store. Together they form the full HOJAI Memory Layer.
 */
export class Memory {
  public readonly os: MemoryOsClient;
  public readonly network: MemoryNetworkClient;
  public readonly confidence: MemoryConfidenceClient;
  public readonly bridge: TwinMemoryBridgeClient;
  public readonly context: MemoryContextEngineClient;
  public readonly config: ReturnType<typeof resolveConfig>;

  constructor(config: HojaiConfig) {
    const resolved = resolveConfig(config);
    this.config = resolved;
    this.os = new MemoryOsClient(resolved);
    this.network = new MemoryNetworkClient(resolved);
    this.confidence = new MemoryConfidenceClient(resolved);
    this.bridge = new TwinMemoryBridgeClient(resolved);
    this.context = new MemoryContextEngineClient(resolved);
  }
}

export default Memory;
