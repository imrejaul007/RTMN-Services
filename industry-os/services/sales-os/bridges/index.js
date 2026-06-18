/**
 * Industry Bridges - RTMN Sales OS Integration Layer
 *
 * Connects Sales OS to all 24 Industry Operating Systems
 * for unified cross-industry sales intelligence
 *
 * Version: 2.0.0
 * Port: 5055
 */

const axios = require('axios');

// Industry OS Base URLs
const INDUSTRY_OS = {
  // Core Industries (Ports 5000-5100)
  restaurant: { name: 'Restaurant OS', port: 5010, baseUrl: process.env.RESTAURANT_OS_URL || 'http://localhost:5010' },
  hotel: { name: 'Hotel OS', port: 5025, baseUrl: process.env.HOTEL_OS_URL || 'http://localhost:5025' },
  healthcare: { name: 'Healthcare OS', port: 5020, baseUrl: process.env.HEALTHCARE_OS_URL || 'http://localhost:5020' },
  retail: { name: 'Retail OS', port: 5030, baseUrl: process.env.RETAIL_OS_URL || 'http://localhost:5030' },
  legal: { name: 'Legal OS', port: 5035, baseUrl: process.env.LEGAL_OS_URL || 'http://localhost:5035' },
  education: { name: 'Education OS', port: 5060, baseUrl: process.env.EDUCATION_OS_URL || 'http://localhost:5060' },
  hospitality: { name: 'Hospitality OS', port: 5050, baseUrl: process.env.HOSPITALITY_OS_URL || 'http://localhost:5050' },
  fitness: { name: 'Fitness OS', port: 5110, baseUrl: process.env.FITNESS_OS_URL || 'http://localhost:5110' },
  beauty: { name: 'Beauty OS', port: 5090, baseUrl: process.env.BEAUTY_OS_URL || 'http://localhost:5090' },
  automotive: { name: 'Automotive OS', port: 5080, baseUrl: process.env.AUTOMOTIVE_OS_URL || 'http://localhost:5080' },
  manufacturing: { name: 'Manufacturing OS', port: 5150, baseUrl: process.env.MANUFACTURING_OS_URL || 'http://localhost:5150' },
  realestate: { name: 'RealEstate OS', port: 5230, baseUrl: process.env.REALESTATE_OS_URL || 'http://localhost:5230' },

  // Extended Industries (Ports 5070-5240)
  agriculture: { name: 'Agriculture OS', port: 5070, baseUrl: process.env.AGRICULTURE_OS_URL || 'http://localhost:5070' },
  fashion: { name: 'Fashion OS', port: 5095, baseUrl: process.env.FASHION_OS_URL || 'http://localhost:5095' },
  gaming: { name: 'Gaming OS', port: 5120, baseUrl: process.env.GAMING_OS_URL || 'http://localhost:5120' },
  government: { name: 'Government OS', port: 5130, baseUrl: process.env.GOVERNMENT_OS_URL || 'http://localhost:5130' },
  homeservices: { name: 'HomeServices OS', port: 5140, baseUrl: process.env.HOMESERVICES_OS_URL || 'http://localhost:5140' },
  nonprofit: { name: 'NonProfit OS', port: 5160, baseUrl: process.env.NONPROFIT_OS_URL || 'http://localhost:5160' },
  professional: { name: 'Professional OS', port: 5170, baseUrl: process.env.PROFESSIONAL_OS_URL || 'http://localhost:5170' },
  sports: { name: 'Sports OS', port: 5180, baseUrl: process.env.SPORTS_OS_URL || 'http://localhost:5180' },
  travel: { name: 'Travel OS', port: 5190, baseUrl: process.env.TRAVEL_OS_URL || 'http://localhost:5190' },
  entertainment: { name: 'Entertainment OS', port: 5200, baseUrl: process.env.ENTERTAINMENT_OS_URL || 'http://localhost:5200' },
  construction: { name: 'Construction OS', port: 5210, baseUrl: process.env.CONSTRUCTION_OS_URL || 'http://localhost:5210' },
  financial: { name: 'Financial OS', port: 5220, baseUrl: process.env.FINANCIAL_OS_URL || 'http://localhost:5220' },
  transport: { name: 'Transport OS', port: 5240, baseUrl: process.env.TRANSPORT_OS_URL || 'http://localhost:5240' },
};

