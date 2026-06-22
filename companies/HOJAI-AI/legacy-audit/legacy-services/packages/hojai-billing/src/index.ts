/**
 * HOJAI Billing Service
 *
 * Subscription management, metering, AI employee billing, and revenue.
 *
 * Port: 4830
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

const PORT = parseInt(process.env.PORT || '4830', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-billing';
const JWT_SECRET = process.env.JWT_SECRET || throw new Error('JWT_SECRET environment variable is required');
const STRIPE_KEY = process.env.STRIPE_KEY || '';
const RAZORPAY_KEY = process.env.RAZORPAY_KEY || '';
const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET || '';

const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

// ============================================
// DATA MODELS
// ============================================

// Subscription Plans
const PlanSchema = new mongoose.Schema({
  planId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  basePrice: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  features: [{
    name: String,
    included: Boolean,
    limit: Number,
    unit: String
  }],
  aiEmployeeLimit: { type: Number, default: 0 },
  apiCallLimit: { type: Number, default: 0 },
  storageLimit: { type: Number, default: 0 }, // in MB
  workflowLimit: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Tenant Subscription
const SubscriptionSchema = new mongoose.Schema({
  subscriptionId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  planId: { type: String, required: true },
  status: { type: String, enum: ['active', 'past_due', 'canceled', 'trialing'], default: 'active' },
  currentPeriodStart: { type: Date },
  currentPeriodEnd: { type: Date },
  cancelAtPeriodEnd: { type: Boolean, default: false },
  trialEnd: { type: Date },
  paymentMethod: { type: String, enum: ['stripe', 'razorpay', 'manual'], default: 'manual' },
  externalSubscriptionId: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Usage Records (Metering)
const UsageSchema = new mongoose.Schema({
  usageId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  type: { type: String, enum: ['api_call', 'ai_employee', 'storage', 'workflow', 'sms', 'email', 'whatsapp'], required: true },
  quantity: { type: Number, default: 1 },
  unit: String,
  metadata: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// AI Employee Billing
const AIEmployeeBillingSchema = new mongoose.Schema({
  billingId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  employeeName: String,
  role: String,
  department: String,
  level: { type: Number, default: 1 },
  basePrice: { type: Number, required: true },
  usage: {
    tasksCompleted: { type: Number, default: 0 },
    tasksFailed: { type: Number, default: 0 },
    hoursActive: { type: Number, default: 0 }
  },
  period: { type: String, required: true }, // YYYY-MM
  status: { type: String, enum: ['active', 'inactive', 'onboarding'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Invoice
const InvoiceSchema = new mongoose.Schema({
  invoiceId: { type: String, required: true, unique: true, index: true },
  invoiceNumber: { type: String, required: true },
  tenantId: { type: String, required: true, index: true },
  subscriptionId: String,
  period: { type: String, required: true },
  lineItems: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    total: Number,
    type: String
  }],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue', 'void'], default: 'draft' },
  dueDate: Date,
  paidAt: Date,
  paymentMethod: String,
  paymentRef: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Marketplace Transaction (Royalties)
const TransactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true, index: true },
  type: { type: String, enum: ['marketplace_sale', 'royalty', 'commission', 'refund'], required: true },
  fromTenantId: String,
  toTenantId: String,
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  description: String,
  listingId: String,
  employeeId: String,
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Plan = mongoose.model('Plan', PlanSchema);
const Subscription = mongoose.model('Subscription', SubscriptionSchema);
const Usage = mongoose.model('Usage', UsageSchema);
const AIEmployeeBilling = mongoose.model('AIEmployeeBilling', AIEmployeeBillingSchema);
const Invoice = mongoose.model('Invoice', InvoiceSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreatePlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  billingCycle: z.enum(['monthly', 'yearly']).optional(),
  basePrice: z.number().min(0),
  features: z.array(z.object({
    name: z.string(),
    included: z.boolean(),
    limit: z.number().optional(),
    unit: z.string().optional()
  })).optional(),
  aiEmployeeLimit: z.number().optional(),
  apiCallLimit: z.number().optional(),
  storageLimit: z.number().optional(),
  workflowLimit: z.number().optional()
});

const CreateSubscriptionSchema = z.object({
  planId: z.string().min(1),
  paymentMethod: z.enum(['stripe', 'razorpay', 'manual']).optional(),
  trialDays: z.number().optional()
});

const RecordUsageSchema = z.object({
  type: z.enum(['api_call', 'ai_employee', 'storage', 'workflow', 'sms', 'email', 'whatsapp']),
  quantity: z.number().min(1).optional(),
  unit: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

const CreateAIEmployeeBillingSchema = z.object({
  employeeId: z.string().min(1),
  employeeName: z.string().min(1),
  role: z.string().min(1),
  department: z.string().optional(),
  level: z.number().min(1).max(10).optional(),
  basePrice: z.number().min(0)
});

// ============================================
// AUTH MIDDLEWARE
// ============================================

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'AUTH_REQUIRED' });

  try {
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).tenantId = decoded.tenantId || decoded.tenant_id;
    next();
  } catch {
    return res.status(401).json({ error: 'AUTH_INVALID' });
  }
}

// ============================================
// HEALTH
// ============================================

app.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'hojai-billing', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ============================================
// PLANS
// ============================================

// List Plans
app.get('/api/plans', async (req, res) => {
  try {
    const plans = await Plan.find({ status: 'active' }).sort({ basePrice: 1 });
    res.json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Plan
app.get('/api/plans/:planId', async (req, res) => {
  try {
    const plan = await Plan.findOne({ planId: req.params.planId });
    if (!plan) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create Plan (Admin)
app.post('/api/plans', async (req, res) => {
  try {
    const data = CreatePlanSchema.parse(req.body);
    const planId = `plan_${uuid().slice(0, 8)}`;

    const plan = new Plan({ ...data, planId });
    await plan.save();

    res.status(201).json({ success: true, data: plan });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// SUBSCRIPTIONS
// ============================================

// Get Subscription
app.get('/api/subscriptions/current', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const subscription = await Subscription.findOne({ tenantId, status: 'active' });

    if (!subscription) {
      return res.json({ success: true, data: null, message: 'No active subscription' });
    }

    const plan = await Plan.findOne({ planId: subscription.planId });
    res.json({ success: true, data: { ...subscription.toObject(), plan } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create Subscription
app.post('/api/subscriptions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = CreateSubscriptionSchema.parse(req.body);

    // Check if already subscribed
    const existing = await Subscription.findOne({ tenantId, status: 'active' });
    if (existing) {
      return res.status(409).json({ error: 'ALREADY_SUBSCRIBED', subscriptionId: existing.subscriptionId });
    }

    const subscriptionId = `sub_${uuid().slice(0, 8)}`;
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const trialEnd = data.trialDays ? new Date(now.getTime() + data.trialDays * 86400000) : null;

    const subscription = new Subscription({
      subscriptionId,
      tenantId,
      planId: data.planId,
      paymentMethod: data.paymentMethod || 'manual',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEnd,
      status: trialEnd ? 'trialing' : 'active'
    });

    await subscription.save();

    const plan = await Plan.findOne({ planId: data.planId });
    res.status(201).json({ success: true, data: { ...subscription.toObject(), plan } });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Cancel Subscription
app.post('/api/subscriptions/cancel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;

    const subscription = await Subscription.findOneAndUpdate(
      { tenantId, status: 'active' },
      { cancelAtPeriodEnd: true },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ error: 'NO_ACTIVE_SUBSCRIPTION' });
    }

    res.json({ success: true, data: subscription, message: 'Subscription will cancel at period end' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// USAGE METERING
// ============================================

// Record Usage
app.post('/api/usage', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = RecordUsageSchema.parse(req.body);

    const usageId = `usage_${uuid().slice(0, 12)}`;

    const usage = new Usage({
      usageId,
      tenantId,
      ...data,
      timestamp: new Date()
    });

    await usage.save();

    res.status(201).json({ success: true, data: usage });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Record Usage Batch
app.post('/api/usage/batch', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { records } = req.body;

    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'RECORDS_MUST_BE_ARRAY' });
    }

    const usages = records.map((r: any) => ({
      usageId: `usage_${uuid().slice(0, 12)}`,
      tenantId,
      ...r,
      timestamp: new Date()
    }));

    await Usage.insertMany(usages);

    res.json({ success: true, data: { recorded: usages.length } });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get Usage Summary
app.get('/api/usage/summary', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { period = 'current' } = req.query;

    let startDate = new Date();
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    if (period === 'last') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const usage = await Usage.aggregate([
      { $match: { tenantId, timestamp: { $gte: startDate } } },
      { $group: {
        _id: '$type',
        total: { $sum: '$quantity' },
        count: { $sum: 1 }
      }}
    ]);

    const summary = usage.reduce((acc: any, item) => {
      acc[item._id] = { total: item.total, count: item.count };
      return acc;
    }, {});

    // Get subscription limits
    const subscription = await Subscription.findOne({ tenantId, status: 'active' });
    const plan = subscription ? await Plan.findOne({ planId: subscription.planId }) : null;

    res.json({
      success: true,
      data: {
        period: startDate.toISOString().slice(0, 10),
        usage: summary,
        limits: plan ? {
          apiCallLimit: plan.apiCallLimit,
          aiEmployeeLimit: plan.aiEmployeeLimit,
          storageLimit: plan.storageLimit,
          workflowLimit: plan.workflowLimit
        } : null
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AI EMPLOYEE BILLING
// ============================================

// Register AI Employee for Billing
app.post('/api/ai-employees/billing', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const data = CreateAIEmployeeBillingSchema.parse(req.body);

    const billingId = `aibill_${uuid().slice(0, 10)}`;
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM

    const billing = new AIEmployeeBilling({
      billingId,
      tenantId,
      period,
      ...data
    });

    await billing.save();

    res.status(201).json({ success: true, data: billing });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update AI Employee Billing
app.patch('/api/ai-employees/:employeeId/billing', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { level, status, basePrice } = req.body;

    const billing = await AIEmployeeBilling.findOneAndUpdate(
      { tenantId, employeeId: req.params.employeeId },
      {
        $set: {
          ...(level && { level }),
          ...(status && { status }),
          ...(basePrice !== undefined && { basePrice }),
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!billing) {
      return res.status(404).json({ error: 'AI_EMPLOYEE_NOT_FOUND' });
    }

    res.json({ success: true, data: billing });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get AI Employee Billing Summary
app.get('/api/ai-employees/billing/summary', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { period = new Date().toISOString().slice(0, 7) } = req.query;

    const billings = await AIEmployeeBilling.find({ tenantId, period });

    const totalCost = billings.reduce((sum: number, b: any) => sum + b.basePrice, 0);
    const byRole = billings.reduce((acc: Record<string, { count: number; cost: number }>, b: any) => {
      if (!acc[b.role as string]) acc[b.role as string] = { count: 0, cost: 0 };
      acc[b.role as string].count++;
      acc[b.role as string].cost += b.basePrice;
      return acc;
    }, {} as Record<string, { count: number; cost: number }>);

    res.json({
      success: true,
      data: {
        period,
        totalAIEmployees: billings.length,
        totalCost,
        byRole,
        employees: billings
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// MARKETPLACE & ROYALTIES
// ============================================

// Record Marketplace Transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const { type, fromTenantId, toTenantId, amount, description, listingId, employeeId } = req.body;

    if (!type || !amount) {
      return res.status(400).json({ error: 'TYPE_AND_AMOUNT_REQUIRED' });
    }

    const transactionId = `txn_${uuid().slice(0, 12)}`;

    const transaction = new Transaction({
      transactionId,
      type,
      fromTenantId,
      toTenantId,
      amount,
      description,
      listingId,
      employeeId,
      status: 'pending'
    });

    await transaction.save();

    res.status(201).json({ success: true, data: transaction });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get Royalty Earnings
app.get('/api/royalties', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;

    const royalties = await Transaction.aggregate([
      { $match: { toTenantId: tenantId, type: 'royalty', status: 'completed' } },
      { $group: {
        _id: '$period',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }},
      { $sort: { _id: -1 } },
      { $limit: 12 }
    ]);

    const totalEarnings = royalties.reduce((sum: number, r: any) => sum + r.total, 0);

    res.json({
      success: true,
      data: {
        totalEarnings,
        byMonth: royalties
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INVOICES
// ============================================

// Get Invoices
app.get('/api/invoices', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { status } = req.query;

    const filter: any = { tenantId };
    if (status) filter.status = status;

    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, data: invoices });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Invoice (Admin)
app.post('/api/invoices/generate', async (req: Request, res: Response) => {
  try {
    const { tenantId, subscriptionId, period } = req.body;

    const subscription = await Subscription.findOne({ subscriptionId: subscriptionId || '' });
    const plan = subscription ? await Plan.findOne({ planId: subscription.planId }) : null;

    // Get AI employee billing
    const aiBilling = await AIEmployeeBilling.find({ tenantId, period: period || new Date().toISOString().slice(0, 7) });
    const aiCost = aiBilling.reduce((sum, b) => sum + b.basePrice, 0);

    // Get usage costs
    const usage = await Usage.aggregate([
      { $match: { tenantId, timestamp: { $gte: new Date(period + '-01') } } },
      { $group: { _id: '$type', total: { $sum: '$quantity' } } }
    ]);

    const lineItems = [
      { description: `Base Plan - ${plan?.name || 'Standard'}`, quantity: 1, unitPrice: plan?.basePrice || 0, total: plan?.basePrice || 0, type: 'subscription' },
      { description: `AI Employees (${aiBilling.length})`, quantity: aiBilling.length, unitPrice: aiCost / aiBilling.length, total: aiCost, type: 'ai_employee' }
    ];

    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const tax = Math.round(subtotal * 0.18); // 18% GST
    const total = subtotal + tax;

    const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Date.now()).slice(-6)}`;

    const invoice = new Invoice({
      invoiceId: `inv_${uuid().slice(0, 10)}`,
      invoiceNumber,
      tenantId,
      subscriptionId,
      period,
      lineItems,
      subtotal,
      tax,
      total,
      dueDate: new Date(Date.now() + 15 * 86400000)
    });

    await invoice.save();

    res.status(201).json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DASHBOARD
// ============================================

// Get Billing Dashboard
app.get('/api/dashboard', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const currentPeriod = new Date().toISOString().slice(0, 7);

    // Subscription info
    const subscription = await Subscription.findOne({ tenantId, status: 'active' });
    const plan = subscription ? await Plan.findOne({ planId: subscription.planId }) : null;

    // Usage summary
    const usage = await Usage.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$type', total: { $sum: '$quantity' }, count: { $sum: 1 } } }
    ]);
    const usageSummary = usage.reduce((acc: any, u: any) => { acc[u._id] = u; return acc; }, {});

    // AI employee billing
    const aiBilling = await AIEmployeeBilling.find({ tenantId, period: currentPeriod });
    const aiCost = aiBilling.reduce((sum, b) => sum + b.basePrice, 0);

    // Recent invoices
    const invoices = await Invoice.find({ tenantId }).sort({ createdAt: -1 }).limit(5);

    // Revenue/expense summary
    const [revenue, expenses] = await Promise.all([
      Transaction.aggregate([
        { $match: { toTenantId: tenantId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { fromTenantId: tenantId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        subscription: subscription ? {
          plan: plan?.name,
          status: subscription.status,
          periodEnd: subscription.currentPeriodEnd
        } : null,
        usage: usageSummary,
        aiEmployees: {
          count: aiBilling.length,
          cost: aiCost
        },
        invoices: invoices.slice(0, 3),
        revenue: revenue[0]?.total || 0,
        expenses: expenses[0]?.total || 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START
// ============================================

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected');

    // Seed default plans if none exist
    const planCount = await Plan.countDocuments();
    if (planCount === 0) {
      await Plan.insertMany([
        { planId: 'plan_starter', name: 'Starter', description: 'For small teams', basePrice: 99, aiEmployeeLimit: 5, apiCallLimit: 10000, features: [{ name: 'Basic Support', included: true }] },
        { planId: 'plan_pro', name: 'Professional', description: 'For growing businesses', basePrice: 499, aiEmployeeLimit: 25, apiCallLimit: 100000, features: [{ name: 'Priority Support', included: true }] },
        { planId: 'plan_enterprise', name: 'Enterprise', description: 'For large organizations', basePrice: 1999, aiEmployeeLimit: 100, apiCallLimit: 1000000, features: [{ name: 'Dedicated Support', included: true }] }
      ]);
      console.log('Default plans seeded');
    }

    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           HOJAI BILLING v1.0.0                         ║
╠═══════════════════════════════════════════════════════════════╣
║  Port:     ${PORT}                                              ║
║  Features: Subscriptions, Usage, AI Billing, Royalties    ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

start();

export default app;
