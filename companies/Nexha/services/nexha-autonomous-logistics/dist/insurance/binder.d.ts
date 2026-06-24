/**
 * Cargo Insurance binder.
 *
 * Auto-binds a policy based on cargo value + route. Rates:
 *   - basic: 0.3% of cargo value
 *   - standard: 0.5% of cargo value
 *   - all-risk: 0.8% of cargo value
 */
import type { InsurancePolicy, ScoredRoute } from '../types.js';
export declare function bindInsurance(params: {
    cargoValueUsd: number;
    route: ScoredRoute;
    coverage: 'basic' | 'standard' | 'all-risk';
    carrierId?: string;
}): InsurancePolicy;
