import { z } from 'zod';

// ============================================
// Pagination & Common Query Parameters
// ============================================
export const PaginationParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// ============================================
// Date Range Query
// ============================================
export const DateRangeParamsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================
// Purchase Order Requests
// ============================================

// Create Purchase Order Request
export const CreatePurchaseOrderRequestSchema = z.object({
  merchantId: z.string().uuid(),
  supplierId: z.string().uuid(),
  items: z.array(z.object({
    supplierProductId: z.string().uuid().optional(),
    name: z.string().min(1, 'Item name is required'),
    sku: z.string().optional(),
    qty: z.number().positive('Quantity must be positive'),
    unit: z.string().min(1, 'Unit is required'),
    unitPrice: z.number().min(0),
  })).min(1, 'At least one item is required'),
  paymentMethod: z.enum(['prepaid', 'net-terms', 'bnpl']).optional(),
  deliveryAddress: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().regex(/^[0-9]{6}$/),
  }).optional(),
  expectedDelivery: z.string().datetime().optional(),
  notes: z.string().optional(),
  source: z.enum(['manual', 'reorder_signal', 'rfq']),
  rfqId: z.string().uuid().optional(),
});

// Update PO Status Request
export const UpdatePOStatusRequestSchema = z.object({
  status: z.enum(['draft', 'submitted', 'confirmed', 'processing', 'shipped', 'partial', 'received', 'cancelled']),
  actualDelivery: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// Update PO Item Request
export const UpdatePOItemRequestSchema = z.object({
  receivedQty: z.number().min(0),
});

// ============================================
// RFQ Requests
// ============================================

// Create RFQ Request
export const CreateRFQRequestSchema = z.object({
  merchantId: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  targetPrice: z.number().positive().optional(),
  deliveryDeadline: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

// RFQ Respond Request
export const RFQRespondRequestSchema = z.object({
  rfqId: z.string().uuid(),
  supplierId: z.string().uuid(),
  unitPrice: z.number().positive('Unit price must be positive'),
  leadTimeDays: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

// Award RFQ Request
export const AwardRFQRequestSchema = z.object({
  supplierId: z.string().uuid(),
});

// ============================================
// Signal Query Requests
// ============================================

// List Signals Query
export const ListSignalsQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  merchantId: z.string().uuid().optional(),
  source: z.enum(['restopapa', 'rez-merchant', 'hotel-pms']).optional(),
  severity: z.enum(['low', 'critical', 'out_of_stock']).optional(),
  signalType: z.enum(['threshold_breach', 'manual_request', 'forecast_deficit']).optional(),
  status: z.enum(['pending', 'matched', 'po_created', 'ignored']).optional(),
  urgency: z.enum(['high', 'medium', 'low']).optional(),
});

// ============================================
// Order Query Requests
// ============================================

// List Orders Query
export const ListOrdersQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  merchantId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  status: z.enum(['draft', 'submitted', 'confirmed', 'processing', 'shipped', 'partial', 'received', 'cancelled']).optional(),
  paymentStatus: z.enum(['pending', 'partial', 'paid']).optional(),
  source: z.enum(['manual', 'reorder_signal', 'rfq']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================
// Catalog/Product Requests
// ============================================

// Catalog Products Query
export const CatalogProductsQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  categoryId: z.string().uuid().optional(),
  categorySlug: z.string().optional(),
  search: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().positive().optional(),
  moqMax: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

// Create Supplier Product Request
export const CreateSupplierProductRequestSchema = z.object({
  supplierId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  moq: z.number().int().positive().default(1),
  price: z.number().positive('Price must be positive'),
  bulkPricing: z.array(z.object({
    qty: z.number().positive(),
    price: z.number().positive(),
  })).optional(),
  images: z.array(z.string().url()).optional(),
  deliveryDays: z.number().int().min(0).optional(),
});

// Update Supplier Product Request
export const UpdateSupplierProductRequestSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().min(1).optional(),
  moq: z.number().int().positive().optional(),
  price: z.number().positive().optional(),
  bulkPricing: z.array(z.object({
    qty: z.number().positive(),
    price: z.number().positive(),
  })).optional(),
  images: z.array(z.string().url()).optional(),
  isActive: z.boolean().optional(),
  deliveryDays: z.number().int().min(0).optional(),
});

// ============================================
// Merchant Requests
// ============================================

// Create Merchant Request
export const CreateMerchantRequestSchema = z.object({
  rezMerchantId: z.string().min(1),
  businessName: z.string().min(1, 'Business name is required'),
  category: z.enum(['restaurant', 'hotel', 'salon', 'retail', 'pharmacy']),
  city: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  source: z.enum(['rez-merchant', 'restopapa', 'hotel-pms']),
  sourceMerchantId: z.string().min(1),
  creditLineId: z.string().uuid().optional(),
});

// Update Merchant Request
export const UpdateMerchantRequestSchema = z.object({
  businessName: z.string().min(1).optional(),
  category: z.enum(['restaurant', 'hotel', 'salon', 'retail', 'pharmacy']).optional(),
  city: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  creditLineId: z.string().uuid().optional(),
});

// ============================================
// Supplier Requests
// ============================================

// Create Supplier Request
export const CreateSupplierRequestSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional().or(z.literal('')),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  categories: z.array(z.string()).optional().default([]),
});

// Update Supplier Request
export const UpdateSupplierRequestSchema = z.object({
  businessName: z.string().min(1).optional(),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional().or(z.literal('')),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  categories: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// User Requests
// ============================================

// Create User Request
export const CreateUserRequestSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().optional(),
  role: z.enum(['merchant', 'supplier', 'admin']),
  linkedEntityId: z.string().optional(),
});

// Update User Request
export const UpdateUserRequestSchema = z.object({
  name: z.string().optional(),
  linkedEntityId: z.string().optional(),
});

// ============================================
// Service Quote Requests
// ============================================

// Create Service Quote Request
export const CreateServiceQuoteRequestSchema = z.object({
  serviceRfqId: z.string().uuid(),
  vendorId: z.string().uuid(),
  merchantId: z.string().uuid(),
  proposedStartDate: z.string().datetime().optional(),
  proposedEndDate: z.string().datetime().optional(),
  estimatedDurationDays: z.number().int().positive().optional(),
  estimatedHours: z.number().positive().optional(),
  laborCost: z.number().min(0).optional(),
  materialCost: z.number().min(0).optional(),
  equipmentCost: z.number().min(0).optional(),
  totalPrice: z.number().positive('Total price is required'),
  currency: z.string().default('INR'),
  paymentTerms: z.string().optional(),
  validUntil: z.string().datetime().optional(),
  warrantyInfo: z.string().optional(),
  notes: z.string().optional(),
  materials: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().positive('Quantity must be positive'),
    unit: z.string().min(1, 'Unit is required'),
    unitPrice: z.number().min(0),
    isOptional: z.boolean().default(false),
    brand: z.string().optional(),
    supplier: z.string().optional(),
    deliveryDate: z.string().datetime().optional(),
  })).optional(),
});