// Industry-specific data models and endpoints
const INDUSTRY_MODELS = {
  restaurant: {
    twins: ['Menu Twin', 'Order Twin', 'Kitchen Twin', 'Table Twin', 'Customer Twin'],
    endpoints: {
      getVenues: '/api/venues',
      getOrders: '/api/orders',
      getMenu: '/api/menu',
      getReservations: '/api/reservations',
      getAnalytics: '/api/analytics',
    },
    salesTriggers: ['New franchise', 'Multi-location expansion', 'POS upgrade', 'Delivery integration'],
    avgDealSize: 250000,
  },
  hotel: {
    twins: ['Room Twin', 'Booking Twin', 'Guest Twin', 'Service Twin', 'Revenue Twin', 'OTA Platform Twin'],
    endpoints: {
      getProperties: '/api/properties',
      getBookings: '/api/bookings',
      getRevenue: '/api/revenue',
      getGuests: '/api/guests',
      getHousekeeping: '/api/housekeeping',
    },
    salesTriggers: ['New property', 'PMS upgrade', 'Channel manager', 'Revenue optimization'],
    avgDealSize: 500000,
  },
  healthcare: {
    twins: ['Patient Twin', 'Appointment Twin', 'Doctor Twin', 'Prescription Twin', 'Insurance Twin'],
    endpoints: {
      getHospitals: '/api/hospitals',
      getPatients: '/api/patients',
      getAppointments: '/api/appointments',
      getPrescriptions: '/api/prescriptions',
      getBilling: '/api/billing',
    },
    salesTriggers: ['Hospital network', 'HIPAA compliance', 'Patient portal', 'Telemedicine'],
    avgDealSize: 750000,
  },
  retail: {
    twins: ['Product Twin', 'Inventory Twin', 'Customer Twin', 'Cart Twin', 'Supplier Twin'],
    endpoints: {
      getStores: '/api/stores',
      getProducts: '/api/products',
      getInventory: '/api/inventory',
      getCustomers: '/api/customers',
      getOrders: '/api/orders',
    },
    salesTriggers: ['Store expansion', 'Omnichannel', 'Inventory optimization', 'Loyalty program'],
    avgDealSize: 400000,
  },
  legal: {
    twins: ['Client Twin', 'Case Twin', 'Lawyer Twin', 'Document Twin', 'Billing Twin'],
    endpoints: {
      getClients: '/api/clients',
      getCases: '/api/cases',
      getDocuments: '/api/documents',
      getBilling: '/api/billing',
      getCalendar: '/api/calendar',
    },
    salesTriggers: ['Firm growth', 'Practice area expansion', 'Document automation', 'Billing efficiency'],
    avgDealSize: 200000,
  },
  education: {
    twins: ['Course Twin', 'Student Twin', 'Instructor Twin', 'Enrollment Twin', 'Certificate Twin'],
    endpoints: {
      getInstitutions: '/api/institutions',
      getCourses: '/api/courses',
      getStudents: '/api/students',
      getEnrollments: '/api/enrollments',
      getCertificates: '/api/certificates',
    },
    salesTriggers: ['New institution', 'LMS upgrade', 'Student engagement', 'Certification program'],
    avgDealSize: 350000,
  },
  hospitality: {
    twins: ['Guest Twin', 'Event Twin', 'Banquet Twin', 'Concierge Twin', 'Experience Twin'],
    endpoints: {
      getProperties: '/api/properties',
      getEvents: '/api/events',
      getGuests: '/api/guests',
      getBookings: '/api/bookings',
    },
    salesTriggers: ['Event venue', 'Banquet management', 'Guest experience', 'Package deals'],
    avgDealSize: 300000,
  },
  fitness: {
    twins: ['Member Twin', 'Trainer Twin', 'Class Twin', 'Membership Twin', 'Attendance Twin'],
    endpoints: {
      getGyms: '/api/gyms',
      getMembers: '/api/members',
      getClasses: '/api/classes',
      getTrainers: '/api/trainers',
    },
    salesTriggers: ['Gym chain', 'Class booking', 'Member retention', 'Trainer management'],
    avgDealSize: 150000,
  },
  beauty: {
    twins: ['Client Twin', 'Service Twin', 'Staff Twin', 'Appointment Twin', 'Product Twin'],
    endpoints: {
      getSalons: '/api/salons',
      getClients: '/api/clients',
      getServices: '/api/services',
      getAppointments: '/api/appointments',
    },
    salesTriggers: ['Salon expansion', 'Appointment booking', 'Client retention', 'Staff scheduling'],
    avgDealSize: 120000,
  },
  automotive: {
    twins: ['Vehicle Twin', 'Customer Twin', 'Service Twin', 'Parts Twin', 'Warranty Twin'],
    endpoints: {
      getDealerships: '/api/dealerships',
      getVehicles: '/api/vehicles',
      getServiceRecords: '/api/service-records',
      getCustomers: '/api/customers',
    },
    salesTriggers: ['Dealership management', 'Service scheduling', 'Parts inventory', 'CRM integration'],
    avgDealSize: 600000,
  },
  manufacturing: {
    twins: ['Product Twin', 'Machine Twin', 'Production Twin', 'Quality Twin', 'Supply Chain Twin'],
    endpoints: {
      getPlants: '/api/plants',
      getProducts: '/api/products',
      getMachines: '/api/machines',
      getProduction: '/api/production',
    },
    salesTriggers: ['Plant setup', 'Automation', 'Quality control', 'Supply chain visibility'],
    avgDealSize: 1000000,
  },
  realestate: {
    twins: ['Property Twin', 'Listing Twin', 'Lead Twin', 'Agent Twin', 'Transaction Twin'],
    endpoints: {
      getProperties: '/api/properties',
      getListings: '/api/listings',
      getLeads: '/api/leads',
      getAgents: '/api/agents',
      getTransactions: '/api/transactions',
    },
    salesTriggers: ['Agency growth', 'Portal listing', 'Lead management', 'Transaction tracking'],
    avgDealSize: 250000,
  },
  agriculture: {
    twins: ['Farm Twin', 'Crop Twin', 'Livestock Twin', 'Weather Twin', 'Yield Twin'],
    endpoints: {
      getFarms: '/api/farms',
      getCrops: '/api/crops',
      getLivestock: '/api/livestock',
      getWeather: '/api/weather',
    },
    salesTriggers: ['Farm management', 'Crop monitoring', 'IoT sensors', 'Yield prediction'],
    avgDealSize: 200000,
  },
  fashion: {
    twins: ['Product Twin', 'Collection Twin', 'Trend Twin', 'Inventory Twin', 'Customer Twin'],
    endpoints: {
      getCollections: '/api/collections',
      getProducts: '/api/products',
      getTrends: '/api/trends',
      getInventory: '/api/inventory',
    },
    salesTriggers: ['Collection launch', 'Inventory management', 'Trend analysis', 'E-commerce'],
    avgDealSize: 180000,
  },
  gaming: {
    twins: ['Game Twin', 'Player Twin', 'Tournament Twin', 'Achievement Twin', 'Monetization Twin'],
    endpoints: {
      getGames: '/api/games',
      getPlayers: '/api/players',
      getTournaments: '/api/tournaments',
      getAnalytics: '/api/analytics',
    },
    salesTriggers: ['Game launch', 'Tournament platform', 'Player engagement', 'Monetization'],
    avgDealSize: 400000,
  },
  government: {
    twins: ['Citizen Twin', 'Service Twin', 'Department Twin', 'Permit Twin', 'Feedback Twin'],
    endpoints: {
      getDepartments: '/api/departments',
      getServices: '/api/services',
      getCitizens: '/api/citizens',
      getPermits: '/api/permits',
    },
    salesTriggers: ['Digital transformation', 'Citizen services', 'E-governance', 'Compliance'],
    avgDealSize: 2000000,
  },
  homeservices: {
    twins: ['Provider Twin', 'Customer Twin', 'Booking Twin', 'Service Twin', 'Review Twin'],
    endpoints: {
      getProviders: '/api/providers',
      getBookings: '/api/bookings',
      getServices: '/api/services',
      getReviews: '/api/reviews',
    },
    salesTriggers: ['Provider network', 'Booking management', 'Dispatch optimization', 'Reviews'],
    avgDealSize: 100000,
  },
  nonprofit: {
    twins: ['Donor Twin', 'Campaign Twin', 'Beneficiary Twin', 'Volunteer Twin', 'Impact Twin'],
    endpoints: {
      getDonors: '/api/donors',
      getCampaigns: '/api/campaigns',
      getBeneficiaries: '/api/beneficiaries',
      getVolunteers: '/api/volunteers',
    },
    salesTriggers: ['Fundraising', 'Donor management', 'Impact tracking', 'Volunteer coordination'],
    avgDealSize: 150000,
  },
  professional: {
    twins: ['Consultant Twin', 'Client Twin', 'Project Twin', 'Timesheet Twin', 'Invoice Twin'],
    endpoints: {
      getConsultants: '/api/consultants',
      getClients: '/api/clients',
      getProjects: '/api/projects',
      getInvoices: '/api/invoices',
    },
    salesTriggers: ['Consulting firm', 'Project management', 'Time tracking', 'Billing'],
    avgDealSize: 250000,
  },
  sports: {
    twins: ['Team Twin', 'Player Twin', 'Match Twin', 'Fan Twin', 'Sponsorship Twin'],
    endpoints: {
      getTeams: '/api/teams',
      getPlayers: '/api/players',
      getMatches: '/api/matches',
      getFans: '/api/fans',
    },
    salesTriggers: ['Team management', 'Fan engagement', 'Sponsorship', 'Ticket sales'],
    avgDealSize: 500000,
  },
  travel: {
    twins: ['Destination Twin', 'Package Twin', 'Booking Twin', 'Traveler Twin', 'Review Twin'],
    endpoints: {
      getDestinations: '/api/destinations',
      getPackages: '/api/packages',
      getBookings: '/api/bookings',
      getTravelers: '/api/travelers',
    },
    salesTriggers: ['Travel agency', 'Package deals', 'Booking platform', 'Review system'],
    avgDealSize: 300000,
  },
  entertainment: {
    twins: ['Event Twin', 'Venue Twin', 'Ticket Twin', 'Artist Twin', 'Fan Twin'],
    endpoints: {
      getEvents: '/api/events',
      getVenues: '/api/venues',
      getTickets: '/api/tickets',
      getArtists: '/api/artists',
    },
    salesTriggers: ['Event management', 'Ticket sales', 'Venue booking', 'Artist management'],
    avgDealSize: 350000,
  },
  construction: {
    twins: ['Project Twin', 'Contractor Twin', 'Material Twin', 'Timeline Twin', 'Budget Twin'],
    endpoints: {
      getProjects: '/api/projects',
      getContractors: '/api/contractors',
      getMaterials: '/api/materials',
      getTimelines: '/api/timelines',
    },
    salesTriggers: ['Project management', 'Contractor coordination', 'Material tracking', 'Cost control'],
    avgDealSize: 800000,
  },
  financial: {
    twins: ['Account Twin', 'Transaction Twin', 'Customer Twin', 'Product Twin', 'Compliance Twin'],
    endpoints: {
      getAccounts: '/api/accounts',
      getTransactions: '/api/transactions',
      getCustomers: '/api/customers',
      getProducts: '/api/products',
    },
    salesTriggers: ['Banking as a service', 'Payment processing', 'Compliance', 'Analytics'],
    avgDealSize: 1000000,
  },
  transport: {
    twins: ['Vehicle Twin', 'Driver Twin', 'Rider Twin', 'Route Twin', 'Trip Twin'],
    endpoints: {
      getVehicles: '/api/vehicles',
      getDrivers: '/api/drivers',
      getRiders: '/api/riders',
      getTrips: '/api/trips',
    },
    salesTriggers: ['Fleet management', 'Driver app', 'Routing optimization', 'Safety features'],
    avgDealSize: 450000,
  },
};

