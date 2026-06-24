/**
 * Cargo Insurance binder.
 *
 * Auto-binds a policy based on cargo value + route. Rates:
 *   - basic: 0.3% of cargo value
 *   - standard: 0.5% of cargo value
 *   - all-risk: 0.8% of cargo value
 */

import type { InsurancePolicy, ScoredRoute } from '../types.js';
import { v4 as uuid } from 'uuid';

const RATES = {
  basic: 0.003,
  standard: 0.005,
  'all-risk': 0.008
} as const;

export function bindInsurance(params: {
  cargoValueUsd: number;
  route: ScoredRoute;
  coverage: 'basic' | 'standard' | 'all-risk';
  carrierId?: string;
}): InsurancePolicy {
  const rate = RATES[params.coverage];
  const premiumUsd = Math.round(params.cargoValueUsd * rate * 100) / 100;
  const validUntil = new Date(Date.now() + params.route.totalTransitHours * 3600 * 1000 + 30 * 24 * 3600 * 1000).toISOString();

  return {
    id: `INS-${uuid().slice(0, 8).toUpperCase()}`,
    carrierId: params.carrierId,
    coverage: params.coverage,
    cargoValueUsd: params.cargoValueUsd,
    premiumUsd,
    rate,
    validUntil,
    policyUrl: `https://insure.nexha.network/policies/${uuid().slice(0, 8)}`
  };
}