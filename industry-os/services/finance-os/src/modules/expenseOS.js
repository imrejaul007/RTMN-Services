/**
 * ExpenseOS - Enhanced Corporate Expense Management
 *
 * Features:
 * - Corporate Cards with real-time controls
 * - Receipt OCR with AI categorization
 * - Travel Booking Integration
 * - Policy Engine
 * - Cost Optimization
 */

const { v4: uuidv4 } = require('uuid');

// ============================================================
// CORPORATE CARD MODULE
// ============================================================

class CorporateCard {
  constructor(data) {
    this.id = uuidv4();
    this.employeeId = data.employeeId;
    this.employeeName = data.employeeName;
    this.type = data.type || 'virtual'; // physical, virtual
    this.lastFour = data.lastFour || Math.floor(1000 + Math.random() * 9000).toString();
    this.status = 'active'; // active, frozen, cancelled
    this.limits = {
      daily: data.dailyLimit || 50000,
      monthly: data.monthlyLimit || 200000,
      perTransaction: data.perTransactionLimit || 50000
    };
    this.controls = {
      allowedCategories: data.allowedCategories || [],
      blockedCategories: data.blockedCategories || [],
      allowedMerchants: data.allowedMerchants || [],
      blockedMerchants: data.blockedMerchants || [],
      allowedCountries: data.allowedCountries || ['IN'],
      blockedCountries: data.blockedCountries || []
    };
    this.spent = {
      today: 0,
      thisMonth: 0,
      transactionCount: 0
    };
    this.createdAt = new Date();
  }

  checkTransaction(tx) {
    const issues = [];

    // Amount checks
    if (tx.amount > this.limits.perTransaction) {
      issues.push({
        type: 'limit_exceeded',
        field: 'perTransaction',
        limit: this.limits.perTransaction,
        actual: tx.amount
      });
    }

    if (this.spent.today + tx.amount > this.limits.daily) {
      issues.push({
        type: 'daily_limit_exceeded',
        limit: this.limits.daily,
        current: this.spent.today,
        requested: tx.amount
      });
    }

    // Category checks
    if (this.controls.blockedCategories.includes(tx.category)) {
      issues.push({
        type: 'category_blocked',
        category: tx.category
      });
    }

    // Merchant checks
    if (this.controls.blockedMerchants.includes(tx.merchant)) {
      issues.push({
        type: 'merchant_blocked',
        merchant: tx.merchant
      });
    }

    // Geographic checks
    if (this.controls.blockedCountries.includes(tx.country)) {
      issues.push({
        type: 'country_blocked',
        country: tx.country
      });
    }

    return {
      approved: issues.length === 0,
      issues,
      cardStatus: this.status
    };
  }

  processTransaction(tx) {
    const check = this.checkTransaction(tx);

    if (check.approved) {
      this.spent.today += tx.amount;
      this.spent.thisMonth += tx.amount;
      this.spent.transactionCount++;
    }

    return check;
  }

  freeze() {
    this.status = 'frozen';
    return this;
  }

  unfreeze() {
    this.status = 'active';
    return this;
  }

  updateLimits(limits) {
    this.limits = { ...this.limits, ...limits };
    return this;
  }
}

// ============================================================
// POLICY ENGINE
// ============================================================

class PolicyEngine {
  constructor() {
    this.policies = new Map();
    this.violations = [];
  }

  addPolicy(policy) {
    const id = uuidv4();
    this.policies.set(id, {
      id,
      name: policy.name,
      type: policy.type, // travel, food, procurement, general
      rules: policy.rules,
      actions: policy.actions || ['warn'], // warn, block, require_approval
      priority: policy.priority || 0,
      active: true,
      createdAt: new Date()
    });
    return id;
  }

  evaluate(expense) {
    const applicablePolicies = Array.from(this.policies.values())
      .filter(p => p.active && p.type === expense.type)
      .sort((a, b) => b.priority - a.priority);

    const violations = [];
    const warnings = [];
    const approvals = [];

    for (const policy of applicablePolicies) {
      for (const rule of policy.rules) {
        const result = this.evaluateRule(rule, expense);

        if (result.violated) {
          violations.push({
            policy: policy.name,
            policyId: policy.id,
            rule: rule.description,
            actual: result.actual,
            expected: rule.condition,
            action: policy.actions.includes('block') ? 'blocked' : 'warning'
          });

          if (policy.actions.includes('require_approval')) {
            approvals.push({
              policy: policy.name,
              reason: rule.description
            });
          }
        } else if (result.warning) {
          warnings.push({
            policy: policy.name,
            warning: result.warning
          });
        }
      }
    }

    return {
      allowed: violations.filter(v => v.action !== 'blocked').length === violations.length,
      violations,
      warnings,
      approvalsRequired: approvals,
      autoApproved: violations.length === 0
    };
  }

