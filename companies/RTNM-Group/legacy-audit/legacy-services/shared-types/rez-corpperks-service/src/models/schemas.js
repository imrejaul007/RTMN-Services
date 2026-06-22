/**
 * CorpPerks MongoDB Models
 * Database schemas for persistence
 */

const mongoose = require('mongoose');

// ============ COMPANY ============
const companySchema = new mongoose.Schema({
  companyId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  gstIn: { type: String },
  address: {
    billing: String,
    shipping: String,
  },
  plan: { type: String, enum: ['basic', 'premium', 'enterprise'], default: 'basic' },
  status: { type: String, enum: ['active', 'suspended', 'trial'], default: 'trial' },
  settings: {
    currency: { type: String, default: 'INR' },
    timezone: { type: String, default: 'Asia/Kolkata' },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ============ EMPLOYEE ============
const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  companyId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  department: String,
  level: String,
  designation: String,
  status: { type: String, enum: ['enrolled', 'pending', 'suspended'], default: 'pending' },
  benefits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Benefit' }],
  walletBalance: { type: Number, default: 0 },
  karmaScore: { type: Number, default: 0 },
  enrolledAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ============ BENEFIT ============
const benefitSchema = new mongoose.Schema({
  companyId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['meal', 'travel', 'wellness', 'learning', 'gift'], required: true },
  description: String,
  amount: { type: Number, required: true },
  frequency: { type: String, enum: ['monthly', 'quarterly', 'yearly'], default: 'monthly' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  eligibility: {
    departments: [String],
    levels: [String],
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ============ BENEFIT USAGE ============
const benefitUsageSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, index: true },
  companyId: { type: String, required: true, index: true },
  benefitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Benefit' },
  benefitType: { type: String, enum: ['meal', 'travel', 'wellness', 'learning', 'gift'] },
  amount: { type: Number, required: true },
  balanceBefore: Number,
  balanceAfter: Number,
  description: String,
  referenceId: String, // booking ID, order ID, etc.
  createdAt: { type: Date, default: Date.now },
});

// ============ BOOKING ============
const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true },
  companyId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true },
  confirmationNumber: String,
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
  property: {
    propertyId: String,
    name: String,
    address: String,
  },
  room: {
    roomId: String,
    name: String,
    bedType: String,
  },
  guest: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
  },
  dates: {
    checkIn: Date,
    checkOut: Date,
    nights: Number,
  },
  pricing: {
    roomRate: Number,
    numberOfRooms: Number,
    subtotal: Number,
    gstAmount: Number,
    totalAmount: Number,
    currency: { type: String, default: 'INR' },
  },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ============ INVOICE ============
const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  companyId: { type: String, required: true, index: true },
  companyName: String,
  gstIn: String,
  billingAddress: String,
  shippingAddress: String,
  items: [{
    description: String,
    quantity: Number,
    rate: Number,
    amount: Number,
    hsnCode: String,
  }],
  subtotal: Number,
  taxableAmount: Number,
  cgst: Number,
  sgst: Number,
  totalTax: Number,
  grandTotal: Number,
  itcEligible: { type: Boolean, default: true },
  einvoiceStatus: String,
  einvoiceAckNumber: String,
  status: { type: String, enum: ['created', 'submitted', 'verified', 'cancelled'], default: 'created' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ============ ORDER ============
const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  orderNumber: String,
  companyId: { type: String, required: true, index: true },
  employeeId: String,
  status: { type: String, enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  items: [{
    productId: String,
    name: String,
    sku: String,
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number,
  }],
  delivery: {
    type: { type: String, enum: ['shipping', 'pickup'] },
    address: String,
    trackingNumber: String,
  },
  pricing: {
    subtotal: Number,
    bulkDiscount: Number,
    gstAmount: Number,
    totalAmount: Number,
  },
  branding: {
    logo: String,
    message: String,
  },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ============ REWARD TRANSACTION ============
const rewardTransactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true, index: true },
  companyId: { type: String, required: true, index: true },
  type: { type: String, enum: ['earn', 'redeem'], required: true },
  amount: { type: Number, required: true },
  source: String,
  description: String,
  referenceId: String,
  balanceAfter: Number,
  createdAt: { type: Date, default: Date.now },
});

// ============ CAMPAIGN ============
const campaignSchema = new mongoose.Schema({
  campaignId: { type: String, required: true, unique: true },
  companyId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['gift', 'karma', 'reward'], required: true },
  description: String,
  status: { type: String, enum: ['draft', 'active', 'paused', 'completed', 'cancelled'], default: 'draft' },
  budget: Number,
  spent: { type: Number, default: 0 },
  startDate: Date,
  endDate: Date,
  eligibleEmployees: [String],
  participants: [{
    employeeId: String,
    enrolledAt: Date,
    participatedAt: Date,
    status: String,
  }],
  target: Number,
  current: { type: Number, default: 0 },
  impactType: String,
  rewards: [{
    type: String,
    amount: Number,
    description: String,
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ============ WALLET ============
const walletSchema = new mongoose.Schema({
  walletId: { type: String, required: true, unique: true },
  companyId: { type: String, required: true, unique: true, index: true },
  balance: { type: Number, default: 0 },
  availableLimit: { type: Number, default: 0 },
  usedAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  type: { type: String, enum: ['corporate', 'employee'], default: 'corporate' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ============ CARD ============
const cardSchema = new mongoose.Schema({
  cardId: { type: String, required: true, unique: true },
  walletId: { type: String, required: true, index: true },
  companyId: { type: String, required: true, index: true },
  employeeId: String,
  cardNumber: String,
  cardNumberLast4: String,
  cardType: { type: String, enum: ['virtual', 'physical'], default: 'virtual' },
  cardholderName: String,
  expiryMonth: String,
  expiryYear: String,
  status: { type: String, enum: ['active', 'frozen', 'cancelled'], default: 'active' },
  limit: Number,
  usedAmount: { type: Number, default: 0 },
  dailyLimit: Number,
  monthlyLimit: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ============ EXPORT MODELS ============
const Company = mongoose.model('Company', companySchema);
const Employee = mongoose.model('Employee', employeeSchema);
const Benefit = mongoose.model('Benefit', benefitSchema);
const BenefitUsage = mongoose.model('BenefitUsage', benefitUsageSchema);
const Booking = mongoose.model('Booking', bookingSchema);
const Invoice = mongoose.model('Invoice', invoiceSchema);
const Order = mongoose.model('Order', orderSchema);
const RewardTransaction = mongoose.model('RewardTransaction', rewardTransactionSchema);
const Campaign = mongoose.model('Campaign', campaignSchema);
const Wallet = mongoose.model('Wallet', walletSchema);
const Card = mongoose.model('Card', cardSchema);

module.exports = {
  Company,
  Employee,
  Benefit,
  BenefitUsage,
  Booking,
  Invoice,
  Order,
  RewardTransaction,
  Campaign,
  Wallet,
  Card,
  mongoose,
};
