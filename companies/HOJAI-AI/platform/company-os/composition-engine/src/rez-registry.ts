/**
 * REZ Service Registry
 *
 * Maps industries to REZ-Merchant services.
 * Used by Composition Engine to wire up connectors.
 */

import { IndustryType } from './types';

export interface REZService {
  name: string;
  path: string;          // Path in REZ-Merchant repo
  url: string;           // Default runtime URL
  purpose: string;       // What it does
  defaultPort: number;   // Default port for local dev
}

export interface REZIndustryServices {
  industry: IndustryType;
  services: REZService[];
  connectors: string[];   // Connector module names
}

// ============================================
// REZ-Merchant Service Registry
// ============================================

export const REZ_SERVICE_REGISTRY: Record<IndustryType, REZIndustryServices> = {
  restaurant: {
    industry: 'restaurant',
    connectors: ['restaurant'],
    services: [
      {
        name: 'rez-menu-service',
        path: 'REZ-Merchant/rez-menu-service',
        url: process.env.REZ_MENU_SERVICE_URL || 'http://localhost:3002',
        purpose: 'Menu management',
        defaultPort: 3002,
      },
      {
        name: 'rez-order-service',
        path: 'REZ-Merchant/rez-order-service',
        url: process.env.REZ_ORDER_SERVICE_URL || 'http://localhost:3003',
        purpose: 'Order processing',
        defaultPort: 3003,
      },
      {
        name: 'rez-table-booking-service',
        path: 'REZ-Merchant/rez-table-booking-service',
        url: process.env.REZ_TABLE_BOOKING_URL || 'http://localhost:3004',
        purpose: 'Table reservations',
        defaultPort: 3004,
      },
      {
        name: 'rez-kds-service',
        path: 'REZ-Merchant/rez-kds-service',
        url: process.env.REZ_KDS_SERVICE_URL || 'http://localhost:3005',
        purpose: 'Kitchen display system',
        defaultPort: 3005,
      },
      {
        name: 'rez-pos-service',
        path: 'REZ-Merchant/rez-pos-service',
        url: process.env.REZ_POS_SERVICE_URL || 'http://localhost:3006',
        purpose: 'Point of sale',
        defaultPort: 3006,
      },
      {
        name: 'rez-inventory-service',
        path: 'REZ-Merchant/rez-inventory-service',
        url: process.env.REZ_INVENTORY_SERVICE_URL || 'http://localhost:3007',
        purpose: 'Inventory management',
        defaultPort: 3007,
      },
      {
        name: 'rez-ai-waiter',
        path: 'REZ-Merchant/rez-ai-waiter',
        url: process.env.REZ_AI_WAITER_URL || 'http://localhost:3008',
        purpose: 'AI customer assistant',
        defaultPort: 3008,
      },
    ],
  },

  beauty: {
    industry: 'beauty',
    connectors: ['beauty'],
    services: [
      {
        name: 'rez-beauty-appointment',
        path: 'REZ-Merchant/rez-beauty-appointment',
        url: process.env.REZ_APPOINTMENT_SERVICE_URL || 'http://localhost:3010',
        purpose: 'Appointment scheduling',
        defaultPort: 3010,
      },
      {
        name: 'rez-beauty-stylist',
        path: 'REZ-Merchant/rez-beauty-stylist',
        url: process.env.REZ_STYLIST_SERVICE_URL || 'http://localhost:3011',
        purpose: 'Stylist management',
        defaultPort: 3011,
      },
      {
        name: 'rez-beauty-service',
        path: 'REZ-Merchant/rez-beauty-service',
        url: process.env.REZ_BEAUTY_SERVICE_URL || 'http://localhost:3012',
        purpose: 'Service catalog',
        defaultPort: 3012,
      },
      {
        name: 'rez-beauty-membership',
        path: 'REZ-Merchant/rez-beauty-membership',
        url: process.env.REZ_MEMBERSHIP_SERVICE_URL || 'http://localhost:3013',
        purpose: 'Membership & loyalty',
        defaultPort: 3013,
      },
    ],
  },

  hotel: {
    industry: 'hotel',
    connectors: ['hotel'],
    services: [
      {
        name: 'REZ-hotel-pms',
        path: 'REZ-Merchant/REZ-hotel-pms',
        url: process.env.REZ_PMS_SERVICE_URL || 'http://localhost:3020',
        purpose: 'Property management',
        defaultPort: 3020,
      },
      {
        name: 'REZ-hotel-booking',
        path: 'REZ-Merchant/REZ-hotel-booking',
        url: process.env.REZ_BOOKING_SERVICE_URL || 'http://localhost:3021',
        purpose: 'Hotel reservations',
        defaultPort: 3021,
      },
      {
        name: 'REZ-hotel-channel-bridge',
        path: 'REZ-Merchant/REZ-hotel-channel-bridge',
        url: process.env.REZ_HOTEL_CHANNEL_URL || 'http://localhost:3022',
        purpose: 'OTA channel sync',
        defaultPort: 3022,
      },
      {
        name: 'REZ-hotel-housekeeping',
        path: 'REZ-Merchant/REZ-hotel-housekeeping',
        url: process.env.REZ_HOUSEKEEPING_URL || 'http://localhost:3023',
        purpose: 'Housekeeping tasks',
        defaultPort: 3023,
      },
      {
        name: 'REZ-hotel-billing',
        path: 'REZ-Merchant/REZ-hotel-billing',
        url: process.env.REZ_HOTEL_BILLING_URL || 'http://localhost:3024',
        purpose: 'Guest billing',
        defaultPort: 3024,
      },
    ],
  },

  retail: {
    industry: 'retail',
    connectors: ['retail'],
    services: [
      {
        name: 'rez-retail-service',
        path: 'REZ-Merchant/rez-retail-service',
        url: process.env.REZ_RETAIL_SERVICE_URL || 'http://localhost:3030',
        purpose: 'Core retail operations',
        defaultPort: 3030,
      },
      {
        name: 'rez-retail-pos-service',
        path: 'REZ-Merchant/rez-retail-pos-service',
        url: process.env.REZ_RETAIL_POS_URL || 'http://localhost:3031',
        purpose: 'Retail POS',
        defaultPort: 3031,
      },
      {
        name: 'rez-retail-inventory-service',
        path: 'REZ-Merchant/rez-retail-inventory-service',
        url: process.env.REZ_RETAIL_INVENTORY_URL || 'http://localhost:3032',
        purpose: 'Retail inventory',
        defaultPort: 3032,
      },
      {
        name: 'rez-retail-loyalty-service',
        path: 'REZ-Merchant/rez-retail-loyalty-service',
        url: process.env.REZ_RETAIL_LOYALTY_URL || 'http://localhost:3033',
        purpose: 'Loyalty program',
        defaultPort: 3033,
      },
      {
        name: 'rez-retail-analytics-service',
        path: 'REZ-Merchant/rez-retail-analytics-service',
        url: process.env.REZ_RETAIL_ANALYTICS_URL || 'http://localhost:3034',
        purpose: 'Sales analytics',
        defaultPort: 3034,
      },
      {
        name: 'rez-retail-crm-service',
        path: 'REZ-Merchant/rez-retail-crm-service',
        url: process.env.REZ_RETAIL_CRM_URL || 'http://localhost:3035',
        purpose: 'Customer management',
        defaultPort: 3035,
      },
    ],
  },

  // Other industries - add as needed
  healthcare: {
    industry: 'healthcare',
    connectors: ['healthcare'],
    services: [],
  },
  education: {
    industry: 'education',
    connectors: ['education'],
    services: [],
  },
  realestate: {
    industry: 'realestate',
    connectors: ['realestate'],
    services: [
      {
        name: 'REZ-realestate-os',
        path: 'REZ-Merchant/REZ-realestate-os',
        url: process.env.REZ_RE_ SERVICE_URL || 'http://localhost:3040',
        purpose: 'Real estate management',
        defaultPort: 3040,
      },
    ],
  },
  manufacturing: {
    industry: 'manufacturing',
    connectors: ['manufacturing'],
    services: [
      {
        name: 'REZ-manufacturing-os',
        path: 'REZ-Merchant/REZ-manufacturing-os',
        url: process.env.REZ_MFG_SERVICE_URL || 'http://localhost:3050',
        purpose: 'Manufacturing operations',
        defaultPort: 3050,
      },
    ],
  },

  // Placeholders for remaining industries
  fitness: { industry: 'fitness', connectors: [], services: [] },
  legal: { industry: 'legal', connectors: [], services: [] },
  construction: { industry: 'construction', connectors: [], services: [] },
  logistics: { industry: 'logistics', connectors: [], services: [] },
  automotive: { industry: 'automotive', connectors: [], services: [] },
  fashion: { industry: 'fashion', connectors: [], services: [] },
  sports: { industry: 'sports', connectors: [], services: [] },
  entertainment: { industry: 'entertainment', connectors: [], services: [] },
  travel: { industry: 'travel', connectors: [], services: [] },
  government: { industry: 'government', connectors: [], services: [] },
  agriculture: { industry: 'agriculture', connectors: [], services: [] },
  nonprofit: { industry: 'nonprofit', connectors: [], services: [] },
  professional: { industry: 'professional', connectors: [], services: [] },
  home_services: { industry: 'home_services', connectors: [], services: [] },
  gaming: { industry: 'gaming', connectors: [], services: [] },
  media: { industry: 'media', connectors: [], services: [] },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get all services for an industry
 */
export function getServicesForIndustry(industry: IndustryType): REZService[] {
  return REZ_SERVICE_REGISTRY[industry]?.services || [];
}

/**
 * Get service by name
 */
export function getServiceByName(name: string): REZService | null {
  for (const industry of Object.values(REZ_SERVICE_REGISTRY)) {
    const service = industry.services.find(s => s.name === name);
    if (service) return service;
  }
  return null;
}

/**
 * Get all registered services
 */
export function getAllServices(): REZService[] {
  const services: REZService[] = [];
  for (const industry of Object.values(REZ_SERVICE_REGISTRY)) {
    services.push(...industry.services);
  }
  return services;
}

/**
 * Get industries with registered services
 */
export function getSupportedIndustries(): IndustryType[] {
  return Object.entries(REZ_SERVICE_REGISTRY)
    .filter(([_, config]) => config.services.length > 0)
    .map(([industry]) => industry as IndustryType);
}

/**
 * Get connector name for industry
 */
export function getConnectorForIndustry(industry: IndustryType): string | null {
  return REZ_SERVICE_REGISTRY[industry]?.connectors[0] || null;
}
