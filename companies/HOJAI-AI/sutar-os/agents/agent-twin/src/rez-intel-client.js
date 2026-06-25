/**
 * Dual-client intelligence client for agent-twin.
 *
 * Thin re-export wrapper that delegates to `@rtmn/shared/intel/dual-client`.
 * agent-twin is an ESM service (`"type": "module"`), so we use ESM `export`
 * syntax to re-export the dual-client helper as named exports.
 *
 * The dual-client supports HOJAI Intelligence (4881) + REZ Intelligence (5370)
 * with INTEL_MODE=hojai|rez|dual. See @rtmn/shared/intel/dual-client.cjs for
 * the full mapping of helpers to backends.
 */

import dual from '@rtmn/shared/intel/dual-client';

export const REZ_INTEL_URL = dual.REZ_INTEL_URL;
export const HOJAI_INTEL_URL = dual.HOJAI_INTEL_URL;
export const INTEL_MODE = dual.INTEL_MODE;
export const REZ_INTEL_ENABLED = dual.REZ_INTEL_ENABLED;
export const HOJAI_INTEL_ENABLED = dual.HOJAI_INTEL_ENABLED;

export const enrichAgentContext = dual.enrichAgentContext;
export const classifyIntent = dual.classifyIntent;
export const getCustomerInsights = dual.getCustomerInsights;
export const getMerchantInsights = dual.getMerchantInsights;
export const predictRevenue = dual.predictRevenue;
export const predictChurn = dual.predictChurn;
export const predictLtv = dual.predictLtv;
export const predictDemand = dual.predictDemand;
export const getProductRecommendations = dual.getProductRecommendations;
export const getNextBestAction = dual.getNextBestAction;
export const getPricingRecommendations = dual.getPricingRecommendations;
export const checkHealth = dual.checkHealth;
export const checkRezIntelHealth = dual.checkRezIntelHealth;

export default dual;