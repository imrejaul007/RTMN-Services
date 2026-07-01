/**
 * Finance OS Tests - Unit tests for core modules
 * Run with: node --test __tests__/finance-tests.js
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert');

// ============================================================
// TAX OS TESTS (local module)
// ============================================================

describe('TaxOS - India GST', () => {
  const taxOS = require('../src/modules/taxOS');

  it('should calculate GST correctly', () => {
    const result = taxOS.calculateGST(100000, 18, 'intra');

    assert.strictEqual(result.rate, 18);
    assert.strictEqual(result.cgst, 9000);
    assert.strictEqual(result.sgst, 9000);
    assert.strictEqual(result.total, 118000);
  });

  it('should calculate inter-state IGST', () => {
    const result = taxOS.calculateGST(100000, 18, 'inter');

    assert.strictEqual(result.igst, 18000);
    assert.strictEqual(result.cgst, 0);
  });

  it('should calculate TDS correctly', () => {
    const result = taxOS.calculateTDS('194Q', 6000000);

    assert.strictEqual(result.rate, 0.1);
    assert.strictEqual(result.tdsAmount, 6000);
    assert.strictEqual(result.netAmount, 5994000);
  });

  it('should apply TDS threshold', () => {
    const result = taxOS.calculateTDS('194Q', 400000);

    assert.strictEqual(result.tdsAmount, 0);
    assert.ok(result.note.includes('threshold'));
  });

  it('should calculate UAE VAT', () => {
    const result = taxOS.calculateVAT(10000);

    assert.strictEqual(result.vatRate, 5);
    assert.strictEqual(result.vatAmount, 500);
    assert.strictEqual(result.total, 10500);
  });

  it('should calculate income tax (new regime)', () => {
    const result = taxOS.calculateIncomeTax(1000000, 'new');

    assert.ok(result.totalTax >= 0);
    assert.strictEqual(result.regime, 'new');
  });

  it('should calculate income tax (old regime)', () => {
    const result = taxOS.calculateIncomeTax(500000, 'old');

    assert.ok(result.totalTax >= 0);
    assert.strictEqual(result.regime, 'old');
  });
});

// ============================================================
// EXPENSE OS TESTS
// ============================================================

describe('ExpenseOS - Corporate Card', () => {
  const expenseOS = require('../src/modules/expenseOS');

  it('should create a corporate card', () => {
    const card = new expenseOS.CorporateCard({
      employeeId: 'EMP001',
      employeeName: 'John Doe',
      dailyLimit: 50000
    });

    assert.strictEqual(card.employeeName, 'John Doe');
    assert.strictEqual(card.status, 'active');
  });

  it('should approve valid transaction', () => {
    const card = new expenseOS.CorporateCard({
      employeeId: 'EMP001',
      dailyLimit: 50000
    });

    const result = card.checkTransaction({ amount: 10000, category: 'travel' });

    assert.strictEqual(result.approved, true);
    assert.strictEqual(result.issues.length, 0);
  });

  it('should block transaction exceeding limit', () => {
    const card = new expenseOS.CorporateCard({
      employeeId: 'EMP001',
      perTransactionLimit: 10000
    });

    const result = card.checkTransaction({ amount: 50000 });

    assert.strictEqual(result.approved, false);
  });

  it('should freeze card', () => {
    const card = new expenseOS.CorporateCard({ employeeId: 'EMP001' });
    card.freeze();

    assert.strictEqual(card.status, 'frozen');
  });
});

describe('ExpenseOS - Policy Engine', () => {
  const expenseOS = require('../src/modules/expenseOS');

  it('should create and evaluate policy', () => {
    const engine = new expenseOS.PolicyEngine();

    engine.addPolicy({
      name: 'Travel Limit',
      type: 'travel',
      rules: [{ field: 'amount', operator: 'lt', condition: { value: 100000 }, description: 'Under 1L' }],
      actions: ['warn']
    });

    const result = engine.evaluate({ type: 'travel', amount: 50000 });
    assert.strictEqual(result.allowed, true);
  });

  it('should create and evaluate policies', () => {
    const engine = new expenseOS.PolicyEngine();

    const policyId = engine.addPolicy({
      name: 'Food Limit',
      type: 'food',
      rules: [{ field: 'amount', operator: 'gt', condition: { value: 5000 }, description: 'Over 5000' }],
      actions: ['warn']
    });

    assert.ok(policyId);

    const result = engine.evaluate({ type: 'food', amount: 10000 });
    assert.ok(result);
  });
});

describe('ExpenseOS - Receipt Intelligence', () => {
  const expenseOS = require('../src/modules/expenseOS');

  it('should detect duplicate receipts', () => {
    const intelligence = new expenseOS.ReceiptIntelligence();

    const existing = [{ merchant: 'Taj Hotel', amount: 5000, date: '2024-01-15' }];
    const result = intelligence.detectDuplicates(
      { merchant: 'Taj Hotel', amount: 5000, date: '2024-01-15' },
      existing
    );

    assert.strictEqual(result.duplicate, true);
  });

  it('should not flag different receipts as duplicates', () => {
    const intelligence = new expenseOS.ReceiptIntelligence();

    const existing = [{ merchant: 'Taj Hotel', amount: 5000, date: '2024-01-15' }];
    const result = intelligence.detectDuplicates(
      { merchant: 'Uber', amount: 500, date: '2024-01-16' },
      existing
    );

    assert.strictEqual(result.duplicate, false);
  });
});

describe('ExpenseOS - Cost Optimization', () => {
  const expenseOS = require('../src/modules/expenseOS');

  it('should analyze expenses', () => {
    const optimizer = new expenseOS.CostOptimization();

    const expenses = [
      { amount: 10000, category: 'software', department: 'Engineering', vendor: 'AWS' },
      { amount: 5000, category: 'travel', department: 'Sales', vendor: 'Uber' }
    ];

    const analysis = optimizer.analyzeExpenses(expenses);

    assert.strictEqual(analysis.totalSpend, 15000);
    assert.ok(analysis.byCategory.software > 0);
    assert.ok(analysis.recommendations.length >= 0);
  });
});

describe('ExpenseOS - Travel Management', () => {
  const expenseOS = require('../src/modules/expenseOS');

  it('should check travel policy', () => {
    const travel = new expenseOS.TravelManagement();

    const request = {
      employeeId: 'EMP001',
      flightClass: 'economy',
      departureDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      hotelRate: 5000
    };

    const result = travel.checkTravelPolicy(request);

    assert.strictEqual(result.approved, true);
  });

  it('should flag hotel rate violations', () => {
    const travel = new expenseOS.TravelManagement();

    const request = {
      employeeId: 'EMP001',
      hotelRate: 15000 // Over 8000 limit
    };

    const result = travel.checkTravelPolicy(request);

    assert.strictEqual(result.approved, false);
    assert.ok(result.issues.some(i => i.type === 'hotel_rate'));
  });
});

// ============================================================
// INTEGRATION TESTS
// ============================================================

describe('Integration - FX Rates', () => {
  const fx = require('../src/integrations/fxIntegration');

  it('should convert USD to INR', async () => {
    const result = await fx.convert(1000, 'USD', 'INR');

    assert.strictEqual(result.from, 'USD');
    assert.strictEqual(result.to, 'INR');
    assert.ok(result.rate > 0);
    assert.ok(result.convertedAmount > 0);
  });

  it('should return 1 for same currency', async () => {
    const rate = await fx.getRate('USD', 'USD');
    assert.strictEqual(rate, 1);
  });

  it('should get forward rate', async () => {
    const forward = await fx.getForwardRate('USD', 'INR', 90);

    assert.ok(forward.forwardRate > 0);
    assert.strictEqual(forward.tenorDays, 90);
  });

  it('should get all rates', async () => {
    const rates = await fx.getAllRates('INR');

    assert.ok(rates.USD);
    assert.ok(rates.EUR);
    assert.ok(rates.GBP);
  });
});

describe('Integration - Bank', () => {
  const bank = require('../src/integrations/bankIntegration');

  it('should list supported banks', () => {
    const banks = Object.keys(bank.BANKS);

    assert.ok(banks.includes('hdfc'));
    assert.ok(banks.includes('icici'));
    assert.ok(banks.includes('sbi'));
    assert.ok(banks.includes('axis'));
    assert.ok(banks.includes('yes'));
  });

  it('should get HDFC balance', async () => {
    const result = await bank.getBalance('hdfc', '123456789');

    assert.strictEqual(result.bank, 'HDFC Bank');
    assert.ok(result.balance >= 0);
  });

  it('should get ICICI statement', async () => {
    const result = await bank.getStatement('icici', '123456789', '2024-01-01', '2024-01-31');

    assert.ok(result.transactions.length >= 0);
  });

  it('should categorize transactions', () => {
    const cat = bank.categorizeTransaction('NEFT Received from Infosys');

    assert.strictEqual(cat, 'bank_transfer');
  });
});

describe('Integration - Auth', () => {
  const auth = require('../src/integrations/authIntegration');

  it('should return health status', async () => {
    const result = await auth.healthCheck();

    assert.ok(result.hasOwnProperty('healthy'));
  });
});

describe('Integration - OCR', () => {
  const ocr = require('../src/integrations/ocrIntegration');

  it('should process receipt (mock)', async () => {
    const result = await ocr.processReceipt('test-image-data');

    assert.ok(result.merchant);
    assert.ok(result.amount > 0);
    assert.ok(result.category);
  });

  it('should return health status', async () => {
    const result = await ocr.healthCheck();

    assert.ok(result.hasOwnProperty('healthy'));
  });
});

// ============================================================
// DATABASE TESTS
// ============================================================

describe('Database - Schema Definitions', () => {
  const db = require('../src/database/database');

  it('should export database module', () => {
    assert.ok(db.database);
    assert.ok(db.memoryDB);
    assert.ok(db.mongooseAvailable !== undefined);
  });

  it('should have CRUD methods', () => {
    assert.ok(typeof db.database.createAccount === 'function');
    assert.ok(typeof db.database.getAccounts === 'function');
    assert.ok(typeof db.database.createJournalEntry === 'function');
  });

  it('should have report methods', () => {
    assert.ok(typeof db.database.getTrialBalance === 'function');
  });
});

// ============================================================
// SUMMARY
// ============================================================

console.log('\n✅ Finance OS Unit Tests Ready');
console.log('Run with: node --test __tests__/finance-tests.js\n');
