/**
 * REZ Invoice Client
 *
 * Wraps rez-invoice-service: invoices, line items, payments, GST reports,
 * reminders, PDF generation.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  currency: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number; taxRate?: number }>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  paidAt?: string;
}

export interface InvoiceInput {
  customerId: string;
  customerName: string;
  customerEmail?: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; taxRate?: number }>;
  metadata?: Record<string, unknown>;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  reference?: string;
  paidAt: string;
}

export interface GstReport {
  period: string;
  totalSales: number;
  totalTax: number;
  cgst: number;
  sgst: number;
  igst: number;
  invoiceCount: number;
}

export class InvoiceClient {
  constructor(private config: HojaiConfig) {}

  // ── Invoices ──────────────────────────────────────────────
  async create(input: InvoiceInput): Promise<Invoice> {
    return request<Invoice>(this.config, 'POST', '/api/invoices', input);
  }

  async list(input: { status?: InvoiceStatus; customerId?: string; fromDate?: string; toDate?: string } = {}): Promise<Invoice[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Invoice[]>(this.config, 'GET', `/api/invoices?${params.toString()}`);
  }

  async get(id: string): Promise<Invoice> {
    return request<Invoice>(this.config, 'GET', `/api/invoices/${encodeURIComponent(id)}`);
  }

  async getByNumber(invoiceNumber: string): Promise<Invoice> {
    return request<Invoice>(this.config, 'GET', `/api/invoices/number/${encodeURIComponent(invoiceNumber)}`);
  }

  async update(id: string, patch: Partial<InvoiceInput>): Promise<Invoice> {
    return request<Invoice>(this.config, 'PATCH', `/api/invoices/${encodeURIComponent(id)}`, patch);
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    return request(this.config, 'DELETE', `/api/invoices/${encodeURIComponent(id)}`);
  }

  async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    return request<Invoice>(this.config, 'PATCH', `/api/invoices/${encodeURIComponent(id)}/status`, { status });
  }

  // ── Payments ──────────────────────────────────────────────
  async recordPayment(invoiceId: string, input: { amount: number; paymentMethod: string; reference?: string }): Promise<InvoicePayment> {
    return request<InvoicePayment>(this.config, 'POST', `/api/invoices/${encodeURIComponent(invoiceId)}/payments`, input);
  }

  async listPayments(invoiceId: string): Promise<InvoicePayment[]> {
    return request<InvoicePayment[]>(this.config, 'GET', `/api/invoices/${encodeURIComponent(invoiceId)}/payments`);
  }

  // ── Delivery ──────────────────────────────────────────────
  async send(id: string, input?: { to?: string; cc?: string[]; message?: string }): Promise<{ sent: boolean; sentTo: string; sentAt: string }> {
    return request(this.config, 'POST', `/api/invoices/${encodeURIComponent(id)}/send`, input || {});
  }

  async getPdf(id: string): Promise<Buffer> {
    // PDF returns binary, not JSON
    const res = await request<ArrayBuffer>(this.config, 'GET', `/api/invoices/${encodeURIComponent(id)}/pdf`);
    return Buffer.from(res);
  }

  async preview(id: string): Promise<{ html: string; data: Record<string, unknown> }> {
    return request(this.config, 'GET', `/api/invoices/${encodeURIComponent(id)}/preview`);
  }

  // ── Reminders ─────────────────────────────────────────────
  async sendReminder(invoiceId: string, input: { type: 'gentle' | 'firm' | 'final'; message?: string }): Promise<{ sent: boolean }> {
    return request(this.config, 'POST', `/api/invoices/${encodeURIComponent(invoiceId)}/reminders`, input);
  }

  async sendBatchReminders(input: { invoiceIds: string[]; type: 'gentle' | 'firm' | 'final' }): Promise<{ sent: number; failed: number }> {
    return request(this.config, 'POST', '/api/invoices/reminders/batch', input);
  }

  // ── Reports ───────────────────────────────────────────────
  async getSummary(): Promise<{ totalInvoices: number; totalPaid: number; totalOutstanding: number; totalOverdue: number; currency: string }> {
    return request(this.config, 'GET', '/api/invoices/stats/summary');
  }

  async getGstReport(input: { period: string }): Promise<GstReport> {
    return request<GstReport>(this.config, 'GET', `/api/invoices/reports/gst?period=${encodeURIComponent(input.period)}`);
  }

  async getOverdueReport(): Promise<Invoice[]> {
    return request<Invoice[]>(this.config, 'GET', '/api/invoices/reports/overdue');
  }
}