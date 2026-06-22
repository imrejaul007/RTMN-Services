/**
 * REZ Knowledge Graph v2.0
 *
 * Comprehensive user knowledge base aggregating ALL data sources
 * Version 2.0 adds: StayOwn, RisnaEstate, REZ Workspace, Z-Events, RIDZA, LawGens, REZ Intelligence
 */

import type { SocialProfile } from './types.js';

// ==================== KNOWLEDGE NODE TYPES ====================

export interface KnowledgeNode {
  id: string;
  type: 'person' | 'business' | 'device' | 'location' | 'product' | 'transaction';
  source: string;
  data: Record<string, any>;
  lastUpdated: string;
  confidence: number;
}

// ==================== COMPREHENSIVE USER PROFILE v2.0 ====================

export interface ComprehensiveUserProfile {
  // Core Identity
  identity: {
    userId: string;
    primaryPhone: string;
    primaryEmail?: string;
    alternatePhones?: string[];
    alternateEmails?: string[];
    avatar?: string;
    verified: boolean;
    verificationMethods: ('phone' | 'email' | 'aadhaar' | 'gstin' | 'pan' | 'bank')[];
  };

  // REZ Consumer Data (4200)
  consumer?: ConsumerData;

  // REZ Merchant Data (4100)
  merchant?: MerchantData;

  // RABTUL Data (Auth, Payment, Wallet, Order)
  rabtul?: RabtulData;

  // CorpPerks Data (4720)
  corpperks?: CorpPerksData;

  // Nexha Data (5001)
  nexha?: NexhaData;

  // KHAIRMOVE Data (4600)
  kHAIRMOVE?: KHAIRMOVEData;

  // RisaCare Data (4800)
  risaCare?: RisaCareData;

  // StayOwn Data (4801) - NEW
  stayOwn?: StayOwnData;

  // RisnaEstate Data (4901) - NEW
  risnaEstate?: RisnaEstateData;

  // REZ Workspace Data - NEW
  rezWorkspace?: REZWorkspaceData;

  // Z-Events Data - NEW
  zEvents?: ZEventsData;

  // SADA Data (4190)
  sada?: SADAData;

  // Salar OS Data (4710)
  salarOS?: SalarOSData;

  // Shab AI Data (4970)
  shabAI?: ShabAIData;

  // Genie Data (4703-4707)
  genie?: GenieData;

  // AssetMind Data (5001+)
  assetMind?: AssetMindData;

  // REZ SalesMind Data (5150+)
  rezSalesMind?: REZSalesMindData;

  // HOJAI AI Data (Memory, Knowledge Graph, Twins)
  hojaiAI?: HOJAIAIData;

  // REE Data (3000-3011)
  ree?: REEData;

  // RIDZA Data (5200) - NEW
  ridza?: RIDZAData;

  // LawGens Data (5100) - NEW
  lawGens?: LawGensData;

  // REZ Intelligence Data - NEW
  rezIntelligence?: REZIntelligenceData;

  // Aggregated Insights
  insights: Insights;

  // Metadata
  metadata: ProfileMetadata;
}

// ==================== DATA TYPE DEFINITIONS ====================

export interface ConsumerData {
  name: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  location: {
    currentCity: string;
    homeAddress?: string;
    workAddress?: string;
    coordinates?: { lat: number; lng: number };
  };
  wallet: {
    balance: number;
    coins: number;
    cashbackEarned: number;
    cashbackSpent: number;
  };
  loyalty: {
    points: number;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    pointsEarned: number;
    pointsRedeemed: number;
  };
  orders: {
    total: number;
    totalSpent: number;
    avgOrderValue: number;
    lastOrderDate?: string;
    favoriteMerchants: string[];
    favoriteCategories: string[];
  };
  preferences: {
    cuisine: string[];
    brands: string[];
    paymentMethods: string[];
    notificationPrefs: {
      push: boolean;
      email: boolean;
      sms: boolean;
    };
  };
  engagement: {
    appOpenCount: number;
    lastActive: string;
    sessionsCount: number;
    avgSessionDuration: number;
  };
}

