/**
 * Database Layer - MongoDB persistence for Finance OS
 *
 * Replaces in-memory Maps with proper MongoDB collections
 */

const mongoose = require('mongoose');
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27027/finance-os';

// ============================================================
// SCHEMAS
// ============================================================

// Chart of Accounts Schema
const AccountSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
    required: true
  },
  subtype: String,
  nature: { type: String, enum: ['Debit', 'Credit'] },
  balance: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  parentId: mongoose.Schema.Types.ObjectId,
  isActive: { type: Boolean, default: true },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

// Journal Entry Schema
const JournalEntrySchema = new mongoose.Schema({
  entryNumber: { type: String, required: true },
  date: { type: Date, required: true },
  description: String,
  entries: [{
    accountCode: String,
    accountName: String,
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    narration: String
  }],
  source: { type: String, enum: ['manual', 'invoice', 'payment', 'receipt', 'payroll', 'adjustment'] },
  reference: String,
  status: { type: String, enum: ['draft', 'posted', 'reversed'], default: 'posted' },
  postedBy: String,
  postedAt: Date
}, { timestamps: true });

// Customer Schema
const CustomerSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  email: String,
  phone: String,
  gstin: String,
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  balance: { type: Number, default: 0 },
  creditLimit: { type: Number, default: 0 },
  paymentTerms: { type: Number, default: 30 },
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' }
}, { timestamps: true });

// Vendor Schema
const VendorSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  email: String,
  phone: String,
  gstin: String,
  pan: String,
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    ifsc: String,
    branch: String
  },
  balance: { type: Number, default: 0 },
  paymentTerms: { type: Number, default: 30 },
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' }
}, { timestamps: true });

// Invoice Schema
const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true },
  type: { type: String, enum: ['sales', 'purchase'], required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  date: { type: Date, required: true },
  dueDate: Date,
  items: [{
    description: String,
    hsn: String,
    quantity: Number,
    rate: Number,
    amount: Number,
    discount: { type: Number, default: 0 },
    taxableAmount: Number,
    cgst: { rate: Number, amount: Number },
    sgst: { rate: Number, amount: Number },
    igst: { rate: Number, amount: Number },
    total: Number
  }],
  subtotal: Number,
  totalTax: Number,
  totalAmount: Number,
  amountPaid: { type: Number, default: 0 },
  amountDue: Number,
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'],
    default: 'draft'
  },
  payments: [{
    date: Date,
    amount: Number,
    mode: String,
    reference: String
  }],
  placeOfSupply: String,
  reverseCharge: { type: Boolean, default: false }
}, { timestamps: true });

// Bank Account Schema
const BankAccountSchema = new mongoose.Schema({
  name: { type: String, required: true },
  bankName: String,
  accountNumber: String,
  ifsc: String,
  type: { type: String, enum: ['checking', 'savings', 'payroll', 'investment'] },
  balance: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  isActive: { type: Boolean, default: true },
  lastSynced: Date
}, { timestamps: true });

// Budget Schema
const BudgetSchema = new mongoose.Schema({
  fiscalYear: { type: String, required: true },
  department: String,
  allocated: { type: Number, required: true },
  spent: { type: Number, default: 0 },
  items: [{
    category: String,
    budgeted: Number,
    actual: Number,
    variance: Number
  }],
  status: { type: String, enum: ['draft', 'approved', 'active', 'closed'], default: 'draft' },
  approvedBy: String,
  approvedAt: Date
}, { timestamps: true });

// Expense Schema
const ExpenseSchema = new mongoose.Schema({
  expenseNumber: { type: String, required: true },
  date: { type: Date, required: true },
  category: { type: String, required: true },
  description: String,
  amount: { type: Number, required: true },
  gstRate: Number,
  gstAmount: Number,
  totalAmount: Number,
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  employeeId: String,
  department: String,
  project: String,
  paymentMode: String,
  reference: String,
  receipt: {
    url: String,
    ocrData: mongoose.Schema.Types.Mixed,
    verified: Boolean
  },
  status: { type: String, enum: ['draft', 'submitted', 'approved', 'rejected', 'paid'], default: 'draft' },
  approvedBy: String,
  approvedAt: Date,
  policyCheck: mongoose.Schema.Types.Mixed
}, { timestamps: true });