  evaluateRule(rule, expense) {
    const value = expense[rule.field];
    const condition = rule.condition;

    switch (rule.operator) {
      case 'gt':
        return { violated: value > condition.value, actual: value, expected: `> ${condition.value}` };
      case 'lt':
        return { violated: value < condition.value, actual: value, expected: `< ${condition.value}` };
      case 'eq':
        return { violated: value === condition.value, actual: value, expected: `= ${condition.value}` };
      case 'in':
        return { violated: !condition.values.includes(value), actual: value, expected: `in [${condition.values.join(', ')}]` };
      case 'not_in':
        return { violated: condition.values.includes(value), actual: value, expected: `not in [${condition.values.join(', ')}]` };
      case 'contains':
        return { violated: !value.includes(condition.value), actual: value, expected: `contains ${condition.value}` };
      default:
        return { violated: false };
    }
  }
}

// ============================================================
// RECEIPT INTELLIGENCE
// ============================================================

class ReceiptIntelligence {
  constructor() {
    this.categories = [
      'travel', 'accommodation', 'food', 'transport',
      'office_supplies', 'software', 'equipment', 'fuel',
      'communication', 'entertainment', 'training', 'other'
    ];
  }

  async processReceipt(imageData) {
    // Simulated OCR + AI extraction
    // In production, would integrate with OCR service (AWS Textract, Google Vision)

    const extracted = {
      merchant: this.extractMerchant(imageData),
      amount: this.extractAmount(imageData),
      date: this.extractDate(imageData),
      category: this.categorize(imageData),
      confidence: 0.85
    };

    return extracted;
  }

  extractMerchant(data) {
    // Simulated extraction
    const merchants = ['Taj Hotel', 'Uber', 'Amazon', 'Swiggy', 'MakeMyTrip'];
    return merchants[Math.floor(Math.random() * merchants.length)];
  }

  extractAmount(data) {
    // Simulated extraction
    return Math.floor(100 + Math.random() * 5000);
  }

  extractDate(data) {
    return new Date().toISOString().split('T')[0];
  }

  categorize(data) {
    // AI categorization based on merchant/amount/patterns
    const categoryWeights = {
      travel: ['flight', 'uber', 'ola', 'taxi', 'airways'],
      accommodation: ['hotel', 'taj', 'marriott', 'hilton', 'airbnb'],
      food: ['swiggy', 'zomato', 'restaurant', 'cafe'],
      transport: ['fuel', 'petrol', 'diesel', 'metro'],
      software: ['aws', 'google', 'microsoft', 'slack'],
      equipment: ['amazon', 'flipkart', 'electronics']
    };

    // Simple categorization
    return this.categories[Math.floor(Math.random() * this.categories.length)];
  }

  detectDuplicates(newReceipt, existingReceipts) {
    const threshold = 0.8; // 80% similarity threshold

    for (const existing of existingReceipts) {
      const similarity = this.calculateSimilarity(newReceipt, existing);

      if (similarity > threshold) {
        return {
          duplicate: true,
          existingReceipt: existing,
          confidence: similarity
        };
      }
    }

    return { duplicate: false };
  }

  calculateSimilarity(r1, r2) {
    let score = 0;
    let maxScore = 0;

    // Amount similarity
    maxScore += 40;
    if (r1.amount === r2.amount) score += 40;
    else if (Math.abs(r1.amount - r2.amount) < 100) score += 20;

    // Date similarity (same day = high)
    maxScore += 30;
    if (r1.date === r2.date) score += 30;
    else if (this.sameWeek(r1.date, r2.date)) score += 15;

    // Merchant similarity
    maxScore += 30;
    if (r1.merchant === r2.merchant) score += 30;
    else if (r1.merchant.toLowerCase().includes(r2.merchant.toLowerCase())) score += 15;

    return score / maxScore;
  }

  sameWeek(d1, d2) {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    return Math.abs(date1 - date2) < oneWeek;
  }
}

// ============================================================
// TRAVEL MANAGEMENT
// ============================================================

class TravelManagement {
  constructor() {
    this.bookings = new Map();
    this.policies = this.getDefaultPolicies();
  }

  getDefaultPolicies() {
    return {
      flights: {
        domestic: { class: 'economy', advanceBooking: 14 },
        international: { class: 'economy', advanceBooking: 30 }
      },
      hotels: {
        metro: { maxPerNight: 8000 },
        tier2: { maxPerNight: 5000 }
      },
      meals: {
        domestic: { breakfast: 500, lunch: 800, dinner: 1200 },
        international: { breakfast: 1500, lunch: 2500, dinner: 4000 }
      }
    };
  }

