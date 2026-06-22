/**
 * HOJAI AI Support Agent - Type Definitions
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: 24x7 customer support with ticket resolution, FAQ, escalation routing, warranty verification, and refund processing
 *
 * Tagline: "AI-powered support that resolves issues instantly, 24 hours a day."
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

/**
 * Ticket priority levels
 */
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Ticket status
 */
export type TicketStatus = 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed' | 'escalated';

/**
 * Ticket category
 */
export type TicketCategory =
  | 'billing'
  | 'technical'
  | 'account'
  | 'product'
  | 'shipping'
  | 'returns'
  | 'refund'
  | 'warranty'
  | 'general';

/**
 * Escalation level
 */
export type EscalationLevel = 'level1' | 'level2' | 'level3' | 'management';

/**
 * Warranty status
 */
export type WarrantyStatus = 'active' | 'expired' | 'limited' | 'void';

/**
 * Refund status
 */
export type RefundStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';

/**
 * Refund type
 */
export type RefundType = 'full' | 'partial' | 'store_credit';

/**
 * Customer tier for support priority
 */
export type CustomerTier = 'standard' | 'premium' | 'enterprise';

/**
 * FAQ category
 */
export type FAQCategory =
  | 'getting-started'
  | 'billing'
  | 'technical'
  | 'account'
  | 'products'
  | 'shipping'
  | 'returns'
  | 'warranty'
  | 'general';

// ============================================================================
// Ticket Types
// ============================================================================

/**
 * Ticket attachment
 */
export interface TicketAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
}

/**
 * Ticket message/comment
 */
export interface TicketMessage {
  id: string;
  ticketId: string;
  authorId: string;
  authorType: 'customer' | 'agent' | 'system';
  content: string;
  attachments?: TicketAttachment[];
  createdAt: string;
  updatedAt?: string;
}

/**
 * Ticket assignment
 */
export interface TicketAssignment {
  agentId?: string;
  agentName?: string;
  team?: string;
  assignedAt?: string;
}

/**
 * Ticket SLA
 */
export interface TicketSLA {
  firstResponseDue: string;
  resolutionDue: string;
  breached: boolean;
  breachedAt?: string;
}

/**
 * Support ticket
 */
export interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerTier: CustomerTier;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: TicketAssignment;
  sla?: TicketSLA;
  tags?: string[];
  messages: TicketMessage[];
  relatedTicketIds?: string[];
  resolution?: {
    summary: string;
    resolvedBy: string;
    resolvedAt: string;
    rating?: number;
    feedback?: string;
  };
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
}

/**
 * Create ticket input
 */
