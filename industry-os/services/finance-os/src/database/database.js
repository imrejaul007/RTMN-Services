/**
 * Database Layer - MongoDB persistence for Finance OS
 *
 * Provides both MongoDB and in-memory fallbacks
 */

// Try to load mongoose
let mongoose;
let mongooseAvailable = false;

try {
  mongoose = require('mongoose');
  mongooseAvailable = true;
} catch (e) {
  console.log('MongoDB not installed - using in-memory storage');
}

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27027/finance-os';

// ============================================================
// IN-MEMORY STORAGE (Fallback)
// ============================================================

class InMemoryDB {
  constructor() {
    this.collections = new Map();
  }

  getCollection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    return this.collections.get(name);
  }

  insertOne(collection, data) {
    const id = data._id || `${collection}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    data._id = id;
    this.getCollection(collection).set(id, { ...data });
    return data;
  }

  find(collection, filter = {}) {
    const items = Array.from(this.getCollection(collection).values());
    return items.filter(item => {
      return Object.entries(filter).every(([key, value]) => item[key] === value);
    });
  }

  findOne(collection, filter = {}) {
    return this.find(collection, filter)[0] || null;
  }

  updateOne(collection, filter, update) {
    const items = this.find(collection, filter);
    if (items.length === 0) return null;

    const item = items[0];
    Object.assign(item, update);
    return item;
  }

  deleteOne(collection, filter) {
    const items = this.find(collection, filter);
    if (items.length === 0) return null;

    const id = items[0]._id;
    this.getCollection(collection).delete(id);
    return { deletedCount: 1 };
  }
}

const memoryDB = new InMemoryDB();

// ============================================================
// SCHEMAS (MongoDB - if available)
// ============================================================

let Account, JournalEntry, Customer, Vendor, Invoice, BankAccount, Budget, Expense, Asset, TaxFiling;

if (mongooseAvailable) {
  // Account Schema
  const AccountSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['asset', 'liability', 'equity', 'revenue', 'expense'], required: true },
    subtype: String,
    nature: { type: String, enum: ['Debit', 'Credit'] },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    isActive: { type: Boolean, default: true },
    metadata: mongoose.Schema.Types.Mixed
  }, { timestamps: true });

  Account = mongoose.model('Account', AccountSchema);

  // Journal Entry Schema
  const JournalEntrySchema = new mongoose.Schema({
    entryNumber: { type: String, required: true },
    date: { type: Date, required: true },
    description: String,
    entries: [{
      accountCode: String,
      accountName: String,
      debit: { type: Number, default: 0 },
      credit: { type: Number, default: 0 }
    }],
    source: { type: String, enum: ['manual', 'invoice', 'payment', 'receipt', 'payroll', 'adjustment'] },
    status: { type: String, enum: ['draft', 'posted', 'reversed'], default: 'posted' }
  }, { timestamps: true });

  JournalEntry = mongoose.model('JournalEntry', JournalEntrySchema);

  // Customer Schema
  const CustomerSchema = new mongoose.Schema({
    code: { type: String, required: true },
    name: { type: String, required: true },
    email: String,
    phone: String,
    gstin: String,
    balance: { type: Number, default: 0 },
    creditLimit: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' }
  }, { timestamps: true });

  Customer = mongoose.model('Customer', CustomerSchema);

  // Vendor Schema
  const VendorSchema = new mongoose.Schema({
    code: { type: String, required: true },
    name: { type: String, required: true },
    email: String,
    phone: String,
    gstin: String,
    balance: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' }
  }, { timestamps: true });

  Vendor = mongoose.model('Vendor', VendorSchema);

  // Invoice Schema
  const InvoiceSchema = new mongoose.Schema({
    invoiceNumber: { type: String, required: true },
    type: { type: String, enum: ['sales', 'purchase'], required: true },
    customerId: mongoose.Schema.Types.ObjectId,
    vendorId: mongoose.Schema.Types.ObjectId,
    date: { type: Date, required: true },
    items: [{
      description: String,
      hsn: String,
      quantity: Number,
      rate: Number,
      amount: Number,
      taxableAmount: Number,
      total: Number
    }],
    totalAmount: Number,
    amountPaid: { type: Number, default: 0 },
    amountDue: Number,
    status: { type: String, enum: ['draft', 'sent', 'paid', 'partial', 'overdue'], default: 'draft' }
  }, { timestamps: true });

  Invoice = mongoose.model('Invoice', InvoiceSchema);

  // Asset Schema
  const AssetSchema = new mongoose.Schema({
    assetCode: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    purchaseDate: { type: Date, required: true },
    purchaseValue: { type: Number, required: true },
    usefulLife: Number,
    depreciationMethod: { type: String, enum: ['straight_line', 'declining', 'double_declining'] },
    currentValue: Number,
    accumulatedDepreciation: Number,
    status: { type: String, enum: ['active', 'disposed', 'sold'], default: 'active' }
  }, { timestamps: true });

  Asset = mongoose.model('Asset', AssetSchema);

  // Budget Schema
  const BudgetSchema = new mongoose.Schema({
    fiscalYear: { type: String, required: true },
    department: String,
    allocated: { type: Number, required: true },
    spent: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'approved', 'active', 'closed'], default: 'draft' }
  }, { timestamps: true });

  Budget = mongoose.model('Budget', BudgetSchema);

  // Expense Schema
  const ExpenseSchema = new mongoose.Schema({
    expenseNumber: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['draft', 'submitted', 'approved', 'rejected'], default: 'draft' }
  }, { timestamps: true });

  Expense = mongoose.model('Expense', ExpenseSchema);

  // Bank Account Schema
  const BankAccountSchema = new mongoose.Schema({
    name: { type: String, required: true },
    bankName: String,
    accountNumber: String,
    type: { type: String, enum: ['checking', 'savings', 'payroll'] },
    balance: { type: Number, default: 0 }
  }, { timestamps: true });

  BankAccount = mongoose.model('BankAccount', BankAccountSchema);

  // Tax Filing Schema
  const TaxFilingSchema = new mongoose.Schema({
    type: { type: String, required: true },
    period: { type: String, required: true },
    form: String,
    status: { type: String, enum: ['pending', 'filed', 'accepted', 'rejected'], default: 'pending' },
    amount: Number
  }, { timestamps: true });

  TaxFiling = mongoose.model('TaxFiling', TaxFilingSchema);
}

// ============================================================
// DATABASE CLASS
// ============================================================

class Database {
  constructor() {
    this.connected = false;
  }

  async connect() {
    if (!mongooseAvailable) {
      console.log('MongoDB not available - using in-memory storage');
      return;
    }

    try {
      await mongoose.connect(MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      this.connected = true;
      console.log('MongoDB connected:', MONGO_URL);
    } catch (error) {
      console.error('MongoDB connection failed:', error.message);
    }
  }

  // Account operations
  async createAccount(data) {
    if (mongooseAvailable && this.connected) {
      const account = new Account(data);
      return account.save();
    }
    return memoryDB.insertOne('accounts', data);
  }

  async getAccounts(filter = {}) {
    if (mongooseAvailable && this.connected) {
      return Account.find(filter).sort({ code: 1 });
    }
    return memoryDB.find('accounts', filter);
  }

  // Journal operations
  async createJournalEntry(data) {
    if (mongooseAvailable && this.connected) {
      const entry = new JournalEntry(data);
      return entry.save();
    }
    return memoryDB.insertOne('journalEntries', data);
  }

  async getJournalEntries(filter = {}) {
    if (mongooseAvailable && this.connected) {
      return JournalEntry.find(filter).sort({ date: -1 });
    }
    return memoryDB.find('journalEntries', filter);
  }

  // Customer operations
  async createCustomer(data) {
    if (mongooseAvailable && this.connected) {
      const customer = new Customer(data);
      return customer.save();
    }
    return memoryDB.insertOne('customers', data);
  }

  async getCustomers(filter = {}) {
    if (mongooseAvailable && this.connected) {
      return Customer.find(filter);
    }
    return memoryDB.find('customers', filter);
  }

  // Vendor operations
  async createVendor(data) {
    if (mongooseAvailable && this.connected) {
      const vendor = new Vendor(data);
      return vendor.save();
    }
    return memoryDB.insertOne('vendors', data);
  }

  async getVendors(filter = {}) {
    if (mongooseAvailable && this.connected) {
      return Vendor.find(filter);
    }
    return memoryDB.find('vendors', filter);
  }

  // Invoice operations
  async createInvoice(data) {
    if (mongooseAvailable && this.connected) {
      const invoice = new Invoice(data);
      return invoice.save();
    }
    return memoryDB.insertOne('invoices', data);
  }

  async getInvoices(filter = {}) {
    if (mongooseAvailable && this.connected) {
      return Invoice.find(filter).sort({ date: -1 });
    }
    return memoryDB.find('invoices', filter);
  }

  // Budget operations
  async createBudget(data) {
    if (mongooseAvailable && this.connected) {
      const budget = new Budget(data);
      return budget.save();
    }
    return memoryDB.insertOne('budgets', data);
  }

  async getBudgets(filter = {}) {
    if (mongooseAvailable && this.connected) {
      return Budget.find(filter);
    }
    return memoryDB.find('budgets', filter);
  }

  // Expense operations
  async createExpense(data) {
    if (mongooseAvailable && this.connected) {
      const expense = new Expense(data);
      return expense.save();
    }
    return memoryDB.insertOne('expenses', data);
  }

  async getExpenses(filter = {}) {
    if (mongooseAvailable && this.connected) {
      return Expense.find(filter).sort({ date: -1 });
    }
    return memoryDB.find('expenses', filter);
  }

  // Asset operations
  async createAsset(data) {
    if (mongooseAvailable && this.connected) {
      const asset = new Asset(data);
      return asset.save();
    }
    return memoryDB.insertOne('assets', data);
  }

  async getAssets(filter = {}) {
    if (mongooseAvailable && this.connected) {
      return Asset.find(filter);
    }
    return memoryDB.find('assets', filter);
  }

  // Tax Filing operations
  async createTaxFiling(data) {
    if (mongooseAvailable && this.connected) {
      const filing = new TaxFiling(data);
      return filing.save();
    }
    return memoryDB.insertOne('taxFilings', data);
  }

  async getTaxFilings(filter = {}) {
    if (mongooseAvailable && this.connected) {
      return TaxFiling.find(filter).sort({ period: -1 });
    }
    return memoryDB.find('taxFilings', filter);
  }

  // Financial Reports
  async getTrialBalance(date) {
    const accounts = await this.getAccounts({ isActive: true });
    const journalEntries = await this.getJournalEntries({
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
          if (balances[e.accountCode].type === 'asset' || balances[e.accountCode].type === 'expense') {
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
}

// Singleton instance
const database = new Database();

module.exports = {
  database,
  memoryDB,
  mongooseAvailable,
  // Export models if available
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
