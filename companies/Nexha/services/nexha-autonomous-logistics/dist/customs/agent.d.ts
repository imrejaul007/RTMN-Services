/**
 * Customs Agent — checks HS codes, country regulations, duties, sanctions.
 *
 * Simplified model (production would call WCO HS database + national customs APIs):
 * - HS code lookup: returns duty rate band based on HS chapter
 * - Country rules: per-destination document requirements + clearance time
 * - Trade agreements: preferential tariff detection (e.g. EU-US, GCC, SAARC)
 * - Restrictions: hardcoded list of sanctioned destinations + prohibited goods
 */
import type { IsoCountry, CustomsRequirements, CustomsDocument, CustomsDuty, CustomsRestrictions, HsCode } from '../types.js';
/**
 * Look up HS code and return duty band.
 */
export declare function lookupHsCode(hsCode: HsCode): {
    rate: number;
    description: string;
};
/**
 * Get country-specific rules.
 */
export declare function getCountryRules(country: IsoCountry): {
    documents: Array<{
        code: string;
        name: string;
        required: boolean;
    }>;
    clearanceHours: number;
    vatRate: number;
    notes?: string;
};
/**
 * Calculate duties (duty + VAT) for a shipment.
 */
export declare function calculateDuties(params: {
    hsCode: HsCode;
    origin: IsoCountry;
    destination: IsoCountry;
    value: number;
    currency: string;
}): {
    duties: CustomsDuty[];
    totalDutiesUsd: number;
};
/**
 * Check restrictions / sanctions for a shipment.
 */
export declare function checkRestrictions(params: {
    origin: IsoCountry;
    destination: IsoCountry;
    hsCode?: HsCode;
}): CustomsRestrictions;
/**
 * Determine required documents for a destination + cargo.
 */
export declare function determineDocuments(destination: IsoCountry, hsCode?: HsCode): CustomsDocument[];
/**
 * Main entry point — full customs check for a shipment.
 */
export declare function checkRequirements(params: {
    origin: IsoCountry;
    destination: IsoCountry;
    hsCode?: HsCode;
    value: number;
    currency: string;
}): Promise<CustomsRequirements>;
/**
 * Schedule customs clearance for a booked shipment.
 * In production this would file the documents with the customs authority.
 */
export declare function scheduleClearance(params: {
    shipmentId: string;
    documents: CustomsDocument[];
    destination: IsoCountry;
}): Promise<{
    clearanceId: string;
    scheduledFor: string;
    status: 'scheduled' | 'pending_docs';
}>;
