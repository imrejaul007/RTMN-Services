export type RefundStatus =
  | 'pending'
  | 'auto_approved'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type RefundChannel =
  | 'order'
  | 'payment'
  | 'subscription'
  | 'wallet'
  | 'loyalty';

export type RefundReason =
  | 'customer_request'
  | 'duplicate_charge'
  | 'product_not_received'
  | 'product_damaged'
  | 'service_not_satisfied'
  | 'wrong_item'
  | 'billing_error'
  | 'fraud'
  | 'other';

export type RefundPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface RefundItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
  reason?: RefundReason;
}

export interface RefundEvidence {
  type: 'image' | 'document' | 'description';
  url?: string;
  description?: string;
  uploadedAt?: Date;
}

export interface TrustScoreContext {
  customerId: string;
  trustScore: number;
  totalOrders: number;
  previousRefunds: number;
  accountAge: number;
}

export interface ComplianceInfo {
  region: string;
  regulationType: string;
  requiredRetention: number;
  auditTrail: boolean;
}

export interface RefundRequest {
  id: string;
  requestId: string; // REQ-{timestamp}-{random}

  // Customer info
  customerId: string;
  customerEmail?: string;

  // Channel info
  channel: RefundChannel;
  channelRefId: string; // Original transaction/order ID

  // Amount info
  originalAmount: number;
  refundAmount: number;
  currency: string;
  processingFee?: number;
  netRefundAmount?: number;

  // Status
  status: RefundStatus;
  priority: RefundPriority;

  // Reason
  reason: RefundReason;
  reasonDescription?: string;
  items?: RefundItem[];

  // Evidence
  evidence?: RefundEvidence[];

  // Trust score context
  trustScoreContext?: TrustScoreContext;

  // Decision info
  autoApproved: boolean;
  approvedBy?: string; // 'system' or agent ID
  approvalReason?: string;
  decisionEngineRef?: string;

  // Compliance
  complianceInfo?: ComplianceInfo;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  completedAt?: Date;

  // Audit
  auditTrail: Array<{
    action: string;
    actor: string;
    timestamp: Date;
    details?: Record<string, unknown>;
  }>;

  // Metadata
  metadata?: Record<string, unknown>;
}

// In-memory storage for demo (replace with database in production)
export class RefundStore {
  private refunds: Map<string, RefundRequest> = new Map();
  private requestIdIndex: Map<string, string> = new Map(); // requestId -> id

  create(refund: RefundRequest): RefundRequest {
    this.refunds.set(refund.id, refund);
    this.requestIdIndex.set(refund.requestId, refund.id);
    return refund;
  }

  findById(id: string): RefundRequest | undefined {
    return this.refunds.get(id);
  }

  findByRequestId(requestId: string): RefundRequest | undefined {
    const id = this.requestIdIndex.get(requestId);
    return id ? this.refunds.get(id) : undefined;
  }

  findAll(filters?: Partial<RefundRequest>): RefundRequest[] {
    let results = Array.from(this.refunds.values());

    if (filters) {
      if (filters.status) {
        results = results.filter(r => r.status === filters.status);
      }
      if (filters.channel) {
        results = results.filter(r => r.channel === filters.channel);
      }
      if (filters.customerId) {
        results = results.filter(r => r.customerId === filters.customerId);
      }
      if (filters.priority) {
        results = results.filter(r => r.priority === filters.priority);
      }
    }

    return results.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  update(id: string, updates: Partial<RefundRequest>): RefundRequest | undefined {
    const existing = this.refunds.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.refunds.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    const refund = this.refunds.get(id);
    if (refund) {
      this.requestIdIndex.delete(refund.requestId);
    }
    return this.refunds.delete(id);
  }

  count(filters?: Partial<RefundRequest>): number {
    return this.findAll(filters).length;
  }

  getStats(): {
    total: number;
    byStatus: Record<RefundStatus, number>;
    byChannel: Record<RefundChannel, number>;
    totalAmount: number;
  } {
    const refunds = Array.from(this.refunds.values());

    const byStatus: Record<RefundStatus, number> = {
      pending: 0,
      auto_approved: 0,
      approved: 0,
      rejected: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    };

    const byChannel: Record<RefundChannel, number> = {
      order: 0,
      payment: 0,
      subscription: 0,
      wallet: 0,
      loyalty: 0
    };

    let totalAmount = 0;

    refunds.forEach(r => {
      byStatus[r.status]++;
      byChannel[r.channel]++;
      if (r.status === 'completed') {
        totalAmount += r.refundAmount;
      }
    });

    return {
      total: refunds.length,
      byStatus,
      byChannel,
      totalAmount
    };
  }
}

export const refundStore = new RefundStore();
