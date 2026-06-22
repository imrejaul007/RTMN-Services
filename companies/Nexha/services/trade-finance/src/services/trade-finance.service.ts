/**
 * NeXha Trade Finance - Core Service
 *
 * Features:
 * - Credit Lines for distributors/merchants
 * - BNPL (Buy Now Pay Later) for purchases
 * - Invoice Financing
 * - Working Capital Loans
 * - Credit Scoring
 */

import { randomUUID, randomInt } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export type CreditStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type CreditType = 'distributor' | 'merchant' | 'franchise' | 'manufacturer';
export type BNPLStatus = 'active' | 'paid' | 'overdue' | 'defaulted';
export type LoanStatus = 'pending' | 'approved' | 'disbursed' | 'rejected' | 'closed';
export type InvoiceStatus = 'pending' | 'financed' | 'paid' | 'defaulted';

export interface CreditLine {
  id: string;
  businessId: string;
  businessName: string;
  type: CreditType;
  creditLimit: number;
  usedAmount: number;
  availableAmount: number;
  status: CreditStatus;
  interestRate: number; // Annual rate in %
  dueDate?: Date;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BNPLTransaction {
  id: string;
  bnplNumber: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  orderId: string;
  orderAmount: number;
  tenure: number; // days
  emiAmount: number;
  totalPayable: number;
  amountPaid: number;
  status: BNPLStatus;
  dueDate: Date;
  payments: Array<{
    date: Date;
    amount: number;
    method: 'upi' | 'card' | 'bank_transfer';
    reference: string;
  }>;
  createdAt: Date;
}

export interface Loan {
  id: string;
  loanNumber: string;
  businessId: string;
  businessName: string;
  type: 'working_capital' | 'invoice_discounting' | 'equipment' | 'expansion';
  principal: number;
  interestRate: number;
  tenure: number; // months
  emi: number;
  totalInterest: number;
  totalPayable: number;
  disbursedAmount: number;
  repaidAmount: number;
  outstandingAmount: number;
  status: LoanStatus;
  disbursedAt?: Date;
  nextDueDate?: Date;
  createdAt: Date;
}

export interface InvoiceFinancing {
  id: string;
  invoiceNumber: string;
  businessId: string;
  businessName: string;
  buyerId: string;
  buyerName: string;
  invoiceAmount: number;
  financedAmount: number; // Usually 80-90% of invoice
  fee: number;
  dueDate: Date;
  status: InvoiceStatus;
  financedAt?: Date;
  paidAt?: Date;
  createdAt: Date;
}

// ============================================================================
// Store
// ============================================================================

const store = {
  creditLines: new Map<string, CreditLine>(),
  bnplTransactions: new Map<string, BNPLTransaction>(),
  loans: new Map<string, Loan>(),
  invoices: new Map<string, InvoiceFinancing>(),
};

// ============================================================================
// Credit Service
// ============================================================================

export class CreditService {
  async applyForCredit(input: {
    businessId: string;
    businessName: string;
    type: CreditType;
    requestedLimit: number;
    // In production, calculate from actual credit bureau data
    // This uses crypto for secure randomness during development
    baseScore?: number;
  }): Promise<CreditLine> {
    // Calculate credit score using secure random number generation
    // In production, replace with actual credit bureau API call
    const creditScore = input.baseScore || randomInt(650, 951); // 650-950 inclusive
    const approvedLimit = creditScore >= 750
      ? input.requestedLimit
      : input.requestedLimit * (creditScore - 650) / 300;

    const creditLine: CreditLine = {
      id: randomUUID(),
      businessId: input.businessId,
      businessName: input.businessName,
      type: input.type,
      creditLimit: Math.round(approvedLimit),
      usedAmount: 0,
      availableAmount: Math.round(approvedLimit),
      status: creditScore >= 700 ? 'approved' : 'pending',
      interestRate: creditScore >= 800 ? 12 : 15, // Lower rate for higher score
      approvedAt: creditScore >= 700 ? new Date() : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    store.creditLines.set(creditLine.id, creditLine);
    return creditLine;
  }

  async getCreditLine(id: string): Promise<CreditLine | null> {
    return store.creditLines.get(id) || null;
  }

  async getCreditLineByBusiness(businessId: string): Promise<CreditLine | null> {
    return Array.from(store.creditLines.values()).find(
      c => c.businessId === businessId
    ) || null;
  }

  async approveCredit(id: string): Promise<CreditLine | null> {
    const credit = store.creditLines.get(id);
    if (!credit) return null;

    credit.status = 'approved';
    credit.approvedAt = new Date();
    credit.updatedAt = new Date();
    store.creditLines.set(id, credit);
    return credit;
  }

  async useCredit(id: string, amount: number): Promise<CreditLine | null> {
    const credit = store.creditLines.get(id);
    if (!credit || credit.status !== 'approved') return null;
    if (credit.availableAmount < amount) return null;

    credit.usedAmount += amount;
    credit.availableAmount -= amount;
    credit.updatedAt = new Date();
    store.creditLines.set(id, credit);
    return credit;
  }

  async repayCredit(id: string, amount: number): Promise<CreditLine | null> {
    const credit = store.creditLines.get(id);
    if (!credit) return null;

    credit.usedAmount = Math.max(0, credit.usedAmount - amount);
    credit.availableAmount = credit.creditLimit - credit.usedAmount;
    credit.updatedAt = new Date();
    store.creditLines.set(id, credit);
    return credit;
  }
}

// ============================================================================
// BNPL Service
// ============================================================================

export class BNPLService {
  async createTransaction(input: {
    buyerId: string;
    buyerName: string;
    sellerId: string;
    sellerName: string;
    orderId: string;
    orderAmount: number;
    tenureDays?: number;
  }): Promise<BNPLTransaction> {
    const tenure = input.tenureDays || 30;
    const interestRate = 2; // 2% flat fee for BNPL
    const fee = input.orderAmount * (interestRate / 100);
    const totalPayable = input.orderAmount + fee;
    const emiAmount = totalPayable; // Single payment

    const transaction: BNPLTransaction = {
      id: randomUUID(),
      bnplNumber: `BNPL-${Date.now().toString(36).toUpperCase()}`,
      buyerId: input.buyerId,
      buyerName: input.buyerName,
      sellerId: input.sellerId,
      sellerName: input.sellerName,
      orderId: input.orderId,
      orderAmount: input.orderAmount,
      tenure,
      emiAmount,
      totalPayable,
      amountPaid: 0,
      status: 'active',
      dueDate: new Date(Date.now() + tenure * 24 * 60 * 60 * 1000),
      payments: [],
      createdAt: new Date(),
    };

    store.bnplTransactions.set(transaction.id, transaction);
    return transaction;
  }

