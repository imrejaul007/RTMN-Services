/**
 * HOJAI Merchant Bridge - Types
 * Connects Hojai AI to REZ Merchant platform
 */

// ============================================================================
// MERCHANT TYPES
// ============================================================================

export interface Merchant {
  id: string;
  name: string;
  businessType: 'restaurant' | 'salon' | 'retail' | 'clinic' | 'hotel';
  email: string;
  phone: string;
  address: Address;
  hours: BusinessHours;
  features: MerchantFeatures;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  pincode: string;
  coordinates?: { lat: number; lng: number };
}

export interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  open: string;  // "09:00"
  close: string; // "21:00"
  closed: boolean;
}

export interface MerchantFeatures {
  ordering: boolean;
  booking: boolean;
  payments: boolean;
  delivery: boolean;
  takeaway: boolean;
  dinein: boolean;
  loyalty: boolean;
}

// ============================================================================
// CUSTOMER TYPES
// ============================================================================

export interface Customer {
  id: string;
  merchantId: string;
  name: string;
  phone: string;
  email?: string;
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  loyaltyPoints: number;
  lifetimeValue: number;
  totalOrders: number;
  lastVisit: Date;
  preferences: CustomerPreferences;
  tags: string[];
  createdAt: Date;
}

export interface CustomerPreferences {
  favoriteItems: string[];
  dietaryRestrictions: string[];
  preferredPayment: 'upi' | 'card' | 'cash' | 'wallet';
  notificationPreferences: {
    sms: boolean;
    whatsapp: boolean;
    email: boolean;
    push: boolean;
  };
}

// ============================================================================
// MENU TYPES
// ============================================================================

export interface MenuItem {
  id: string;
  merchantId: string;
  category: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  available: boolean;
  preparationTime: number; // minutes
  variants?: MenuVariant[];
  addons?: MenuAddon[];
  dietary: ('veg' | 'nonveg' | 'vegan' | 'glutenfree')[];
  allergens?: string[];
}

export interface MenuVariant {
  id: string;
  name: string;
  price: number;
}

export interface MenuAddon {
  id: string;
  name: string;
  price: number;
}

// ============================================================================
// ORDER TYPES
// ============================================================================

export interface Order {
  id: string;
  merchantId: string;
  customerId: string;
  type: 'delivery' | 'pickup' | 'dinein' | 'table';
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: 'upi' | 'card' | 'cash' | 'wallet' | 'cod';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  estimatedTime?: Date;
  completedAt?: Date;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  variants?: { name: string; price: number }[];
  addons?: { name: string; price: number }[];
  notes?: string;
}

// ============================================================================
// BOOKING TYPES
// ============================================================================

export interface Booking {
  id: string;
  merchantId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  date: string; // "2026-05-29"
  time: string; // "14:00"
  guests: number;
  type: 'salon' | 'restaurant' | 'clinic' | 'hotel';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  service?: string;
  notes?: string;
  createdAt: Date;
}

// ============================================================================
// INVENTORY TYPES
// ============================================================================

export interface InventoryItem {
  id: string;
  merchantId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  expiryDate?: Date;
  costPrice: number;
  sellingPrice: number;
}

// ============================================================================
// TABLE TYPES
// ============================================================================

export interface Table {
  id: string;
  merchantId: string;
  number: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  position?: { x: number; y: number };
}

export interface TableReservation {
  id: string;
  tableId: string;
  customerId: string;
  date: string;
  time: string;
  duration: number; // minutes
  guests: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}

// ============================================================================
// BRIDGE RESPONSE TYPES
// ============================================================================

export interface MerchantContext {
  merchant: Merchant;
  customers: Customer[];
  menu: MenuItem[];
  todayOrders: Order[];
  todayRevenue: number;
  activeBookings: Booking[];
  tables: Table[];
}

export interface CustomerContext {
  customer: Customer;
  recentOrders: Order[];
  favoriteItems: MenuItem[];
  upcomingBookings: Booking[];
  loyaltyProgress: {
    currentPoints: number;
    nextTier: string;
    pointsNeeded: number;
  };
}

export interface AIServiceContext {
  merchant: Merchant;
  customer?: Customer;
  menu: MenuItem[];
  orders: Order[];
  availability: {
    tables: Table[];
    slots: TimeSlot[];
    items: { id: string; name: string; available: boolean }[];
  };
}

export interface TimeSlot {
  time: string;
  available: boolean;
  capacity?: number;
}
