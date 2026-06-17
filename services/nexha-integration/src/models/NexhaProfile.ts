import { v4 as uuidv4 } from 'uuid';

// Base Types
export interface NexhaBaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
}

// Supplier Models
export interface SupplierAddress {
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

export interface SupplierContact {
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface SupplierCertification {
  type: string;
  issuer: string;
  issuedDate: Date;
  expiryDate: Date;
  documentUrl?: string;
}

export interface SupplierRating {
  average: number;
  totalReviews: number;
  deliveryRating: number;
  qualityRating: number;
  communicationRating: number;
}

export interface Supplier extends NexhaBaseEntity {
  type: 'supplier';
  companyName: string;
  tradingName?: string;
  registrationNumber?: string;
  taxId?: string;
  email: string;
  phone: string;
  address: SupplierAddress;
  contacts: SupplierContact[];
  categories: string[];
  certifications: SupplierCertification[];
  rating: SupplierRating;
  paymentTerms: string;
  minimumOrderValue: number;
  leadTimeDays: number;
  tags: string[];
  metadata?: Record<string, unknown>;
}

// Product/Inventory Models
export interface ProductPricing {
  unitPrice: number;
  currency: string;
  minimumQuantity: number;
  bulkDiscount?: {
    quantity: number;
    discountPercent: number;
  }[];
}

export interface ProductInventory {
  available: number;
  reserved: number;
  incoming: number;
  warehouse: string;
  lastUpdated: Date;
}

export interface Product extends NexhaBaseEntity {
  type: 'product';
  sku: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  supplierId: string;
  pricing: ProductPricing;
  inventory: ProductInventory;
  specifications?: Record<string, string>;
  images?: string[];
  tags: string[];
  metadata?: Record<string, unknown>;
}

// Procurement Models
export interface ProcurementLineItem {
  productId: string;
  productSku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
}

export interface ProcurementOrder extends NexhaBaseEntity {
  type: 'procurement_order';
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  status: 'draft' | 'pending' | 'approved' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  lineItems: ProcurementLineItem[];
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number;
  currency: string;
  shippingAddress: SupplierAddress;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  notes?: string;
  approvedBy?: string;
  approvedAt?: Date;
  metadata?: Record<string, unknown>;
}

// Distribution Models
export interface DistributionChannel {
  id: string;
  name: string;
  type: 'retail' | 'wholesale' | 'online' | 'direct';
  priority: number;
}

export interface DistributionOrder extends NexhaBaseEntity {
  type: 'distribution_order';
  orderNumber: string;
  sourceWarehouseId: string;
  destinationAddress: SupplierAddress;
  channel: DistributionChannel;
  items: {
    productId: string;
    productSku: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }[];
  status: 'pending' | 'processing' | 'packed' | 'shipped' | 'in_transit' | 'delivered' | 'failed';
  totalAmount: number;
  currency: string;
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: SupplierAddress;
  capacity: number;
  currentUtilization: number;
  manager?: string;
  contactPhone?: string;
  isActive: boolean;
}

// Twin Sync Models
export interface TwinSyncRecord {
  id: string;
  sourceType: 'procurement' | 'distribution' | 'supplier' | 'product';
  sourceId: string;
  twinType: 'order' | 'payment' | 'asset' | 'supplier';
  twinId?: string;
  status: 'pending' | 'synced' | 'failed' | 'conflict';
  lastSyncAt?: Date;
  retryCount: number;
  error?: string;
  payload?: Record<string, unknown>;
}

// Event Models
export interface NexhaEvent {
  id: string;
  type: string;
  source: 'procurement' | 'distribution' | 'supplier';
  entityType: string;
  entityId: string;
  action: 'created' | 'updated' | 'deleted' | 'status_changed';
  data: Record<string, unknown>;
  timestamp: Date;
  processed: boolean;
}

// Factory functions
export function createSupplier(data: Partial<Supplier>): Supplier {
  return {
    id: data.id || uuidv4(),
    type: 'supplier',
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
    status: data.status || 'pending',
    companyName: data.companyName || '',
    tradingName: data.tradingName,
    registrationNumber: data.registrationNumber,
    taxId: data.taxId,
    email: data.email || '',
    phone: data.phone || '',
    address: data.address || {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: ''
    },
    contacts: data.contacts || [],
    categories: data.categories || [],
    certifications: data.certifications || [],
    rating: data.rating || {
      average: 0,
      totalReviews: 0,
      deliveryRating: 0,
      qualityRating: 0,
      communicationRating: 0
    },
    paymentTerms: data.paymentTerms || 'NET30',
    minimumOrderValue: data.minimumOrderValue || 0,
    leadTimeDays: data.leadTimeDays || 7,
    tags: data.tags || [],
    metadata: data.metadata
  };
}

export function createProcurementOrder(data: Partial<ProcurementOrder>): ProcurementOrder {
  const lineItems = data.lineItems || [];
  const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);

  return {
    id: data.id || uuidv4(),
    type: 'procurement_order',
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
    status: data.status || 'draft',
    orderNumber: data.orderNumber || `PO-${Date.now()}`,
    supplierId: data.supplierId || '',
    supplierName: data.supplierName || '',
    lineItems,
    subtotal,
    taxAmount: data.taxAmount || subtotal * 0.1,
    shippingCost: data.shippingCost || 0,
    totalAmount: data.totalAmount || subtotal + (data.taxAmount || subtotal * 0.1) + (data.shippingCost || 0),
    currency: data.currency || 'USD',
    shippingAddress: data.shippingAddress || {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: ''
    },
    expectedDeliveryDate: data.expectedDeliveryDate,
    actualDeliveryDate: data.actualDeliveryDate,
    notes: data.notes,
    approvedBy: data.approvedBy,
    approvedAt: data.approvedAt,
    metadata: data.metadata
  };
}

export function createDistributionOrder(data: Partial<DistributionOrder>): DistributionOrder {
  return {
    id: data.id || uuidv4(),
    type: 'distribution_order',
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
    status: data.status || 'pending',
    orderNumber: data.orderNumber || `DO-${Date.now()}`,
    sourceWarehouseId: data.sourceWarehouseId || '',
    destinationAddress: data.destinationAddress || {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: ''
    },
    channel: data.channel || { id: 'default', name: 'Default', type: 'retail', priority: 1 },
    items: data.items || [],
    totalAmount: data.totalAmount || 0,
    currency: data.currency || 'USD',
    trackingNumber: data.trackingNumber,
    carrier: data.carrier,
    notes: data.notes,
    metadata: data.metadata
  };
}

export function createSyncRecord(
  sourceType: TwinSyncRecord['sourceType'],
  sourceId: string,
  twinType: TwinSyncRecord['twinType']
): TwinSyncRecord {
  return {
    id: uuidv4(),
    sourceType,
    sourceId,
    twinType,
    status: 'pending',
    lastSyncAt: undefined,
    retryCount: 0
  };
}

export function createNexhaEvent(
  type: string,
  source: NexhaEvent['source'],
  entityType: string,
  entityId: string,
  action: NexhaEvent['action'],
  data: Record<string, unknown>
): NexhaEvent {
  return {
    id: uuidv4(),
    type,
    source,
    entityType,
    entityId,
    action,
    data,
    timestamp: new Date(),
    processed: false
  };
}