  async makePayment(
    id: string,
    amount: number,
    method: 'upi' | 'card' | 'bank_transfer',
    reference: string
  ): Promise<BNPLTransaction | null> {
    const txn = store.bnplTransactions.get(id);
    if (!txn) return null;

    txn.payments.push({
      date: new Date(),
      amount,
      method,
      reference,
    });
    txn.amountPaid += amount;

    if (txn.amountPaid >= txn.totalPayable) {
      txn.status = 'paid';
    }

    store.bnplTransactions.set(id, txn);
    return txn;
  }

  async getTransaction(id: string): Promise<BNPLTransaction | null> {
    return store.bnplTransactions.get(id) || null;
  }

  async getOverdueTransactions(): Promise<BNPLTransaction[]> {
    const now = new Date();
    return Array.from(store.bnplTransactions.values()).filter(
      t => t.status === 'active' && t.dueDate < now
    );
  }
}

// ============================================================================
// Loan Service
// ============================================================================

export class LoanService {
  applyForLoan(input: {
    businessId: string;
    businessName: string;
    type: Loan['type'];
    principal: number;
    tenureMonths: number;
  }): Loan {
    const interestRate = 14; // 14% annual
    const monthlyRate = interestRate / 12 / 100;
    const n = input.tenureMonths;

    // EMI = P * r * (1+r)^n / ((1+r)^n - 1)
    const emi = input.principal * monthlyRate * Math.pow(1 + monthlyRate, n) / (Math.pow(1 + monthlyRate, n) - 1);
    const totalInterest = emi * n - input.principal;

    const loan: Loan = {
      id: randomUUID(),
      loanNumber: `LOAN-${Date.now().toString(36).toUpperCase()}`,
      businessId: input.businessId,
      businessName: input.businessName,
      type: input.type,
      principal: input.principal,
      interestRate,
      tenure: input.tenureMonths,
      emi,
      totalInterest,
      totalPayable: emi * n,
      disbursedAmount: 0,
      repaidAmount: 0,
      outstandingAmount: 0,
      status: 'pending',
      createdAt: new Date(),
    };

    store.loans.set(loan.id, loan);
    return loan;
  }

