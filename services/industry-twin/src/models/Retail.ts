import mongoose, { Document, Schema } from 'mongoose';

// Retail-specific entity types
export type RetailType = 'department_store' | 'specialty' | 'grocery' | 'convenience' | 'discount' | 'luxury' | 'online' | 'marketplace' | 'pop_up';
export type ProductCategory = 'electronics' | 'clothing' | 'food' | 'beverage' | 'home' | 'health' | 'beauty' | 'sports' | 'toys' | 'furniture' | 'automotive' | 'other';

// Product/SKU
export interface RetailProduct {
  productId: string;
  sku: string;
  name: string;
  description: string;
  category: ProductCategory;
  subcategory?: string;
  brand: string;
  supplier: string;
  cost: number;
  price: number;
  compareAtPrice?: number;
  margin: number;
  stock: {
    onHand: number;
    available: number;
    reserved: number;
    incoming: number;
  };
  dimensions?: {
    weight: number;
    height: number;
    width: number;
    depth: number;
  };
  images: string[];
  variants?: {
    name: string;
    value: string;
    sku: string;
    price: number;
    stock: number;
  }[];
  tags: string[];
  status: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
}

// Store location
export interface StoreLocation {
  locationId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates: { lat: number; lng: number };
  phone: string;
  email?: string;
  manager: string;
  hours: {
    day: string;
    open: string;
    close: string;
    open24Hours: boolean;
  }[];
  type: 'brick_mortar' | 'online' | 'hybrid';
  size?: number;
  capacity?: number;
  currentStock?: number;
}

// Customer profile
export interface RetailCustomer {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  loyaltyPoints: number;
  totalPurchases: number;
  averageOrderValue: number;
  purchaseCount: number;
  preferences: string[];
  segments: string[];
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  communicationPreferences: ('email' | 'sms' | 'push')[];
  vip: boolean;
  createdAt: Date;
}

// Cart
export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  price: number;
  discount?: number;
  variant?: string;
  addedAt: Date;
}

export interface ShoppingCart {
  cartId: string;
  customerId?: string;
  sessionId: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  expiresAt: Date;
  createdAt: Date;
}

// Order
export interface RetailOrder {
  orderId: string;
  customerId?: string;
  locationId?: string;
  items: {
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    price: number;
    discount: number;
    subtotal: number;
  }[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  fulfillmentMethod: 'pickup' | 'delivery' | 'shipping';
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Promotion
export interface Promotion {
  promotionId: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed' | 'bogo' | 'bundle' | 'loyalty';
  code?: string;
  discountValue: number;
  minimumPurchase?: number;
  applicableCategories?: ProductCategory[];
  applicableProducts?: string[];
  startDate: Date;
  endDate: Date;
  usageLimit?: number;
  usageCount: number;
  status: 'active' | 'scheduled' | 'expired' | 'paused';
}

// Supplier
export interface Supplier {
  supplierId: string;
  name: string;
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  products: string[];
  leadTime: number;
  minimumOrder: number;
  paymentTerms: string;
  rating: number;
  status: 'active' | 'inactive' | 'probation';
}

// Retail profile
export interface IRetailProfile extends Document {
  tenantId: string;
  businessId: string;
  name: string;
  type: RetailType;
  brandName: string;
  locations: StoreLocation[];
  products: RetailProduct[];
  customers: RetailCustomer[];
  activeCarts: ShoppingCart[];
  orders: RetailOrder[];
  promotions: Promotion[];
  suppliers: Supplier[];
  metrics: {
    totalRevenue: number;
    averageOrderValue: number;
    conversionRate: number;
    customerRetentionRate: number;
    inventoryTurnover: number;
    sellThroughRate: number;
    grossMargin: number;
    footTraffic?: number;
    onlineTraffic?: number;
  };
  integrations: {
    pos: string;
    ecommerce: string;
    crm: string;
    erp: string;
    paymentProcessor: string;
    shipping: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// Subdocument schemas
const StoreLocationSchema = new Schema<StoreLocation>({
  locationId: { type: String, required: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  phone: { type: String, required: true },
  email: { type: String },
  manager: { type: String, required: true },
  hours: [{
    day: { type: String, required: true },
    open: { type: String, required: true },
    close: { type: String, required: true },
    open24Hours: { type: Boolean, default: false }
  }],
  type: {
    type: String,
    enum: ['brick_mortar', 'online', 'hybrid'],
    default: 'brick_mortar'
  },
  size: { type: Number },
  capacity: { type: Number },
  currentStock: { type: Number }
}, { _id: false });

const RetailProfileSchema = new Schema<IRetailProfile>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    businessId: {
      type: String,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['department_store', 'specialty', 'grocery', 'convenience', 'discount', 'luxury', 'online', 'marketplace', 'pop_up'],
      required: true
    },
    brandName: {
      type: String,
      required: true
    },
    locations: [StoreLocationSchema],
    products: [Schema.Types.Mixed],
    customers: [Schema.Types.Mixed],
    activeCarts: [Schema.Types.Mixed],
    orders: [Schema.Types.Mixed],
    promotions: [Schema.Types.Mixed],
    suppliers: [Schema.Types.Mixed],
    metrics: {
      totalRevenue: { type: Number, default: 0 },
      averageOrderValue: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 },
      customerRetentionRate: { type: Number, default: 0 },
      inventoryTurnover: { type: Number, default: 0 },
      sellThroughRate: { type: Number, default: 0 },
      grossMargin: { type: Number, default: 0 },
      footTraffic: { type: Number },
      onlineTraffic: { type: Number }
    },
    integrations: {
      pos: { type: String },
      ecommerce: { type: String },
      crm: { type: String },
      erp: { type: String },
      paymentProcessor: { type: String },
      shipping: [{ type: String }]
    }
  },
  {
    timestamps: true,
    collection: 'retail_profiles'
  }
);

// Indexes
RetailProfileSchema.index({ tenantId: 1 });
RetailProfileSchema.index({ 'locations.city': 1, 'locations.state': 1 });
RetailProfileSchema.index({ type: 1 });

export const RetailProfile = mongoose.model<IRetailProfile>('RetailProfile', RetailProfileSchema);

export default RetailProfile;
