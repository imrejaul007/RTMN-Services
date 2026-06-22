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

import { randomUUID } from 'crypto';

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
  }): Promise<CreditLine> {
    // Calculate credit score (simplified)
    const creditScore = Math.floor(Math.random() * 300) + 650; // 650-950
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
// Exports
// ============================================================================

export const creditService = new CreditService();
export const bnplService = new BNPLService();
export const loanService = new LoanService();
export const invoiceService = new InvoiceService();