export interface CreateTicketInput {
  customerId: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
  attachments?: TicketAttachment[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// FAQ Types
// ============================================================================

/**
 * FAQ item
 */
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: FAQCategory;
  tags: string[];
  helpful: number;
  notHelpful: number;
  views: number;
  relatedFAQs?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * FAQ search result
 */
export interface FAQSearchResult {
  faq: FAQItem;
  relevanceScore: number;
  matchedTerms: string[];
  snippet: string;
}

/**
 * Create FAQ input
 */
export interface CreateFAQInput {
  question: string;
  answer: string;
  category: FAQCategory;
  tags?: string[];
  relatedFAQs?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Escalation Types
// ============================================================================

/**
 * Escalation reason
 */
export type EscalationReason =
  | 'customer_request'
  | 'priority_upgrade'
  | 'sla_breach'
  | 'complex_issue'
  | 'sentiment_negative'
  | 'repeated_issue'
  | 'refund_exceeds_limit'
  | 'management_review';

/**
 * Escalation target
 */
export interface EscalationTarget {
  level: EscalationLevel;
  team?: string;
  agentId?: string;
  agentName?: string;
  reason: EscalationReason;
  notes?: string;
}

/**
 * Escalation record
 */
export interface Escalation {
  id: string;
  ticketId: string;
  fromLevel?: EscalationLevel;
  toLevel: EscalationLevel;
  targetTeam?: string;
  targetAgentId?: string;
  targetAgentName?: string;
  reason: EscalationReason;
  notes?: string;
  escalatedBy: string;
  escalatedAt: string;
  resolvedAt?: string;
  status: 'pending' | 'accepted' | 'resolved' | 'rejected';
}

/**
 * Escalation input
 */
export interface EscalateInput {
  ticketId: string;
  reason: EscalationReason;
  notes?: string;
  targetLevel?: EscalationLevel;
  targetTeam?: string;
}

// ============================================================================
// Warranty Types
// ============================================================================

/**
 * Warranty coverage
 */
export interface WarrantyCoverage {
  type: 'standard' | 'extended' | 'limited';
  startDate: string;
  endDate: string;
  coveredParts?: string[];
  excludedParts?: string[];
  termsUrl?: string;
}

/**
 * Warranty claim
 */
export interface WarrantyClaim {
  id: string;
  warrantyId: string;
  ticketId?: string;
  claimType: 'repair' | 'replacement' | 'refund';
  description: string;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'completed';
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

/**
 * Warranty record
 */
export interface WarrantyRecord {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  serialNumber?: string;
  purchaseDate: string;
  customerId: string;
  customerEmail: string;
  status: WarrantyStatus;
  coverage: WarrantyCoverage;
  claims?: WarrantyClaim[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Warranty check input
 */
export interface WarrantyCheckInput {
  productId?: string;
  serialNumber?: string;
  orderId?: string;
  customerId?: string;
}

/**
 * Warranty check result
 */
export interface WarrantyCheckResult {
  found: boolean;
  warranty?: WarrantyRecord;
  eligible: boolean;
  reason?: string;
}

// ============================================================================
// Refund Types
// ============================================================================

/**
 * Refund item
 */
export interface RefundItem {
  itemId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
}

/**
 * Refund breakdown
 */
export interface RefundBreakdown {
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  items: RefundItem[];
}

/**
 * Refund record
 */
export interface RefundRecord {
  id: string;
  refundNumber: string;
  ticketId?: string;
  orderId: string;
  customerId: string;
  customerEmail: string;
  type: RefundType;
  reason: string;
  reasonCategory?: string;
  amount: number;
  breakdown: RefundBreakdown;
  status: RefundStatus;
  paymentMethod: string;
  originalPaymentId?: string;
  refundPaymentId?: string;
  processedBy?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  completedAt?: string;
}

/**
 * Refund process input
 */
export interface RefundProcessInput {
  orderId: string;
  customerId: string;
  customerEmail: string;
  type: RefundType;
  reason: string;
  reasonCategory?: string;
  items?: RefundItem[];
  ticketId?: string;
  paymentMethod?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Refund preview
 */
export interface RefundPreview {
  eligible: boolean;
  reason?: string;
  breakdown: RefundBreakdown;
  estimatedProcessingDays: number;
  paymentMethod: string;
}

// ============================================================================
// Customer History Types
// ============================================================================

/**
 * Customer interaction
 */
export interface CustomerInteraction {
  id: string;
  type: 'ticket' | 'faq_view' | 'chat' | 'call' | 'email';
  summary: string;
  referenceId?: string;
  createdAt: string;
}

/**
 * Customer ticket summary
 */
export interface CustomerTicketSummary {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  averageResolutionTime: number;
  satisfactionScore?: number;
}

/**
 * Customer order summary
 */
export interface CustomerOrderSummary {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate?: string;
}

/**
 * Customer preferences
 */
export interface CustomerPreferences {
  language: string;
  timezone: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

/**
 * Customer profile
 */
export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  tier: CustomerTier;
  createdAt: string;
  lastActiveAt: string;
  preferences: CustomerPreferences;
  metadata?: Record<string, unknown>;
}

/**
 * Customer history
 */
export interface CustomerHistory {
  profile: CustomerProfile;
  tickets: CustomerTicketSummary;
  orders: CustomerOrderSummary;
  interactions: CustomerInteraction[];
  relatedTickets?: SupportTicket[];
  notes?: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    timestamp: string;
    requestId: string;
    tenantId?: string;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    timestamp: string;
    requestId: string;
    tenantId?: string;
  };
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

// Ticket Schemas
export const CreateTicketSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email('Invalid email format'),
  subject: z.string().min(1, 'Subject is required').max(500, 'Subject too long'),
  description: z.string().min(1, 'Description is required').max(10000, 'Description too long'),
  category: z.enum(['billing', 'technical', 'account', 'product', 'shipping', 'returns', 'refund', 'warranty', 'general']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    type: z.string(),
    size: z.number(),
    uploadedAt: z.string(),
  })).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const TicketQuerySchema = z.object({
  status: z.enum(['open', 'pending', 'in_progress', 'resolved', 'closed', 'escalated']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  category: z.enum(['billing', 'technical', 'account', 'product', 'shipping', 'returns', 'refund', 'warranty', 'general']).optional(),
  customerId: z.string().optional(),
  assignedTo: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

export const ResolveTicketSchema = z.object({
  resolution: z.object({
    summary: z.string().min(1, 'Resolution summary is required'),
    resolvedBy: z.string().min(1, 'Resolved by is required'),
    rating: z.number().min(1).max(5).optional(),
    feedback: z.string().max(1000).optional(),
  }),
});

export const AddMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(5000),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    type: z.string(),
    size: z.number(),
    uploadedAt: z.string(),
  })).optional(),
});

// Escalation Schemas
export const EscalateSchema = z.object({
  ticketId: z.string().min(1, 'Ticket ID is required'),
  reason: z.enum([
    'customer_request',
    'priority_upgrade',
    'sla_breach',
    'complex_issue',
    'sentiment_negative',
    'repeated_issue',
    'refund_exceeds_limit',
    'management_review',
  ]),
  notes: z.string().max(1000).optional(),
  targetLevel: z.enum(['level1', 'level2', 'level3', 'management']).optional(),
  targetTeam: z.string().optional(),
});

// Warranty Schemas
export const WarrantyCheckSchema = z.object({
  productId: z.string().optional(),
  serialNumber: z.string().optional(),
  orderId: z.string().optional(),
  customerId: z.string().optional(),
}).refine(data => data.productId || data.serialNumber || data.orderId || data.customerId, {
  message: 'At least one search parameter is required',
});

export const WarrantyClaimSchema = z.object({
  warrantyId: z.string().min(1, 'Warranty ID is required'),
  ticketId: z.string().optional(),
  claimType: z.enum(['repair', 'replacement', 'refund']),
  description: z.string().min(1, 'Claim description is required').max(2000),
});

// Refund Schemas
export const RefundProcessSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
  customerEmail: z.string().email('Invalid email format'),
  type: z.enum(['full', 'partial', 'store_credit']),
  reason: z.string().min(1, 'Refund reason is required').max(500),
  reasonCategory: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string(),
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    refundAmount: z.number().min(0),
  })).optional(),
  ticketId: z.string().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().max(1000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const RefundPreviewSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
  reason: z.string().min(1, 'Reason is required'),
});

