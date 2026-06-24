/**
 * Customs Agent — checks HS codes, country regulations, duties, sanctions.
 *
 * Simplified model (production would call WCO HS database + national customs APIs):
 * - HS code lookup: returns duty rate band based on HS chapter
 * - Country rules: per-destination document requirements + clearance time
 * - Trade agreements: preferential tariff detection (e.g. EU-US, GCC, SAARC)
 * - Restrictions: hardcoded list of sanctioned destinations + prohibited goods
 */
/**
 * HS code → duty rate band (simplified)
 * Real WCO HS has ~20,000 codes. We bucket by HS chapter (first 2 digits).
 */
const HS_DUTY_RATES = {
    // Chapters 01-05: Live animals, animal products
    '01': { rate: 0.05, description: 'Live animals' },
    '02': { rate: 0.10, description: 'Meat' },
    '03': { rate: 0.07, description: 'Fish, crustaceans' },
    '04': { rate: 0.12, description: 'Dairy products' },
    // Chapters 06-14: Vegetable products
    '06': { rate: 0.05, description: 'Live plants' },
    '07': { rate: 0.08, description: 'Vegetables' },
    '08': { rate: 0.06, description: 'Fruit, nuts' },
    '09': { rate: 0.04, description: 'Coffee, tea, spices' },
    '10': { rate: 0.02, description: 'Cereals' },
    // Chapters 15-24: Food products, beverages, tobacco
    '15': { rate: 0.06, description: 'Fats, oils' },
    '17': { rate: 0.14, description: 'Sugars, confectionery' },
    '22': { rate: 0.18, description: 'Beverages, alcohol' },
    '24': { rate: 0.25, description: 'Tobacco' },
    // Chapters 25-27: Mineral products
    '25': { rate: 0.02, description: 'Salt, minerals' },
    '27': { rate: 0.05, description: 'Mineral fuels, oil' },
    // Chapters 28-38: Chemicals
    '28': { rate: 0.06, description: 'Inorganic chemicals' },
    '29': { rate: 0.07, description: 'Organic chemicals' },
    '30': { rate: 0.03, description: 'Pharmaceuticals' },
    '33': { rate: 0.08, description: 'Cosmetics' },
    '38': { rate: 0.07, description: 'Misc chemicals' },
    // Chapters 39-40: Plastics, rubber
    '39': { rate: 0.08, description: 'Plastics' },
    '40': { rate: 0.05, description: 'Rubber' },
    // Chapters 41-43: Leather
    '41': { rate: 0.07, description: 'Raw hides, leather' },
    '42': { rate: 0.10, description: 'Leather goods' },
    // Chapters 44-49: Wood, paper
    '44': { rate: 0.05, description: 'Wood' },
    '48': { rate: 0.04, description: 'Paper' },
    '49': { rate: 0.02, description: 'Printed books' },
    // Chapters 50-63: Textiles (heavily protected in many markets)
    '50': { rate: 0.10, description: 'Silk' },
    '52': { rate: 0.12, description: 'Cotton' },
    '54': { rate: 0.12, description: 'Man-made filaments' },
    '61': { rate: 0.16, description: 'Apparel, knitted' },
    '62': { rate: 0.16, description: 'Apparel, woven' },
    '63': { rate: 0.14, description: 'Textile articles' },
    // Chapters 64-67: Footwear, headgear
    '64': { rate: 0.12, description: 'Footwear' },
    // Chapters 68-71: Stone, ceramics, glass
    '70': { rate: 0.08, description: 'Glass' },
    // Chapters 72-83: Metals
    '72': { rate: 0.05, description: 'Iron, steel' },
    '76': { rate: 0.06, description: 'Aluminium' },
    // Chapters 84-85: Machinery, electronics
    '84': { rate: 0.04, description: 'Machinery' },
    '85': { rate: 0.05, description: 'Electrical equipment' },
    // Chapters 86-89: Vehicles, aircraft
    '87': { rate: 0.10, description: 'Vehicles' },
    '88': { rate: 0.03, description: 'Aircraft' },
    // Chapters 90-92: Instruments, watches
    '90': { rate: 0.04, description: 'Optical, medical instruments' },
    '91': { rate: 0.08, description: 'Watches' },
    // Chapters 94-96: Furniture, toys
    '94': { rate: 0.08, description: 'Furniture' },
    '95': { rate: 0.06, description: 'Toys' },
    // Chapters 97: Art, antiques
    '97': { rate: 0.05, description: 'Works of art' },
    // Default catch-all
    '99': { rate: 0.05, description: 'Special classifications' }
};
/**
 * Per-destination country document requirements + clearance time.
 */
