/**
 * Invoice Automation Agent
 * Finance - Invoice Processing, Validation, Approval, Payment
 */

import { Agent, AgentContext, AgentResult } from '@hojai/agents';
import { MemoryOS } from '@hojai/memory';
import { TwinOS } from '@hojai/twins';

export interface Invoice {
  id?: string;
  vendor_name: string;
  vendor_email?: string;
  vendor_id?: string;
  invoice_number: string;
  date: string;
  due_date?: string;
  amount: number;
  currency: string;
  line_items?: { description: string; quantity: number; amount: number }[];
  tax?: number;
  attachments?: { name: string; url: string }[];
  status?: 'pending' | 'approved' | 'rejected' | 'paid';
}

export interface InvoiceConfig {
  approvalThresholds: {
    autoApprove: number; // Amount below this auto-approved
    managerApproval: number; // Amount requiring manager
    directorApproval: number; // Amount requiring director
  };
  autoApprovalEnabled: boolean;
  defaultPaymentTerms: number; // Days
  integrations: {
    erp?: string;
    payment?: string;
    email?: string;
  };
}

export class InvoiceAutomationAgent extends Agent {
  private memory: MemoryOS;
  private twins: TwinOS;
  private config: InvoiceConfig;

  constructor(config: Partial<InvoiceConfig> = {}) {
    super({
      id: 'invoice-automation-agent',
      name: 'Invoice Automation Agent',
      role: 'finance',
      description: 'AI-powered invoice processing, validation, approval routing, and payment automation',
      skills: [
        'invoice_extraction',
        'invoice_validation',
        'po_matching',
        'vendor_verification',
        'approval_routing',
        'payment_scheduling',
        'ledger_update'
      ],
      memory: {
        required: ['vendor_history', 'po_records', 'invoice_templates'],
        updateOn: ['invoice_received', 'invoice_approved', 'invoice_paid']
      },
      twins: ['vendor_twin', 'invoice_twin', 'expense_twin']
    });

    this.memory = new MemoryOS();
    this.twins = new TwinOS();
    this.config = {
      approvalThresholds: config.approvalThresholds ?? {
        autoApprove: 10000,
        managerApproval: 50000,
        directorApproval: 500000
      },
      autoApprovalEnabled: config.autoApprovalEnabled ?? true,
      defaultPaymentTerms: config.defaultPaymentTerms ?? 30,
      integrations: config.integrations ?? {}
    };
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const { input } = context;
    const invoice = input as Invoice;

    // Step 1: Extract and normalize invoice data
    const extracted = await this.extractInvoice(invoice);

    // Step 2: Validate invoice
    const validation = await this.validateInvoice(extracted);

    if (!validation.valid) {
      await this.handleInvalidInvoice(extracted, validation.errors);
      return {
        success: false,
        error: `Invalid invoice: ${validation.errors.join(', ')}`,
        output: { invoice: extracted, validation }
      };
    }

    // Step 3: Match with PO
    const poMatch = await this.matchPurchaseOrder(extracted);

    // Step 4: Get vendor info
    const vendor = await this.getVendorInfo(extracted.vendor_name);

    // Step 5: Determine approval route
    const approvalRoute = await this.determineApprovalRoute(extracted, vendor, poMatch);

    // Step 6: Route for approval
    const approval = await this.routeForApproval(extracted, vendor, approvalRoute);

    if (approval.approved) {
      // Step 7: Schedule payment
      await this.schedulePayment(extracted, vendor);

      // Step 8: Update ledger
      await this.updateLedger(extracted, vendor);

      // Step 9: Send receipt to vendor
      await this.sendReceipt(extracted, vendor);

      // Step 10: Update vendor twin
      await this.updateVendorTwin(extracted, vendor);

      return {
        success: true,
        output: {
          invoice: extracted,
          validation,
          vendor,
          poMatch,
          approval,
          status: 'approved_and_scheduled',
          paymentDate: approvalRoute.scheduledDate
        }
      };
    } else {
      return {
        success: true,
        output: {
          invoice: extracted,
          validation,
          approval,
          status: 'pending_approval',
          approvers: approval.approvers
        }
      };
    }
  }

