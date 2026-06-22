/**
 * SUTAR Negotiation Engine - Type Definitions
 * Layer 7 of SUTAR OS - Automated Bargaining and Negotiation
 */

// ============================================================================
// Core Types
// ============================================================================

export type NegotiationStatus =
  | 'draft'
  | 'rfq_sent'
  | 'quote_received'
  | 'negotiating'
  | 'awaiting_response'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'cancelled';

export type NegotiationType = 'rfq' | 'quote' | 'counter' | 'deal';

export type PartyRole = 'buyer' | 'seller' | 'agent' | 'mediator';

export type AXPResponse = 'accept' | 'counter' | 'reject' | 'expire';

export type OfferStatus = 'pending' | 'accepted' | 'countered' | 'rejected' | 'expired';

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';

// ============================================================================
// Party Types
// ============================================================================

export interface Party {
  id: string;
  name: string;
  email: string;
  role: PartyRole;
  organization?: string;
  trustScore?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateParty {
  name: string;
  email: string;
  role: PartyRole;
  organization?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Product Types
// ============================================================================

export interface Product {
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  specifications?: Record<string, unknown>;
  category?: string;
  sku?: string;
}

// ============================================================================
// Offer Types
// ============================================================================

export interface Offer {
  id: string;
  negotiationId: string;
  partyId: string;
  partyName: string;
  amount: number;
  currency: Currency;
  terms: Term[];
  validUntil: Date;
  status: OfferStatus;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Term {
  id: string;
  type: 'price' | 'delivery' | 'payment' | 'warranty' | 'quantity' | 'quality' | 'custom';
  label: string;
  value: string | number | boolean;
  isFlexible: boolean;
  priority: 'required' | 'preferred' | 'optional';
}

export interface CreateOffer {
  amount: number;
  currency: Currency;
  terms: Omit<Term, 'id'>[];
  validUntil: Date;
  message?: string;
}

// ============================================================================
// RFQ Types
// ============================================================================

export interface RFQ {
  id: string;
  rfqNumber: string;
  negotiationId: string;
  buyerId: string;
  buyerName: string;
  sellerId?: string;
  sellerName?: string;
  product: Product;
  targetPrice?: number;
  targetDeliveryDate?: Date;
  currency: Currency;
  status: 'draft' | 'sent' | 'quoted' | 'expired' | 'cancelled';
  deadline: Date;
  requirements: string[];
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRFQ {
  buyerId: string;
  buyerName: string;
  sellerId?: string;
  sellerName?: string;
  product: Product;
  targetPrice?: number;
  targetDeliveryDate?: Date;
  currency?: Currency;
  deadline: Date;
  requirements?: string[];
  attachments?: string[];
}

// ============================================================================
// Quote Types
// ============================================================================

export interface Quote {
  id: string;
  quoteNumber: string;
  rfqId: string;
  negotiationId: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  product: Product;
  unitPrice: number;
  totalPrice: number;
  currency: Currency;
  quantity: number;
  terms: Term[];
  validUntil: Date;
  deliveryDate?: Date;
  paymentTerms?: string;
  warrantyTerms?: string;
  notes?: string;
  status: 'draft' | 'sent' | 'quoted' | 'countered' | 'accepted' | 'rejected' | 'expired';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQuote {
  rfqId: string;
  negotiationId: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  product: Product;
  unitPrice: number;
  currency?: Currency;
  terms?: Omit<Term, 'id'>[];
  validUntil: Date;
  deliveryDate?: Date;
  paymentTerms?: string;
  warrantyTerms?: string;
  notes?: string;
}

// ============================================================================
// Negotiation Types
// ============================================================================

export interface Negotiation {
  id: string;
  negotiationId: string;
  title: string;
  description?: string;
  type: NegotiationType;
  status: NegotiationStatus;
  buyer: Party;
  seller?: Party;
  product: Product;
  targetPrice?: number;
  currentPrice?: number;
  currency: Currency;
  initialOffer?: Offer;
  currentOffer?: Offer;
  offerHistory: Offer[];
  terms: Term[];
  acceptedTerms: string[];
  rfq?: RFQ;
  quote?: Quote;
  counterOffers: CounterOffer[];
  deadline?: Date;
  startedAt: Date;
  completedAt?: Date;
  createdBy: string;
  tenantId: string;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: number;
  };
  auditTrail: AuditEntry[];
}

export interface CounterOffer {
  id: string;
  negotiationId: string;
  partyId: string;
  partyName: string;
  previousOfferId: string;
  amount: number;
  currency: Currency;
  terms: Term[];
  message: string;
  status: 'pending' | 'accepted' | 'countered' | 'rejected';
  createdAt: Date;
  expiresAt: Date;
}

export interface AuditEntry {
  action: string;
  performedBy: string;
  performedAt: Date;
  details: string;
  previousValue?: unknown;
  newValue?: unknown;
}

// ============================================================================
// AXP Protocol Types
// ============================================================================

export interface AXPOffer {
  offerId: string;
  negotiationId: string;
  partyId: string;
  partyName: string;
  offer: Offer;
  suggestedResponse?: AXPResponse;
  reasoning?: string;
  timestamp: Date;
}

export interface AXPMessage {
  id: string;
  type: AXPResponse;
  negotiationId: string;
  partyId: string;
  partyName: string;
  offerId: string;
  responseOffer?: Partial<Offer>;
  message?: string;
  timestamp: Date;
}

export interface AXPSession {
  id: string;
  negotiationId: string;
  parties: Party[];
  currentOffer: Offer;
  history: AXPMessage[];
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  startedAt: Date;
  expiresAt: Date;
}

// ============================================================================
// DTO Types
// ============================================================================

export interface CreateNegotiationDto {
  title: string;
  description?: string;
  type: NegotiationType;
  buyer: CreateParty;
  seller?: CreateParty;
  product: Product;
  targetPrice?: number;
  currency?: Currency;
  terms?: Omit<Term, 'id'>[];
  deadline?: Date;
  createdBy: string;
  tenantId: string;
}

export interface NegotiationQuery {
  tenantId: string;
  status?: NegotiationStatus;
  type?: NegotiationType;
  buyerId?: string;
  sellerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CounterOfferDto {
  negotiationId: string;
  amount: number;
  currency: Currency;
  terms: Omit<Term, 'id'>[];
  message: string;
  validUntil: Date;
}

export interface AXPResponseDto {
  negotiationId: string;
  response: AXPResponse;
  offer?: Partial<Offer>;
  message?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  timestamp: string;
}

// ============================================================================
// Integration Types
// ============================================================================

export interface DecisionEngineRequest {
  negotiationId: string;
  currentOffer: Offer;
  targetPrice?: number;
  alternatives?: Offer[];
  context: {
    buyerProfile?: Record<string, unknown>;
    sellerProfile?: Record<string, unknown>;
    marketData?: Record<string, unknown>;
  };
}

export interface DecisionEngineResponse {
  recommendedAction: 'accept' | 'counter' | 'reject' | 'hold';
  suggestedPrice?: number;
  reasoning: string;
  confidence: number;
  alternativeStrategies?: Array<{
    action: string;
    expectedOutcome: string;
    probability: number;
  }>;
}

export interface SimulationRequest {
  negotiationId: string;
  proposedOffer: Offer;
  iterations?: number;
  parameters?: {
    riskTolerance?: number;
    timeHorizon?: number;
    marketVolatility?: number;
  };
}

export interface SimulationResponse {
  simulationId: string;
  outcomes: Array<{
    scenario: string;
    probability: number;
    expectedValue: number;
    risk: number;
  }>;
  recommendedOffer: Offer;
  confidence: number;
}

export interface TrustScoreRequest {
  partyId: string;
  partyRole: PartyRole;
  transactionValue?: number;
  context: {
    previousTransactions?: number;
    successRate?: number;
    avgResponseTime?: number;
  };
}

export interface TrustScoreResponse {
  partyId: string;
  trustScore: number;
  tier: 'trusted' | 'verified' | 'standard' | 'new';
  factors: Array<{
    factor: string;
    weight: number;
    score: number;
  }>;
  recommendations?: string[];
}

// ============================================================================
// Event Types
// ============================================================================

export interface NegotiationEvent {
  type: string;
  negotiationId: string;
  payload: Record<string, unknown>;
  timestamp: string;
  source: string;
  correlationId?: string;
}

export type NegotiationEventType =
  | 'negotiation.created'
  | 'negotiation.rfq_sent'
  | 'negotiation.quote_received'
  | 'negotiation.counter_offer'
  | 'negotiation.accepted'
  | 'negotiation.rejected'
  | 'negotiation.expired'
  | 'negotiation.cancelled'
  | 'negotiation.completed'
  | 'axp.offer_received'
  | 'axp.response_sent';

// ============================================================================
// Config Types
// ============================================================================

export interface ServiceConfig {
  port: number;
  environment: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  decisionEngineUrl: string;
  simulationOsUrl: string;
  trustEngineUrl: string;
  eventBusUrl?: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}
