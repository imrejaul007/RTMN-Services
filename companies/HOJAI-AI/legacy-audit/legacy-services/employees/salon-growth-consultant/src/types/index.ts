import { z } from 'zod';

// ============================================
// Base Types
// ============================================

export interface SalonProfile {
  id: string;
  name: string;
  location: string;
  type: 'salon' | 'spa' | 'beauty_parlor' | 'unisex' | 'unisex_premium';
  services: string[];
  priceRange: 'budget' | 'mid' | 'premium' | 'luxury';
  seatingCapacity: number;
  stations: number;
  avgServiceValue: number;
  monthlyRevenue: number;
  operatingHours: OperatingHours;
}

export interface OperatingHours {
  [day: string]: { open: string; close: string; closed?: boolean };
}

// ============================================
// Staff Types
// ============================================

export interface StaffMember {
  id: string;
  name: string;
  role: 'stylist' | 'senior_stylist' | 'colorist' | 'senior_colorist' | 'beautician' | 'masseur' | 'manager' | 'receptionist';
  services: string[];
  experience: number; // years
  rating: number; // 1-5
  monthlyClients: number;
  avgServiceDuration: number; // minutes
  salary: number;
  commission?: number; // percentage
  availability: WeeklyAvailability;
}

export interface WeeklyAvailability {
  [day: string]: { start: string; end: string; available: boolean };
}

export interface StaffUtilization {
  staffId: string;
  staffName: string;
  role: string;
  totalCapacity: number; // minutes available
  bookedMinutes: number;
  utilizationPercent: number;
  revenue: number;
  revenuePerHour: number;
  avgClientRating: number;
  peakHours: { hour: number; utilization: number }[];
  utilizationTrend: 'up' | 'down' | 'stable';
}

export interface StaffAnalysis {
  overallUtilization: number;
  targetUtilization: number;
  topPerformers: StaffUtilization[];
  underperformers: StaffUtilization[];
  utilizationByRole: { role: string; utilization: number; staffCount: number }[];
  revenueByStaff: { staffId: string; name: string; revenue: number }[];
  capacityGaps: { timeSlot: string; shortfall: number; recommendation: string }[];
  recommendations: {
    category: 'rebooking' | 'pricing' | 'training' | 'scheduling' | 'incentive';
    action: string;
    targetStaff?: string;
    expectedImpact: number;
    priority: 'high' | 'medium' | 'low';
  }[];
}

export interface StaffConsultRequest {
  salonId: string;
  staff: StaffMember[];
  services: Service[];
  appointments: Appointment[];
  dateRange?: { start: string; end: string };
}

export interface StaffConsultResponse {
  analysis: StaffAnalysis;
  rebookingCampaigns: {
    targetStaff: string;
    clientCount: number;
    action: string;
    expectedRetentionLift: number;
  }[];
  trainingNeeds: {
    skill: string;
    staffIds: string[];
    priority: 'urgent' | 'high' | 'medium';
  }[];
}

// ============================================
// Service Types
// ============================================

export interface Service {
  id: string;
  name: string;
  category: 'hair' | 'skin' | 'nails' | 'spa' | 'makeup' | 'waxing' | 'mens' | 'other';
  price: number;
  cost: number;
  duration: number; // minutes
  popularity: number; // 1-100
  requiresStylist?: boolean;
  allowsUpsell?: boolean;
  seasonality?: { peak: string[]; low: string[] };
}

export interface ServiceMix {
  serviceId: string;
  name: string;
  category: string;
  bookings: number;
  revenue: number;
  avgDuration: number;
  upsellRate: number;
  repeatRate: number;
  margin: number;
}

export interface BookingAnalysis {
  totalBookings: number;
  bookingTrends: { week: string; bookings: number; revenue: number }[];
  serviceMix: ServiceMix[];
  peakSlots: { time: string; demand: number; capacity: number }[];
  lowSlots: { time: string; demand: number; utilization: number }[];
  repeatRate: number;
  noShowRate: number;
  cancellationRate: number;
}

export interface BookingConsultRequest {
  salonId: string;
  services: Service[];
  appointments: Appointment[];
  clients: Client[];
  dateRange?: { start: string; end: string };
}