const COUNTRY_RULES = {
    US: {
        documents: [
            { code: 'COMMERCIAL_INVOICE', name: 'Commercial Invoice', required: true },
            { code: 'PACKING_LIST', name: 'Packing List', required: true },
            { code: 'BILL_OF_LADING', name: 'Bill of Lading / Airway Bill', required: true },
            { code: 'CUSTOMS_FORM_7501', name: 'CBP Form 7501 (Entry Summary)', required: true },
            { code: 'ARRIVAL_NOTICE', name: 'Arrival Notice', required: false }
        ],
        clearanceHours: 48,
        vatRate: 0
    },
    IN: {
        documents: [
            { code: 'COMMERCIAL_INVOICE', name: 'Commercial Invoice', required: true },
            { code: 'PACKING_LIST', name: 'Packing List', required: true },
            { code: 'BILL_OF_LADING', name: 'Bill of Lading / Airway Bill', required: true },
            { code: 'BILL_OF_ENTRY', name: 'Bill of Entry', required: true },
            { code: 'IEC_COPY', name: 'IEC (Importer Exporter Code) Copy', required: true },
            { code: 'GST_INVOICE', name: 'GST Invoice', required: true },
            { code: 'COO', name: 'Certificate of Origin', required: false }
        ],
        clearanceHours: 72,
        vatRate: 0.18, // GST
        notes: 'GST applies on (customs duty value + duty amount). IGST for inter-state.'
    },
    DE: {
        documents: [
            { code: 'COMMERCIAL_INVOICE', name: 'Commercial Invoice', required: true },
            { code: 'PACKING_LIST', name: 'Packing List', required: true },
            { code: 'CMR', name: 'CMR Consignment Note', required: false },
            { code: 'BILL_OF_LADING', name: 'Bill of Lading / Airway Bill', required: true },
            { code: 'EUR1', name: 'EUR1 Movement Certificate (if preferential)', required: false },
            { code: 'EORI', name: 'EORI Number', required: true }
        ],
        clearanceHours: 24,
        vatRate: 0.19
    },
    GB: {
        documents: [
            { code: 'COMMERCIAL_INVOICE', name: 'Commercial Invoice', required: true },
            { code: 'PACKING_LIST', name: 'Packing List', required: true },
            { code: 'BILL_OF_LADING', name: 'Bill of Lading / Airway Bill', required: true },
            { code: 'C88', name: 'C88 Single Administrative Document', required: true },
            { code: 'EORI', name: 'EORI Number', required: true }
        ],
        clearanceHours: 36,
        vatRate: 0.20
    },
    AE: {
        documents: [
            { code: 'COMMERCIAL_INVOICE', name: 'Commercial Invoice', required: true },
            { code: 'PACKING_LIST', name: 'Packing List', required: true },
            { code: 'BILL_OF_LADING', name: 'Bill of Lading / Airway Bill', required: true },
            { code: 'COO', name: 'Certificate of Origin', required: true },
            { code: 'TRADE_LICENSE', name: 'Importer Trade License', required: true }
        ],
        clearanceHours: 24,
        vatRate: 0.05
    },
    CN: {
        documents: [
            { code: 'COMMERCIAL_INVOICE', name: 'Commercial Invoice', required: true },
            { code: 'PACKING_LIST', name: 'Packing List', required: true },
            { code: 'BILL_OF_LADING', name: 'Bill of Lading / Airway Bill', required: true },
            { code: 'CUSTOMS_DECLARATION', name: 'China Customs Declaration', required: true },
            { code: 'CIQ', name: 'CIQ Inspection (if applicable)', required: false }
        ],
        clearanceHours: 60,
        vatRate: 0.13
    },
    JP: {
        documents: [
            { code: 'COMMERCIAL_INVOICE', name: 'Commercial Invoice', required: true },
            { code: 'PACKING_LIST', name: 'Packing List', required: true },
            { code: 'BILL_OF_LADING', name: 'Bill of Lading / Airway Bill', required: true },
            { code: 'NACCS_DECLARATION', name: 'NACCS Electronic Declaration', required: true }
        ],
        clearanceHours: 48,
        vatRate: 0.10
    },
    AU: {
        documents: [
            { code: 'COMMERCIAL_INVOICE', name: 'Commercial Invoice', required: true },
            { code: 'PACKING_LIST', name: 'Packing List', required: true },
            { code: 'BILL_OF_LADING', name: 'Bill of Lading / Airway Bill', required: true },
            { code: 'BORDER_QUESTIONNAIRE', name: 'Full Import Declaration', required: true },
            { code: 'BIOSECURITY', name: 'Biosecurity Information', required: false }
        ],
        clearanceHours: 48,
        vatRate: 0.10
    },
    SG: {
        documents: [
            { code: 'COMMERCIAL_INVOICE', name: 'Commercial Invoice', required: true },
            { code: 'PACKING_LIST', name: 'Packing List', required: true },
            { code: 'BILL_OF_LADING', name: 'Bill of Lading / Airway Bill', required: true },
            { code: 'BEARING_PERMIT', name: 'Customs Permit (if controlled goods)', required: false }
        ],
        clearanceHours: 12,
        vatRate: 0.09
    }
};
// Default for countries not in the table
const DEFAULT_RULES = {
    documents: [
        { code: 'COMMERCIAL_INVOICE', name: 'Commercial Invoice', required: true },
        { code: 'PACKING_LIST', name: 'Packing List', required: true },
        { code: 'BILL_OF_LADING', name: 'Bill of Lading / Airway Bill', required: true }
    ],
    clearanceHours: 48,
    vatRate: 0.10
};
/**
 * Sanctioned / prohibited destinations (subset).
 * Production would integrate UN/EU/OFAC lists.
 */