// Asset Schema
const AssetSchema = new mongoose.Schema({
  assetCode: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  purchaseDate: { type: Date, required: true },
  purchaseValue: { type: Number, required: true },
  usefulLife: Number, // in months
  depreciationMethod: { type: String, enum: ['straight_line', 'declining', 'double_declining'] },
  salvageValue: Number,
  currentValue: Number,
  accumulatedDepreciation: Number,
  location: String,
  assignedTo: String,
  status: { type: String, enum: ['active', 'disposed', 'sold', 'scrapped'], default: 'active' },
  disposalDate: Date,
  disposalValue: Number,
  disposalGainLoss: Number
}, { timestamps: true });

// Tax Filing Schema
const TaxFilingSchema = new mongoose.Schema({
  type: { type: String, required: true }, // GST, TDS, TCS, IncomeTax
  period: { type: String, required: true }, // e.g., "07-2024"
  form: String, // GSTR-1, GSTR-3B, Form 16A, etc.
  filingDate: Date,
  dueDate: Date,
  status: {
    type: String,
    enum: ['pending', 'filed', 'filed_late', 'accepted', 'rejected', 'pending_payment'],
    default: 'pending'
  },
  amount: Number,
  taxPayable: Number,
  inputTaxCredit: Number,
  interest: Number,
  penalty: Number,
  totalAmount: Number,
  paidAmount: Number,
  paymentDate: Date,
  paidChallan: String,
  acknowledgmentNumber: String,
  filedBy: String
}, { timestamps: true });

// ============================================================
// MODELS
// ============================================================

const Account = mongoose.model('Account', AccountSchema);
const JournalEntry = mongoose.model('JournalEntry', JournalEntrySchema);
const Customer = mongoose.model('Customer', CustomerSchema);
const Vendor = mongoose.model('Vendor', VendorSchema);
const Invoice = mongoose.model('Invoice', InvoiceSchema);
const BankAccount = mongoose.model('BankAccount', BankAccountSchema);
const Budget = mongoose.model('Budget', BudgetSchema);
const Expense = mongoose.model('Expense', ExpenseSchema);
const Asset = mongoose.model('Asset', AssetSchema);
const TaxFiling = mongoose.model('TaxFiling', TaxFilingSchema);

// ============================================================
// DATABASE OPERATIONS
// ============================================================

class Database {
  constructor() {
    this.connected = false;
  }