export interface BookingConsultResponse {
  analysis: BookingAnalysis;
  recommendations: {
    category: 'timing' | 'pricing' | 'service' | 'retention' | 'upsell';
    action: string;
    expectedImpact: number;
    implementation: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  upsellOpportunities: {
    service: string;
    toService: string;
    combination: string;
    pricePoint: number;
    marginBoost: number;
  }[];
  retentionStrategies: {
    trigger: string;
    action: string;
    targetSegment: string;
    expectedLift: number;
  }[];
}

// ============================================
// Client Types
// ============================================

export interface Client {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  visitCount: number;
  avgSpend: number;
  lastVisit?: string;
  preferredServices?: string[];
  preferredStaff?: string;
  birthday?: string;
  tags?: string[];
  lifecycleStage?: 'new' | 'active' | 'at_risk' | 'dormant' | 'VIP';
}

export interface ClientMetrics {
  totalClients: number;
  newClients: number;
  returningClients: number;
  atRiskClients: number;
  dormantClients: number;
  VIPClients: number;
  avgLifetimeValue: number;
  avgVisitFrequency: number; // days between visits
  repeatRate: number;
  churnRate: number;
}

// ============================================
// Appointment Types
// ============================================

export interface Appointment {
  id: string;
  clientId?: string;
  staffId: string;
  serviceId: string;
  dateTime: string;
  duration: number;
  price?: number;
  status: 'booked' | 'completed' | 'cancelled' | 'no_show';
  source?: 'walk_in' | 'phone' | 'online' | 'whatsapp' | 'app';
  upsells?: { serviceId: string; price: number }[];
}

// ============================================
// Membership Types
// ============================================

export interface MembershipTier {
  name: string;
  pointsRequired: number;
  monthlyFee: number;
  benefits: string[];
  discount: number; // percentage
  multiplier: number;
  color: string;
  perks: {
    category: 'discount' | 'free_service' | 'priority' | 'exclusive' | 'points';
    item: string;
    value: number;
    frequency?: 'monthly' | 'quarterly' | 'annually';
  }[];
}

export interface Membership {
  id: string;
  name: string;
  tiers: MembershipTier[];
  pointsPerRupee: number;
  pointsValue: number; // points = 1 rupee
  birthdayBonus: number;
  referralBonus: number;
  expiry: 'never' | 'months' | 'years';
  expiryMonths?: number;
}

export interface MembershipMetrics {
  totalMembers: number;
  activeMembers: number;
  premiumMembers: number;
  monthlyRecurringRevenue: number;
  avgMemberValue: number;
  churnRate: number;
  redemptionRate: number;
  tierDistribution: { tier: string; count: number; percent: number; revenue: number }[];
}

export interface MembershipConsultRequest {
  salonId: string;
  salonName: string;
  avgServiceValue: number;
  monthlyClients: number;
  clientMetrics: ClientMetrics;
  currentMembership?: Membership;
  goals: 'acquire' | 'retain' | 'increase_spend' | 'all';
}

export interface MembershipConsultResponse {
  program: Membership;
  metrics: MembershipMetrics;
  recommendations: {
    action: string;
    reason: string;
    expectedLift: number;
    timeline: string;
  }[];
  tierStrategy: {
    tier: string;
    targetPercent: number;
    benefits: string[];
    upgradeCriteria: string;
  }[];
  campaigns: {
    name: string;
    type: 'welcome' | 'upgrade' | 'reactivation' | 'referral' | 'birthday';
    description: string;
    targetSegment: string;
    expectedConversion: number;
  }[];
  projectedImpact: {
    memberGrowth: number;
    revenueIncrease: number;
    retentionLift: number;
    mrrIncrease: number;
  };
}

// ============================================
// Package Types
// ============================================

export interface BeautyPackage {
  id: string;
  name: string;
  description: string;
  services: { serviceId: string; name: string; originalPrice: number; discountedPrice: number }[];
  totalOriginalPrice: number;
  packagePrice: number;
  discountPercent: number;
  margin: number;
  validity: number; // days
  targetSegment: 'new_client' | 'regular' | 'premium' | 'seasonal' | 'bridal';
  category: 'bridal' | 'party' | 'regular' | 'mens' | 'seasonal' | 'custom';
  popularity?: number;
  projectedSales?: number;
}

export interface PackageAnalysis {
  currentPackages: BeautyPackage[];
  packageRevenue: number;
  packageMargin: number;
  conversionRate: number;
  avgPackageValue: number;
  categoryBreakdown: { category: string; revenue: number; percent: number }[];
  seasonalPatterns: { season: string; topPackage: string; sales: number }[];
}

export interface PackageConsultRequest {
  salonId: string;
  services: Service[];
  clients: Client[];
  currentPackages?: BeautyPackage[];
  focusAreas?: string[];
}

export interface PackageConsultResponse {
  analysis: PackageAnalysis;
  recommendations: {
    action: 'create' | 'modify' | 'discontinue' | 'promote';
    package?: BeautyPackage;
    category?: string;
    description: string;
    expectedImpact: number;
    priority: 'high' | 'medium' | 'low';
  }[];
  newPackages: BeautyPackage[];
  seasonalBundles: {
    season: string;
    occasion: string;
    package: BeautyPackage;
    marketingPush: string;
  }[];
  upsellPaths: {
    fromPackage: string;
    toPackage: string;
    trigger: string;
    expectedConversion: number;
  }[];
}

// ============================================
// Scheduling Types
// ============================================

export interface ScheduleSlot {
  date: string;
  time: string;
  staffId: string;
  serviceId?: string;
  booked: boolean;
  clientId?: string;
  appointmentId?: string;
}

export interface ScheduleOptimization {
  avgUtilization: number;
  peakCoverage: { slot: string; coverage: number; demand: number }[];
  understaffedSlots: { day: string; time: string; demand: number; staff: number }[];
  overstaffedSlots: { day: string; time: string; staff: number; utilization: number }[];
  revenueOpportunity: { category: string; opportunity: string; potential: number }[];
}

export interface ScheduleConsultRequest {
  salonId: string;
  staff: StaffMember[];
  services: Service[];
  appointments: Appointment[];
  holidays?: string[];
  targetUtilization?: number;
}

export interface ScheduleConsultResponse {
  optimization: ScheduleOptimization;
  recommendations: {
    category: 'staffing' | 'booking' | 'incentive' | 'marketing';
    action: string;
    implementation: string;
    expectedImpact: number;
    priority: 'high' | 'medium' | 'low';
  }[];
  optimalSchedule: {
    day: string;
    slots: { time: string; staffCount: number; targetUtilization: number }[];
  }[];
  bufferRecommendations: {
    service: string;
    currentBuffer: number;
    recommendedBuffer: number;
    reason: string;
  }[];
  incentiveRecommendations: {
    period: string;
    target: string;
    incentive: string;
    expectedLift: number;
  }[];
}

// ============================================
// Growth Types
// ============================================

export interface GrowthMetrics {
  currentRevenue: number;
  targetRevenue: number;
  growthRate: number;
  clientAcquisitionCost: number;
  clientLifetimeValue: number;
  avgServiceValue: number;
  serviceFrequency: number;
  repeatClientRate: number;
}

export interface GrowthConsultRequest {
  salonId: string;
  salonProfile: SalonProfile;
  financialMetrics: { monthlyRevenue: number; monthlyClients: number; avgServiceValue: number };
  clientMetrics: ClientMetrics;
  staffMetrics?: { totalStaff: number; utilization: number; avgRating: number };
}

export interface GrowthConsultResponse {
  currentState: {
    revenue: number;
    clients: number;
    avgServiceValue: number;
    growthRate: number;
    staffUtilization: number;
  };
  targetState: {
    revenue: number;
    clients: number;
    avgServiceValue: number;
    growthRate: number;
    staffUtilization: number;
  };
  growthPillars: {
    pillar: string;
    weight: number;
    currentScore: number;
    targetScore: number;
    initiatives: { initiative: string; impact: number; timeline: string; effort: string }[];
  }[];
  quickWins: { action: string; impact: number; effort: string; timeline: string }[];
  investments: { category: string; amount: number; roi: number; paybackMonths: number }[];
  timeline: { month: string; focus: string; keyActions: string[]; expectedOutcome: string }[];
}

// ============================================
// Zod Schemas for Validation
// ============================================

export const StaffConsultSchema = z.object({
  salonId: z.string().min(1),
  staff: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    role: z.enum(['stylist', 'senior_stylist', 'colorist', 'senior_colorist', 'beautician', 'masseur', 'manager', 'receptionist']),
    services: z.array(z.string()),
    experience: z.number().min(0),
    rating: z.number().min(1).max(5),
    monthlyClients: z.number().min(0),
    avgServiceDuration: z.number().positive(),
    salary: z.number().nonnegative(),
    commission: z.number().min(0).max(100).optional(),
    availability: z.record(z.object({
      start: z.string(),
      end: z.string(),
      available: z.boolean(),
    })),
  })),
  services: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    category: z.enum(['hair', 'skin', 'nails', 'spa', 'makeup', 'waxing', 'mens', 'other']),
    price: z.number().positive(),
    cost: z.number().nonnegative(),
    duration: z.number().positive(),
    popularity: z.number().min(0).max(100).optional().default(50),
  })),
  appointments: z.array(z.object({
    id: z.string().min(1),
    clientId: z.string().min(1),
    staffId: z.string().min(1),
    serviceId: z.string().min(1),
    dateTime: z.string(),
    duration: z.number().positive(),
    price: z.number().nonnegative(),
    status: z.enum(['booked', 'completed', 'cancelled', 'no_show']),
    source: z.enum(['walk_in', 'phone', 'online', 'whatsapp', 'app']),
  })),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
});

