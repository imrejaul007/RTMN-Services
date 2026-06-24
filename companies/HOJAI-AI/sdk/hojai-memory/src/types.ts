/** Map of memory layer service key → port. */
export const MEMORY_PORTS: Record<string, number> = {
  os: 4703,         // MemoryOS — the dumb store
  network: 4794,    // memory-network — tiers, search, aggregation
  confidence: 4152, // Memory Confidence — fact reliability scoring
  bridge: 4704,     // Twin Memory Bridge — twin↔memory partition links
  context: 4790,    // Memory Context Engine — LLM context composer
};

/** A single memory unit (the canonical "fact" / "memory" shape). */
export interface MemoryUnit {
  id: string;
  ownerId: string;
  /** Tier: personal | business | industry | ecosystem | agent */
  tier: 'personal' | 'business' | 'industry' | 'ecosystem' | 'agent';
  type: string;
  content: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  /** 0-100 confidence (denormalized from Memory Confidence service) */
  confidence?: number;
  createdAt: string;
  updatedAt: string;
  /** ISO datetime after which the memory can be archived */
  expiresAt?: string | null;
}

/** Tier-level statistics (count + size per tier per owner). */
export interface TierStats {
  ownerId: string;
  tier: MemoryUnit['tier'];
  count: number;
  sizeBytes: number;
  oldestAt?: string;
  newestAt?: string;
}