  async connect() {
    if (this.connected) return;

    try {
      await mongoose.connect(MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      this.connected = true;
      console.log('MongoDB connected:', MONGO_URL);
    } catch (error) {
      console.error('MongoDB connection failed:', error.message);
      // Fall back to in-memory
      this.connected = false;
    }
  }

  async disconnect() {
    if (this.connected) {
      await mongoose.disconnect();
      this.connected = false;
    }
  }

  // Account operations
  async createAccount(data) {
    if (!this.connected) return this.fallbackCreate('account', data);
    const account = new Account(data);
    return account.save();
  }

  async getAccounts(filter = {}) {
    if (!this.connected) return [];
    return Account.find(filter).sort({ code: 1 });
  }

  async updateAccount(code, data) {
    if (!this.connected) return null;
    return Account.findOneAndUpdate({ code }, data, { new: true });
  }

  // Journal operations
  async createJournalEntry(data) {
    if (!this.connected) return this.fallbackCreate('journal', data);
    const entry = new JournalEntry(data);
    return entry.save();
  }

  async getJournalEntries(filter = {}) {
    if (!this.connected) return [];
    return JournalEntry.find(filter).sort({ date: -1 });
  }

  // Customer operations
  async createCustomer(data) {
    if (!this.connected) return this.fallbackCreate('customer', data);
    const customer = new Customer(data);
    return customer.save();
  }

  async getCustomers(filter = {}) {
    if (!this.connected) return [];
    return Customer.find(filter);
  }

  // Vendor operations
  async createVendor(data) {
    if (!this.connected) return this.fallbackCreate('vendor', data);
    const vendor = new Vendor(data);
    return vendor.save();
  }

  async getVendors(filter = {}) {
    if (!this.connected) return [];
    return Vendor.find(filter);
  }

  // Invoice operations
  async createInvoice(data) {
    if (!this.connected) return this.fallbackCreate('invoice', data);
    const invoice = new Invoice(data);
    return invoice.save();
  }

  async getInvoices(filter = {}) {
    if (!this.connected) return [];
    return Invoice.find(filter).sort({ date: -1 });
  }

  async updateInvoice(id, data) {
    if (!this.connected) return null;
    return Invoice.findByIdAndUpdate(id, data, { new: true });
  }

  // Budget operations
  async createBudget(data) {
    if (!this.connected) return this.fallbackCreate('budget', data);
    const budget = new Budget(data);
    return budget.save();
  }

  async getBudgets(filter = {}) {
    if (!this.connected) return [];
    return Budget.find(filter);
  }

  // Expense operations
  async createExpense(data) {
    if (!this.connected) return this.fallbackCreate('expense', data);
    const expense = new Expense(data);
    return expense.save();
  }

  async getExpenses(filter = {}) {
    if (!this.connected) return [];
    return Expense.find(filter).sort({ date: -1 });
  }

  // Asset operations
  async createAsset(data) {
    if (!this.connected) return this.fallbackCreate('asset', data);
    const asset = new Asset(data);
    return asset.save();
  }

  async getAssets(filter = {}) {
    if (!this.connected) return [];
    return Asset.find(filter);
  }

  async calculateDepreciation(assetId) {
    if (!this.connected) return null;
    const asset = await Asset.findById(assetId);
    if (!asset) return null;

    const monthsElapsed = Math.floor(
      (Date.now() - new Date(asset.purchaseDate)) / (30 * 24 * 60 * 60 * 1000)
    );

    let depreciation;
    switch (asset.depreciationMethod) {
      case 'straight_line':
        depreciation = (asset.purchaseValue - asset.salvageValue) / asset.usefulLife;
        break;
      case 'declining':
        depreciation = asset.purchaseValue * 0.15 / 12; // 15% per year
        break;
      case 'double_declining':
        depreciation = asset.purchaseValue * 0.20 / 12; // 20% per year
        break;
      default:
        depreciation = (asset.purchaseValue - asset.salvageValue) / asset.usefulLife;
    }

    const totalDepreciation = Math.min(
      depreciation * monthsElapsed,
      asset.purchaseValue - asset.salvageValue
    );

    return {
      assetId: asset._id,
      currentValue: asset.purchaseValue - totalDepreciation,
      accumulatedDepreciation: totalDepreciation,
      monthlyDepreciation: depreciation,
      monthsElapsed
    };
  }

  // Tax Filing operations
  async createTaxFiling(data) {
    if (!this.connected) return this.fallbackCreate('taxFiling', data);
    const filing = new TaxFiling(data);
    return filing.save();
  }

  async getTaxFilings(filter = {}) {
    if (!this.connected) return [];
    return TaxFiling.find(filter).sort({ period: -1 });
  }

  // Financial Reports
  async getTrialBalance(date) {
    if (!this.connected) return null;

    const accounts = await Account.find({ isActive: true });
    const journalEntries = await JournalEntry.find({
      date: { $lte: date || new Date() },
      status: 'posted'
    });

    // Calculate balances from journal entries
    const balances = {};
    accounts.forEach(a => {
      balances[a.code] = { name: a.name, type: a.type, balance: 0 };
    });

    journalEntries.forEach(entry => {
      entry.entries.forEach(e => {
        if (balances[e.accountCode]) {
          if (balances[e.accountCode].type === 'asset' ||
              balances[e.accountCode].type === 'expense') {
            balances[e.accountCode].balance += e.debit - e.credit;
          } else {
            balances[e.accountCode].balance += e.credit - e.debit;
          }
        }
      });
    });

    return {
      date: date || new Date(),
      accounts: Object.values(balances).filter(a => a.balance !== 0),
      totalDebits: Object.values(balances)
        .filter(a => a.type === 'asset' || a.type === 'expense')
        .reduce((s, a) => s + Math.abs(a.balance), 0),
      totalCredits: Object.values(balances)
        .filter(a => a.type === 'liability' || a.type === 'equity' || a.type === 'revenue')
        .reduce((s, a) => s + Math.abs(a.balance), 0)
    };
  }

  // Fallback for when DB is not available
  fallbackCreate(type, data) {
    return Promise.resolve({ id: `${type}-${Date.now()}`, ...data, _fallback: true });
  }
}

// Singleton instance
const database = new Database();

module.exports = {
  database,
  Account,
  JournalEntry,
  Customer,
  Vendor,
  Invoice,
  BankAccount,
  Budget,
  Expense,
  Asset,
  TaxFiling
};