const SANCTIONED_DESTINATIONS = ['KP', 'IR', 'SY', 'CU'];
function requiresSpecialPermitsFor(_category) {
    return [];
}
const RESTRICTED_GOODS_TO = {
    IL: requiresSpecialPermitsFor('food, pharmaceuticals'),
    RU: requiresSpecialPermitsFor('electronics, dual-use')
};
/**
 * Trade agreements that reduce duty rates.
 */
const TRADE_AGREEMENTS = [
    { members: ['US', 'CA', 'MX'], name: 'USMCA', dutyReduction: 0.9 },
    { members: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PL', 'PT', 'IE'], name: 'EU Single Market', dutyReduction: 1.0 },
    { members: ['AE', 'SA', 'QA', 'KW', 'OM', 'BH'], name: 'GCC', dutyReduction: 0.95 },
    { members: ['IN', 'LK', 'BD', 'NP', 'BT', 'PK'], name: 'SAFTA', dutyReduction: 0.5 },
    { members: ['SG', 'AU', 'NZ', 'MY', 'JP', 'KR', 'VN', 'CN', 'TH'], name: 'RCEP', dutyReduction: 0.7 },
    { members: ['GB', 'AU', 'NZ', 'SG', 'MY', 'JP', 'CA'], name: 'CPTPP', dutyReduction: 0.7 }
];
function findTradeAgreement(origin, destination) {
    return TRADE_AGREEMENTS.find((a) => a.members.includes(origin) && a.members.includes(destination));
}
/**
 * Look up HS code and return duty band.
 */
export function lookupHsCode(hsCode) {
    const chapter = hsCode.replace(/[^0-9]/g, '').slice(0, 2);
    return HS_DUTY_RATES[chapter] || HS_DUTY_RATES['99'];
}
/**
 * Get country-specific rules.
 */
export function getCountryRules(country) {
    return COUNTRY_RULES[country] || DEFAULT_RULES;
}
/**
 * Calculate duties (duty + VAT) for a shipment.
 */
export function calculateDuties(params) {
    const { hsCode, origin, destination, value, currency } = params;
    const hsData = lookupHsCode(hsCode);
    const destRules = getCountryRules(destination);
    let dutyRate = hsData.rate;
    // Apply trade agreement reduction
    const agreement = findTradeAgreement(origin, destination);
    if (agreement) {
        dutyRate = dutyRate * (1 - agreement.dutyReduction);
    }
    const duties = [];
    if (dutyRate > 0) {
        duties.push({
            type: 'duty',
            rate: Math.round(dutyRate * 10000) / 10000,
            amountUsd: Math.round(value * dutyRate * 100) / 100,
            notes: agreement ? `Reduced via ${agreement.name}` : undefined
        });
    }
    if (destRules.vatRate > 0) {
        // VAT is calculated on (value + duty)
        const vatBase = value + (value * dutyRate);
        duties.push({
            type: destRules.vatRate >= 0.13 ? 'vat' : 'gst',
            rate: destRules.vatRate,
            amountUsd: Math.round(vatBase * destRules.vatRate * 100) / 100,
            notes: destRules.notes
        });
    }
    // Small processing fee
    duties.push({
        type: 'processing_fee',
        rate: 0,
        amountUsd: 25,
        notes: 'Customs broker fee (estimate)'
    });
    const totalDutiesUsd = Math.round(duties.reduce((s, d) => s + d.amountUsd, 0) * 100) / 100;
    return { duties, totalDutiesUsd };
}
/**
 * Check restrictions / sanctions for a shipment.
 */
export function checkRestrictions(params) {
    const warnings = [];
    let prohibited = false;
    let reason;
    if (SANCTIONED_DESTINATIONS.includes(params.destination)) {
        prohibited = true;
        reason = `Destination ${params.destination} is under international sanctions`;
    }
    else if (SANCTIONED_DESTINATIONS.includes(params.origin)) {
        prohibited = true;
        reason = `Origin ${params.origin} is under international sanctions`;
    }
    // HS-specific restrictions (simplified)
    if (params.hsCode) {
        const chapter = params.hsCode.replace(/[^0-9]/g, '').slice(0, 2);
        if (chapter === '93') {
            // Arms and ammunition
            warnings.push('HS Chapter 93 (arms/ammunition) requires special export license');
        }
        if (chapter === '71') {
            // Precious metals/stones
            warnings.push('HS Chapter 71 (precious metals/stones) may require additional declaration');
        }
        if (chapter === '12') {
            // Oilseeds
            warnings.push('HS Chapter 12 may require phytosanitary certificate');
        }
    }
    return {
        allowed: !prohibited,
        prohibited,
        warnings,
        reason
    };
}
/**
 * Determine required documents for a destination + cargo.
 */
export function determineDocuments(destination, hsCode) {
    const rules = getCountryRules(destination);
    const docs = rules.documents.map((d) => ({
        code: d.code,
        name: d.name,
        description: `Required by ${destination} customs`,
        required: d.required
    }));
    if (hsCode) {
        const chapter = hsCode.replace(/[^0-9]/g, '').slice(0, 2);
        if (['02', '03', '04', '07', '08', '10', '17', '22'].includes(chapter)) {
            docs.push({
                code: 'PHYTOSANITARY',
                name: 'Phytosanitary / Health Certificate',
                description: 'Required for food/agricultural products',
                required: true
            });
        }
        if (chapter === '30') {
            docs.push({
                code: 'DRUG_LICENSE',
                name: 'Drug Import License',
                description: 'Required for pharmaceuticals',
                required: true
            });
        }
    }
    return docs;
}
/**
 * Main entry point — full customs check for a shipment.
 */
export async function checkRequirements(params) {
    const { origin, destination, hsCode, value, currency } = params;
    const destRules = getCountryRules(destination);
    const restrictions = checkRestrictions({ origin, destination, hsCode });
    if (!hsCode) {
        // No HS code provided — return partial info
        return {
            documents: determineDocuments(destination),
            duties: [{ type: 'processing_fee', rate: 0, amountUsd: 25, notes: 'HS code required for duty calculation' }],
            totalDutiesUsd: 25,
            estimatedClearanceHours: destRules.clearanceHours,
            restrictions
        };
    }
    const { duties, totalDutiesUsd } = calculateDuties({ hsCode, origin, destination, value, currency });
    const documents = determineDocuments(destination, hsCode);
    return {
        documents,
        duties,
        totalDutiesUsd,
        estimatedClearanceHours: destRules.clearanceHours,
        restrictions
    };
}
/**
 * Schedule customs clearance for a booked shipment.
 * In production this would file the documents with the customs authority.
 */
export async function scheduleClearance(params) {
    const missingRequired = params.documents.filter((d) => d.required).length;
    const status = missingRequired === params.documents.length
        ? 'scheduled'
        : 'pending_docs';
    const clearanceId = `CLR-${params.shipmentId.slice(-8)}`;
    const scheduledFor = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    return { clearanceId, scheduledFor, status };
}
