/**
 * Store types for Merchant SDK
 */

export interface StoreLocation {
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  coordinates?: [number, number];
  deliveryRadius?: number;
  landmark?: string;
}

export interface StoreContact {
  phone?: string;
  email?: string;
  website?: string;
  whatsapp?: string;
}

export interface StoreOperationalInfo {
  hours?: Record<string, { open: string; close: string }>;
  dineIn?: boolean;
  delivery?: boolean;
  takeaway?: boolean;
  orderingMode?: string[];
}

export interface StoreSocialLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  website?: string;
}

export interface StoreRatings {
  average: number;
  count: number;
  distribution?: {
    5?: number;
    4?: number;
    3?: number;
    2?: number;
    1?: number;
  };
}

export interface StoreQRData {
  storeId: string;
  storeSlug: string;
  qrPayload: {
    storeId: string;
    action: string;
    version: number;
    timestamp?: number;
  };
  qrString: string;
  deepLink: string;
  links: {
    checkin: string;
    menu: string;
    pay: string;
    review: string;
  };
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  banner?: string[];
  category: string;
  subcategories?: string[];
  location: StoreLocation;
  contact?: StoreContact;
  operationalInfo?: StoreOperationalInfo;
  storeType?: 'restaurant' | 'cafe' | 'bakery' | 'salon' | 'spa' | 'retail' | 'other';
  acceptsOnlineOrders?: boolean;
  acceptsScanPay?: boolean;
  deliveryEnabled?: boolean;
  deliveryRadiusKm?: number;
  deliveryFee?: number;
  ratings?: StoreRatings;
  tags?: string[];
  features?: string[];
  socialLinks?: StoreSocialLinks;
  isActive: boolean;
  isListed: boolean;
  verificationStatus?: 'pending' | 'approved' | 'rejected' | 'suspended';
}

export interface StoreResponse {
  success: boolean;
  data: Store;
  meta?: {
    qrType?: string;
    scannedAt?: string;
  };
}

export interface StoreListResponse {
  success: boolean;
  data: Store[];
}

export interface StoreAnalyticsResponse {
  success: boolean;
  data: {
    storeId: string;
    storeName: string;
    qrScans: number;
    ordersFromQR: number;
    conversionRate: string;
    lastUpdated?: string;
  };
}
