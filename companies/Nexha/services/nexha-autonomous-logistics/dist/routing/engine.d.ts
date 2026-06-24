/**
 * Multi-modal routing engine.
 *
 * Generates route options for a shipment request, combining multiple carriers
 * across modes (e.g. road to port → sea freight → road to destination).
 *
 * In production this would use real routing data (OSRM, Google Routes API,
 * port-to-port schedules). Here we use Haversine distance + carrier transit
 * times to produce realistic multi-leg options.
 */
import type { ShipmentRequest, Carrier, Route, ScoredRoute, OptimizationGoal, TransportMode } from '../types.js';
/**
 * Haversine great-circle distance in km.
 */
export declare function haversineKm(a: {
    country: string;
    city?: string;
}, b: {
    country: string;
    city?: string;
}): number;
/**
 * Determine best mode per leg based on distance + cargo characteristics.
 */
export declare function suggestMode(distanceKm: number, cargoType: string, isPerishable: boolean): TransportMode;
/**
 * Build a route from origin → destination using one carrier (single-leg).
 * For multi-modal, returns a route with a single leg using the carrier's best mode.
 */
export declare function buildSingleLegRoute(carrier: Carrier, request: ShipmentRequest): Route;
/**
 * Build a multi-leg route using multiple carriers (e.g. truck to port → ship → truck).
 * Uses a hub-and-spoke pattern: truck to nearest major hub, then long-haul, then truck to destination.
 */
export declare function buildMultiLegRoute(primary: Carrier, request: ShipmentRequest): Route;
/**
 * Generate candidate routes for a shipment request.
 * Returns 3-5 options using different carriers and modes.
 */
export declare function generateCandidateRoutes(request: ShipmentRequest): Route[];
/**
 * Score routes against optimization goals.
 *
 * Each route receives a 0-1 score per dimension, then combined using
 * either default weights or caller-supplied weights.
 */
export declare function scoreRoutes(routes: Route[], goal?: OptimizationGoal, weights?: {
    cost?: number;
    speed?: number;
    carbon?: number;
    reliability?: number;
}): ScoredRoute[];