// Bridge API class
class IndustryBridge {
  constructor(industryKey) {
    this.industryKey = industryKey;
    this.config = INDUSTRY_OS[industryKey];
    this.models = INDUSTRY_MODELS[industryKey];
  }

  async healthCheck() {
    try {
      const response = await axios.get(`${this.config.baseUrl}/health`, { timeout: 3000 });
      return { status: 'connected', healthy: true, ...response.data };
    } catch (error) {
      return { status: 'disconnected', healthy: false, error: error.message };
    }
  }

  async getIndustryData(endpoint) {
    try {
      const response = await axios.get(`${this.config.baseUrl}${endpoint}`, { timeout: 5000 });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getMarketInsights() {
    return {
      industry: this.config.name,
      twins: this.models.twins,
      avgDealSize: this.models.avgDealSize,
      salesTriggers: this.models.salesTriggers,
      opportunities: await this.getOpportunities(),
    };
  }

  async getOpportunities() {
    return this.models.salesTriggers.map(trigger => ({
      trigger,
      potential: this.models.avgDealSize,
      relatedTwins: this.models.twins.slice(0, 2),
    }));
  }
}

// Create bridge instances
const bridges = {};
Object.keys(INDUSTRY_OS).forEach(key => {
  bridges[key] = new IndustryBridge(key);
});

// Bridge Manager class
class IndustryBridgeManager {
  constructor() {
    this.bridges = bridges;
    this.connections = new Map();
  }

  async checkAllConnections() {
    const results = {};
    for (const [key, bridge] of Object.entries(this.bridges)) {
      results[key] = await bridge.healthCheck();
    }
    return results;
  }

  async getAllMarketInsights() {
    const insights = {};
    for (const [key, bridge] of Object.entries(this.bridges)) {
      try {
        insights[key] = await bridge.getMarketInsights();
      } catch (e) {
        insights[key] = { error: e.message };
      }
    }
    return insights;
  }

  getBridge(industry) {
    return this.bridges[industry];
  }

  getAllIndustries() {
    return Object.entries(this.bridges).map(([key, bridge]) => ({
      key,
      name: bridge.config.name,
      port: bridge.config.port,
      twins: bridge.models.twins,
      avgDealSize: bridge.models.avgDealSize,
    }));
  }
}

const bridgeManager = new IndustryBridgeManager();

module.exports = {
  IndustryBridge,
  IndustryBridgeManager,
  bridgeManager,
  bridges,
  INDUSTRY_OS,
  INDUSTRY_MODELS,
};
