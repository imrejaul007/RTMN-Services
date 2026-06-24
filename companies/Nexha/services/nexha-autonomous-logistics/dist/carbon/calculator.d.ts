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
export declare function calculateCarbon(route: ScoredRoute): CarbonEstimate;
