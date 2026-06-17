/**
 * Media OS - Invoice Model
 * Billing invoices for advertisers and creators
 */

const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  type: { type: String, enum: ['campaign', 'booking', 'subscription', 'royalty', 'refund', 'adjustment'] },
  referenceId: mongoose.Schema.Types.ObjectId,
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, required: true },
  amount: { type: Number, required: true },
  tax: { type: Number, default: 0 },
}, { _id: true });

const invoiceSchema = new mongoose.Schema({
  // Invoice number
  invoiceNumber: { type: String, required: true, unique: true },
  type: { type: String, enum: ['advertiser', 'creator', 'vendor', 'refund'], required: true },

  // Customer
  customerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  customerType: { type: String, enum: ['advertiser', 'creator', 'vendor'] },
  customerName: String,
  customerEmail: String,
  customerAddress: {
    street: String,
    city: String,
    state: String,
    country: String,
    pincode: String,
  },

  // Billing
  billingInfo: {
    gstin: String,
    pan: String,
    billingName: String,
  },

  // Line items
  items: [lineItemSchema],

  // Totals
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  taxRate: { type: Number, default: 18 }, // percentage
  taxAmount: { type: Number, required: true },
  total: { type: Number, required: true },

  // Currency
  currency: { type: String, default: 'INR' },
  exchangeRate: { type: Number, default: 1 },

  // Status
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'refunded'],
    default: 'draft',
  },

  // Dates
  issueDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  paidDate: Date,

  // Payment
  payment: {
    method: String,
    transactionId: String,
    reference: String,
  },

  // Credits
  credits: [{
    code: String,
    amount: Number,
    description: String,
  }],

  // Notes
  notes: String,
  terms: String,

  // RTMN Integration
  twinId: String,
  externalId: String, // from accounting system

  // Audit
  sentCount: { type: Number, default: 0 },
  lastSentAt: Date,
  reminderSentAt: Date,

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Generate invoice number
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const seq = String(count + 1).padStart(5, '0');
    this.invoiceNumber = `INV/${year}${month}/${seq}`;
  }
  next();
});

// Indexes
invoiceSchema.index({ customerId: 1, status: 1 });
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ 'issueDate': -1, status: 1 });
invoiceSchema.index({ 'dueDate': 1, status: 1 });

// Virtuals
invoiceSchema.virtual('isOverdue').get(function() {
  return this.status !== 'paid' && this.dueDate < new Date();
});

invoiceSchema.virtual('daysOverdue').get(function() {
  if (!this.isOverdue) return 0;
  return Math.floor((new Date() - this.dueDate) / (1000 * 60 * 60 * 24));
});

// Methods
invoiceSchema.methods.markPaid = async function(paymentDetails) {
  this.status = 'paid';
  this.paidDate = new Date();
  this.payment = paymentDetails;
  await this.save();
  return this;
};

invoiceSchema.methods.send = async function() {
  this.status = 'sent';
  this.sentCount += 1;
  this.lastSentAt = new Date();
  await this.save();
  return this;
};

// Statics
invoiceSchema.statics.findByCustomer = function(customerId) {
  return this.find({ customerId }).sort({ issueDate: -1 });
};

invoiceSchema.statics.findOverdue = function() {
  return this.find({
    status: { $nin: ['paid', 'cancelled', 'refunded'] },
    dueDate: { $lt: new Date() },
  });
};

invoiceSchema.statics.getRevenue = function(startDate, endDate) {
  return this.aggregate([
    { $match: { status: 'paid', paidDate: { $gte: startDate, $lte: endDate } } },
    { $group: {
      _id: null,
      total: { $sum: '$total' },
      tax: { $sum: '$taxAmount' },
      count: { $sum: 1 },
    }},
  ]);
};

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
