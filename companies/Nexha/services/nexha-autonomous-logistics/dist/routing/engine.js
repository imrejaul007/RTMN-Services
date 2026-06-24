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
import { CARRIERS, findCarriers } from '../carriers/registry.js';
import { v4 as uuid } from 'uuid';
const EARTH_RADIUS_KM = 6371;
/**
 * Haversine great-circle distance in km.
 */
export function haversineKm(a, b) {
    // Stub: use country-based distance table. In production, geocode + OSRM.
    // Approximate: same country = 500km avg, neighboring = 3000km, far = 8000km
    if (a.country === b.country)
        return 500;
    const sameRegion = {
        EU: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'PL', 'GB', 'IE', 'PT'],
        SAARC: ['IN', 'PK', 'BD', 'NP', 'LK', 'BT'],
        GCC: ['AE', 'SA', 'QA', 'KW', 'OM', 'BH'],
        NAFTA: ['US', 'CA', 'MX']
    };
    for (const region of Object.values(sameRegion)) {
        if (region.includes(a.country) && region.includes(b.country))
            return 1200;
    }
    // Cross-continental
    return 8000;
}
/**
 * Determine best mode per leg based on distance + cargo characteristics.
 */
export function suggestMode(distanceKm, cargoType, isPerishable) {
    if (isPerishable && distanceKm > 500)
        return 'air';
    if (distanceKm < 300)
        return 'courier';
    if (distanceKm < 1500)
        return 'road';
    if (distanceKm > 4000) {
        // Long-haul: sea or air based on urgency (we use air for now perishable/letters)
        if (cargoType === 'documents' || cargoType === 'electronics')
            return 'air';
        return 'sea';
    }
    return 'road';
}
/**
 * Build a single-leg route for a given carrier.
 */
function buildLeg(carrier, origin, destination, weightKg, isPerishable) {
    const distanceKm = haversineKm(origin, destination);
    const mode = isPerishable && carrier.modes.includes('air')
        ? 'air'
        : carrier.modes.includes(suggestMode(distanceKm, '', isPerishable))
            ? suggestMode(distanceKm, '', isPerishable)
            : carrier.modes[0];
    // Time = transit hours scaled by distance (avg carrier time is for ~3000km)
    const timeScaling = Math.max(0.3, Math.min(2.5, distanceKm / 3000));
    const transitHours = Math.round(carrier.averageTransitHours * timeScaling * 10) / 10;
    // Cost = base rate × weight × distance / 1000 (last 1000km = 1 unit)
    const costUsd = Math.round(carrier.baseRatePerKg * weightKg * Math.max(1, distanceKm / 1000) * 100) / 100;
    // Carbon = grams × kg × km / 1e6 (kg)
    const carbonKg = Math.round((carrier.carbonGramsPerKgKm * weightKg * distanceKm) / 1000 * 100) / 100;
    return {
        carrierId: carrier.id,
        carrierName: carrier.name,
        mode,
        fromAddress: origin,
        toAddress: destination,
        transitHours,
        costUsd,
        carbonKg,
        distanceKm: Math.round(distanceKm)
    };
}
/**
 * Build a route from origin → destination using one carrier (single-leg).
 * For multi-modal, returns a route with a single leg using the carrier's best mode.
 */
export function buildSingleLegRoute(carrier, request) {
    const leg = buildLeg(carrier, request.origin, request.destination, request.cargo.weightKg, request.cargo.type === 'perishable');
    return {
        id: `RTE-${uuid().slice(0, 8).toUpperCase()}`,
        legs: [leg],
        totalCostUsd: leg.costUsd,
        totalTransitHours: leg.transitHours,
        totalCarbonKg: leg.carbonKg,
        totalDistanceKm: leg.distanceKm,
        reliabilityScore: carrier.reliability
    };
}
/**
 * Build a multi-leg route using multiple carriers (e.g. truck to port → ship → truck).
 * Uses a hub-and-spoke pattern: truck to nearest major hub, then long-haul, then truck to destination.
 */
export function buildMultiLegRoute(primary, request) {
    const distanceKm = haversineKm(request.origin, request.destination);
    // Hub for the origin country (simplified: just use origin country code as hub)
    const hub = { country: request.origin.country };
    // Leg 1: origin → hub (truck/courier)
    const truckCarrier = CARRIERS.find((c) => c.modes.includes('road') && (c.regions.length === 0 || c.regions.includes(request.origin.country)))
        || CARRIERS.find((c) => c.id === 'ups-worldwide');
    const leg1 = buildLeg(truckCarrier, request.origin, hub, request.cargo.weightKg, false);
    // Leg 2: hub → destination country (long-haul carrier)
    const leg2 = buildLeg(primary, hub, request.destination, request.cargo.weightKg, request.cargo.type === 'perishable');
    // Leg 3: hub → destination (final-mile)
    const lastMileCarrier = CARRIERS.find((c) => c.modes.includes('road') && (c.regions.length === 0 || c.regions.includes(request.destination.country)) && c.id !== truckCarrier.id)
        || CARRIERS.find((c) => c.id === 'ups-worldwide');
    const leg3 = buildLeg(lastMileCarrier, hub, request.destination, request.cargo.weightKg, false);
    const legs = [leg1, leg2, leg3];
    const totalCostUsd = legs.reduce((s, l) => s + l.costUsd, 0);
    const totalTransitHours = legs.reduce((s, l) => s + l.transitHours, 0);
    const totalCarbonKg = legs.reduce((s, l) => s + l.carbonKg, 0);
    const totalDistanceKm = legs.reduce((s, l) => s + l.distanceKm, 0);
    // Multi-leg reliability is product of individual reliabilities
    const reliabilityScore = legs.reduce((s, l) => {
        const c = CARRIERS.find((cc) => cc.id === l.carrierId);
        return s * (c?.reliability || 0.9);
    }, 1);
    return {
        id: `RTE-${uuid().slice(0, 8).toUpperCase()}`,
        legs,
        totalCostUsd: Math.round(totalCostUsd * 100) / 100,
        totalTransitHours: Math.round(totalTransitHours * 10) / 10,
        totalCarbonKg: Math.round(totalCarbonKg * 100) / 100,
        totalDistanceKm,
        reliabilityScore: Math.round(reliabilityScore * 100) / 100
    };
}
/**
 * Generate candidate routes for a shipment request.
 * Returns 3-5 options using different carriers and modes.
 */
