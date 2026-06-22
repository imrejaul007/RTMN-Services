/**
 * HOJAI Twin - Digital Twin Platform
 *
 * Employee, Customer, Company Digital Twins
 *
 * Port: 4860
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';

const PORT = parseInt(process.env.PORT || '4860', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-twin';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

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
// TWIN MODELS
// ============================================

// Employee Twin
const EmployeeTwinSchema = new mongoose.Schema({
  twinId: { type: String, required: true, unique: true, index: true },
  employeeId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: String,
  email: String,
  department: String,
  // Work Style
  workStyle: {
    preferredHours: [String],
    communicationStyle: { type: String, enum: ['async', 'sync', 'mixed'] },
    meetingPatterns: [String],
    breakFrequency: String
  },
  // Expertise
  expertise: {
    skills: [String],
    certifications: [String],
    yearsExperience: Number,
    industries: [String],
    strengthAreas: [String]
  },
  // Performance
  performance: {
    currentMetrics: mongoose.Schema.Types.Mixed,
    historicalTrend: mongoose.Schema.Types.Mixed,
    lastReview: Date,
    nextReview: Date
  },
  // Personality
  personality: {
    workingStyle: { type: String, enum: ['independent', 'collaborative', 'hybrid'] },
    stressResponse: String,
    motivationFactors: [String],
    feedbackStyle: String
  },
  // Relationships
  relationships: {
    teamMembers: [String],
    stakeholders: [String],
    mentees: [String],
    mentors: [String]
  },
  // Predictions
  predictions: {
    burnoutRisk: Number,
    flightRisk: Number,
    promotionReadiness: Number,
    collaborationScore: Number
  },
  createdAt: Date,
  updatedAt: Date
}, { timestamps: true });

// Customer Twin
const CustomerTwinSchema = new mongoose.Schema({
  twinId: { type: String, required: true, unique: true, index: true },
  customerId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: String,
  email: String,
  // Preferences
  preferences: {
    communication: [String],
    channels: [String],
    contentTypes: [String],
    priceRange: mongoose.Schema.Types.Mixed,
    brandAffinities: [String]
  },
  // Behavior
  behavior: {
    purchaseFrequency: String,
    avgOrderValue: Number,
    preferredCategories: [String],
    browsingPatterns: mongoose.Schema.Types.Mixed,
    engagementScore: Number
  },
  // Lifetime
  lifetime: {
    customerSince: Date,
    totalOrders: Number,
    totalSpent: Number,
    avgLifetime: Number,
    favoriteProducts: [String],
    churnRisk: Number
  },
  // Predictions
  predictions: {
    nextPurchase: Date,
    productRecommendations: [String],
    churnRisk: Number,
    ltvScore: Number
  },
  createdAt: Date,
  updatedAt: Date
}, { timestamps: true });

// Company Twin
const CompanyTwinSchema = new mongoose.Schema({
  twinId: { type: String, required: true, unique: true, index: true },
  companyId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: String,
  industry: String,
  size: String,
  // Operations
  operations: {
    peakHours: [String],
    seasonalPatterns: mongoose.Schema.Types.Mixed,
    growthRate: Number,
    efficiency: Number
  },
  // Financial
  financial: {
    revenue: mongoose.Schema.Types.Mixed,
    costs: mongoose.Schema.Types.Mixed,
    margins: mongoose.Schema.Types.Mixed,
    burnRate: Number,
    runway: Number
  },
  // Customers
  customers: {
    total: Number,
    newThisMonth: Number,
    churnRate: Number,
    nps: Number,
    segments: [String]
  },
  // Products
  products: {
    total: Number,
    topSellers: [String],
    newThisMonth: Number,
    returnRate: Number
  },
  // Predictions
  predictions: {
    growthTrajectory: String,
    expansionSignals: [String],
    riskFactors: [String],
    marketPosition: String
  },
  createdAt: Date,
  updatedAt: Date
}, { timestamps: true });

// Merchant Twin
const MerchantTwinSchema = new mongoose.Schema({
  twinId: { type: String, required: true, unique: true, index: true },
  merchantId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: String,
  type: String,
  // Customer patterns
  customers: {
    total: Number,
    repeatRate: Number,
    segments: [String],
    avgOrderValue: Number
  },
  // Inventory
  inventory: {
    totalSKUs: Number,
    fastMoving: [String],
    slowMoving: [String],
    stockoutRisk: [String]
  },
  // Marketing
  marketing: {
    channels: [String],
    effectiveness: mongoose.Schema.Types.Mixed,
    roi: Number,
    campaignPerformance: mongoose.Schema.Types.Mixed
  },
  // Operations
  operations: {
    fulfillmentRate: Number,
    avgDeliveryTime: Number,
    returnRate: Number,
    customerSatisfaction: Number
  },
  // Predictions
  predictions: {
    demandForecast: mongoose.Schema.Types.Mixed,
    restockRecommendations: [String],
    customerChurnRisk: Number,
    growthPotential: Number
  },
  createdAt: Date,
  updatedAt: Date
}, { timestamps: true });

const EmployeeTwin = mongoose.model('EmployeeTwin', EmployeeTwinSchema);
const CustomerTwin = mongoose.model('CustomerTwin', CustomerTwinSchema);
const CompanyTwin = mongoose.model('CompanyTwin', CompanyTwinSchema);
const MerchantTwin = mongoose.model('MerchantTwin', MerchantTwinSchema);

// ============================================
// AUTH
// ============================================

async function auth(req: Request, res: Response, next: Function) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'AUTH_REQUIRED' });
  try {
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).tenantId = decoded.tenantId || decoded.tenant_id;
    next();
  } catch { res.status(401).json({ error: 'AUTH_INVALID' }); }
}

// ============================================
// HEALTH
// ============================================

app.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'hojai-twin', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ============================================
// EMPLOYEE TWIN
// ============================================

// Create/Update Employee Twin
app.post('/api/employee/:employeeId', auth, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const tenantId = (req as any).tenantId;
    const twinId = `emp_twin_${uuid().slice(0, 8)}`;

    const twin = await EmployeeTwin.findOneAndUpdate(
      { employeeId, tenantId },
      { ...req.body, twinId, tenantId },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: twin });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Get Employee Twin
app.get('/api/employee/:employeeId', auth, async (req: Request, res: Response) => {
  try {
    const twin = await EmployeeTwin.findOne({
      employeeId: req.params.employeeId,
      tenantId: (req as any).tenantId
    });

    if (!twin) return res.status(404).json({ error: 'TWIN_NOT_FOUND' });
    res.json({ success: true, data: twin });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Get Predictions
app.get('/api/employee/:employeeId/predictions', auth, async (req: Request, res: Response) => {
  try {
    const twin = await EmployeeTwin.findOne({
      employeeId: req.params.employeeId,
      tenantId: (req as any).tenantId
    });

    if (!twin) return res.status(404).json({ error: 'TWIN_NOT_FOUND' });

    res.json({
      success: true,
      data: {
        predictions: twin.predictions,
        recommendations: generateRecommendations(twin)
      }
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// CUSTOMER TWIN
// ============================================

// Create/Update Customer Twin
app.post('/api/customer/:customerId', auth, async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const tenantId = (req as any).tenantId;
    const twinId = `cust_twin_${uuid().slice(0, 8)}`;

    const twin = await CustomerTwin.findOneAndUpdate(
      { customerId, tenantId },
      { ...req.body, twinId, tenantId },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: twin });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Get Customer Twin
app.get('/api/customer/:customerId', auth, async (req: Request, res: Response) => {
  try {
    const twin = await CustomerTwin.findOne({
      customerId: req.params.customerId,
      tenantId: (req as any).tenantId
    });

    if (!twin) return res.status(404).json({ error: 'TWIN_NOT_FOUND' });
    res.json({ success: true, data: twin });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Get Recommendations
app.get('/api/customer/:customerId/recommendations', auth, async (req: Request, res: Response) => {
  try {
    const twin = await CustomerTwin.findOne({
      customerId: req.params.customerId,
      tenantId: (req as any).tenantId
    });

    if (!twin) return res.status(404).json({ error: 'TWIN_NOT_FOUND' });

    res.json({
      success: true,
      data: {
        predictions: twin.predictions,
        nextPurchase: twin.predictions.nextPurchase,
        productRecommendations: twin.predictions.productRecommendations,
        churnRisk: twin.predictions.churnRisk
      }
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// COMPANY TWIN
// ============================================

// Create/Update Company Twin
app.post('/api/company/:companyId', auth, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const tenantId = (req as any).tenantId;
    const twinId = `comp_twin_${uuid().slice(0, 8)}`;

    const twin = await CompanyTwin.findOneAndUpdate(
      { companyId, tenantId },
      { ...req.body, twinId, tenantId },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: twin });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Get Company Twin
app.get('/api/company/:companyId', auth, async (req: Request, res: Response) => {
  try {
    const twin = await CompanyTwin.findOne({
      companyId: req.params.companyId,
      tenantId: (req as any).tenantId
    });

    if (!twin) return res.status(404).json({ error: 'TWIN_NOT_FOUND' });
    res.json({ success: true, data: twin });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Get Strategic Insights
app.get('/api/company/:companyId/insights', auth, async (req: Request, res: Response) => {
  try {
    const twin = await CompanyTwin.findOne({
      companyId: req.params.companyId,
      tenantId: (req as any).tenantId
    });

    if (!twin) return res.status(404).json({ error: 'TWIN_NOT_FOUND' });

    res.json({
      success: true,
      data: {
        predictions: twin.predictions,
        financial: twin.financial,
        customerHealth: twin.customers,
        recommendations: generateCompanyRecommendations(twin)
      }
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// MERCHANT TWIN
// ============================================

// Create/Update Merchant Twin
app.post('/api/merchant/:merchantId', auth, async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const tenantId = (req as any).tenantId;
    const twinId = `merch_twin_${uuid().slice(0, 8)}`;

    const twin = await MerchantTwin.findOneAndUpdate(
      { merchantId, tenantId },
      { ...req.body, twinId, tenantId },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: twin });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Get Merchant Twin
app.get('/api/merchant/:merchantId', auth, async (req: Request, res: Response) => {
  try {
    const twin = await MerchantTwin.findOne({
      merchantId: req.params.merchantId,
      tenantId: (req as any).tenantId
    });

    if (!twin) return res.status(404).json({ error: 'TWIN_NOT_FOUND' });
    res.json({ success: true, data: twin });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// ANALYTICS
// ============================================

// Get Twin Analytics
app.get('/api/analytics', auth, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { type = 'all' } = req.query;

    let filter: any = { tenantId };

    const [employees, customers, companies, merchants] = await Promise.all([
      type === 'all' || type === 'employee' ? EmployeeTwin.countDocuments(filter) : 0,
      type === 'all' || type === 'customer' ? CustomerTwin.countDocuments(filter) : 0,
      type === 'all' || type === 'company' ? CompanyTwin.countDocuments(filter) : 0,
      type === 'all' || type === 'merchant' ? MerchantTwin.countDocuments(filter) : 0
    ]);

    res.json({
      success: true,
      data: {
        totalTwins: employees + customers + companies + merchants,
        byType: {
          employees,
          customers,
          companies,
          merchants
        }
      }
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================
// HELPERS
// ============================================

function generateRecommendations(twin: any) {
  const recs = [];

  if (twin.predictions?.burnoutRisk > 0.7) {
    recs.push({ type: 'burnout', message: 'High burnout risk - consider workload reduction' });
  }
  if (twin.predictions?.flightRisk > 0.6) {
    recs.push({ type: 'flight', message: 'Flight risk detected - retention actions recommended' });
  }
  if (twin.predictions?.promotionReadiness > 0.8) {
    recs.push({ type: 'promotion', message: 'Ready for promotion - plan career discussion' });
  }

  return recs;
}

function generateCompanyRecommendations(twin: any) {
  const recs = [];

  if (twin.customers?.churnRate > 0.15) {
    recs.push({ type: 'churn', message: 'High churn rate - implement retention program' });
  }
  if (twin.financial?.burnRate > twin.financial?.revenue * 0.8) {
    recs.push({ type: 'cash', message: 'High burn rate - review cost structure' });
  }
  if (twin.predictions?.growthTrajectory === 'declining') {
    recs.push({ type: 'growth', message: 'Declining trajectory - pivot strategy needed' });
  }

  return recs;
}

// ============================================
// START
// ============================================

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected');

    app.listen(PORT, () => {
      console.log(`\n╔═══════════════════════════════════════════════════╗
║           HOJAI TWIN v1.0.0
╠═══════════════════════════════════════════════════╣
║  Port:     ${PORT}
║  Features: Employee, Customer, Company, Merchant Twins
╚═══════════════════════════════════════════════════╝\n`);
    });
  } catch (e) {
    console.error('Failed:', e);
    process.exit(1);
  }
}

start();

export default app;
