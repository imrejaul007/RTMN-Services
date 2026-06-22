// Auto-RFQ Service - Main Export
// This module exports all public APIs from the auto-rfq service

// Types
export * from './types/index.js';

// Engine
export { AutoRFQEngine, createMockEngine, type DatabaseInterface, type NotificationService } from './engine.js';

// Triggers
export {
  LowInventoryTrigger,
  ScheduledReorderTrigger,
  ContractRenewalTrigger,
  TriggerFactory,
  TriggerEvaluator,
  calculateReorderPoint,
  calculateReorderQuantity,
  determineUrgency,
  deduplicateTriggerEvents,
  sortByUrgency,
  filterByMinUrgency,
} from './triggers.js';

// Generator
export {
  RFQGenerator,
  BatchRFQProcessor,
  SupplierMatcher,
  generateRFQTitle,
  generateRFQDescription,
  buildRFQInputFromTrigger,
  formatRFQForCreation,
  createFailedResult,
  createSuccessResult,
  type FormattedRFQData,
} from './generator.js';