export const BookingConsultSchema = z.object({
  salonId: z.string().min(1),
  services: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    category: z.enum(['hair', 'skin', 'nails', 'spa', 'makeup', 'waxing', 'mens', 'other']),
    price: z.number().positive(),
    cost: z.number().nonnegative().optional().default(0),
    duration: z.number().positive(),
    popularity: z.number().min(0).max(100).optional().default(50),
    allowsUpsell: z.boolean().optional().default(false),
  })),
  appointments: z.array(z.object({
    id: z.string().min(1),
    clientId: z.string().min(1),
    staffId: z.string().min(1),
    serviceId: z.string().min(1),
    dateTime: z.string(),
    duration: z.number().positive(),
    price: z.number().nonnegative(),
    status: z.enum(['booked', 'completed', 'cancelled', 'no_show']),
    source: z.enum(['walk_in', 'phone', 'online', 'whatsapp', 'app']).optional().default('walk_in'),
    upsells: z.array(z.object({
      serviceId: z.string(),
      price: z.number().nonnegative(),
    })).optional(),
  })),
  clients: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    phone: z.string().optional(),
    visitCount: z.number().min(0).optional().default(0),
    avgSpend: z.number().nonnegative().optional().default(0),
    lastVisit: z.string().optional(),
    lifecycleStage: z.enum(['new', 'active', 'at_risk', 'dormant', 'VIP']).optional().default('new'),
    tags: z.array(z.string()).optional().default([]),
    preferredServices: z.array(z.string()).optional().default([]),
    birthday: z.string().optional(),
  })),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
});