export interface MerchantData {
  businessName: string;
  ownerName: string;
  businessType: string;
  category: string;
  subcategory?: string;
  gstin?: string;
  pan?: string;
  address: {
    full: string;
    city: string;
    state: string;
    pincode: string;
    coordinates?: { lat: number; lng: number };
  };
  contact: {
    phone: string;
    whatsapp?: string;
    email?: string;
    website?: string;
  };
  businessMetrics: {
    monthlyRevenue: number;
    dailyTransactions: number;
    avgTransactionValue: number;
    yearsInBusiness: number;
    employeeCount: number;
  };
  techStack: {
    hasPOS: boolean;
    posProvider?: string;
    hasQRMenu: boolean;
    hasLoyalty: boolean;
    hasDelivery: boolean;
    deliveryPartners?: string[];
    hasOnlineOrdering: boolean;
    hasTableBooking: boolean;
  };
  ratings: {
    google?: { rating: number; reviews: number; lastUpdated: string };
    zomato?: { rating: number; reviews: number };
    swiggy?: { rating: number; reviews: number };
  };
  digitalPresence: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
  rezekaData: {
    merchantId: string;
    score: number;
    grade: 'A' | 'B' | 'C' | 'D';
    status: 'hot' | 'warm' | 'cold' | 'converted' | 'lost';
    assignedTo?: string;
    lastContacted?: string;
    territory?: string;
    lastVisit?: string;
    visitCount: number;
  };
}

export interface RabtulData {
  auth: {
    userId: string;
    loginCount: number;
    lastLogin: string;
    mfaEnabled: boolean;
    loginMethods: ('password' | 'otp' | 'biometric' | 'pin')[];
    devices: Array<{
      deviceId: string;
      type: string;
      lastUsed: string;
    }>;
  };
  payments: {
    totalTransactions: number;
    totalAmount: number;
    successfulPayments: number;
    failedPayments: number;
    avgTransactionValue: number;
    preferredPaymentMethod: string;
    upiRegistered?: string;
    cardsLast4?: string[];
  };
  wallet: {
    currentBalance: number;
    totalLoaded: number;
    totalWithdrawn: number;
    cashbackBalance: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    totalValue: number;
  };
}

export interface CorpPerksData {
  employee: {
    employeeId: string;
    name: string;
    designation: string;
    department: string;
    team?: string;
    manager?: string;
    joiningDate: string;
    status: 'active' | 'inactive' | 'onleave';
  };
  organization: {
    companyId: string;
    companyName: string;
    companyType: string;
    location: string;
  };
  salary: {
    corpId: string;
    accountNumber?: string;
    bankName?: string;
    monthlySalary: number;
    salaryDay: number;
  };
  hr: {
    attendanceRate: number;
    leaveBalance: number;
    performanceScore?: number;
    lastAppraisal?: string;
  };
}

export interface NexhaData {
  vendor: {
    vendorId: string;
    businessName: string;
    contactName: string;
    services: string[];
    certifications: string[];
    rating: number;
    completedOrders: number;
    avgDeliveryTime: number;
  };
  franchise?: {
    franchiseId: string;
    franchiseName: string;
    type: 'owned' | 'licensed';
    location: string;
  };
}

export interface KHAIRMOVEData {
  driver?: {
    driverId: string;
    name: string;
    vehicleType: 'auto' | 'bike' | 'car';
    vehicleNumber?: string;
    licenseNumber?: string;
    rating: number;
    totalRides: number;
    totalEarnings: number;
    onlineHours: number;
  };
  user?: {
    userId: string;
    totalRides: number;
    totalSpent: number;
    avgRating: number;
    favoriteRoutes: string[];
  };
}

export interface RisaCareData {
  patient?: {
    patientId: string;
    name: string;
    dateOfBirth: string;
    bloodGroup?: string;
    allergies?: string[];
    medicalHistory: string[];
    emergencyContact?: string;
  };
  appointments: {
    total: number;
    upcoming: number;
    completed: number;
    cancelled: number;
    lastVisit?: string;
  };
  insurance?: {
    provider: string;
    policyNumber: string;
    coverage: number;
    validUntil: string;
  };
}

// NEW DATA TYPES

export interface StayOwnData {
  guest?: {
    guestId: string;
    name: string;
    totalStays: number;
    totalSpent: number;
    avgStayDuration: number;
    lastStay?: string;
    preferredPropertyType: string[];
    amenitiesUsed: string[];
  };
  host?: {
    hostId: string;
    propertyName: string;
    propertyType: 'hotel' | 'vacation_rental' | 'homestay';
    location: string;
    totalBookings: number;
    avgRating: number;
    superhost: boolean;
    responseRate: number;
    avgEarnings: number;
  };
  bookings: {
    total: number;
    upcoming: number;
    completed: number;
    cancelled: number;
    totalSpent: number;
    favoriteDestinations: string[];
  };
  habixo?: {
    userId: string;
    totalTrips: number;
    loyaltyPoints: number;
    tier: 'basic' | 'silver' | 'gold' | 'platinum';
  };
}