  async approveLoan(id: string): Promise<Loan | null> {
    const loan = store.loans.get(id);
    if (!loan) return null;

    loan.status = 'approved';
    loan.disbursedAmount = loan.principal;
    loan.outstandingAmount = loan.totalPayable;
    loan.disbursedAt = new Date();
    loan.nextDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    store.loans.set(id, loan);
    return loan;
  }

  async makeEMIPayment(id: string, amount: number): Promise<Loan | null> {
    const loan = store.loans.get(id);
    if (!loan || loan.status !== 'disbursed') return null;

    loan.repaidAmount += amount;
    loan.outstandingAmount -= amount;

    if (loan.repaidAmount >= loan.totalPayable) {
      loan.status = 'closed';
    } else {
      // Calculate next due date
      loan.nextDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    store.loans.set(id, loan);
    return loan;
  }
}

// ============================================================================
// Invoice Financing Service
// ============================================================================

export class InvoiceService {
  financeInvoice(input: {
    businessId: string;
    businessName: string;
    buyerId: string;
    buyerName: string;
    invoiceAmount: number;
    invoiceNumber: string;
    dueDate: Date;
  }): InvoiceFinancing {
    const advanceRate = 0.85; // 85% advance
    const feeRate = 2.5; // 2.5% processing fee

    const financedAmount = input.invoiceAmount * advanceRate;
    const fee = input.invoiceAmount * (feeRate / 100);

    const invoice: InvoiceFinancing = {
      id: randomUUID(),
      invoiceNumber: input.invoiceNumber,
      businessId: input.businessId,
      businessName: input.businessName,
      buyerId: input.buyerId,
      buyerName: input.buyerName,
      invoiceAmount: input.invoiceAmount,
      financedAmount,
      fee,
      dueDate: input.dueDate,
      status: 'pending',
      createdAt: new Date(),
    };

    store.invoices.set(invoice.id, invoice);
    return invoice;
  }

  async disburseInvoice(id: string): Promise<InvoiceFinancing | null> {
    const invoice = store.invoices.get(id);
    if (!invoice) return null;

    invoice.status = 'financed';
    invoice.financedAt = new Date();
    store.invoices.set(id, invoice);
    return invoice;
  }

