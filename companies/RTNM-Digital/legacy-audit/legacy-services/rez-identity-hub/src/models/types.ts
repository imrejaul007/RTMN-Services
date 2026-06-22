/**
 * Unified Identity Models
 *
 * Core types for REZ Identity Hub
 */

// User types across the ecosystem
export type UserType = 'customer' | 'merchant' | 'vendor' | 'employee' | 'partner' | 'unknown';

// Identity status
export type IdentityStatus = 'verified' | 'pending' | 'unverified' | 'flagged';

// Social media platforms
export type SocialPlatform = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'pinterest' | 'tiktok';

// Base contact info
export interface ContactInfo {
  phone?: string;
  email?: string;
  whatsapp?: string;
  telegram?: string;
}

// Location info
export interface LocationInfo {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
}

// Verified social media profile
export interface SocialProfile {
  platform: SocialPlatform;
  url: string;
  handle: string;
  displayName?: string;
  followers?: number;
  following?: number;
  posts?: number;
  verified: boolean;
  verifiedAt?: string;
  verificationMethod?: 'manual' | 'oauth' | 'scraped' | 'api';
  profilePicture?: string;
  bio?: string;
  lastChecked?: string;
}

// Verified social media result
export interface VerifiedSocialMedia {
  userId: string;
  profiles: SocialProfile[];
  totalFollowers: number;
  verifiedAt: string;
  verificationScore: number; // 0-100
}

// Customer profile (REZ Consumer)
export interface CustomerProfile {
  userId: string;
  type: 'customer';

  // Basic info
  name: string;
  phone: string;
  email?: string;

  // Profile
  avatar?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';

  // Location
  location?: LocationInfo;

  // Social
  socialProfiles?: SocialProfile[];

  // REZ Consumer data
  walletBalance?: number;
  loyaltyPoints?: number;
  lifetimeValue?: number;

  // Preferences
  preferences?: {
    cuisine?: string[];
    brands?: string[];
    notifications?: boolean;
  };

  // Behavior
  totalOrders?: number;
  avgOrderValue?: number;
  lastOrderDate?: string;
  favoriteMerchants?: string[];

  // Engagement
  appUsageScore?: number;
  pushEnabled?: boolean;
  emailEnabled?: boolean;

  // Metadata
  createdAt: string;
  updatedAt: string;
  lastSeen: string;
  source: 'app' | 'merchant' | 'import' | 'referral';
}

// Merchant profile (REZ Merchant)
export interface MerchantProfile {
  userId: string;
  type: 'merchant';

  // Business info
  businessName: string;
  ownerName?: string;
  phone: string;
  email?: string;
  gstin?: string;
  pan?: string;

  // Location
  address: LocationInfo;

  // Category
  category: string;
  subcategory?: string;
  tags?: string[];

  // Social
  socialProfiles?: SocialProfile[];
  website?: string;

  // Business metrics
  monthlyRevenue?: number;
  employeeCount?: number;
  yearsInBusiness?: number;

  // Ratings
  googleRating?: number;
  googleReviews?: number;
  zomatoRating?: number;
  swiggyRating?: number;

  // Tech stack
  hasPOS?: boolean;
  posProvider?: string;
  hasQRMenu?: boolean;
  hasLoyalty?: boolean;
  hasDelivery?: boolean;
  deliveryPartners?: string[];

  // REZ Merchant data
  merchantScore?: number;
  leadStatus?: 'hot' | 'warm' | 'cold' | 'converted' | 'lost';
  assignedTo?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  lastContacted?: string;
  source: 'discovery' | 'referral' | 'import' | 'walk-in';
}

// Vendor profile (Nexha, CorpPerks)
export interface VendorProfile {
  userId: string;
  type: 'vendor';

  // Business info
  businessName: string;
  contactName: string;
  phone: string;
  email: string;

  // Business details
  businessType: string;
  services: string[];
  certifications?: string[];

  // Location
  location: LocationInfo;

  // Social
  socialProfiles?: SocialProfile[];
  website?: string;

  // Business metrics
  rating?: number;
  completedOrders?: number;
  avgDeliveryTime?: number;

  // Metadata
  createdAt: string;
  updatedAt: string;
  source: 'nexha' | 'corpperks' | 'import';
}

// Employee profile (CorpPerks)
export interface EmployeeProfile {
  userId: string;
  type: 'employee';

  // Personal info
  name: string;
  phone: string;
  email: string;
  avatar?: string;

  // Location
  location?: LocationInfo;

  department?: string;
  designation?: string;
  employeeId?: string;

  // Organization
  companyId?: string;
  companyName?: string;
  team?: string;
  manager?: string;

  // Social
  socialProfiles?: SocialProfile[];
  linkedIn?: string;

  // CorpPerks data
  corpId?: string;
  salaryAccount?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  source: 'corpsperks' | 'hris' | 'import';
}

// Unified identity (merged across all apps)
export interface UnifiedIdentity {
  id: string;

  // Core identifiers
  primaryPhone: string;
  primaryEmail?: string;

  // Linked identities
  linkedIdentities: {
    customerId?: string;
    merchantId?: string;
    vendorId?: string;
    employeeId?: string;
 };

  // Resolved profiles
  customer?: CustomerProfile;
  merchant?: MerchantProfile;
  vendor?: VendorProfile;
  employee?: EmployeeProfile;

  // Aggregated social profiles
  socialProfiles: SocialProfile[];

  // Identity resolution score
  identityScore: number; // How confident we are this is the same person

  // Status
  status: IdentityStatus;

  // Activity summary
  activity: {
    totalAppsUsed: number;
    lastActivity: string;
    totalTransactions: number;
    totalSpent: number;
    totalEarned: number;
  };

  // Metadata
  createdAt: string;
  updatedAt: string;
  lastResolved: string;
}

// Pre-call research brief
export interface PreCallBrief {
  // Who is this person?
  identity: {
    id: string;
    name: string;
    type: UserType;
    primaryPhone: string;
    photo?: string;
  };

  // What do we know about them?
  profile: {
    customer?: Partial<CustomerProfile>;
    merchant?: Partial<MerchantProfile>;
    vendor?: Partial<VendorProfile>;
    employee?: Partial<EmployeeProfile>;
  };

  // Verified social media
  social: {
    profiles: SocialProfile[];
    totalFollowers: number;
    verificationScore: number;
  };

  // What have they done with us?
  activity: {
    appsUsed: string[];
    totalOrders: number;
    totalSpent: number;
    loyaltyPoints: number;
    lastActive: string;
    engagementScore: number;
  };

  // What opportunities exist?
  opportunities: {
    open: number;
    suggested: string[];
    suggestedProducts: string[];
  };

  // What should we say?
  talkingPoints: {
    recentActivity: string;
    achievements?: string;
    painPoints?: string;
    previousOffers?: string;
  };

  // Risk flags
  flags: {
    isFlagged: boolean;
    reason?: string;
    spamRisk: boolean;
    vfyRisk: boolean;
  };

  // Research metadata
  research: {
    completedAt: string;
    sources: string[];
    confidence: number;
    timeToResearch: number; // ms
  };
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

// Search result
export interface SearchResult {
  id: string;
  type: UserType;
  name: string;
  phone: string;
  email?: string;
  photo?: string;
  location?: string;
  matchScore: number;
  matchedOn: ('phone' | 'email' | 'name' | 'gstin')[];
 source: string;
  lastSeen: string;
}