// Update Service Quote Request
export const UpdateServiceQuoteRequestSchema = z.object({
  proposedStartDate: z.string().datetime().optional(),
  proposedEndDate: z.string().datetime().optional(),
  estimatedDurationDays: z.number().int().positive().optional(),
  estimatedHours: z.number().positive().optional(),
  laborCost: z.number().min(0).optional(),
  materialCost: z.number().min(0).optional(),
  equipmentCost: z.number().min(0).optional(),
  totalPrice: z.number().positive().optional(),
  currency: z.string().optional(),
  paymentTerms: z.string().optional(),
  validUntil: z.string().datetime().optional(),
  warrantyInfo: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'under_review', 'accepted', 'rejected', 'expired', 'withdrawn']).optional(),
  materials: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().positive('Quantity must be positive'),
    unit: z.string().min(1, 'Unit is required'),
    unitPrice: z.number().min(0),
    isOptional: z.boolean().default(false),
    brand: z.string().optional(),
    supplier: z.string().optional(),
    deliveryDate: z.string().datetime().optional(),
  })).optional(),
});

// Accept Quote Request
export const AcceptQuoteRequestSchema = z.object({
  acceptedBy: z.string().uuid('User ID is required'),
  notes: z.string().optional(),
});

// Reject Quote Request
export const RejectQuoteRequestSchema = z.object({
  rejectedBy: z.string().uuid('User ID is required'),
  reason: z.string().optional(),
});

