import mongoose, { Document, Schema, Model } from 'mongoose';

// Invoice status enum
export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  PARTIAL = 'partial',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

// Payment method enum
export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  UPI = 'upi',
  CHECK = 'check',
  OTHER = 'other',
}

// Line item interface
export interface ILineItem {
  description: string;
  quantity: number;
  price: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

// Payment record interface
export interface IPaymentRecord {
  amount: number;
  method: PaymentMethod;
  date: Date;
  reference?: string;
  notes?: string;
  transactionId?: string;
}

// Invoice document interface
export interface IInvoice extends Document {
  invoiceId: string;
  tenantId: string;
  customerId: string;
  orderId?: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  items: ILineItem[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  notes?: string;
  terms?: string;
  payment?: IPaymentRecord;
  paidAmount: number;
  remainingAmount: number;
  overdueDays: number;
  lastPaymentDate?: Date;
  sentAt?: Date;
  paidAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Invoice schema
const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      index: true,
    },
    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    items: [{
      description: { type: String, required: true },
      quantity: { type: Number, required: true, min: 0 },
      price: { type: Number, required: true, min: 0 },
      taxRate: { type: Number, default: 0 },
      taxAmount: { type: Number, default: 0 },
      total: { type: Number, required: true },
    }],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.DRAFT,
      index: true,
    },
    notes: String,
    terms: String,
    payment: {
      method: { type: String, enum: Object.values(PaymentMethod) },
      date: Date,
      reference: String,
      transactionId: String,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    overdueDays: {
      type: Number,
      default: 0,
    },
    lastPaymentDate: Date,
    sentAt: Date,
    paidAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'invoices',
  }
);

// Compound indexes for common queries
InvoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ tenantId: 1, customerId: 1, status: 1 });
InvoiceSchema.index({ tenantId: 1, issueDate: -1 });
InvoiceSchema.index({ tenantId: 1, dueDate: 1, status: 1 });

// Virtual for checking overdue status
InvoiceSchema.virtual('isOverdue').get(function () {
  if (this.status === InvoiceStatus.PAID || this.status === InvoiceStatus.CANCELLED) {
    return false;
  }
  return new Date() > this.dueDate;
});

// Pre-save hook to calculate totals
InvoiceSchema.pre('save', function (next) {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Calculate tax amount
  this.taxAmount = this.items.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    return sum + (itemTotal * (item.taxRate / 100));
  }, 0);

  // Calculate total
  this.total = this.subtotal + this.taxAmount - this.discount;

  // Calculate remaining amount
  this.remainingAmount = this.total - this.paidAmount;

  // Update overdue days
  if (this.status !== InvoiceStatus.PAID && this.status !== InvoiceStatus.CANCELLED) {
    const now = new Date();
    if (now > this.dueDate) {
      const diffTime = Math.abs(now.getTime() - this.dueDate.getTime());
      this.overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else {
      this.overdueDays = 0;
    }
  }

  next();
});

// Instance method to mark as sent
InvoiceSchema.methods.markAsSent = function (): void {
  this.status = InvoiceStatus.SENT;
  this.sentAt = new Date();
};

// Instance method to record payment
InvoiceSchema.methods.recordPayment = function (payment: IPaymentRecord): void {
  this.paidAmount += payment.amount;
  this.lastPaymentDate = payment.date;

  if (this.paidAmount >= this.total) {
    this.status = InvoiceStatus.PAID;
    this.paidAt = payment.date;
    this.remainingAmount = 0;
  } else if (this.paidAmount > 0) {
    this.status = InvoiceStatus.PARTIAL;
    this.remainingAmount = this.total - this.paidAmount;
  }

  this.payment = payment;
};

// Instance method to cancel invoice
InvoiceSchema.methods.cancel = function (reason?: string): void {
  this.status = InvoiceStatus.CANCELLED;
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
};

// Static method to get next invoice number
InvoiceSchema.statics.getNextInvoiceNumber = async function (tenantId: string): Promise<string> {
  const prefix = process.env.INVOICE_PREFIX || 'INV';
  const count = await this.countDocuments({ tenantId });
  return `${prefix}-${String(count + 1).padStart(6, '0')}`;
};

// Static method to update overdue invoices
InvoiceSchema.statics.updateOverdueInvoices = async function (tenantId?: string): Promise<number> {
  const query: any = {
    status: { $nin: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
    dueDate: { $lt: new Date() },
  };

  if (tenantId) {
    query.tenantId = tenantId;
  }

  const result = await this.updateMany(query, {
    $set: {
      status: InvoiceStatus.OVERDUE,
      overdueDays: Math.floor((Date.now() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
    },
  });

  return result.modifiedCount;
};

// Export model
const Invoice: Model<IInvoice> = mongoose.model<IInvoice>('Invoice', InvoiceSchema);

export default Invoice;
export { InvoiceSchema };