export interface RisnaEstateData {
  buyer?: {
    buyerId: string;
    name: string;
    budget: {
      min: number;
      max: number;
    };
    preferredLocations: string[];
    propertyTypes: string[];
    requirements: string[];
    readyToBuy: boolean;
    lastViewed?: string;
  };
  seller?: {
    sellerId: string;
    propertyName: string;
    propertyType: string;
    location: string;
    price: number;
    status: 'available' | 'under_offer' | 'sold';
    views: number;
    inquiries: number;
  };
  agent?: {
    agentId: string;
    name: string;
    licenseNumber: string;
    totalDeals: number;
    specialization: string[];
    rating: number;
    totalEarnings: number;
  };
  propertyInterest: {
    propertiesViewed: number;
    inquiriesMade: number;
    siteVisits: number;
    offersMade: number;
    dealsClosed: number;
    favoriteAreas: string[];
  };
  propFlowAI?: {
    lastAnalysis?: string;
    matchScore: number;
    recommendedProperties: string[];
  };
}

export interface REZWorkspaceData {
  user?: {
    userId: string;
    name: string;
    email: string;
    department: string;
    role: string;
  };
  documents: {
    total: number;
    shared: number;
    recent: Array<{
      name: string;
      type: string;
      lastModified: string;
    }>;
  };
  calendar: {
    totalEvents: number;
    upcoming: number;
    meetingsAttended: number;
    nextEvent?: string;
  };
  collaboration: {
    teams: string[];
    channels: string[];
    messagesSent: number;
    activeProjects: string[];
  };
  productivity: {
    tasksCreated: number;
    tasksCompleted: number;
    avgTaskCompletionTime: number;
    focusTime: number;
  };
}

export interface ZEventsData {
  attendee?: {
    attendeeId: string;
    name: string;
    totalEvents: number;
    ticketsPurchased: number;
    totalSpent: number;
    favoriteCategories: string[];
    lastEvent?: string;
  };
  organizer?: {
    organizerId: string;
    eventName: string;
    eventsHosted: number;
    totalAttendees: number;
    avgRating: number;
    revenue: number;
  };
  tickets: {
    total: number;
    upcoming: number;
    past: number;
    cancelled: number;
    favoriteVenues: string[];
  };
  preferences: {
    preferredCategories: string[];
    preferredCities: string[];
    notificationPrefs: {
      newEvents: boolean;
      reminders: boolean;
      recommendations: boolean;
    };
  };
}

export interface SADAData {
  trust: {
    trustScore: number;
    trustLevel: 'low' | 'medium' | 'high' | 'verified';
    riskFactors: string[];
    lastAssessed: string;
  };
  verification: {
    kyc: { status: 'pending' | 'verified' | 'failed'; verifiedAt?: string };
    kyb: { status: 'pending' | 'verified' | 'failed'; verifiedAt?: string };
    assertions: Array<{
      type: string;
      value: string;
      issuedBy: string;
      validUntil?: string;
    }>;
  };
  governance: {
    policiesAccepted: string[];
    complianceScore: number;
    auditTrail: Array<{
      action: string;
      timestamp: string;
      entity: string;
    }>;
  };
}

export interface SalarOSData {
  humanTwin?: {
    twinId: string;
    name: string;
    capabilities: Array<{
      skill: string;
      proficiency: number;
      lastUsed: string;
    }>;
    experience: Array<{
      role: string;
      company: string;
      years: number;
    }>;
    goals: string[];
    preferences: Record<string, any>;
  };
  agentTwin?: {
    twinId: string;
    name: string;
    capabilities: string[];
    tasksCompleted: number;
    avgTaskDuration: number;
  };
  organizationTwin?: {
    orgId: string;
    name: string;
    employees: number;
    departments: string[];
  };
}

export interface ShabAIData {
  family?: {
    familyId: string;
    members: Array<{
      name: string;
      relation: string;
      role: 'elder' | 'adult' | 'child';
    }>;
  };
  memories: Array<{
    id: string;
    type: 'event' | 'preference' | 'milestone';
    title: string;
    date: string;
    sharedWith: string[];
  }>;
  elderCare?: {
    status: 'active' | 'monitored';
    lastCheck: string;
    alerts: number;
  };
  childProgress?: {
    totalXP: number;
    level: number;
    subjects: string[];
  };
}