// FAQ Schemas
export const CreateFAQSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500),
  answer: z.string().min(1, 'Answer is required').max(5000),
  category: z.enum(['getting-started', 'billing', 'technical', 'account', 'products', 'shipping', 'returns', 'warranty', 'general']),
  tags: z.array(z.string()).optional(),
  relatedFAQs: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const FAQSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(200),
  category: z.enum(['getting-started', 'billing', 'technical', 'account', 'products', 'shipping', 'returns', 'warranty', 'general']).optional(),
  limit: z.coerce.number().min(1).max(20).default(10),
});

// ============================================================================
// Type Inference
// ============================================================================

export type CreateTicketInputType = z.infer<typeof CreateTicketSchema>;
export type TicketQueryInputType = z.infer<typeof TicketQuerySchema>;
export type ResolveTicketInputType = z.infer<typeof ResolveTicketSchema>;
export type AddMessageInputType = z.infer<typeof AddMessageSchema>;
export type EscalateInputType = z.infer<typeof EscalateSchema>;
export type WarrantyCheckInputType = z.infer<typeof WarrantyCheckSchema>;
export type WarrantyClaimInputType = z.infer<typeof WarrantyClaimSchema>;
export type RefundProcessInputType = z.infer<typeof RefundProcessSchema>;
export type RefundPreviewInputType = z.infer<typeof RefundPreviewSchema>;
export type CreateFAQInputType = z.infer<typeof CreateFAQSchema>;
export type FAQSearchInputType = z.infer<typeof FAQSearchSchema>;

// ============================================================================
// Tenant Context
// ============================================================================

export interface TenantContext {
  tenant_id: string;
  namespace: string;
  user_id?: string;
  plan?: 'starter' | 'professional' | 'enterprise';
  roles?: string[];
}

// ============================================================================
// Express Request Extension
// ============================================================================

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
      userId?: string;
    }
  }
}