export function generateCandidateRoutes(request) {
    const distanceKm = haversineKm(request.origin, request.destination);
    const isPerishable = request.cargo.type === 'perishable';
    // Pick candidate carriers based on the request
    let candidates;
    if (distanceKm < 500) {
        // Short-haul: use road/courier
        candidates = findCarriers({ country: request.destination.country, modes: ['road', 'courier'] })
            .slice(0, 3);
    }
    else if (distanceKm < 3000) {
        // Mid-haul: air or road
        candidates = findCarriers({ country: request.destination.country, modes: ['air', 'courier'] })
            .slice(0, 3);
    }
    else if (isPerishable) {
        // Long-haul perishable: air freight
        candidates = findCarriers({ country: request.destination.country, modes: ['air'] })
            .slice(0, 3);
    }
    else {
        // Long-haul: sea freight primary, plus air alternatives
        const sea = findCarriers({ modes: ['sea'] }).slice(0, 2);
        const air = findCarriers({ country: request.destination.country, modes: ['air'] }).slice(0, 1);
        candidates = [...sea, ...air];
    }
    // Always include at least 3 candidates
    if (candidates.length < 3) {
        candidates = [...candidates, ...CARRIERS.filter((c) => !candidates.includes(c)).slice(0, 3 - candidates.length)];
    }
    // Build a route per candidate
    const routes = candidates.map((c) => {
        // Use multi-leg for long-distance sea freight; single-leg otherwise
        if (c.modes.includes('sea') && distanceKm > 4000) {
            return buildMultiLegRoute(c, request);
        }
        return buildSingleLegRoute(c, request);
    });
    return routes;
}
/**
 * Score routes against optimization goals.
 *
 * Each route receives a 0-1 score per dimension, then combined using
 * either default weights or caller-supplied weights.
 */
export function scoreRoutes(routes, goal = 'cost', weights) {
    if (routes.length === 0)
        return [];
    // Normalize each dimension to 0-1 (best = 1)
    const minCost = Math.min(...routes.map((r) => r.totalCostUsd));
    const maxCost = Math.max(...routes.map((r) => r.totalCostUsd));
    const minHours = Math.min(...routes.map((r) => r.totalTransitHours));
    const maxHours = Math.max(...routes.map((r) => r.totalTransitHours));
    const minCarbon = Math.min(...routes.map((r) => r.totalCarbonKg));
    const maxCarbon = Math.max(...routes.map((r) => r.totalCarbonKg));
    const minReliability = Math.min(...routes.map((r) => r.reliabilityScore));
    const maxReliability = Math.max(...routes.map((r) => r.reliabilityScore));
    const costRange = maxCost - minCost || 1;
    const hoursRange = maxHours - minHours || 1;
    const carbonRange = maxCarbon - minCarbon || 1;
    const reliabilityRange = maxReliability - minReliability || 1;
    // Default weights by goal
    const defaultWeights = {
        cost: goal === 'cost' ? 0.5 : goal === 'reliability' ? 0.15 : 0.30,
        speed: goal === 'speed' ? 0.5 : 0.30,
        carbon: goal === 'carbon' ? 0.5 : 0.15,
        reliability: goal === 'reliability' ? 0.5 : 0.25
    };
    const w = { ...defaultWeights, ...(weights || {}) };
    return routes
        .map((r) => {
        const costScore = 1 - (r.totalCostUsd - minCost) / costRange;
        const speedScore = 1 - (r.totalTransitHours - minHours) / hoursRange;
        const carbonScore = 1 - (r.totalCarbonKg - minCarbon) / carbonRange;
        const reliabilityScore = maxReliability === minReliability
            ? 1
            : (r.reliabilityScore - minReliability) / reliabilityRange;
        const composite = (w.cost * costScore +
            w.speed * speedScore +
            w.carbon * carbonScore +
            w.reliability * reliabilityScore);
        return {
            ...r,
            score: Math.round(composite * 1000) / 1000,
            scores: {
                cost: Math.round(costScore * 1000) / 1000,
                speed: Math.round(speedScore * 1000) / 1000,
                carbon: Math.round(carbonScore * 1000) / 1000,
                reliability: Math.round(reliabilityScore * 1000) / 1000
            }
        };
    })
        .sort((a, b) => b.score - a.score);
}