export interface GenieData {
  memory: {
    memories: Array<{
      id: string;
      content: string;
      type: 'experience' | 'preference' | 'relationship';
      importance: number;
      createdAt: string;
    }>;
    memoryScore: number;
  };
  relationships: Array<{
    personId: string;
    name: string;
    relation: string;
    interactionCount: number;
    lastInteraction: string;
    sentiment: 'positive' | 'neutral' | 'negative';
  }>;
  briefing: {
    lastBriefing?: string;
    briefingCount: number;
    topics: string[];
  };
}

export interface AssetMindData {
  financial: {
    creditScore?: number;
    monthlyIncome?: number;
    monthlyExpenses?: number;
    savingsRate?: number;
    investmentPortfolio?: number;
  };
  assets: Array<{
    type: string;
    value: number;
    lastValued: string;
  }>;
  marketTwin?: {
    preferences: string[];
    riskAppetite: 'low' | 'medium' | 'high';
  };
}

export interface REZSalesMindData {
  merchantIntelligence?: {
    discoveryDate: string;
    source: 'google' | 'referral' | 'import' | 'walk-in';
    competitors: string[];
    marketShare?: number;
    opportunities: Array<{
      type: string;
      description: string;
      severity: 'high' | 'medium' | 'low';
      suggestedProduct: string;
    }>;
  };
  leads: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D';
    status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
    lastContact?: string;
    nextAction?: string;
    expectedCloseDate?: string;
  };
  territory: {
    territoryId?: string;
    territoryName?: string;
    priority: number;
  };
}

export interface HOJAIAIData {
  memoryOS?: {
    vectors: number;
    lastUpdated: string;
    topics: string[];
    contextWindow: string[];
  };
  knowledgeGraph?: {
    entities: number;
    relationships: number;
    lastSync: string;
  };
  digitalTwin?: {
    twinType: 'human' | 'agent' | 'organization' | 'hybrid';
    twinId: string;
    lastUpdated: string;
    completeness: number;
  };
  intentTracking?: {
    currentGoals: string[];
    pastIntents: Array<{
      intent: string;
      confidence: number;
      timestamp: string;
    }>;
  };
}

export interface REEData {
  trustPlatform?: {
    trustScore: number;
    factors: Array<{
      factor: string;
      contribution: number;
    }>;
    fraudSignals: string[];
  };
  growth?: {
    referralCount: number;
    viralCoefficient: number;
    referralChain: string[];
    referralsConverted: number;
  };
  attribution?: {
    firstTouch: { channel: string; date: string };
    lastTouch: { channel: string; date: string };
    conversions: number;
    attributionModel: string;
  };
}

// NEW: RIDZA Data
export interface RIDZAData {
  credit?: {
    score: number;
    limit: number;
    used: number;
    available: number;
    history: {
      onTimePayments: number;
      latePayments: number;
      defaults: number;
    };
  };
  insurance?: {
    policies: Array<{
      type: string;
      provider: string;
      policyNumber: string;
      premium: number;
      coverage: number;
      validUntil: string;
    }>;
    totalCoverage: number;
  };
  lending?: {
    activeLoans: number;
    totalBorrowed: number;
    totalRepaid: number;
    outstanding: number;
    history: Array<{
      type: string;
      amount: number;
      status: 'active' | 'repaid' | 'defaulted';
      date: string;
    }>;
  };
  financialHealth: {
    debtToIncomeRatio: number;
    savingsRate: number;
    investmentRatio: number;
    overallScore: number;
  };
}

// NEW: LawGens Data
export interface LawGensData {
  client?: {
    clientId: string;
    name: string;
    cases: number;
    totalSpent: number;
    activeCases: number;
  };
  contracts: {
    total: number;
    signed: number;
    pending: number;
    expired: number;
    types: string[];
  };
  compliance: {
    status: 'compliant' | 'non_compliant' | 'under_review';
    lastAudit?: string;
    issues: string[];
    certifications: string[];
  };
  legalMatters: {
    active: number;
    resolved: number;
    totalCost: number;
    matters: Array<{
      type: string;
      status: 'active' | 'resolved' | 'dismissed';
      lawyer?: string;
      lastUpdate: string;
    }>;
  };
}

