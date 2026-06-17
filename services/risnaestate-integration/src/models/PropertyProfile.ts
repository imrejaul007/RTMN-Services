/**
 * PropertyProfile Model
 * Represents a property listing in the Real Estate OS
 */

export interface Location {
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  locality?: string;
  landmark?: string;
}

export interface PropertyMedia {
  type: 'image' | 'video' | 'virtual_tour' | 'floor_plan';
  url: string;
  caption?: string;
  isPrimary?: boolean;
  order?: number;
}

export interface PropertyPricing {
  price: number;
  pricePerSqft?: number;
  currency: string;
  priceType: 'fixed' | 'negotiable' | 'on_request';
  additionalCosts?: {
    registration?: number;
    stamp_duty?: number;
    maintenance?: number;
    property_tax?: number;
  };
}

export interface PropertyDetails {
  propertyType: 'apartment' | 'villa' | 'plot' | 'commercial' | 'industrial' | 'land' | 'penthouse' | 'townhouse';
  bedrooms?: number;
  bathrooms?: number;
  balconies?: number;
  totalFloors?: number;
  floorNumber?: number;
  carpetArea: number;
  carpetAreaUnit: 'sqft' | 'sqm' | 'sqyd';
  builtUpArea?: number;
  builtUpAreaUnit?: 'sqft' | 'sqm' | 'sqyd';
  totalArea?: number;
  totalAreaUnit?: 'sqft' | 'sqm' | 'sqyd' | 'acre' | 'hectare';
  yearBuilt?: number;
  possessionDate?: string;
  ageOfProperty?: string;
  facingDirection?: 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';
}

export interface PropertyAmenities {
  parking?: boolean;
  parkingSpaces?: number;
  furnished?: 'furnished' | 'semi_furnished' | 'unfurnished';
  amenities?: string[];
  powerBackup?: boolean;
  waterSupply?: 'borewell' | 'municipal' | 'tanker' | 'solar';
  security?: boolean;
  lift?: boolean;
  gym?: boolean;
  swimmingPool?: boolean;
  clubHouse?: boolean;
  childrenPlayArea?: boolean;
  garden?: boolean;
  maintenanceStaff?: boolean;
}

export interface PropertyOwnership {
  ownerName: string;
  ownerContact?: string;
  ownerEmail?: string;
  ownershipType: 'freehold' | 'leasehold' | 'cooperative' | 'power_of_attorney';
  encumbranceFree: boolean;
  khataCertificate?: string;
}

export interface PropertyLegal {
  reraApproved?: boolean;
  reraNumber?: string;
  bcpoCertificate?: string;
  ocReceived?: boolean;
  buildingPlanApproved?: boolean;
  mortgageDetails?: string;
  litigationDetails?: string;
}

export interface PropertyAnalytics {
  views: number;
  inquiries: number;
  siteVisitRequests: number;
  daysOnMarket: number;
  priceHistory: Array<{
    date: string;
    price: number;
    changeType: 'increase' | 'decrease' | 'initial';
  }>;
}

export interface PropertyProfile {
  id: string;
  listingId: string;
  title: string;
  description: string;
  location: Location;
  pricing: PropertyPricing;
  details: PropertyDetails;
  amenities: PropertyAmenities;
  ownership: PropertyOwnership;
  legal: PropertyLegal;
  media: PropertyMedia[];
  analytics: PropertyAnalytics;
  status: 'active' | 'pending' | 'sold' | 'withdrawn' | 'reserved';
  listingType: 'sale' | 'rent' | 'lease';
  customerId?: string;
  agentId?: string;
  tags?: string[];
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
  syncedToTwin: boolean;
  twinSyncStatus?: 'pending' | 'synced' | 'failed';
  twinId?: string;
}

/**
 * Factory function to create a new PropertyProfile
 */
export function createPropertyProfile(data: Partial<PropertyProfile>): PropertyProfile {
  const now = new Date().toISOString();
  return {
    id: data.id || '',
    listingId: data.listingId || `RE-${Date.now()}`,
    title: data.title || '',
    description: data.description || '',
    location: data.location || {
      address: '',
      city: '',
      state: '',
      country: '',
      pincode: ''
    },
    pricing: data.pricing || {
      price: 0,
      currency: 'INR',
      priceType: 'fixed'
    },
    details: data.details || {
      propertyType: 'apartment',
      carpetArea: 0,
      carpetAreaUnit: 'sqft'
    },
    amenities: data.amenities || {
      furnished: 'unfurnished'
    },
    ownership: data.ownership || {
      ownerName: '',
      ownershipType: 'freehold',
      encumbranceFree: true
    },
    legal: data.legal || {},
    media: data.media || [],
    analytics: data.analytics || {
      views: 0,
      inquiries: 0,
      siteVisitRequests: 0,
      daysOnMarket: 0,
      priceHistory: []
    },
    status: data.status || 'active',
    listingType: data.listingType || 'sale',
    customerId: data.customerId,
    agentId: data.agentId,
    tags: data.tags || [],
    featured: data.featured || false,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    syncedToTwin: data.syncedToTwin || false,
    twinSyncStatus: data.twinSyncStatus,
    twinId: data.twinId
  };
}

/**
 * Property filter options for queries
 */
export interface PropertyFilter {
  status?: PropertyProfile['status'];
  listingType?: PropertyProfile['listingType'];
  propertyType?: PropertyDetails['propertyType'];
  city?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minArea?: number;
  maxArea?: number;
  furnished?: PropertyAmenities['furnished'];
  featured?: boolean;
  ownerId?: string;
  tags?: string[];
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'createdAt' | 'views' | 'daysOnMarket';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Property statistics
 */
export interface PropertyStats {
  totalListings: number;
  activeListings: number;
  soldProperties: number;
  pendingListings: number;
  averagePrice: number;
  medianPrice: number;
  totalViews: number;
  totalInquiries: number;
  totalSiteVisits: number;
  byType: Record<string, number>;
  byCity: Record<string, number>;
}
