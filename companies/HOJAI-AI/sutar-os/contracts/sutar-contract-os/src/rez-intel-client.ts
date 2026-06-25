/**
 * Dual-client intelligence client for sutar-contract-os (TypeScript)
 *
 * Re-exports the shared HOJAI + REZ dual-client helper. Supports
 * INTEL_MODE=hojai|rez|dual for routing between HOJAI Intelligence
 * (port 4881, core AI) and REZ Intelligence (port 5370, business intelligence).
 *
 * See @rtmn/shared/intel/dual-client for the full backend mapping.
 */

import dual from '@rtmn/shared/intel/dual-client';

export const REZ_INTEL_URL = dual.REZ_INTEL_URL;
export const HOJAI_INTEL_URL = dual.HOJAI_INTEL_URL;
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