// Submit Quote Request
export const SubmitQuoteRequestSchema = z.object({
  vendorId: z.string().uuid('Vendor ID is required'),
});

// List Service Quotes Query
export const ListServiceQuotesQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  merchantId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  serviceRfqId: z.string().uuid().optional(),
  status: z.enum(['draft', 'submitted', 'under_review', 'accepted', 'rejected', 'expired', 'withdrawn']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'totalPrice', 'estimatedDurationDays', 'submittedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Quote Comparison Query
export const QuoteComparisonQuerySchema = z.object({
  serviceRfqId: z.string().uuid('Service RFQ ID is required'),
});

// ============================================
// Service Order Requests
// ============================================

// Create Service Order Request
export const CreateServiceOrderRequestSchema = z.object({
  merchantId: z.string().uuid({ message: 'Valid merchant ID is required' }),
  serviceProviderId: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  schedule: z.object({
    scheduledDate: z.string().datetime({ message: 'Invalid date format' }),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format'),
    recurring: z.object({
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      interval: z.number().int().positive(),
      endDate: z.string().datetime().optional(),
      daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
      dayOfMonth: z.number().int().min(1).max(31).optional(),
    }).optional(),
  }).optional(),
  items: z.array(z.object({
    serviceName: z.string().min(1, 'Service name is required'),
    description: z.string().optional(),
    quantity: z.number().positive('Quantity must be positive'),
    unit: z.string().min(1, 'Unit is required'),
    unitPrice: z.number().min(0),
  })).min(1, 'At least one service item is required'),
  paymentMethod: z.enum(['cash', 'card', 'upi', 'bank_transfer', 'credit']).optional(),
  notes: z.array(z.object({
    content: z.string().min(1, 'Note content is required'),
    isInternal: z.boolean().default(false),
  })).optional(),
});

// Update Service Order Request
export const UpdateServiceOrderRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  schedule: z.object({
    scheduledDate: z.string().datetime({ message: 'Invalid date format' }),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format'),
    recurring: z.object({
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      interval: z.number().int().positive(),
      endDate: z.string().datetime().optional(),
      daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
      dayOfMonth: z.number().int().min(1).max(31).optional(),
    }).optional(),
  }).optional(),
  items: z.array(z.object({
    serviceName: z.string().min(1, 'Service name is required'),
    description: z.string().optional(),
    quantity: z.number().positive('Quantity must be positive'),
    unit: z.string().min(1, 'Unit is required'),
    unitPrice: z.number().min(0),
  })).min(1).optional(),
  serviceProviderId: z.string().uuid().optional(),
  paymentMethod: z.enum(['cash', 'card', 'upi', 'bank_transfer', 'credit']).optional(),
});

// Update Service Order Status Request
export const UpdateServiceOrderStatusRequestSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']),
  notes: z.string().max(500).optional(),
});

// Add Note to Service Order Request
export const AddServiceOrderNoteRequestSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
  isInternal: z.boolean().default(false),
});

// List Service Orders Query
export const ListServiceOrdersQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  merchantId: z.string().uuid().optional(),
  serviceProviderId: z.string().uuid().optional(),
  status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  paymentStatus: z.enum(['pending', 'partial', 'paid']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'scheduledDate', 'priority', 'total', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
