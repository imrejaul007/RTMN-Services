/**
 * Carbon footprint calculator.
 *
 * Per-leg emissions + intensity metrics + offset cost estimates.
 *
 * Constants:
 *   - Average tree absorbs ~25 kg CO2/year
 *   - Average offset cost: $15/tonne CO2 (varies by project)
 */

import type { CarbonEstimate, ScoredRoute } from '../types.js';
import { CARRIERS } from '../carriers/registry.js';

const TREE_ABSORPTION_KG_PER_YEAR = 25;
const OFFSET_COST_USD_PER_TONNE = 15;

export function calculateCarbon(route: ScoredRoute): CarbonEstimate {
  const legs = route.legs.map((leg) => {
    const carrier = CARRIERS.find((c) => c.id === leg.carrierId);
    return {
      carrierId: leg.carrierId,
      mode: leg.mode,
      kg: leg.carbonKg,
      distanceKm: leg.distanceKm
    };
  });

  const totalKg = Math.round(route.totalCarbonKg * 100) / 100;
  const totalTonnes = totalKg / 1000;

  // Intensity = kg CO2 per km of transport (rough aggregate metric)
  const intensity = route.totalDistanceKm > 0
    ? Math.round((totalKg / route.totalDistanceKm) * 1000) / 1000
    : 0;

  // Tree-days = (total kg / absorption per tree per day) where one tree-year = 25kg
  // So tree-days = totalKg / (25 / 365)
  const treeDays = Math.round((totalKg / (TREE_ABSORPTION_KG_PER_YEAR / 365)) * 10) / 10;

  const offsetCostUsd = Math.round(totalTonnes * OFFSET_COST_USD_PER_TONNE * 100) / 100;

  return {
    totalKg,
    intensity,
    treeDays,
    offsetCostUsd,
    legs
  };
}