// NEW: REZ Intelligence Data
export interface REZIntelligenceData {
  intentSignals?: {
    currentIntent: {
      action: 'browse' | 'compare' | 'purchase' | 'abandon';
      confidence: number;
      products: string[];
      timestamp: string;
    };
    pastIntents: Array<{
      action: string;
      timestamp: string;
      outcome: 'converted' | 'abandoned';
    }>;
  };
  purchaseSignals?: {
    signals: Array<{
      type: 'high_value' | 'repeat' | 'new' | 'churning';
      confidence: number;
      description: string;
    }>;
    propensityScores: {
      likelihoodToBuy: number;
      likelihoodToChurn: number;
      predictedLTV: number;
    };
  };
  fraudDetection?: {
    riskLevel: 'low' | 'medium' | 'high';
    fraudScore: number;
    flags: string[];
    lastChecked: string;
  };
  behavioralData?: {
    avgSessionDuration: number;
    pagesVisited: number;
    featuresUsed: string[];
    searchQueries: string[];
    deviceType: string;
    location: string;
  };
}

// ==================== INSIGHTS ====================

export interface Insights {
  totalValue: number;
  riskScore: number;
  engagementScore: number;
  valueScore: number;
  churnRisk: 'low' | 'medium' | 'high';
  upsellPotential: 'low' | 'medium' | 'high';
  nPS?: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  lastActive: string;
  dataCompleteness: number;
  dataSources: string[];
  dataFreshness: {
    [key: string]: {
      lastUpdated: string;
      freshness: 'fresh' | 'stale' | 'unknown';
    };
  };
}

export interface ProfileMetadata {
  createdAt: string;
  updatedAt: string;
  lastFullSync: string;
  version: string;
}

// ==================== DATA SOURCE CONFIG ====================

export interface DataSourceConfig {
  name: string;
  port: number;
  endpoint: string;
  auth: {
    type: 'apiKey' | 'jwt' | 'serviceAccount';
    key: string;
  };
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  lastSync?: string;
  status?: 'active' | 'inactive' | 'error';
  errorMessage?: string;
}