  private async extractInvoice(invoice: Invoice): Promise<Invoice> {
    // If invoice has attachments, use OCR
    if (invoice.attachments?.length) {
      // TODO: Integrate with OCR service
      return {
        ...invoice,
        status: 'extracted'
      };
    }

    // Return normalized invoice
    return {
      ...invoice,
      currency: invoice.currency || 'INR',
      due_date: invoice.due_date || this.calculateDueDate(),
      status: 'extracted'
    };
  }

  private calculateDueDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + this.config.defaultPaymentTerms);
    return date.toISOString().split('T')[0];
  }

  private async validateInvoice(invoice: Invoice): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!invoice.vendor_name) errors.push('Vendor name is required');
    if (!invoice.invoice_number) errors.push('Invoice number is required');
    if (!invoice.date) errors.push('Invoice date is required');
    if (!invoice.amount || invoice.amount <= 0) errors.push('Valid amount is required');

    // Date validation
    const invoiceDate = new Date(invoice.date);
    const today = new Date();
    if (invoiceDate > today) {
      warnings.push('Invoice date is in the future');
    }

    // Amount validation
    if (invoice.amount > 10000000) {
      warnings.push('Large invoice amount - manual review recommended');
    }

    // Duplicate check
    const isDuplicate = await this.checkDuplicate(invoice);
    if (isDuplicate) {
      errors.push('Possible duplicate invoice detected');
    }

    // Vendor validation
    const vendor = await this.getVendorInfo(invoice.vendor_name);
    if (!vendor.verified) {
      warnings.push('Vendor is not verified');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async checkDuplicate(invoice: Invoice): Promise<boolean> {
    const recentInvoices = await this.memory.search({
      type: 'invoice',
      vendor_name: invoice.vendor_name,
      invoice_number: invoice.invoice_number,
      date_range: '30d'
    });

    if (recentInvoices.length > 0) {
      const existing = recentInvoices[0];
      return existing.amount === invoice.amount;
    }

    return false;
  }

  private async handleInvalidInvoice(invoice: Invoice, errors: string[]): Promise<void> {
    await this.memory.save({
      type: 'invoice_rejection',
      invoice,
      reason: errors,
      rejectedAt: new Date().toISOString(),
      action: 'manual_review_required'
    });

    // TODO: Notify accounts payable
  }

  private async matchPurchaseOrder(invoice: Invoice): Promise<{
    matched: boolean;
    po_id?: string;
    po_amount?: number;
    variance?: number;
  }> {
    if (!invoice.vendor_id) {
      return { matched: false };
    }

    // TODO: Integrate with PO system
    // Search for matching PO
    const pos = await this.memory.search({
      type: 'purchase_order',
      vendor_id: invoice.vendor_id,
      status: 'approved'
    });

    if (pos.length === 0) {
      return { matched: false };
    }

    // Find best match
    const po = pos[0];
    const variance = invoice.amount - po.amount;

    return {
      matched: true,
      po_id: po.id,
      po_amount: po.amount,
      variance
    };
  }

  private async getVendorInfo(vendorName: string): Promise<{
    verified: boolean;
    payment_terms: number;
    credit_limit?: number;
    bank_details?: any;
  }> {
    // TODO: Integrate with vendor database
    return {
      verified: true,
      payment_terms: 30,
      credit_limit: 1000000
    };
  }

  private async determineApprovalRoute(
    invoice: Invoice,
    vendor: any,
    poMatch: any
  ): Promise<{
    type: 'auto' | 'manager' | 'director' | 'multiple';
    approvers: string[];
    scheduledDate: string;
    reason: string;
  }> {
    const amount = invoice.amount;

    // Auto-approval
    if (this.config.autoApprovalEnabled && amount <= this.config.approvalThresholds.autoApprove) {
      return {
        type: 'auto',
        approvers: [],
        scheduledDate: this.calculatePaymentDate(vendor.payment_terms),
        reason: 'Below auto-approval threshold'
      };
    }

    // Manager approval
    if (amount <= this.config.approvalThresholds.managerApproval) {
      return {
        type: 'manager',
        approvers: ['finance_manager'],
        scheduledDate: this.calculatePaymentDate(vendor.payment_terms),
        reason: `Amount ₹${amount.toLocaleString()} requires manager approval`
      };
    }

    // Director approval
    if (amount <= this.config.approvalThresholds.directorApproval) {
      return {
        type: 'director',
        approvers: ['finance_manager', 'finance_director'],
        scheduledDate: this.calculatePaymentDate(vendor.payment_terms),
        reason: `Large invoice ₹${amount.toLocaleString()} requires director approval`
      };
    }

    // CFO approval for very large
    return {
      type: 'multiple',
      approvers: ['finance_manager', 'finance_director', 'cfo'],
      scheduledDate: this.calculatePaymentDate(vendor.payment_terms),
      reason: `Critical amount ₹${amount.toLocaleString()} requires CFO approval`
    };
  }

  private calculatePaymentDate(paymentTerms: number): string {
    const date = new Date();
    date.setDate(date.getDate() + paymentTerms);
    return date.toISOString().split('T')[0];
  }

  private async routeForApproval(
    invoice: Invoice,
    vendor: any,
    route: any
  ): Promise<{
    approved: boolean;
    approvers: string[];
    approvedBy?: string;
    approvedAt?: string;
  }> {
    if (route.type === 'auto') {
      return {
        approved: true,
        approvers: [],
        approvedBy: 'system',
        approvedAt: new Date().toISOString()
      };
    }

    // TODO: Create approval task in workflow system
    await this.memory.save({
      type: 'approval_request',
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      amount: invoice.amount,
      vendor: invoice.vendor_name,
      approvers: route.approvers,
      reason: route.reason,
      requestedAt: new Date().toISOString(),
      status: 'pending'
    });

    return {
      approved: false,
      approvers: route.approvers
    };
  }

  private async schedulePayment(invoice: Invoice, vendor: any): Promise<void> {
    const paymentDate = this.calculatePaymentDate(vendor.payment_terms || 30);

    await this.memory.save({
      type: 'payment_schedule',
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      vendor_name: vendor.name,
      amount: invoice.amount,
      currency: invoice.currency,
      payment_date: paymentDate,
      payment_method: 'bank_transfer',
      bank_details: vendor.bank_details,
      status: 'scheduled',
      scheduledAt: new Date().toISOString()
    });

    // TODO: Integrate with payment system (Razorpay, bank, etc.)
  }

  private async updateLedger(invoice: Invoice, vendor: any): Promise<void> {
    // TODO: Integrate with ERP/Accounting
    await this.memory.save({
      type: 'ledger_entry',
      invoice_id: invoice.id,
      account: 'accounts_payable',
      vendor_name: vendor.name,
      debit: invoice.amount,
      credit: 0,
      date: new Date().toISOString(),
      reference: invoice.invoice_number,
      status: 'posted'
    });
  }

  private async sendReceipt(invoice: Invoice, vendor: any): Promise<void> {
    if (!vendor.email) return;

    // TODO: Integrate with email service
    await this.memory.save({
      type: 'vendor_notification',
      vendor_email: vendor.email,
      subject: `Payment Receipt - Invoice ${invoice.invoice_number}`,
      invoice_number: invoice.invoice_number,
      amount: invoice.amount,
      sentAt: new Date().toISOString(),
      status: 'sent'
    });
  }

  private async updateVendorTwin(invoice: Invoice, vendor: any): Promise<void> {
    await this.twins.upsert('vendor_twin', {
      identity: { vendor_id: vendor.id || invoice.vendor_name },
      data: {
        last_invoice_date: invoice.date,
        last_invoice_amount: invoice.amount,
        total_paid_ytd: 0, // TODO: Calculate YTD
        payment_terms: vendor.payment_terms,
        updatedAt: new Date().toISOString()
      }
    });
  }

  // Dashboard methods
  async getPendingApprovals(): Promise<Invoice[]> {
    const approvals = await this.memory.search({
      type: 'approval_request',
      status: 'pending'
    });

    return approvals;
  }

  async getScheduledPayments(): Promise<any[]> {
    const payments = await this.memory.search({
      type: 'payment_schedule',
      status: 'scheduled'
    });

    return payments;
  }

  async getVendorSummary(vendorName: string): Promise<any> {
    const invoices = await this.memory.search({
      type: 'invoice',
      vendor_name: vendorName
    });

    const totalPaid = invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.amount, 0);

    const totalPending = invoices
      .filter(i => i.status !== 'paid')
      .reduce((sum, i) => sum + i.amount, 0);

    return {
      vendor_name: vendorName,
      total_invoices: invoices.length,
      total_paid: totalPaid,
      total_pending: totalPending,
      average_amount: invoices.length > 0 ? totalPaid / invoices.length : 0
    };
  }
}

export default InvoiceAutomationAgent;
