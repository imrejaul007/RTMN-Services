/**
 * Intent Graph Abstraction Layer
 *
 * This module provides dependency injection and event-based communication
 * for intent graph services, avoiding direct package dependencies.
 */

// Re-export interfaces and types
export {
  type IntentSignal,
  type DormantIntentSignal,
  type AffinityProfile,
  type EnrichedContext,
  type CaptureIntentParams,
  type CaptureResult,
  type IntentGraphProvider,
  type IntentGraphProviderFactory,
  type IntentGraphEventType,
  type IntentGraphEvent,
  type IntentGraphEventListener,
  NoOpIntentGraphProvider,
  setIntentGraphProviderFactory,
  getIntentGraphProvider,
  getIntentGraphEventEmitter,
  emitIntentCaptured,
  emitIntentRevived,
  IntentGraphEventEmitter,
} from './interfaces.js';

// Default export for convenience
export { getIntentGraphProvider as default } from './interfaces.js';
