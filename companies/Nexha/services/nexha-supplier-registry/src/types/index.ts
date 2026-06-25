/**
 * Nexha Supplier Registry — Type Definitions
 * Tier-5: Full trade lifecycle — onboarding → verification → contract → order → payment
 */

// ── Enums ────────────────────────────────────────────────────────────────────

export type RegistryStatus = 'applicant' | 'pending_kyb' | 'pending_contract' | 'approved' | 'suspended';
export type SupplierTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
export type KYBStatus = 'not_started' | 'in_progress' | 'pending_review' | 'verified' | 'rejected';
export type ContractStatus = 'draft' | 'pending_signature' | 'active' | 'expired' | 'terminated';
export type OrderStatus =
  | 'rfq'           // Request for Quote sent
  | 'quote_received' // Supplier quoted
  | 'quote_accepted' // Buyer accepted quote
  | 'negotiating'    // Active negotiation
  | 'awarded'        // PO issued
  | 'confirmed'      // Supplier confirmed
  | 'processing'     // Being fulfilled
  | 'shipped'        // Dispatched
  | 'delivered'     // Received by buyer
  | 'completed'     // Closed
  | 'disputed'      // Issue raised
  | 'cancelled';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type DisputeStatus = 'open' | 'under_review' | 'resolved_buyer' | 'resolved_supplier' | 'escalated';
export type VerificationLevel = 'basic' | 'standard' | 'enhanced' | 'certified';

// ── Supplier Registry ──────────────────────────────────────────────────────────

export interface SupplierKYC {
  gstin?: string;
  pan?: string;
  businessType?: 'proprietorship' | 'partnership' | 'llp' | 'private_ltd' | 'public_ltd';
  registrationNumber?: string;
  yearEstablished?: number;
  employeeCount?: number;
  annualTurnover?: number;
  address?: string;
  bankAccount?: string;
  bankIfsc?: string;
  documents: KYBDocument[];
  verificationLevel: VerificationLevel;
  kybStatus: KYBStatus;
  kybStartedAt?: string;
  kybCompletedAt?: string;
  rejectionReason?: string;
}

export interface KYBDocument {
  type: 'gstin_certificate' | 'pan_card' | 'address_proof' | 'bank_statement' | 'registration' | 'trade_license' | 'iso_cert' | 'other';
  label: string;
  url?: string;
  uploadedAt?: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface SupplierContract {
  id: string;
  supplierId: string;
  version: number;
  status: ContractStatus;
  template: string;
  terms: {
    paymentTermsDays: number;
    minOrderValue: number;
    maxOrderValue?: number;
    deliveryDaysMin: number;
    deliveryDaysMax: number;
    qualityGuarantee: string;
    returnPolicy: string;
    exclusivity?: boolean;
    bulkDiscountPct?: number;
  };
  signedAt?: string;
  expiresAt?: string;
  signedBy?: string;
  signedName?: string;
  signedTitle?: string;
  documentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierTierConfig {
  tier: SupplierTier;
  verificationLevel: VerificationLevel;
  maxOrderValue: number;
  commissionPct: number;
  paymentTermsDays: number;
  features: string[];
}

export interface SupplierRegistry {
  id: string;
  corpId: string;                        // from CorpID
  name: string;
  description?: string;
  email: string;
  phone?: string;
  status: RegistryStatus;
  tier: SupplierTier;
  kyc: SupplierKYC;
  contract?: SupplierContract;
  nexhaId?: string;                     // linked Nexha (federation member)
  onboardingChecklist: OnboardingItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingItem {
  id: string;
  category: 'account' | 'kyc' | 'contract' | 'banking' | 'training';
  label: string;
  required: boolean;
  completed: boolean;
  completedAt?: string;
  proofUrl?: string;
}

// ── Trade Flow ────────────────────────────────────────────────────────────────

export interface RFQ {
  id: string;
  buyerNexhaId: string;
  supplierIds: string[];
  category: string;
  items: RFQItem[];
  deliveryLocation: string;
  deliveryBy: string;       // ISO date
  notes?: string;
  status: OrderStatus;
  createdAt: string;
}

export interface RFQItem {
  description: string;
  quantity: number;
  unit: string;
  specifications?: string;
}

export interface Quote {
  id: string;
  rfqId: string;
  supplierId: string;
  supplierName: string;
  lineItems: QuoteLineItem[];
  subtotal: number;
  taxes: number;
  total: number;
  currency: string;
  validUntil: string;
  deliveryDays: number;
  notes?: string;
  status: 'submitted' | 'accepted' | 'rejected' | 'countered' | 'withdrawn';
  submittedAt: string;
}

export interface QuoteLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  rfqId: string;
  quoteId: string;
  buyerNexhaId: string;
  supplierId: string;
  lineItems: POLineItem[];
  subtotal: number;
  taxes: number;
  total: number;
  currency: string;
  paymentTermsDays: number;
  expectedDelivery: string;
  actualDelivery?: string;
  status: OrderStatus;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface POLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  deliveredQty?: number;
}

export interface Shipment {
  id: string;
  poId: string;
  supplierId: string;
  carrier?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  status: 'preparing' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed';
  events: ShipmentEvent[];
}

export interface ShipmentEvent {
  timestamp: string;
  status: string;
  location?: string;
  description?: string;
}

export interface Payment {
  id: string;
  poId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method?: string;
  transactionRef?: string;
  initiatedAt?: string;
  completedAt?: string;
  failedReason?: string;
  retryCount: number;
}

export interface Dispute {
  id: string;
  poId: string;
  raisedBy: string;          // nexhaId
  reason: string;
  description: string;
  evidence?: string[];
  status: DisputeStatus;
  resolution?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
}

// ── Search & Matching ─────────────────────────────────────────────────────────

export interface RegistrySearchQuery {
  status?: RegistryStatus | RegistryStatus[];
  tier?: SupplierTier | SupplierTier[];
  category?: string;
  verified?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// ── Response Types ────────────────────────────────────────────────────────────

export interface TradeFlowState {
  rfq: RFQ | null;
  quotes: Quote[];
  selectedQuote: Quote | null;
  purchaseOrder: PurchaseOrder | null;
  shipment: Shipment | null;
  payment: Payment | null;
}

export interface RegistryStats {
  total: number;
  byStatus: Record<RegistryStatus, number>;
  byTier: Record<SupplierTier, number>;
  verified: number;
  pendingKYB: number;
  activeContracts: number;
  totalTradeValue: number;
}
