/**
 * Intent Graph Service Interfaces
 *
 * These interfaces define the contract for intent graph services.
 * Implementations can be injected to avoid direct dependencies.
 *
 * @example
 * ```typescript
 * import { IntentGraphProvider } from './interfaces';
 *
 * class MyService {
 *   constructor(private intentGraph: IntentGraphProvider) {}
 *
 *   async getUserContext(userId: string) {
 *     return this.intentGraph.getEnrichedContext(userId);
 *   }
 * }
 * ```
 */

// ── Interface Definitions ─────────────────────────────────────────────────────

/**
 * Active intent signal from the intent graph
 */
export interface IntentSignal {
  key: string;
  category: string;
  confidence: number;
  lastSeen: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Dormant intent signal from the intent graph
 */
export interface DormantIntentSignal {
  key: string;
  category: string;
  daysDormant: number;
  revivalScore: number;
  metadata?: Record<string, unknown>;
}

/**
 * User affinity profile from the intent graph
 */
export interface AffinityProfile {
  travelAffinity: number;
  diningAffinity: number;
  retailAffinity: number;
  dominantCategory: 'TRAVEL' | 'DINING' | 'RETAIL' | 'MIXED';
}

/**
 * Enriched context from the intent graph
 */
export interface EnrichedContext {
  activeIntents: IntentSignal[];
  dormantIntents: DormantIntentSignal[];
  suggestedNudges: Array<{
    intentKey: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  profile?: {
    travelAffinity: number;
    diningAffinity: number;
    retailAffinity: number;
    totalConversions: number;
  };
}

/**
 * Intent capture parameters
 */
export interface CaptureIntentParams {
  userId: string;
  appType: string;
  eventType: string;
  category: string;
  intentKey: string;
  intentQuery?: string;
  metadata?: Record<string, unknown>;
  merchantId?: string;
}

/**
 * Intent capture result
 */
export interface CaptureResult {
  intent: {
    _id: string;
    userId: string;
    appType: string;
    category: string;
    intentKey: string;
    confidence: number;
    status: string;
  };
  signal: {
    eventType: string;
    weight: number;
    data?: Record<string, unknown>;
    capturedAt: Date;
  };
  isNew: boolean;
}

/**
 * Provider interface for intent graph services
 */
export interface IntentGraphProvider {
  /**
   * Get enriched context for a user (active intents, dormant intents, profile)
   */
  getEnrichedContext(userId: string): Promise<EnrichedContext | null>;

  /**
   * Get user's affinity profile
   */
  getAffinityProfile(userId: string): Promise<AffinityProfile | null>;

  /**
   * Capture an intent from user interaction
   */
  captureIntent(params: CaptureIntentParams): Promise<CaptureResult>;

  /**
   * Check if intent graph service is available
   */
  isAvailable(): boolean;
}

// ── Factory Function Type ────────────────────────────────────────────────────

/**
 * Factory function to create an intent graph provider
 */
export type IntentGraphProviderFactory = () => IntentGraphProvider;

// ── No-Op Implementation ─────────────────────────────────────────────────────

/**
 * No-op implementation when intent graph is not available
 */
export class NoOpIntentGraphProvider implements IntentGraphProvider {
  async getEnrichedContext(_userId: string): Promise<EnrichedContext | null> {
    return null;
  }

  async getAffinityProfile(_userId: string): Promise<AffinityProfile | null> {
    return null;
  }

  async captureIntent(_params: CaptureIntentParams): Promise<CaptureResult> {
    return {
      intent: {
        _id: '',
        userId: '',
        appType: '',
        category: '',
        intentKey: '',
        confidence: 0,
        status: '',
      },
      signal: {
        eventType: '',
        weight: 0,
        capturedAt: new Date(),
      },
      isNew: false,
    };
  }

