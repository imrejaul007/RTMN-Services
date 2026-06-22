/**
 * REE Integration Hub - Re-export from canonical location
 *
 * This file re-exports from RTNM-Digital/src/reeIntegration.ts
 * to maintain backward compatibility with existing imports.
 *
 * The canonical REE integration is at: RTNM-Digital/src/reeIntegration.ts
 */

export {
  shareFraudSignals,
  getUnifiedFraudScore,
  shareGrowthEvent,
  trackDeliveryWithRisk,
  getTrustScore,
  getREEDashboard
} from '../../src/reeIntegration';

export type {
  // Re-export types for convenience
} from '../../src/reeIntegration';