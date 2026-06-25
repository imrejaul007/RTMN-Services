/**
 * TypeScript declarations for @rtmn/shared/intel/dual-client
 *
 * The runtime helper is dual-client.cjs (CommonJS) or dual-client.js (ESM).
 * This .d.ts gives TS consumers full typing for both.
 */

declare module '@rtmn/shared/intel/dual-client' {
  export const REZ_INTEL_URL: string;
  export const HOJAI_INTEL_URL: string;
  export const REZ_INTEL_ENABLED: boolean;
  export const HOJAI_INTEL_ENABLED: boolean;
  export const INTEL_MODE: 'hojai' | 'rez' | 'dual';

  export function enrichAgentContext(params: Record<string, any>): Promise<any>;
  export function classifyIntent(params: Record<string, any>): Promise<any>;
  export function getCustomerInsights(customerIdOrParams: string | Record<string, any>): Promise<any>;
  export function getMerchantInsights(params: Record<string, any>): Promise<any>;
  export function predictRevenue(params: Record<string, any>): Promise<any>;
  export function predictChurn(params: Record<string, any>): Promise<any>;
  export function predictLtv(params: Record<string, any>): Promise<any>;
  export function predictDemand(params: Record<string, any>): Promise<any>;
  export function getProductRecommendations(params: Record<string, any>): Promise<any>;
  export function getNextBestAction(params: Record<string, any>): Promise<any>;
  export function getPricingRecommendations(params: Record<string, any>): Promise<any>;
  export function checkHealth(): Promise<{ hojai: boolean; rez: boolean; mode: string }>;
  export function checkRezIntelHealth(): Promise<boolean>;

  const _default: {
    REZ_INTEL_URL: string;
    HOJAI_INTEL_URL: string;
    REZ_INTEL_ENABLED: boolean;
    HOJAI_INTEL_ENABLED: boolean;
    INTEL_MODE: string;
    enrichAgentContext: typeof enrichAgentContext;
    classifyIntent: typeof classifyIntent;
    getCustomerInsights: typeof getCustomerInsights;
    getMerchantInsights: typeof getMerchantInsights;
    predictRevenue: typeof predictRevenue;
    predictChurn: typeof predictChurn;
    predictLtv: typeof predictLtv;
    predictDemand: typeof predictDemand;
    getProductRecommendations: typeof getProductRecommendations;
    getNextBestAction: typeof getNextBestAction;
    getPricingRecommendations: typeof getPricingRecommendations;
    checkHealth: typeof checkHealth;
    checkRezIntelHealth: typeof checkRezIntelHealth;
  };
  export default _default;
}