  async markInvoicePaid(id: string): Promise<InvoiceFinancing | null> {
    const invoice = store.invoices.get(id);
    if (!invoice) return null;

    invoice.status = 'paid';
    invoice.paidAt = new Date();
    store.invoices.set(id, invoice);
    return invoice;
  }
}

// ============================================================================
// FX / Currency Conversion Service
// ============================================================================

export interface FXRate {
  from: string;
  to: string;
  rate: number;           // 1 from = rate to
  inverseRate: number;     // 1 to = inverseRate from
  source: string;           // 'rbi' | 'openex' | 'manual'
  updatedAt: Date;
  validUntil: Date;
}

export interface FXConversionResult {
  from: string;
  to: string;
  amount: number;
  convertedAmount: number;
  rate: number;
  inverseRate: number;
  timestamp: Date;
}

export interface Dispute {
  id: string;
  disputeNumber: string;
  entityType: 'order' | 'invoice' | 'payment' | 'credit';
  entityId: string;
  parties: Array<{ role: 'buyer' | 'seller' | 'buyer' | 'platform'; name: string; email: string }>;
  type: 'payment' | 'quality' | 'delivery' | 'refund' | 'pricing' | 'other';
  status: 'open' | 'under_review' | 'escalated' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  evidence: Array<{ type: 'document' | 'image' | 'message'; url: string; description: string }>;
  resolution?: {
    decision: 'buyer_favor' | 'seller_favor' | 'partial' | 'dismissed';
    amount?: number;
    action?: string;
    notes?: string;
    resolvedBy?: string;
    resolvedAt?: Date;
  };
  messages: Array<{
    from: string;
    message: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export class FXService {
  // In-memory FX rates (in production, fetch from RBI API or Open Exchange Rates)
  private rates = new Map<string, FXRate>();

  constructor() {
    // Seed with common INR cross rates (as of June 2026)
    // These should be fetched from an external API in production
    this.setRate('INR', 'USD', 0.0119);   // 1 INR = 0.0119 USD
    this.setRate('INR', 'EUR', 0.0109);   // 1 INR = 0.0109 EUR
    this.setRate('INR', 'GBP', 0.0093);   // 1 INR = 0.0093 GBP
    this.setRate('USD', 'EUR', 0.92);      // 1 USD = 0.92 EUR
    this.setRate('USD', 'GBP', 0.79);      // 1 USD = 0.79 GBP
    this.setRate('EUR', 'USD', 1.09);      // 1 EUR = 1.09 USD
    this.setRate('EUR', 'GBP', 0.86);      // 1 EUR = 0.86 GBP
    this.setRate('GBP', 'USD', 1.27);      // 1 GBP = 1.27 USD
    this.setRate('GBP', 'EUR', 1.16);      // 1 GBP = 1.16 EUR
  }

  private setRate(from: string, to: string, rate: number): void {
    const key = `${from}_${to}`;
    const inverseKey = `${to}_${from}`;
    this.rates.set(key, {
      from,
      to,
      rate,
      inverseRate: 1 / rate,
      source: 'manual',
      updatedAt: new Date(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });
  }

  /**
   * Get current exchange rate between two currencies
   */
  getRate(from: string, to: string): FXRate | null {
    if (from === to) {
      return { from, to, rate: 1, inverseRate: 1, source: 'identity', updatedAt: new Date(), validUntil: new Date() };
    }
    return this.rates.get(`${from}_${to}`) || null;
  }

  /**
   * Get all available rates
   */
  getAllRates(): FXRate[] {
    return Array.from(this.rates.values());
  }

  /**
   * Convert an amount from one currency to another
   */
  convert(from: string, to: string, amount: number): FXConversionResult {
    if (from === to) {
      return { from, to, amount, convertedAmount: amount, rate: 1, inverseRate: 1, timestamp: new Date() };
    }

    const rate = this.rates.get(`${from}_${to}`);
    if (!rate) {
      throw new Error(`FX rate not available for ${from} to ${to}`);
    }

    const convertedAmount = amount * rate.rate;
    return {
      from,
      to,
      amount,
      convertedAmount: Math.round(convertedAmount * 100) / 100,
      rate: rate.rate,
      inverseRate: rate.inverseRate,
      timestamp: new Date(),
    };
  }

  /**
   * Update FX rates (would be called by a scheduled job fetching from RBI/API)
   */
  updateRate(from: string, to: string, rate: number, source: FXRate['source'] = 'manual'): void {
    this.setRate(from, to, rate);
    logger?.info(`[FXService] Updated ${from}/${to} rate to ${rate}`);
  }
}

// ============================================================================
// Dispute Resolution Service
// ============================================================================

export class DisputeService {
  private disputes = new Map<string, Dispute>();

  /**
   * Create a new dispute
   */
  async createDispute(input: {
    entityType: Dispute['entityType'];
    entityId: string;
    parties: Dispute['parties'];
    type: Dispute['type'];
    description: string;
    priority?: Dispute['priority'];
  }): Promise<Dispute> {
    const dispute: Dispute = {
      id: randomUUID(),
      disputeNumber: `DSP-${Date.now().toString(36).toUpperCase()}`,
      entityType: input.entityType,
      entityId: input.entityId,
      parties: input.parties,
      type: input.type,
      status: 'open',
      priority: input.priority || 'medium',
      description: input.description,
      evidence: [],
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.disputes.set(dispute.id, dispute);
    return dispute;
  }

  /**
   * Get dispute by ID
   */
  async getDispute(id: string): Promise<Dispute | null> {
    return this.disputes.get(id) || null;
  }

  /**
   * List disputes with filters
   */
  async listDisputes(filters?: {
    status?: Dispute['status'];
    type?: Dispute['type'];
    entityId?: string;
    limit?: number;
  }): Promise<Dispute[]> {
    let results = Array.from(this.disputes.values());
    if (filters?.status) results = results.filter(d => d.status === filters.status);
    if (filters?.type) results = results.filter(d => d.type === filters.type);
    if (filters?.entityId) results = results.filter(d => d.entityId === filters.entityId);
    return results.slice(0, filters?.limit || 50);
  }

  /**
   * Add evidence to a dispute
   */
  async addEvidence(id: string, evidence: Dispute['evidence'][0]): Promise<Dispute | null> {
    const dispute = this.disputes.get(id);
    if (!dispute) return null;
    dispute.evidence.push(evidence);
    dispute.updatedAt = new Date();
    this.disputes.set(id, dispute);
    return dispute;
  }

  /**
   * Add a message to the dispute thread
   */
  async addMessage(id: string, from: string, message: string): Promise<Dispute | null> {
    const dispute = this.disputes.get(id);
    if (!dispute) return null;
    dispute.messages.push({ from, message, timestamp: new Date() });
    dispute.updatedAt = new Date();
    this.disputes.set(id, dispute);
    return dispute;
  }

  /**
   * Update dispute status
   */
  async updateStatus(id: string, status: Dispute['status']): Promise<Dispute | null> {
    const dispute = this.disputes.get(id);
    if (!dispute) return null;
    dispute.status = status;
    dispute.updatedAt = new Date();
    this.disputes.set(id, dispute);
    return dispute;
  }

  /**
   * Resolve a dispute with a decision
   */
  async resolveDispute(
    id: string,
    decision: Dispute['resolution']['decision'],
    resolvedBy: string,
    options?: { amount?: number; action?: string; notes?: string }
  ): Promise<Dispute | null> {
    const dispute = this.disputes.get(id);
    if (!dispute) return null;

    dispute.status = 'resolved';
    dispute.resolution = {
      decision,
      resolvedBy,
      resolvedAt: new Date(),
      amount: options?.amount,
      action: options?.action,
      notes: options?.notes,
    };
    dispute.updatedAt = new Date();
    this.disputes.set(id, dispute);
    return dispute;
  }

  /**
   * Escalate a dispute
   */
  async escalate(id: string): Promise<Dispute | null> {
    return this.updateStatus(id, 'escalated');
  }
}

// ============================================================================
// Exports
// ============================================================================

export const creditService = new CreditService();
export const bnplService = new BNPLService();
export const loanService = new LoanService();
export const invoiceService = new InvoiceService();
export const fxService = new FXService();
export const disputeService = new DisputeService();