// ALL25 DATA SOURCES
export const DATA_SOURCES: Record<string, DataSourceConfig> = {
  // Core REZ Apps
  rezConsumer: {
    name: 'REZ Consumer',
    port: 4200,
    endpoint: '/api/users',
    auth: { type: 'apiKey', key: process.env.REZ_CONSUMER_KEY || '' },
    syncFrequency: 'realtime'
  },
  rezMerchant: {
    name: 'REZ Merchant',
    port: 4100,
    endpoint: '/api/merchants',
    auth: { type: 'apiKey', key: process.env.REZ_MERCHANT_KEY || '' },
    syncFrequency: 'hourly'
  },

  // RABTUL Infrastructure
  rabtulAuth: {
    name: 'RABTUL Auth',
    port: 4002,
    endpoint: '/api/users',
    auth: { type: 'serviceAccount', key: process.env.RABTUL_KEY || '' },
    syncFrequency: 'daily'
  },
  rabtulPayment: {
    name: 'RABTUL Payment',
    port: 4001,
    endpoint: '/api/transactions',
    auth: { type: 'serviceAccount', key: process.env.RABTUL_KEY || '' },
    syncFrequency: 'realtime'
  },
  rabtulWallet: {
    name: 'RABTUL Wallet',
    port: 4004,
    endpoint: '/api/wallets',
    auth: { type: 'serviceAccount', key: process.env.RABTUL_KEY || '' },
    syncFrequency: 'realtime'
  },
  rabtulOrder: {
    name: 'RABTUL Order',
    port: 4006,
    endpoint: '/api/orders',
    auth: { type: 'serviceAccount', key: process.env.RABTUL_KEY || '' },
    syncFrequency: 'hourly'
  },

  // Ecosystem Companies
  corpperks: {
    name: 'CorpPerks',
    port: 4720,
    endpoint: '/api/employees',
    auth: { type: 'apiKey', key: process.env.CORPPERKS_KEY || '' },
    syncFrequency: 'daily'
  },
  nexha: {
    name: 'Nexha',
    port: 5001,
    endpoint: '/api/vendors',
    auth: { type: 'apiKey', key: process.env.NEXHA_KEY || '' },
    syncFrequency: 'daily'
  },
  kHAIRMOVE: {
    name: 'KHAIRMOVE',
    port: 4600,
    endpoint: '/api/users',
    auth: { type: 'apiKey', key: process.env.KHAIRMOVE_KEY || '' },
    syncFrequency: 'hourly'
  },
  risaCare: {
    name: 'RisaCare',
    port: 4800,
    endpoint: '/api/patients',
    auth: { type: 'serviceAccount', key: process.env.RISACARE_KEY || '' },
    syncFrequency: 'daily'
  },

  // NEW: More Ecosystem Companies
  stayOwn: {
    name: 'StayOwn',
    port: 4801,
    endpoint: '/api/guests',
    auth: { type: 'apiKey', key: process.env.STAYOWN_KEY || '' },
    syncFrequency: 'daily'
  },
  risnaEstate: {
    name: 'RisnaEstate',
    port: 4901,
    endpoint: '/api/properties',
    auth: { type: 'apiKey', key: process.env.RISNAESTATE_KEY || '' },
    syncFrequency: 'daily'
  },
  rezWorkspace: {
    name: 'REZ Workspace',
    port: 4600,
    endpoint: '/api/users',
    auth: { type: 'apiKey', key: process.env.REZWORKSPACE_KEY || '' },
    syncFrequency: 'hourly'
  },
  zEvents: {
    name: 'Z-Events',
    port: 4600,
    endpoint: '/api/events',
    auth: { type: 'apiKey', key: process.env.ZEVENTS_KEY || '' },
    syncFrequency: 'daily'
  },
  ridza: {
    name: 'RIDZA',
    port: 5200,
    endpoint: '/api/finance',
    auth: { type: 'apiKey', key: process.env.RIDZA_KEY || '' },
    syncFrequency: 'weekly'
  },
  lawGens: {
    name: 'LawGens',
    port: 5100,
    endpoint: '/api/legal',
    auth: { type: 'apiKey', key: process.env.LAWGENS_KEY || '' },
    syncFrequency: 'weekly'
  },

  // Trust& Governance
  sada: {
    name: 'SADA',
    port: 4190,
    endpoint: '/api/entities',
    auth: { type: 'serviceAccount', key: process.env.SADA_KEY || '' },
    syncFrequency: 'weekly'
  },
  salarOS: {
    name: 'Salar OS',
    port: 4710,
    endpoint: '/api/twins',
    auth: { type: 'apiKey', key: process.env.SALAR_KEY || '' },
    syncFrequency: 'daily'
  },

  // AI & Personal
  shabAI: {
    name: 'Shab AI',
    port: 4970,
    endpoint: '/api/family',
    auth: { type: 'apiKey', key: process.env.SHAB_KEY || '' },
    syncFrequency: 'weekly'
  },
  genie: {
    name: 'Genie',
    port: 4703,
    endpoint: '/api/memory',
    auth: { type: 'apiKey', key: process.env.GENIE_KEY || '' },
    syncFrequency: 'realtime'
  },
  assetMind: {
    name: 'AssetMind',
    port: 5001,
    endpoint: '/api/financial',
    auth: { type: 'apiKey', key: process.env.ASSET_KEY || '' },
    syncFrequency: 'weekly'
  },

  // SalesMind & Intelligence
  rezSalesMind: {
    name: 'REZ SalesMind',
    port: 5150,
    endpoint: '/api/merchants',
    auth: { type: 'apiKey', key: process.env.ATLAS_KEY || '' },
    syncFrequency: 'hourly'
  },
  hojaiMemory: {
    name: 'HOJAI Memory',
    port: 4520,
    endpoint: '/api/vectors',
    auth: { type: 'apiKey', key: process.env.HOJAI_KEY || '' },
    syncFrequency: 'daily'
  },
  hojaiKG: {
    name: 'HOJAI Knowledge Graph',
    port: 4530,
    endpoint: '/api/entities',
    auth: { type: 'apiKey', key: process.env.HOJAI_KEY || '' },
    syncFrequency: 'daily'
  },
  rezIntelligence: {
    name: 'REZ Intelligence',
    port: 4018,
    endpoint: '/api/signals',
    auth: { type: 'apiKey', key: process.env.REZINTEL_KEY || '' },
    syncFrequency: 'realtime'
  },

  // REE Cross-Cutting
  reeTrust: {
    name: 'REE Trust Platform',
    port: 3001,
    endpoint: '/api/trust',
    auth: { type: 'serviceAccount', key: process.env.REE_KEY || '' },
    syncFrequency: 'daily'
  },
  reeGrowth: {
    name: 'REE Growth Engine',
    port: 3002,
    endpoint: '/api/growth',
    auth: { type: 'serviceAccount', key: process.env.REE_KEY || '' },
    syncFrequency: 'daily'
  },
  reeAttribution: {
    name: 'REE Attribution',
    port: 3004,
    endpoint: '/api/attribution',
    auth: { type: 'serviceAccount', key: process.env.REE_KEY || '' },
    syncFrequency: 'daily'
  },

  // CRM Hub (26th data source)
  rezCRM: {
    name: 'REZ CRM Hub',
    port: 4300,
    endpoint: '/api',
    auth: { type: 'apiKey', key: process.env.REZCRM_KEY || '' },
    syncFrequency: 'hourly'
  }
};

