/**
 * Core types for nexha-autonomous-logistics.
 *
 * All addresses use ISO 3166-1 alpha-2 country codes (e.g. "US", "IN", "DE").
 * HS codes are 6+ digit Harmonized System codes (e.g. "6203.42" for men's cotton trousers).
 * Currencies use ISO 4217 (e.g. "USD", "EUR", "INR").
 */
export type IsoCountry = string;
export type IsoCurrency = string;
export type HsCode = string;
export type Address = {
    country: IsoCountry;
    city?: string;
    postalCode?: string;
    /** Free-form street/port/airport address */
    line1?: string;
};
export type CargoType = 'general' | 'perishable' | 'hazardous' | 'fragile' | 'liquid' | 'electronics' | 'textile' | 'documents' | 'vehicle' | 'bulk';
export type TransportMode = 'air' | 'sea' | 'road' | 'rail' | 'courier';
export type OptimizationGoal = 'cost' | 'speed' | 'carbon' | 'reliability';
export type Cargo = {
    type: CargoType;
    weightKg: number;
    dimensionsCm?: {
        length: number;
        width: number;
        height: number;
    };
    hsCode?: HsCode;
    declaredValue: number;
    currency: IsoCurrency;
    /** Pieces count (defaults to 1) */
    pieces?: number;
    /** Stackable / non-stackable */
    stackable?: boolean;
    /** Required temperature range for perishables */
    temperatureRangeC?: {
        min: number;
        max: number;
    };
};
export type ShipmentRequest = {
    origin: Address;
    destination: Address;
    cargo: Cargo;
    /** ISO 8601 deadline (when cargo must arrive) */
    deadline?: string;
    /** Optimization goal */
    optimizeFor?: OptimizationGoal;
    /** Optional scoring weights (must sum to ~1.0) */
    weights?: {
        cost?: number;
        speed?: number;
        carbon?: number;
        reliability?: number;
    };
    /** Auto-bind insurance */
    insurance?: {
        coverage: 'basic' | 'standard' | 'all-risk';
        cargoValue?: number;
    };
    /** Preferred carriers (optional) */
    preferredCarriers?: string[];
};
export type CarrierId = string;
export type Carrier = {
    id: CarrierId;
    name: string;
    /** Modes the carrier supports */
    modes: TransportMode[];
    /** ISO country codes the carrier serves (empty = global) */
    regions: IsoCountry[];
    /** Reliability score 0-1 (carrier-specific) */
    reliability: number;
    /** Base rate USD per kg */
    baseRatePerKg: number;
    /** Average transit time in hours */
    averageTransitHours: number;
    /** Carbon grams per kg-km */
    carbonGramsPerKgKm: number;
};
export type RouteLeg = {
    carrierId: CarrierId;
    carrierName: string;
    mode: TransportMode;
    fromAddress: Address;
    toAddress: Address;
    /** Transit time in hours for this leg */
    transitHours: number;
    /** Cost in USD for this leg */
    costUsd: number;
    /** Carbon kg for this leg */
    carbonKg: number;
    /** Distance in km (estimated) */
    distanceKm: number;
};
export type Route = {
    id: string;
    legs: RouteLeg[];
    totalCostUsd: number;
    totalTransitHours: number;
    totalCarbonKg: number;
    totalDistanceKm: number;
    /** 0-1 reliability score aggregated from legs */
    reliabilityScore: number;
};
export type ScoredRoute = Route & {
    /** Final composite score (higher = better) */
    score: number;
    /** Per-dimension score breakdown */
    scores: {
        cost: number;
        speed: number;
        carbon: number;
        reliability: number;
    };
};
export type CustomsDocument = {
    code: string;
    name: string;
    description: string;
    required: boolean;
};
export type CustomsDuty = {
    type: 'duty' | 'vat' | 'gst' | 'excise' | 'processing_fee';
    rate: number;
    amountUsd: number;
    notes?: string;
};
export type CustomsRestrictions = {
    allowed: boolean;
    warnings: string[];
    /** Sanctioned destination / prohibited goods */
    prohibited: boolean;
    reason?: string;
};
export type CustomsRequirements = {
    documents: CustomsDocument[];
    duties: CustomsDuty[];
    totalDutiesUsd: number;
    estimatedClearanceHours: number;
    restrictions: CustomsRestrictions;
};
export type InsurancePolicy = {
    id: string;
    carrierId?: CarrierId;
    coverage: 'basic' | 'standard' | 'all-risk';
    cargoValueUsd: number;
    premiumUsd: number;
    /** Premium rate (e.g. 0.005 = 0.5% of cargo value) */
    rate: number;
    validUntil: string;
    policyUrl?: string;
};
export type ShipmentPlan = {
    id: string;
    recommendedRoute: ScoredRoute;
    alternatives: ScoredRoute[];
    customsDocuments: CustomsDocument[];
    insurance?: InsurancePolicy;
    estimatedCostUsd: number;
    estimatedDelivery: string;
    carbonFootprintKg: number;
    /** ISO timestamp the plan was created */
    createdAt: string;
};
export type BookingLegResult = {
    carrierId: CarrierId;
    shipmentId: string;
    trackingNumber: string;
    pickupTime: string;
    deliveryTime: string;
    costUsd: number;
    status: 'confirmed' | 'pending' | 'failed';
};
export type BookingConfirmation = {
    shipmentId: string;
    bookings: BookingLegResult[];
    estimatedPickup: string;
    estimatedDelivery: string;
    totalCostUsd: number;
};
export type ShipmentStatus = {
    shipmentId: string;
    status: 'created' | 'picked-up' | 'in-transit' | 'customs' | 'out-for-delivery' | 'delivered' | 'exception' | 'cancelled';
    currentLocation?: Address;
    /** Per-leg progress */
    legs: Array<{
        carrierId: CarrierId;
        carrierName: string;
        mode: TransportMode;
        status: 'pending' | 'in-transit' | 'delivered' | 'exception';
        trackingNumber: string;
        lastUpdate: string;
        events: Array<{
            timestamp: string;
            location?: Address;
            status: string;
            description: string;
        }>;
    }>;
    estimatedDelivery?: string;
    /** Difference from planned delivery in hours (negative = early) */
    delayHours?: number;
};
export type RerouteResult = {
    success: boolean;
    reason?: string;
    newShipmentId?: string;
    alternatives?: ScoredRoute[];
};
export type CarbonEstimate = {
    totalKg: number;
    /** kg CO2 per tonne-km for comparison */
    intensity: number;
    /** Equivalent tree-days for offsetting */
    treeDays: number;
    /** Estimated USD cost to offset */
    offsetCostUsd: number;
    /** Per-leg breakdown */
    legs: Array<{
        carrierId: CarrierId;
        mode: TransportMode;
        kg: number;
        distanceKm: number;
    }>;
};
