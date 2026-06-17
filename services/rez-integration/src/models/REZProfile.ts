/**
 * REZ User Profile Model
 * Unified profile model for REZ ecosystem users
 */

export interface REZAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface REZContact {
  phone?: string;
  email?: string;
  preferredContact?: 'email' | 'phone' | 'sms';
}

export interface REZWallet {
  balance: number;
  currency: string;
  status: 'active' | 'frozen' | 'closed';
  lastTransaction?: Date;
}

export interface REZPreferences {
  language: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  privacyLevel: 'public' | 'private' | 'friends_only';
}

export interface REZConsumerProfile {
  corpid: string;
  consumerId: string;
  name: string;
  type: 'consumer';
  contact: REZContact;
  address?: REZAddress;
  wallet: REZWallet;
  preferences: REZPreferences;
  orderHistory: string[]; // Order IDs
  favoriteMerchants: string[]; // Merchant IDs
  activeSubscriptions: string[];
  referralCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface REZMerchantProfile {
  corpid: string;
  merchantId: string;
  businessName: string;
  type: 'merchant';
  contact: REZContact;
  address: REZAddress;
  businessType: string;
  industryVertical: string;
  posTerminals: number;
  activeProducts: number;
  staff: {
    total: number;
    active: number;
  };
  wallet: REZWallet;
  ratings: {
    average: number;
    count: number;
  };
  operatingHours: {
    [day: string]: { open: string; close: string; closed?: boolean };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface REZDeliveryProfile {
  corpid: string;
  deliveryId: string;
  name: string;
  type: 'delivery_partner';
  contact: REZContact;
  vehicle: {
    type: 'bike' | 'car' | 'van';
    plateNumber: string;
    licenseVerified: boolean;
  };
  status: 'available' | 'on_delivery' | 'offline';
  currentLocation?: {
    lat: number;
    lng: number;
    updatedAt: Date;
  };
  wallet: REZWallet;
  stats: {
    totalDeliveries: number;
    completedToday: number;
    rating: number;
  };
  operatingZones: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type REZProfile = REZConsumerProfile | REZMerchantProfile | REZDeliveryProfile;

/**
 * Unified Order model across REZ ecosystem
 */
export interface REZOrder {
  orderId: string;
  corpid: string;
  type: 'consumer' | 'merchant';
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'in_transit' | 'delivered' | 'cancelled';
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  merchant: {
    id: string;
    name: string;
    location: REZAddress;
  };
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    modifiers?: string[];
  }>;
  delivery?: {
    partnerId?: string;
    partnerName?: string;
    pickupTime?: Date;
    deliveryTime?: Date;
    currentLocation?: { lat: number; lng: number };
  };
  pricing: {
    subtotal: number;
    deliveryFee: number;
    taxes: number;
    total: number;
    currency: string;
  };
  payment: {
    method: 'wallet' | 'card' | 'cash' | 'upi';
    status: 'pending' | 'paid' | 'refunded' | 'failed';
    transactionId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Product model for REZ Merchant
 */
export interface REZProduct {
  productId: string;
  merchantId: string;
  corpid: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  images: string[];
  availability: 'available' | 'out_of_stock' | 'limited';
  modifiers?: Array<{
    name: string;
    options: Array<{ name: string; price: number }>;
  }>;
  nutrition?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Shipment model for REZ Delivery
 */
export interface REZShipment {
  shipmentId: string;
  orderId: string;
  corpid: string;
  status: 'assigned' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed';
  pickup: {
    location: REZAddress;
    time?: Date;
    verified: boolean;
  };
  delivery: {
    location: REZAddress;
    time?: Date;
    signature?: string;
    photo?: string;
  };
  deliveryPartner: {
    id: string;
    name: string;
    phone: string;
    currentLocation?: { lat: number; lng: number };
  };
  route?: {
    eta: Date;
    distance: number;
    currentStep: number;
    steps: Array<{ lat: number; lng: number; address: string }>;
  };
  proofOfDelivery?: {
    type: 'signature' | 'photo' | 'otp';
    value: string;
    timestamp: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payment transaction model
 */
export interface REZPayment {
  transactionId: string;
  corpid: string;
  orderId?: string;
  type: 'credit' | 'debit' | 'refund';
  amount: number;
  currency: string;
  method: 'wallet' | 'card' | 'upi' | 'bank_transfer';
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  from?: {
    type: 'consumer' | 'merchant' | 'delivery_partner';
    id: string;
    walletId: string;
  };
  to?: {
    type: 'consumer' | 'merchant' | 'delivery_partner';
    id: string;
    walletId: string;
  };
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Genie Customer Context
 */
export interface GenieCustomerContext {
  corpid: string;
  customerId: string;
  profile: REZProfile;
  recentOrders?: REZOrder[];
  preferences?: REZPreferences;
  walletBalance?: number;
  loyaltyPoints?: number;
  activeSubscriptions?: string[];
}