// ==================== KNOWLEDGE GRAPH SERVICE ====================

export class KnowledgeGraphService {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private edges: Map<string, Array<{ target: string; type: string; weight: number }>> = new Map();

  addNode(id: string, type: KnowledgeNode['type'], source: string, data: Record<string, any>, confidence = 80): void {
    const existing = this.nodes.get(id);
    const updated: KnowledgeNode = {
      id,
      type,
      source,
      data: existing ? { ...existing.data, ...data } : data,
      lastUpdated: new Date().toISOString(),
      confidence: existing ? Math.min(100, (existing.confidence + confidence) / 2) : confidence
    };
    this.nodes.set(id, updated);
  }

  addEdge(sourceId: string, targetId: string, type: string, weight = 1): void {
    if (!this.edges.has(sourceId)) {
      this.edges.set(sourceId, []);
    }
    this.edges.get(sourceId)!.push({ target: targetId, type, weight });
  }

  calculateInsights(profile: ComprehensiveUserProfile): Insights {
    const dataSources = Object.entries(profile)
      .filter(([key, value]) => value !== undefined && key !== 'insights' && key !== 'metadata')
      .map(([key]) => key);

    const filledFields = Object.values(profile)
      .filter(v => v !== undefined && typeof v === 'object')
      .length;

    const dataCompleteness = Math.round((filledFields / 27) * 100); // 27 sections now

    // Calculate freshness
    const freshness: Record<string, { lastUpdated: string; freshness: 'fresh' | 'stale' | 'unknown' }> = {};
    for (const source of dataSources) {
      freshness[source] = {
        lastUpdated: profile.metadata.updatedAt,
        freshness: 'unknown'
      };
    }

    return {
      totalValue: this.calculateTotalValue(profile),
      riskScore: this.calculateRiskScore(profile),
      engagementScore: this.calculateEngagementScore(profile),
      valueScore: this.calculateValueScore(profile),
      churnRisk: this.calculateChurnRisk(profile),
      upsellPotential: this.calculateUpsellPotential(profile),
      sentiment: this.calculateSentiment(profile),
      lastActive: this.getLastActive(profile),
      dataCompleteness,
      dataSources,
      dataFreshness: freshness
    };
  }

  private calculateTotalValue(profile: ComprehensiveUserProfile): number {
    let value = 0;

    if (profile.consumer?.wallet.balance) value += profile.consumer.wallet.balance;
    if (profile.consumer?.loyalty.points) value += profile.consumer.loyalty.points;
    if (profile.consumer?.orders.totalSpent) value += profile.consumer.orders.totalSpent * 0.1;
    if (profile.merchant?.businessMetrics.monthlyRevenue) value += profile.merchant.businessMetrics.monthlyRevenue * 12;
    if (profile.merchant?.rezekaData.score) value += profile.merchant.rezekaData.score * 1000;
    if (profile.rabtul?.wallet.currentBalance) value += profile.rabtul.wallet.currentBalance;
    if (profile.assetMind?.financial.investmentPortfolio) value += profile.assetMind.financial.investmentPortfolio;
    if (profile.stayOwn?.guest?.totalSpent) value += profile.stayOwn.guest.totalSpent;
    if (profile.risnaEstate?.buyer?.budget.max) value += profile.risnaEstate.buyer.budget.max;
    if (profile.ridza?.credit?.limit) value += profile.ridza.credit.limit;
    if (profile.zEvents?.attendee?.totalSpent) value += profile.zEvents.attendee.totalSpent;

    return Math.round(value);
  }

  private calculateRiskScore(profile: ComprehensiveUserProfile): number {
    let risk = 20;

    if (profile.sada?.trust.trustScore && profile.sada.trust.trustScore < 50) risk += 30;
    if (!profile.identity.verified) risk += 20;
    if (profile.ree?.trustPlatform?.fraudSignals?.length) risk += 25;
    if (profile.rezIntelligence?.fraudDetection?.riskLevel === 'high') risk += 30;
    if (profile.consumer?.engagement.lastActive) {
      const daysSinceActive = (Date.now() - new Date(profile.consumer.engagement.lastActive).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActive > 90) risk += 25;
    }

    return Math.min(risk, 100);
  }