export const MembershipConsultSchema = z.object({
  salonId: z.string().min(1),
  salonName: z.string().min(1),
  avgServiceValue: z.number().positive(),
  monthlyClients: z.number().positive(),
  clientMetrics: z.object({
    totalClients: z.number().nonnegative(),
    newClients: z.number().nonnegative(),
    returningClients: z.number().nonnegative(),
    atRiskClients: z.number().nonnegative(),
    dormantClients: z.number().nonnegative(),
    VIPClients: z.number().nonnegative(),
    avgLifetimeValue: z.number().nonnegative(),
    avgVisitFrequency: z.number().positive(),
    repeatRate: z.number().min(0).max(100),
    churnRate: z.number().min(0).max(100),
  }),
  currentMembership: z.object({
    id: z.string(),
    name: z.string(),
    tiers: z.array(z.object({
      name: z.string(),
      pointsRequired: z.number(),
      monthlyFee: z.number().nonnegative(),
      benefits: z.array(z.string()),
      discount: z.number().min(0).max(100),
      multiplier: z.number(),
      color: z.string(),
      perks: z.array(z.object({
        category: z.enum(['discount', 'free_service', 'priority', 'exclusive', 'points']),
        item: z.string(),
        value: z.number(),
        frequency: z.enum(['monthly', 'quarterly', 'annually']).optional(),
      })),
    })),
    pointsPerRupee: z.number(),
    pointsValue: z.number(),
    birthdayBonus: z.number(),
    referralBonus: z.number(),
    expiry: z.enum(['never', 'months', 'years']),
    expiryMonths: z.number().optional(),
  }).optional(),
  goals: z.enum(['acquire', 'retain', 'increase_spend', 'all']),
});