  checkTravelPolicy(request) {
    const issues = [];

    // Flight class check
    if (request.flightClass && request.flightClass !== 'economy') {
      if (!request.approvalReason) {
        issues.push({
          type: 'flight_class',
          message: `${request.flightClass} class requires manager approval`,
          required: true
        });
      }
    }

    // Advance booking
    const daysUntilTrip = Math.ceil((new Date(request.departureDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilTrip < this.policies.flights.domestic.advanceBooking) {
      issues.push({
        type: 'late_booking',
        message: `Book ${this.policies.flights.domestic.advanceBooking - daysUntilTrip} days earlier for best rates`,
        required: false
      });
    }

    // Hotel rate check
    if (request.hotelRate > this.policies.hotels.metro.maxPerNight) {
      issues.push({
        type: 'hotel_rate',
        message: `Hotel rate exceeds policy (max ₹${this.policies.hotels.metro.maxPerNight}/night)`,
        required: true
      });
    }

    return {
      approved: issues.filter(i => i.required).length === 0,
      issues,
      policy: this.policies
    };
  }

  createBooking(request) {
    const check = this.checkTravelPolicy(request);

    if (!check.approved) {
      return { success: false, errors: check.issues };
    }

    const booking = {
      id: uuidv4(),
      employeeId: request.employeeId,
      type: 'travel',
      details: request,
      status: 'approved',
      approvedAt: new Date(),
      createdAt: new Date()
    };

    this.bookings.set(booking.id, booking);
    return { success: true, booking };
  }
}

// ============================================================
// COST OPTIMIZATION
// ============================================================

class CostOptimization {
  constructor() {
    this.analyzed = new Map();
  }

  analyzeExpenses(expenses) {
    const analysis = {
      totalSpend: 0,
      byCategory: {},
      byDepartment: {},
      byVendor: {},
      trends: {},
      savings: [],
      recommendations: []
    };

    expenses.forEach(exp => {
      analysis.totalSpend += exp.amount;

      // By category
      analysis.byCategory[exp.category] = (analysis.byCategory[exp.category] || 0) + exp.amount;

      // By department
      analysis.byDepartment[exp.department] = (analysis.byDepartment[exp.department] || 0) + exp.amount;

      // By vendor
      if (exp.vendor) {
        analysis.byVendor[exp.vendor] = (analysis.byVendor[exp.vendor] || 0) + exp.amount;
      }
    });

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    // Calculate potential savings
    analysis.savings = this.calculateSavings(analysis);

    return analysis;
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    // Vendor consolidation
    const vendors = Object.entries(analysis.byVendor)
      .sort((a, b) => b[1] - a[1]);

    if (vendors.length > 5) {
      const smallVendors = vendors.slice(5);
      const smallSpend = smallVendors.reduce((s, v) => s + v[1], 0);
      recommendations.push({
        type: 'vendor_consolidation',
        impact: 'medium',
        description: `Consolidate ${smallVendors.length} small vendors to reduce administrative costs`,
        potentialSavings: smallSpend * 0.15 // 15% savings from consolidation
      });
    }

    // Software subscriptions
    if (analysis.byCategory.software) {
      recommendations.push({
        type: 'software_audit',
        impact: 'high',
        description: 'Review software subscriptions for duplicates and unused licenses',
        potentialSavings: analysis.byCategory.software * 0.25 // 25% savings potential
      });
    }

    // Travel optimization
    if (analysis.byCategory.travel) {
      recommendations.push({
        type: 'travel_policy',
        impact: 'medium',
        description: 'Implement advance booking policy to reduce travel costs',
        potentialSavings: analysis.byCategory.travel * 0.20 // 20% savings
      });
    }

    return recommendations;
  }

  calculateSavings(analysis) {
    return analysis.recommendations.map(r => ({
      category: r.type,
      potentialSavings: r.potentialSavings,
      effort: r.impact === 'high' ? 'low' : 'medium'
    }));
  }
}

// ============================================================
// EXPENSE MANAGEMENT
// ============================================================

class ExpenseManager {
  constructor() {
    this.expenses = new Map();
    this.cards = new Map();
    this.policyEngine = new PolicyEngine();
    this.receiptIntelligence = new ReceiptIntelligence();
    this.travel = new TravelManagement();
    this.costOptimization = new CostOptimization();
  }

  submitExpense(data) {
    // Check policy
    const policyCheck = this.policyEngine.evaluate(data);

    // Check for duplicates
    const existingExpenses = Array.from(this.expenses.values());
    const duplicateCheck = this.receiptIntelligence.detectDuplicates(data, existingExpenses);

    if (duplicateCheck.duplicate) {
      return {
        success: false,
        error: 'Duplicate expense detected',
        similarExpense: duplicateCheck.existingReceipt
      };
    }

    // Create expense
    const expense = {
      id: uuidv4(),
      ...data,
      status: policyCheck.autoApproved ? 'approved' : 'pending_approval',
      policyCheck,
      submittedAt: new Date(),
      approvals: policyCheck.approvalsRequired || []
    };

    this.expenses.set(expense.id, expense);

    return {
      success: true,
      expense,
      policyCheck
    };
  }

  getExpenseReport(filters = {}) {
    let expenses = Array.from(this.expenses.values());

    if (filters.employeeId) {
      expenses = expenses.filter(e => e.employeeId === filters.employeeId);
    }
    if (filters.department) {
      expenses = expenses.filter(e => e.department === filters.department);
    }
    if (filters.category) {
      expenses = expenses.filter(e => e.category === filters.category);
    }
    if (filters.startDate) {
      expenses = expenses.filter(e => new Date(e.date) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      expenses = expenses.filter(e => new Date(e.date) <= new Date(filters.endDate));
    }

    return this.costOptimization.analyzeExpenses(expenses);
  }
}

module.exports = {
  CorporateCard,
  PolicyEngine,
  ReceiptIntelligence,
  TravelManagement,
  CostOptimization,
  ExpenseManager
};