  private calculateEngagementScore(profile: ComprehensiveUserProfile): number {
    let score = 50;

    if (profile.consumer?.engagement.appOpenCount) score += Math.min(profile.consumer.engagement.appOpenCount / 10, 20);
    if (profile.consumer?.orders.total) score += Math.min(profile.consumer.orders.total / 10, 20);
    if (profile.stayOwn?.guest?.totalStays) score += Math.min(profile.stayOwn.guest.totalStays * 5, 15);
    if (profile.zEvents?.attendee?.totalEvents) score += Math.min(profile.zEvents.attendee.totalEvents * 3, 15);
    if (profile.rezWorkspace?.user) score += 10;

    if (profile.consumer?.engagement.lastActive) {
      const daysSince = (Date.now() - new Date(profile.consumer.engagement.lastActive).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) score += 10;
      else if (daysSince > 30) score -= 20;
    }

    return Math.min(Math.max(score, 0), 100);
  }

  private calculateValueScore(profile: ComprehensiveUserProfile): number {
    let score = 0;

    if (profile.consumer?.orders.totalSpent) score += 25;
    if (profile.merchant?.businessMetrics.monthlyRevenue) score += 30;
    if (profile.assetMind?.financial.investmentPortfolio) score += 20;
    if (profile.stayOwn?.guest?.totalSpent) score += 15;
    if (profile.risnaEstate?.buyer?.budget.max) score += 20;
    if (profile.ridza?.credit?.score) score += 15;

    score += Math.min(this.calculateEngagementScore(profile) * 0.3, 30);
    if (profile.sada?.trust.trustScore) score += profile.sada.trust.trustScore * 0.15;

    return Math.min(Math.round(score), 100);
  }

  private calculateChurnRisk(profile: ComprehensiveUserProfile): 'low' | 'medium' | 'high' {
    const engagement = this.calculateEngagementScore(profile);
    if (profile.rezIntelligence?.purchaseSignals?.propensityScores && profile.rezIntelligence.purchaseSignals.propensityScores.likelihoodToChurn > 70) return 'high';
    if (engagement > 70) return 'low';
    if (engagement > 40) return 'medium';
    return 'high';
  }

  private calculateUpsellPotential(profile: ComprehensiveUserProfile): 'low' | 'medium' | 'high' {
    let potential = 0;

    if (profile.merchant) {
      if (!profile.merchant.techStack.hasPOS) potential += 20;
      if (!profile.merchant.techStack.hasQRMenu) potential += 15;
      if (!profile.merchant.techStack.hasLoyalty) potential += 15;
    }
    if (profile.consumer?.loyalty.tier && profile.consumer.loyalty.tier !== 'platinum') potential += 20;
    if (profile.stayOwn?.habixo && profile.stayOwn.habixo.tier !== 'platinum') potential += 15;
    if (profile.ridza?.insurance && !profile.ridza.insurance.policies?.length) potential += 20;
    if (profile.risnaEstate?.buyer && !profile.risnaEstate.buyer.readyToBuy) potential += 25;

    if (potential > 40) return 'high';
    if (potential > 20) return 'medium';
    return 'low';
  }

  private calculateSentiment(profile: ComprehensiveUserProfile): 'positive' | 'neutral' | 'negative' {
    if (profile.genie?.relationships.length) {
      const avgSentiment = profile.genie.relationships.reduce((sum, r) => {
        if (r.sentiment === 'positive') return sum + 1;
        if (r.sentiment === 'negative') return sum - 1;
        return sum;
      }, 0);
      if (avgSentiment > 0.5) return 'positive';
      if (avgSentiment < -0.5) return 'negative';
    }
    return 'neutral';
  }

  private getLastActive(profile: ComprehensiveUserProfile): string {
    const dates = [
      profile.consumer?.engagement.lastActive,
      profile.merchant?.rezekaData.lastVisit,
      profile.rabtul?.auth.lastLogin,
      profile.genie?.briefing.lastBriefing,
      profile.stayOwn?.guest?.lastStay,
      profile.zEvents?.attendee?.lastEvent,
      profile.rezWorkspace?.user ? new Date().toISOString() : null
    ].filter(Boolean) as string[];

    if (dates.length === 0) return 'unknown';
    return dates.sort().reverse()[0];
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();