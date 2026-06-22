/**
 * SUTAR Economy OS - Billing Service
 * Layer 10: Invoice generation and payment tracking
 */

import { v4 as uuidv4 } from 'uuid';
import type { IBilling, IBillingLineItem, BillingStatus, BillingCycle } from '../types/index.js';

// ============================================
// In-Memory Storage
// ============================================

interface BillingStore {
  [billingId: string]: IBilling;
}

const billingStore: BillingStore = {};

// Invoice number counter
let invoiceCounter = 1000;

// ============================================
// Billing Service Class
// ============================================

export class BillingService {
  /**
   * Generate invoice number
   */
  private generateInvoiceNumber(): string {
    invoiceCounter++;
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `INV-${year}${month}-${invoiceCounter.toString().padStart(6, '0')}`;
  }

  /**
   * Create a new invoice
   */
  async createInvoice(request: {
    entityId: string;
    entityType: 'user' | 'business' | 'agent';
    cycle?: BillingCycle;
    currency?: string;
    lineItems: IBillingLineItem[];
    dueDate?: Date;
    metadata?: Record<string, unknown>;
  }): Promise<IBilling> {
    const {
      entityId,
      entityType,
      cycle = 'one_time',
      currency = 'USD',
      lineItems,
      dueDate,
      metadata
    } = request;

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const taxRate = 0; // Tax rate can be configured
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = subtotal + tax;

    const billing: IBilling = {
      billingId: uuidv4(),
      entityId,
      entityType,
      invoiceNumber: this.generateInvoiceNumber(),
      status: 'draft',
      cycle,
      currency,
      subtotal,
      tax,
      total,
      paidAmount: 0,
      dueDate,
      lineItems,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    billingStore[billing.billingId] = billing;
    return billing;
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(billingId: string): Promise<IBilling | null> {
    return billingStore[billingId] || null;
  }

  /**
   * Get invoice by invoice number
   */
  async getInvoiceByNumber(invoiceNumber: string): Promise<IBilling | null> {
    return Object.values(billingStore).find(b => b.invoiceNumber === invoiceNumber) || null;
  }

  /**
   * Get invoices for an entity
   */
  async getInvoices(
    entityId: string,
    options: {
      page?: number;
      limit?: number;
      status?: BillingStatus;
      cycle?: BillingCycle;
      currency?: string;
      startDate?: Date;
      endDate?: Date;
      sortBy?: 'createdAt' | 'dueDate' | 'total';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    invoices: IBilling[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    summary: {
      totalOutstanding: number;
      totalPaid: number;
      totalOverdue: number;
      currency: string;
    };
  }> {
    const {
      page = 1,
      limit = 20,
      status,
      cycle,
      currency,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    let invoices = Object.values(billingStore)
      .filter(b => b.entityId === entityId)
      .filter(b => !status || b.status === status)
      .filter(b => !cycle || b.cycle === cycle)
      .filter(b => !currency || b.currency === currency)
      .filter(b => !startDate || b.createdAt >= startDate)
      .filter(b => !endDate || b.createdAt <= endDate);

    // Sort invoices
    invoices.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'dueDate':
          const aDate = a.dueDate?.getTime() || 0;
          const bDate = b.dueDate?.getTime() || 0;
          comparison = aDate - bDate;
          break;
        case 'total':
          comparison = a.total - b.total;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const total = invoices.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    invoices = invoices.slice(startIndex, startIndex + limit);

    // Calculate summary
    const allInvoices = Object.values(billingStore).filter(b => b.entityId === entityId);
    const totalOutstanding = allInvoices
      .filter(b => b.status !== 'paid' && b.status !== 'cancelled')
      .reduce((sum, b) => sum + (b.total - b.paidAmount), 0);
    const totalPaid = allInvoices
      .filter(b => b.status === 'paid')
      .reduce((sum, b) => sum + b.paidAmount, 0);
    const totalOverdue = allInvoices
      .filter(b => b.status === 'overdue')
      .reduce((sum, b) => sum + (b.total - b.paidAmount), 0);

    return {
      invoices,
      total,
      page,
      limit,
      totalPages,
      summary: {
        totalOutstanding,
        totalPaid,
        totalOverdue,
        currency: currency || 'USD'
      }
    };
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(billingId: string, status: BillingStatus): Promise<IBilling | null> {
    const billing = billingStore[billingId];
    if (!billing) {
      return null;
    }

    billing.status = status;
    billing.updatedAt = new Date();

    if (status === 'paid') {
      billing.paidAt = new Date();
    }

    billingStore[billingId] = billing;
    return billing;
  }

  /**
   * Add payment to invoice
   */
  async addPayment(
    billingId: string,
    amount: number,
    paymentMethod?: string,
    transactionId?: string
  ): Promise<IBilling | null> {
    const billing = billingStore[billingId];
    if (!billing) {
      return null;
    }

    if (billing.status === 'cancelled' || billing.status === 'refunded') {
      throw new Error('Cannot add payment to cancelled or refunded invoice');
    }

    billing.paidAmount += amount;
    billing.updatedAt = new Date();

    // Check if fully paid
    if (billing.paidAmount >= billing.total) {
      billing.status = 'paid';
      billing.paidAt = new Date();
    } else if (billing.paidAmount > 0) {
      billing.status = 'pending';
    }

    billing.metadata = {
      ...billing.metadata,
      lastPayment: {
        amount,
        paymentMethod,
        transactionId,
        paidAt: new Date().toISOString()
      }
    };

    billingStore[billingId] = billing;
    return billing;
  }

  /**
   * Add line item to invoice
   */
  async addLineItem(
    billingId: string,
    lineItem: IBillingLineItem
  ): Promise<IBilling | null> {
    const billing = billingStore[billingId];
    if (!billing) {
      return null;
    }

    if (billing.status !== 'draft') {
      throw new Error('Can only add line items to draft invoices');
    }

    billing.lineItems.push(lineItem);
    billing.subtotal += lineItem.total;
    billing.total = billing.subtotal + billing.tax;
    billing.updatedAt = new Date();

    billingStore[billingId] = billing;
    return billing;
  }

  /**
   * Remove line item from invoice
   */
  async removeLineItem(billingId: string, index: number): Promise<IBilling | null> {
    const billing = billingStore[billingId];
    if (!billing) {
      return null;
    }

    if (billing.status !== 'draft') {
      throw new Error('Can only remove line items from draft invoices');
    }

    if (index < 0 || index >= billing.lineItems.length) {
      throw new Error('Invalid line item index');
    }

    const removedItem = billing.lineItems.splice(index, 1)[0];
    billing.subtotal -= removedItem.total;
    billing.total = billing.subtotal + billing.tax;
    billing.updatedAt = new Date();

    billingStore[billingId] = billing;
    return billing;
  }

  /**
   * Send invoice (mark as pending)
   */
  async sendInvoice(billingId: string): Promise<IBilling | null> {
    const billing = billingStore[billingId];
    if (!billing) {
      return null;
    }

    if (billing.status !== 'draft') {
      throw new Error('Can only send draft invoices');
    }

    billing.status = 'pending';
    billing.updatedAt = new Date();

    billingStore[billingId] = billing;
    return billing;
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(billingId: string, reason?: string): Promise<IBilling | null> {
    const billing = billingStore[billingId];
    if (!billing) {
      return null;
    }

    if (billing.status === 'paid') {
      throw new Error('Cannot cancel paid invoice. Use refund instead.');
    }

    billing.status = 'cancelled';
    billing.metadata = {
      ...billing.metadata,
      cancelledAt: new Date().toISOString(),
      cancelReason: reason
    };
    billing.updatedAt = new Date();

    billingStore[billingId] = billing;
    return billing;
  }

  /**
   * Refund invoice
   */
  async refundInvoice(billingId: string, amount?: number, reason?: string): Promise<IBilling | null> {
    const billing = billingStore[billingId];
    if (!billing) {
      return null;
    }

    if (billing.status !== 'paid') {
      throw new Error('Can only refund paid invoices');
    }

    const refundAmount = amount || billing.paidAmount;
    billing.status = 'refunded';
    billing.metadata = {
      ...billing.metadata,
      refundedAt: new Date().toISOString(),
      refundAmount,
      refundReason: reason
    };
    billing.updatedAt = new Date();

    billingStore[billingId] = billing;
    return billing;
  }

  /**
   * Mark overdue invoices
   */
  async markOverdueInvoices(): Promise<number> {
    const now = new Date();
    let markedCount = 0;

    for (const billing of Object.values(billingStore)) {
      if (
        billing.status === 'pending' &&
        billing.dueDate &&
        billing.dueDate < now
      ) {
        billing.status = 'overdue';
        billing.updatedAt = new Date();
        billingStore[billing.billingId] = billing;
        markedCount++;
      }
    }

    return markedCount;
  }

  /**
   * Get overdue invoices for an entity
   */
  async getOverdueInvoices(entityId: string): Promise<IBilling[]> {
    return Object.values(billingStore)
      .filter(b => b.entityId === entityId && b.status === 'overdue')
      .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0));
  }

  /**
   * Generate invoice from template
   */
  async generateFromTemplate(request: {
    entityId: string;
    entityType: 'user' | 'business' | 'agent';
    templateId: string;
    customLineItems?: IBillingLineItem[];
    dueDate?: Date;
    metadata?: Record<string, unknown>;
  }): Promise<IBilling> {
    // Templates would be stored in a separate collection
    // For now, create a basic invoice
    const lineItems = request.customLineItems || [
      {
        description: 'Service Fee',
        quantity: 1,
        unitPrice: 0,
        total: 0
      }
    ];

    return this.createInvoice({
      entityId: request.entityId,
      entityType: request.entityType,
      cycle: 'one_time',
      lineItems,
      dueDate: request.dueDate,
      metadata: {
        ...request.metadata,
        templateId: request.templateId
      }
    });
  }

  /**
   * Duplicate invoice
   */
  async duplicateInvoice(billingId: string, options?: {
    newDueDate?: Date;
    adjustAmounts?: number;
  }): Promise<IBilling | null> {
    const original = billingStore[billingId];
    if (!original) {
      return null;
    }

    const lineItems = original.lineItems.map(item => ({
      ...item,
      total: options?.adjustAmounts
        ? Math.round(item.total * (1 + options.adjustAmounts / 100) * 100) / 100
        : item.total
    }));

    return this.createInvoice({
      entityId: original.entityId,
      entityType: original.entityType,
      cycle: original.cycle,
      currency: original.currency,
      lineItems,
      dueDate: options?.newDueDate,
      metadata: {
        duplicatedFrom: billingId,
        originalInvoiceNumber: original.invoiceNumber
      }
    });
  }

  /**
   * Get billing statistics
   */
  async getBillingStatistics(
    entityId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    totalInvoices: number;
    totalBilled: number;
    totalPaid: number;
    totalOutstanding: number;
    totalOverdue: number;
    averageInvoiceValue: number;
    byStatus: Record<BillingStatus, { count: number; amount: number }>;
    byCycle: Record<BillingCycle, { count: number; amount: number }>;
  }> {
    const invoices = Object.values(billingStore)
      .filter(b => b.entityId === entityId)
      .filter(b => b.createdAt >= periodStart && b.createdAt <= periodEnd);

    const stats = {
      totalInvoices: invoices.length,
      totalBilled: invoices.reduce((sum, b) => sum + b.total, 0),
      totalPaid: invoices.reduce((sum, b) => sum + b.paidAmount, 0),
      totalOutstanding: invoices
        .filter(b => b.status !== 'paid' && b.status !== 'cancelled')
        .reduce((sum, b) => sum + (b.total - b.paidAmount), 0),
      totalOverdue: invoices
        .filter(b => b.status === 'overdue')
        .reduce((sum, b) => sum + (b.total - b.paidAmount), 0),
      averageInvoiceValue: 0,
      byStatus: {} as Record<BillingStatus, { count: number; amount: number }>,
      byCycle: {} as Record<BillingCycle, { count: number; amount: number }>
    };

    if (stats.totalInvoices > 0) {
      stats.averageInvoiceValue = stats.totalBilled / stats.totalInvoices;
    }

    // By status
    const statuses: BillingStatus[] = ['draft', 'pending', 'paid', 'overdue', 'cancelled', 'refunded'];
    for (const status of statuses) {
      const statusInvoices = invoices.filter(b => b.status === status);
      stats.byStatus[status] = {
        count: statusInvoices.length,
        amount: statusInvoices.reduce((sum, b) => sum + b.total, 0)
      };
    }

    // By cycle
    const cycles: BillingCycle[] = ['one_time', 'weekly', 'monthly', 'quarterly', 'annually'];
    for (const cycle of cycles) {
      const cycleInvoices = invoices.filter(b => b.cycle === cycle);
      stats.byCycle[cycle] = {
        count: cycleInvoices.length,
        amount: cycleInvoices.reduce((sum, b) => sum + b.total, 0)
      };
    }

    return stats;
  }

  /**
   * Export invoice as PDF-compatible data
   */
  async exportInvoiceData(billingId: string): Promise<Record<string, unknown> | null> {
    const billing = billingStore[billingId];
    if (!billing) {
      return null;
    }

    return {
      invoiceNumber: billing.invoiceNumber,
      status: billing.status,
      entityId: billing.entityId,
      entityType: billing.entityType,
      cycle: billing.cycle,
      currency: billing.currency,
      lineItems: billing.lineItems,
      subtotal: billing.subtotal,
      tax: billing.tax,
      total: billing.total,
      paidAmount: billing.paidAmount,
      dueDate: billing.dueDate?.toISOString(),
      paidAt: billing.paidAt?.toISOString(),
      createdAt: billing.createdAt.toISOString(),
      updatedAt: billing.updatedAt.toISOString()
    };
  }

  /**
   * Get all invoices (admin)
   */
  async getAllInvoices(
    options: {
      page?: number;
      limit?: number;
      status?: BillingStatus;
      entityType?: 'user' | 'business' | 'agent';
      currency?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    invoices: IBilling[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, status, entityType, currency, startDate, endDate } = options;

    let invoices = Object.values(billingStore)
      .filter(b => !status || b.status === status)
      .filter(b => !entityType || b.entityType === entityType)
      .filter(b => !currency || b.currency === currency)
      .filter(b => !startDate || b.createdAt >= startDate)
      .filter(b => !endDate || b.createdAt <= endDate)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = invoices.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    invoices = invoices.slice(startIndex, startIndex + limit);

    return {
      invoices,
      total,
      page,
      limit,
      totalPages
    };
  }
}

// Export singleton instance
export const billingService = new BillingService();