export const PackageConsultSchema = z.object({
  salonId: z.string().min(1),
  services: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    category: z.enum(['hair', 'skin', 'nails', 'spa', 'makeup', 'waxing', 'mens', 'other']),
    price: z.number().positive(),
    cost: z.number().nonnegative().optional().default(0),
    duration: z.number().positive(),
    popularity: z.number().min(0).max(100).optional().default(50),
  })),
  clients: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    phone: z.string().optional(),
    visitCount: z.number().min(0).optional().default(0),
    avgSpend: z.number().nonnegative().optional().default(0),
    lastVisit: z.string().optional(),
    lifecycleStage: z.enum(['new', 'active', 'at_risk', 'dormant', 'VIP']).optional().default('new'),
    tags: z.array(z.string()).optional().default([]),
    preferredServices: z.array(z.string()).optional().default([]),
    birthday: z.string().optional(),
  })),
  currentPackages: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    services: z.array(z.object({
      serviceId: z.string(),
      name: z.string(),
      originalPrice: z.number().nonnegative(),
      discountedPrice: z.number().nonnegative(),
    })),
    totalOriginalPrice: z.number().nonnegative(),
    packagePrice: z.number().nonnegative(),
    discountPercent: z.number().min(0).max(100),
    margin: z.number().min(0).max(100).optional().default(50),
    validity: z.number().positive(),
    targetSegment: z.enum(['new_client', 'regular', 'premium', 'seasonal', 'bridal']),
    category: z.enum(['bridal', 'party', 'regular', 'mens', 'seasonal', 'custom']),
    popularity: z.number().min(0).max(100).optional(),
    projectedSales: z.number().nonnegative().optional(),
  })).optional(),
  focusAreas: z.array(z.string()).optional(),
});

export const ScheduleConsultSchema = z.object({
  salonId: z.string().min(1),
  staff: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    role: z.enum(['stylist', 'senior_stylist', 'colorist', 'senior_colorist', 'beautician', 'masseur', 'manager', 'receptionist']),
    services: z.array(z.string()),
    experience: z.number().min(0).optional().default(1),
    rating: z.number().min(1).max(5).optional().default(4),
    monthlyClients: z.number().min(0).optional().default(20),
    avgServiceDuration: z.number().positive().optional().default(45),
    salary: z.number().nonnegative().optional().default(15000),
    commission: z.number().min(0).max(100).optional(),
    availability: z.record(z.object({
      start: z.string(),
      end: z.string(),
      available: z.boolean(),
    })),
  })),
  services: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    duration: z.number().positive(),
    category: z.enum(['hair', 'skin', 'nails', 'spa', 'makeup', 'waxing', 'mens', 'other']),
    price: z.number().positive().optional().default(500),
    cost: z.number().nonnegative().optional().default(100),
    popularity: z.number().min(0).max(100).optional().default(50),
  })),
  appointments: z.array(z.object({
    id: z.string().min(1),
    clientId: z.string().min(1).optional(),
    staffId: z.string().min(1),
    serviceId: z.string().min(1),
    dateTime: z.string(),
    duration: z.number().positive(),
    price: z.number().nonnegative().optional().default(0),
    status: z.enum(['booked', 'completed', 'cancelled', 'no_show']),
    source: z.enum(['walk_in', 'phone', 'online', 'whatsapp', 'app']).optional().default('walk_in'),
  })),
  holidays: z.array(z.string()).optional(),
  targetUtilization: z.number().min(0).max(100).optional().default(85),
});

export const GrowthConsultSchema = z.object({
  salonId: z.string().min(1),
  salonProfile: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    location: z.string(),
    type: z.enum(['salon', 'spa', 'beauty_parlor', 'unisex', 'unisex_premium']),
    services: z.array(z.string()),
    priceRange: z.enum(['budget', 'mid', 'premium', 'luxury']),
    seatingCapacity: z.number().positive(),
    stations: z.number().positive(),
    avgServiceValue: z.number().positive(),
    monthlyRevenue: z.number().nonnegative(),
    operatingHours: z.record(z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean().optional(),
    })),
  }),
  financialMetrics: z.object({
    monthlyRevenue: z.number().nonnegative(),
    monthlyClients: z.number().nonnegative(),
    avgServiceValue: z.number().positive(),
  }),
  clientMetrics: z.object({
    totalClients: z.number().nonnegative(),
    newClients: z.number().nonnegative(),
    returningClients: z.number().nonnegative(),
    atRiskClients: z.number().nonnegative(),
    dormantClients: z.number().nonnegative(),
    VIPClients: z.number().nonnegative(),
    avgLifetimeValue: z.number().nonnegative(),
    avgVisitFrequency: z.number().positive(),
    repeatRate: z.number().min(0).max(100),
    churnRate: z.number().min(0).max(100),
  }),
  staffMetrics: z.object({
    totalStaff: z.number().positive(),
    utilization: z.number().min(0).max(100),
    avgRating: z.number().min(1).max(5),
  }).optional(),
});

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    processingTime: number;
    model?: string;
    confidence?: number;
  };
}
