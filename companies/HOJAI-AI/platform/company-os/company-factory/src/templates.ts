/**
 * Company Factory Templates
 *
 * One-click deployment templates for all 26 industries.
 */

import { CompanyFactoryTemplate } from './types';

// ============================================
// All 26 Industry Templates
// ============================================

export const FACTORY_TEMPLATES: CompanyFactoryTemplate[] = [
  // ============================================
  // 1. RESTAURANT
  // ============================================
  {
    id: 'restaurant',
    name: 'Restaurant Company',
    industry: 'restaurant',
    description: 'Complete restaurant company with POS, KDS, online ordering',
    icon: '🍽️',
    defaultName: 'My Restaurant',
    defaultDepartments: ['finance', 'hr', 'marketing', 'operations'],
    defaultExtensions: ['pos', 'kitchen', 'reservations', 'menu'],
    defaultAIWorkers: ['ai-cfo', 'ai-marketing', 'ai-ops-manager'],
    defaultChannels: ['do', 'rez', 'nuqta', 'buzzlocal'],
    brandingColors: { primary: '#dc2626', secondary: '#f59e0b' },
    defaultConfig: {
      cuisine: 'multi',
      tableCount: 20,
      deliveryEnabled: true,
      loyaltyEnabled: true,
    },
    setupFee: 5000,
    monthlyFee: 2500,
    capabilities: {
      startup: ['Menu management', 'POS', 'Basic reservations', 'Social media presence'],
      growth: ['KDS', 'Online ordering', 'Loyalty program', 'Inventory tracking', 'Multi-branch'],
      enterprise: ['Multi-location', 'Advanced analytics', 'Franchise support', 'AI marketing'],
      franchise: ['Brand guidelines', 'Franchisee portal', 'Royalty tracking', 'Supplier network'],
    },
  },

  // ============================================
  // 2. BEAUTY
  // ============================================
  {
    id: 'beauty',
    name: 'Beauty Salon Company',
    industry: 'beauty',
    description: 'Salon & spa with appointment booking, stylist management',
    icon: '💅',
    defaultName: 'My Beauty Salon',
    defaultDepartments: ['finance', 'hr', 'marketing'],
    defaultExtensions: ['appointments', 'stylists', 'services', 'memberships'],
    defaultAIWorkers: ['ai-cfo', 'ai-marketing', 'ai-recruiter'],
    defaultChannels: ['do', 'rez', 'nuqta', 'buzzlocal'],
    brandingColors: { primary: '#ec4899', secondary: '#a855f7' },
    defaultConfig: {
      services: ['haircut', 'coloring', 'spa', 'nails'],
      maxStylists: 10,
      membershipEnabled: true,
    },
    setupFee: 4000,
    monthlyFee: 2000,
    capabilities: {
      startup: ['Appointment booking', 'Service catalog', 'Stylist profiles'],
      growth: ['Memberships', 'Loyalty', 'Inventory tracking', 'Customer reviews'],
      enterprise: ['Multi-location', 'Staff scheduling', 'Advanced analytics'],
      franchise: ['Brand kit', 'Franchisee portal', 'Training system'],
    },
  },

  // ============================================
  // 3. HOTEL
  // ============================================
  {
    id: 'hotel',
    name: 'Hotel Company',
    industry: 'hotel',
    description: 'Hotel with PMS, housekeeping, channel manager',
    icon: '🏨',
    defaultName: 'My Hotel',
    defaultDepartments: ['finance', 'hr', 'marketing', 'operations'],
    defaultExtensions: ['rooms', 'guests', 'housekeeping', 'channel'],
    defaultAIWorkers: ['ai-cfo', 'ai-marketing', 'ai-ops-manager'],
    defaultChannels: ['stayown', 'rez'],
    brandingColors: { primary: '#0f766e', secondary: '#0891b2' },
    defaultConfig: {
      roomCount: 50,
      channelManagerEnabled: true,
    },
    setupFee: 10000,
    monthlyFee: 5000,
    capabilities: {
      startup: ['PMS', 'Online booking', 'Guest management'],
      growth: ['Channel manager', 'Housekeeping', 'Revenue management'],
      enterprise: ['Multi-property', 'Group bookings', 'Corporate accounts'],
      franchise: ['Brand standards', 'Central reservations'],
    },
  },

  // ============================================
  // 4. RETAIL
  // ============================================
  {
    id: 'retail',
    name: 'Retail Store Company',
    industry: 'retail',
    description: 'Retail store with POS, inventory, loyalty',
    icon: '🛒',
    defaultName: 'My Retail Store',
    defaultDepartments: ['finance', 'hr', 'marketing', 'sales'],
    defaultExtensions: ['products', 'inventory', 'pos', 'loyalty'],
    defaultAIWorkers: ['ai-cfo', 'ai-marketing', 'ai-closer'],
    defaultChannels: ['do', 'rez', 'indiamart', 'tradeindia'],
    brandingColors: { primary: '#7c3aed', secondary: '#ec4899' },
    defaultConfig: {
      productCount: 100,
      multiStore: false,
    },
    setupFee: 6000,
    monthlyFee: 3000,
    capabilities: {
      startup: ['POS', 'Inventory', 'Basic CRM'],
      growth: ['Loyalty', 'Omnichannel', 'Analytics'],
      enterprise: ['Multi-store', 'Supply chain', 'B2B marketplace'],
      franchise: ['Franchise kit', 'Central inventory'],
    },
  },

  // ============================================
  // 5. HEALTHCARE
  // ============================================
  {
    id: 'healthcare',
    name: 'Healthcare Clinic Company',
    industry: 'healthcare',
    description: 'Clinic with EMR, appointments, prescriptions',
    icon: '🏥',
    defaultName: 'My Clinic',
    defaultDepartments: ['finance', 'hr', 'marketing', 'legal'],
    defaultExtensions: ['patients', 'appointments', 'prescriptions', 'billing'],
    defaultAIWorkers: ['ai-cfo', 'ai-legal-counsel'],
    defaultChannels: ['do', 'rez'],
    brandingColors: { primary: '#0891b2', secondary: '#10b981' },
    defaultConfig: {
      specialties: ['general', 'dental'],
      insuranceEnabled: true,
    },
    setupFee: 15000,
    monthlyFee: 7500,
    capabilities: {
      startup: ['EMR', 'Appointments', 'Prescriptions'],
      growth: ['Insurance', 'Lab integration', 'Telemedicine'],
      enterprise: ['Multi-clinic', 'Hospital integration', 'Specialist network'],
      franchise: ['Brand standards', 'Clinical protocols'],
    },
  },

  // ============================================
  // 6. EDUCATION
  // ============================================
  {
    id: 'education',
    name: 'Education Company',
    industry: 'education',
    description: 'School/Training center with LMS, enrollments',
    icon: '🎓',
    defaultName: 'My School',
    defaultDepartments: ['finance', 'hr', 'marketing'],
    defaultExtensions: ['students', 'courses', 'enrollments', 'certificates'],
    defaultAIWorkers: ['ai-cfo', 'ai-recruiter', 'ai-marketing'],
    defaultChannels: ['do', 'rez'],
    brandingColors: { primary: '#4f46e5', secondary: '#7c3aed' },
    defaultConfig: {
      studentCapacity: 500,
      onlineCourses: false,
    },
    setupFee: 5000,
    monthlyFee: 2500,
    capabilities: {
      startup: ['Student management', 'Course catalog', 'Enrollment'],
      growth: ['Online learning', 'Certificates', 'Assessments'],
      enterprise: ['Multi-campus', 'Corporate training', 'Accreditation'],
      franchise: ['Curriculum licensing', 'Partner network'],
    },
  },

  // ============================================
  // 7. REAL ESTATE
  // ============================================
  {
    id: 'realestate',
    name: 'Real Estate Company',
    industry: 'realestate',
    description: 'Property listings, leads, viewings',
    icon: '🏠',
    defaultName: 'My Realty',
    defaultDepartments: ['finance', 'hr', 'marketing', 'sales', 'legal'],
    defaultExtensions: ['properties', 'listings', 'leads', 'viewings'],
    defaultAIWorkers: ['ai-cfo', 'ai-marketing', 'ai-closer'],
    defaultChannels: ['rez', 'nuqta'],
    brandingColors: { primary: '#1e40af', secondary: '#3b82f6' },
    defaultConfig: { propertyTypes: ['residential', 'commercial'] },
    setupFee: 8000,
    monthlyFee: 4000,
    capabilities: {
      startup: ['Listings', 'Lead capture', 'Basic CRM'],
      growth: ['Virtual tours', 'Agent network', 'Market analytics'],
      enterprise: ['Multi-region', 'Mortgage integration'],
      franchise: ['Brokerage franchise', 'Brand licensing'],
    },
  },

  // ============================================
  // 8. MANUFACTURING
  // ============================================
  {
    id: 'manufacturing',
    name: 'Manufacturing Company',
    industry: 'manufacturing',
    description: 'Factory with production, quality, compliance',
    icon: '🏭',
    defaultName: 'My Factory',
    defaultDepartments: ['finance', 'hr', 'operations', 'legal', 'sales'],
    defaultExtensions: ['production', 'inventory', 'quality', 'compliance'],
    defaultAIWorkers: ['ai-cfo', 'ai-ops-manager'],
    defaultChannels: ['indiamart', 'tradeindia', 'nexha'],
    brandingColors: { primary: '#475569', secondary: '#64748b' },
    defaultConfig: { productionLines: 3, qualityStandard: 'ISO9001' },
    setupFee: 20000,
    monthlyFee: 10000,
    capabilities: {
      startup: ['Production tracking', 'Quality control', 'Basic inventory'],
      growth: ['Supply chain', 'Predictive maintenance', 'Compliance automation'],
      enterprise: ['Multi-plant', 'Global sourcing', 'Advanced analytics'],
      franchise: ['White-label manufacturing', 'Licensed production'],
    },
  },

  // ============================================
  // 9. FITNESS
  // ============================================
  {
    id: 'fitness',
    name: 'Fitness Gym Company',
    industry: 'fitness',
    description: 'Gym with memberships, classes, trainers',
    icon: '💪',
    defaultName: 'My Gym',
    defaultDepartments: ['finance', 'hr', 'marketing'],
    defaultExtensions: ['members', 'classes', 'trainers', 'subscriptions'],
    defaultAIWorkers: ['ai-cfo', 'ai-marketing', 'ai-recruiter'],
    defaultChannels: ['do', 'rez', 'buzzlocal'],
    brandingColors: { primary: '#16a34a', secondary: '#f59e0b' },
    defaultConfig: { capacity: 200, classesEnabled: true },
    setupFee: 4000,
    monthlyFee: 2000,
    capabilities: {
      startup: ['Member management', 'Class scheduling', 'Trainer profiles'],
      growth: ['Personal training', 'Nutrition plans', 'Wearables integration'],
      enterprise: ['Multi-location', 'Corporate wellness'],
      franchise: ['Franchise licensing', 'Brand kit'],
    },
  },

  // ============================================
  // 10. LEGAL
  // ============================================
  {
    id: 'legal',
    name: 'Legal Practice Company',
    industry: 'legal',
    description: 'Law firm with case management, documents, billing',
    icon: '⚖️',
    defaultName: 'My Legal Practice',
    defaultDepartments: ['finance', 'hr', 'marketing'],
    defaultExtensions: ['cases', 'clients', 'documents', 'billing'],
    defaultAIWorkers: ['ai-cfo', 'ai-legal-counsel'],
    defaultChannels: ['rez'],
    brandingColors: { primary: '#1e3a8a', secondary: '#1e40af' },
    defaultConfig: { practiceAreas: ['corporate', 'civil'] },
    setupFee: 10000,
    monthlyFee: 5000,
    capabilities: {
      startup: ['Case management', 'Document storage', 'Time tracking'],
      growth: ['Client portal', 'Billing automation', 'Court calendar'],
      enterprise: ['Multi-office', 'Practice management'],
      franchise: ['Legal franchise', 'Associate network'],
    },
  },

  // ============================================
  // 11. CONSTRUCTION
  // ============================================
  {
    id: 'construction',
    name: 'Construction Company',
    industry: 'construction',
    description: 'Construction with projects, contractors, materials',
    icon: '🏗️',
    defaultName: 'My Construction Co',
    defaultDepartments: ['finance', 'hr', 'operations', 'legal'],
    defaultExtensions: ['projects', 'contractors', 'materials', 'payments'],
    defaultAIWorkers: ['ai-cfo', 'ai-ops-manager'],
    defaultChannels: ['indiamart'],
    brandingColors: { primary: '#92400e', secondary: '#d97706' },
    defaultConfig: { projectTypes: ['residential', 'commercial'] },
    setupFee: 15000,
    monthlyFee: 7500,
    capabilities: {
      startup: ['Project tracking', 'Contractor management', 'Material orders'],
      growth: ['Equipment leasing', 'Subcontractor network'],
      enterprise: ['Multi-site', 'Government contracts'],
      franchise: ['Regional franchises'],
    },
  },

  // ============================================
  // 12. AUTOMOTIVE
  // ============================================
  {
    id: 'automotive',
    name: 'Automotive Company',
    industry: 'automotive',
    description: 'Auto dealer/service with vehicles, service, parts',
    icon: '🚗',
    defaultName: 'My Auto',
    defaultDepartments: ['finance', 'hr', 'marketing', 'sales', 'operations'],
    defaultExtensions: ['vehicles', 'service', 'inventory', 'customers'],
    defaultAIWorkers: ['ai-cfo', 'ai-marketing', 'ai-closer'],
    defaultChannels: ['indiamart', 'rez'],
    brandingColors: { primary: '#dc2626', secondary: '#0f172a' },
    defaultConfig: { services: ['sales', 'service'] },
    setupFee: 10000,
    monthlyFee: 5000,
    capabilities: {
      startup: ['Vehicle inventory', 'Service scheduling', 'CRM'],
      growth: ['Parts inventory', 'Used car management', 'Financing'],
      enterprise: ['Multi-location', 'Manufacturer integration'],
      franchise: ['Dealer franchise'],
    },
  },

  // ============================================
  // 13. LOGISTICS
  // ============================================
  {
    id: 'logistics',
    name: 'Logistics Company',
    industry: 'logistics',
    description: 'Shipping, routes, drivers, warehouses',
    icon: '🚚',
    defaultName: 'My Logistics',
    defaultDepartments: ['finance', 'hr', 'operations'],
    defaultExtensions: ['shipments', 'routes', 'drivers', 'warehouses'],
    defaultAIWorkers: ['ai-cfo', 'ai-ops-manager'],
    defaultChannels: ['nexha', 'global_nexus'],
    brandingColors: { primary: '#0891b2', secondary: '#0e7490' },
    defaultConfig: { fleetSize: 10, warehouses: 1 },
    setupFee: 12000,
    monthlyFee: 6000,
    capabilities: {
      startup: ['Shipment tracking', 'Driver management', 'Route planning'],
      growth: ['Warehouse management', 'Multi-modal transport'],
      enterprise: ['Global shipping', 'Customs clearance'],
      franchise: ['Regional franchises', 'Partner network'],
    },
  },

  // ============================================
  // 14. FASHION
  // ============================================
  {
    id: 'fashion',
    name: 'Fashion Brand Company',
    industry: 'fashion',
    description: 'Fashion with catalog, orders, collections',
    icon: '👗',
    defaultName: 'My Fashion Brand',
    defaultDepartments: ['finance', 'hr', 'marketing', 'sales'],
    defaultExtensions: ['catalog', 'orders', 'inventory', 'collections'],
    defaultAIWorkers: ['ai-cfo', 'ai-marketing', 'ai-content-manager'],
    defaultChannels: ['do', 'rez', 'indiamart'],
    brandingColors: { primary: '#be185d', secondary: '#9d174d' },
    defaultConfig: { seasonalCollections: true },
    setupFee: 6000,
    monthlyFee: 3000,
    capabilities: {
      startup: ['Catalog', 'Orders', 'Inventory'],
      growth: ['Seasonal collections', 'Influencer marketing'],
      enterprise: ['Multi-brand', 'Wholesale', 'Global shipping'],
      franchise: ['Brand licensing'],
    },
  },

  // ============================================
  // 15. SPORTS
  // ============================================
  {
    id: 'sports',
    name: 'Sports Club Company',
    industry: 'sports',
    description: 'Sports with teams, matches, tickets',
    icon: '⚽',
    defaultName: 'My Sports Club',
    defaultDepartments: ['finance', 'hr', 'marketing'],
    defaultExtensions: ['teams', 'matches', 'players', 'tickets'],
    defaultAIWorkers: ['ai-cfo', 'ai-marketing'],
    defaultChannels: ['do', 'rez'],
    brandingColors: { primary: '#15803d', secondary: '#16a34a' },
    defaultConfig: { sport: 'football' },
    setupFee: 5000,
    monthlyFee: 2500,
    capabilities: {
      startup: ['Team management', 'Match scheduling', 'Ticket sales'],
      growth: ['Membership', 'Sponsorship', 'Merchandise'],
      enterprise: ['Multi-team', 'Stadium management'],
      franchise: ['League franchise'],
    },
  },

  // ============================================
  // 16. ENTERTAINMENT
  // ============================================
  {
    id: 'entertainment',
    name: 'Entertainment Company',
    industry: 'entertainment',
    description: 'Events, tickets, venues, bookings',
    icon: '🎬',
    defaultName: 'My Entertainment Co',
    defaultDepartments: ['finance', 'hr', 'marketing'],
    defaultExtensions: ['events', 'tickets', 'venues', 'bookings'],
    defaultAIWorkers: ['ai-cfo', 'ai-marketing'],
    defaultChannels: ['do', 'rez'],
    brandingColors: { primary: '#7c2d12', secondary: '#c2410c' },
    defaultConfig: { venueCount: 1 },
    setupFee: 8000,
    monthlyFee: 4000,
    capabilities: {
      startup: ['Event management', 'Ticket sales', 'Venue booking'],
      growth: ['Multi-venue', 'VIP memberships'],
      enterprise: ['Festival management', 'Artist booking'],
      franchise: ['Brand licensing'],
    },
  },

  // ============================================
  // 17. TRAVEL
  // ============================================
  {
    id: 'travel',
    name: 'Travel Company',
    industry: 'travel',
    description: 'Travel with bookings, destinations, packages',
    icon: '✈️',
    defaultName: 'My Travel Co',
    defaultDepartments: ['finance', 'hr', 'marketing', 'sales'],
    defaultExtensions: ['bookings', 'destinations', 'packages', 'customers'],
    defaultAIWorkers: ['ai-cfo', 'ai-marketing', 'ai-closer'],
    defaultChannels: ['do', 'rez', 'stayown', 'global_nexus'],
    brandingColors: { primary: '#0e7490', secondary: '#0891b2' },
    defaultConfig: { destinations: 50 },
    setupFee: 10000,
    monthlyFee: 5000,
    capabilities: {
      startup: ['Booking system', 'Destination catalog', 'Packages'],
      growth: ['Multi-currency', 'Global suppliers', 'Loyalty'],
      enterprise: ['B2B platform', 'Corporate travel'],
      franchise: ['Travel franchise'],
    },
  },

  // ============================================
  // 18. GOVERNMENT
  // ============================================
  {
    id: 'government',
    name: 'Government Services',
    industry: 'government',
    description: 'Citizen services, permits, compliance',
    icon: '🏛️',
    defaultName: 'My Gov Services',
    defaultDepartments: ['finance', 'hr', 'legal', 'operations'],
    defaultExtensions: ['citizens', 'services', 'permits', 'complaints'],
    defaultAIWorkers: ['ai-cfo', 'ai-legal-counsel'],
    defaultChannels: ['global_nexus'],
    brandingColors: { primary: '#1e40af', secondary: '#1e3a8a' },
    defaultConfig: { jurisdiction: 'India' },
    setupFee: 25000,
    monthlyFee: 15000,
    capabilities: {
      startup: ['Citizen portal', 'Permit applications', 'Complaints'],
      growth: ['E-governance', 'Digital identity', 'Payments'],
      enterprise: ['Multi-department', 'Inter-agency coordination'],
      franchise: ['Regional offices'],
    },
  },

  // ============================================
  // 19. AGRICULTURE
  // ============================================
  {
    id: 'agriculture',
    name: 'Agriculture Company',
    industry: 'agriculture',
    description: 'Farms, crops, inventory, sales',
    icon: '🌾',
    defaultName: 'My Farm',
    defaultDepartments: ['finance', 'hr', 'operations', 'sales'],
    defaultExtensions: ['farms', 'crops', 'inventory', 'sales'],
    defaultAIWorkers: ['ai-cfo', 'ai-ops-manager'],
    defaultChannels: ['indiamart', 'nexha'],
    brandingColors: { primary: '#16a34a', secondary: '#65a30d' },
    defaultConfig: { farmSize: 'small' },
    setupFee: 5000,
    monthlyFee: 2500,
    capabilities: {
      startup: ['Farm management', 'Crop tracking', 'Inventory'],
      growth: ['Supply chain', 'Marketplace', 'Loans'],
      enterprise: ['Cooperative', 'Export', 'Processing'],
      franchise: ['Franchise farms'],
    },
  },

  // ============================================
  // 20. NONPROFIT
  // ============================================
  {
    id: 'nonprofit',
    name: 'Nonprofit Organization',
    industry: 'nonprofit',
    description: 'Donors, campaigns, beneficiaries, volunteers',
    icon: '❤️',
    defaultName: 'My Nonprofit',
    defaultDepartments: ['finance', 'hr', 'marketing'],
    defaultExtensions: ['donors', 'campaigns', 'beneficiaries', 'volunteers'],
    defaultAIWorkers: ['ai-cfo', 'ai-marketing'],
    defaultChannels: ['rez'],
    brandingColors: { primary: '#dc2626', secondary: '#16a34a' },
    defaultConfig: { cause: 'education' },
    setupFee: 0,
    monthlyFee: 500,
    capabilities: {
      startup: ['Donor management', 'Campaigns', 'Volunteer tracking'],
      growth: ['Beneficiary programs', 'Grant management'],
      enterprise: ['Multi-program', 'International operations'],
      franchise: ['Chapter network'],
    },
  },

  // ============================================
  // 21. PROFESSIONAL
  // ============================================
  {
    id: 'professional',
    name: 'Professional Services',
    industry: 'professional',
    description: 'Consulting with clients, projects, invoices',
    icon: '💼',
    defaultName: 'My Consulting',
    defaultDepartments: ['finance', 'hr', 'marketing', 'sales'],
    defaultExtensions: ['clients', 'projects', 'invoices', 'tasks'],
    defaultAIWorkers: ['ai-cfo', 'ai-marketing', 'ai-closer'],
    defaultChannels: ['rez'],
    brandingColors: { primary: '#0f172a', secondary: '#475569' },
    defaultConfig: { services: ['consulting', 'advisory'] },
    setupFee: 6000,
    monthlyFee: 3000,
    capabilities: {
      startup: ['Client portal', 'Project tracking', 'Invoicing'],
      growth: ['Time tracking', 'Resource management', 'Knowledge base'],
      enterprise: ['Multi-office', 'Partner network'],
      franchise: ['Franchise consultancy'],
    },
  },

  // ============================================
  // 22. HOME SERVICES
  // ============================================
  {
    id: 'home_services',
    name: 'Home Services Company',
    industry: 'home_services',
    description: 'Plumbing, electrical, cleaning with bookings',
    icon: '🔧',
    defaultName: 'My Home Services',
    defaultDepartments: ['finance', 'hr', 'marketing'],
    defaultExtensions: ['bookings', 'technicians', 'services', 'customers'],
    defaultAIWorkers: ['ai-cfo', 'ai-marketing', 'ai-recruiter'],
    defaultChannels: ['do', 'rez', 'buzzlocal'],
    brandingColors: { primary: '#0891b2', secondary: '#0e7490' },
    defaultConfig: { services: ['plumbing', 'electrical', 'cleaning'] },
    setupFee: 4000,
    monthlyFee: 2000,
    capabilities: {
      startup: ['Service booking', 'Technician dispatch', 'CRM'],
      growth: ['Multi-city', 'Subscription plans', 'Inventory'],
      enterprise: ['National network', 'Enterprise clients'],
      franchise: ['Regional franchises'],
    },
  },

  // ============================================
  // 23. GAMING
  // ============================================
  {
    id: 'gaming',
    name: 'Gaming Company',
    industry: 'gaming',
    description: 'Gaming with players, matches, tournaments',
    icon: '🎮',
    defaultName: 'My Gaming',
    defaultDepartments: ['finance', 'hr', 'marketing'],
    defaultExtensions: ['players', 'matches', 'tournaments', 'leaderboards'],
    defaultAIWorkers: ['ai-cfo', 'ai-marketing'],
    defaultChannels: ['do', 'rez'],
    brandingColors: { primary: '#7c3aed', secondary: '#a855f7' },
    defaultConfig: { gameType: 'esports' },
    setupFee: 6000,
    monthlyFee: 3000,
    capabilities: {
      startup: ['Player profiles', 'Match making', 'Leaderboards'],
      growth: ['Tournaments', 'Sponsorships', 'Streaming'],
      enterprise: ['Esports leagues', 'Multi-game'],
      franchise: ['Regional esports'],
    },
  },

  // ============================================
  // 24. MEDIA
  // ============================================
  {
    id: 'media',
    name: 'Media Company',
    industry: 'media',
    description: 'Content, creators, campaigns, analytics',
    icon: '📺',
    defaultName: 'My Media',
    defaultDepartments: ['finance', 'hr', 'marketing'],
    defaultExtensions: ['content', 'creators', 'campaigns', 'analytics'],
    defaultAIWorkers: ['ai-cfo', 'ai-content-manager', 'ai-marketing'],
    defaultChannels: ['do', 'rez', 'global_nexus'],
    brandingColors: { primary: '#7c2d12', secondary: '#9a3412' },
    defaultConfig: { contentType: 'video' },
    setupFee: 8000,
    monthlyFee: 4000,
    capabilities: {
      startup: ['Content management', 'Creator profiles', 'Basic analytics'],
      growth: ['Monetization', 'Multi-platform distribution'],
      enterprise: ['Studio operations', 'Global content'],
      franchise: ['Content licensing'],
    },
  },

  // ============================================
  // 25. EVENTS
  // ============================================
  {
    id: 'events',
    name: 'Events Company',
    industry: 'events',
    description: 'Events, venues, tickets, attendees',
    icon: '🎉',
    defaultName: 'My Events',
    defaultDepartments: ['finance', 'hr', 'marketing'],
    defaultExtensions: ['events', 'venues', 'tickets', 'attendees'],
    defaultAIWorkers: ['ai-cfo', 'ai-marketing'],
    defaultChannels: ['do', 'rez'],
    brandingColors: { primary: '#c026d3', secondary: '#a21caf' },
    defaultConfig: { eventTypes: ['corporate', 'social'] },
    setupFee: 6000,
    monthlyFee: 3000,
    capabilities: {
      startup: ['Event planning', 'Venue booking', 'Ticket sales'],
      growth: ['Multi-city events', 'Vendor network'],
      enterprise: ['Festival management', 'Corporate events'],
      franchise: ['Regional franchises'],
    },
  },

  // ============================================
  // 26. EXHIBITIONS
  // ============================================
  {
    id: 'exhibitions',
    name: 'Exhibitions Company',
    industry: 'exhibitions',
    description: 'Exhibitions, stalls, exhibitors, visitors',
    icon: '🎪',
    defaultName: 'My Exhibitions',
    defaultDepartments: ['finance', 'hr', 'marketing'],
    defaultExtensions: ['exhibitions', 'stalls', 'exhibitors', 'visitors'],
    defaultAIWorkers: ['ai-cfo', 'ai-marketing'],
    defaultChannels: ['do', 'rez', 'global_nexus'],
    brandingColors: { primary: '#be185d', secondary: '#9d174d' },
    defaultConfig: { venueType: 'convention' },
    setupFee: 10000,
    monthlyFee: 5000,
    capabilities: {
      startup: ['Exhibition planning', 'Stall allocation', 'Visitor registration'],
      growth: ['Multi-venue', 'Sponsorship tiers'],
      enterprise: ['International expos', 'Multi-track'],
      franchise: ['Regional exhibitions'],
    },
  },
];

// ============================================
// Helper Functions
// ============================================

export function getTemplate(industry: string): CompanyFactoryTemplate | undefined {
  return FACTORY_TEMPLATES.find(t => t.industry === industry);
}

export function listTemplates(): CompanyFactoryTemplate[] {
  return FACTORY_TEMPLATES;
}

export function getTemplatesByStage(stage: 'startup' | 'growth' | 'enterprise' | 'franchise'): CompanyFactoryTemplate[] {
  return FACTORY_TEMPLATES.filter(t => t.capabilities[stage].length > 0);
}