  isAvailable(): boolean {
    return false;
  }
}

// ── Default Provider Registry ────────────────────────────────────────────────

let defaultProvider: IntentGraphProvider | null = null;
let providerFactory: IntentGraphProviderFactory | null = null;

/**
 * Set the intent graph provider factory
 */
export function setIntentGraphProviderFactory(factory: IntentGraphProviderFactory): void {
  providerFactory = factory;
  defaultProvider = null; // Reset cached provider
}

/**
 * Get the default intent graph provider
 */
export function getIntentGraphProvider(): IntentGraphProvider {
  if (!defaultProvider) {
    if (providerFactory) {
      defaultProvider = providerFactory();
    } else {
      // Try to use real implementation if available, otherwise use no-op
      defaultProvider = createDefaultIntentGraphProvider();
    }
  }
  return defaultProvider;
}

/**
 * Create the default intent graph provider
 * Uses real implementation if rez-intent-graph is available
 */
function createDefaultIntentGraphProvider(): IntentGraphProvider {
  try {
    // Dynamic import to avoid hard dependency
    // This will fail gracefully if rez-intent-graph is not available
    return createRezIntentGraphProvider();
  } catch {
    // Fall back to no-op provider
    return new NoOpIntentGraphProvider();
  }
}

/**
 * Create provider that wraps rez-intent-graph services
 * This is the real implementation that uses the actual services
 */
function createRezIntentGraphProvider(): IntentGraphProvider {
  // Lazy load the actual implementation to avoid circular dependency issues
  let crossAppAggregationService: any = null;
  let intentCaptureService: any = null;

  const loadServices = async () => {
    if (!crossAppAggregationService) {
      const module = await import('rez-intent-graph');
      crossAppAggregationService = module.crossAppAggregationService;
      intentCaptureService = module.intentCaptureService;
    }
  };

  return {
    async getEnrichedContext(userId: string): Promise<EnrichedContext | null> {
      try {
        await loadServices();
        const ctx = await crossAppAggregationService.getEnrichedContext(userId);
        if (!ctx) return null;

        return {
          activeIntents: ctx.activeIntents.map((i: any) => ({
            key: i.key,
            category: i.category,
            confidence: i.confidence,
            lastSeen: new Date(i.lastSeen),
            metadata: {},
          })),
          dormantIntents: ctx.dormantIntents.map((d: any) => ({
            key: d.key,
            category: d.category,
            daysDormant: d.daysDormant,
            revivalScore: d.revivalScore,
            metadata: {},
          })),
          suggestedNudges: ctx.suggestedNudges,
          profile: ctx.crossAppProfile ? {
            travelAffinity: ctx.crossAppProfile.travelAffinity,
            diningAffinity: ctx.crossAppProfile.diningAffinity,
            retailAffinity: ctx.crossAppProfile.retailAffinity,
            totalConversions: ctx.crossAppProfile.totalConversions,
          } : undefined,
        };
      } catch {
        return null;
      }
    },

    async getAffinityProfile(userId: string): Promise<AffinityProfile | null> {
      try {
        await loadServices();
        const profile = await crossAppAggregationService.getUserAffinityProfile(userId);
        if (!profile) return null;

        return {
          travelAffinity: profile.travelAffinity,
          diningAffinity: profile.diningAffinity,
          retailAffinity: profile.retailAffinity,
          dominantCategory: profile.dominantCategory,
        };
      } catch {
        return null;
      }
    },

    async captureIntent(params: CaptureIntentParams): Promise<CaptureResult> {
      await loadServices();
      return intentCaptureService.capture(params);
    },

    isAvailable(): boolean {
      try {
        loadServices();
        return true;
      } catch {
        return false;
      }
    },
  };
}

// ── Event-Based Communication ─────────────────────────────────────────────────

/**
 * Event types for intent graph events
 */
export type IntentGraphEventType =
  | 'intent_captured'
  | 'intent_revived'
  | 'nudge_sent'
  | 'affinity_updated';

/**
 * Intent graph event
 */
export interface IntentGraphEvent {
  type: IntentGraphEventType;
  userId: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Event listener callback
 */
export type IntentGraphEventListener = (event: IntentGraphEvent) => void;

/**
 * Event emitter for intent graph events
 * Allows decoupled communication between services
 */
export class IntentGraphEventEmitter {
  private listeners: Map<IntentGraphEventType, Set<IntentGraphEventListener>> = new Map();

  /**
   * Subscribe to an event type
   */
  subscribe(eventType: IntentGraphEventType, listener: IntentGraphEventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  /**
   * Emit an event
   */
  emit(event: IntentGraphEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('[IntentGraphEventEmitter] Listener error:', error);
        }
      });
    }
  }

  /**
   * Remove all listeners
   */
  clear(): void {
    this.listeners.clear();
  }
}

// Singleton event emitter for cross-service communication
let eventEmitter: IntentGraphEventEmitter | null = null;

export function getIntentGraphEventEmitter(): IntentGraphEventEmitter {
  if (!eventEmitter) {
    eventEmitter = new IntentGraphEventEmitter();
  }
  return eventEmitter;
}

/**
 * Emit an intent captured event
 */
export function emitIntentCaptured(
  userId: string,
  intentKey: string,
  category: string,
  metadata?: Record<string, unknown>
): void {
  getIntentGraphEventEmitter().emit({
    type: 'intent_captured',
    userId,
    data: { intentKey, category, ...metadata },
    timestamp: new Date(),
  });
}

/**
 * Emit an intent revived event
 */
export function emitIntentRevived(
  userId: string,
  intentKey: string,
  triggerType: string
): void {
  getIntentGraphEventEmitter().emit({
    type: 'intent_revived',
    userId,
    data: { intentKey, triggerType },
    timestamp: new Date(),
  });
}
