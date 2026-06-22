/**
 * Jewelry Intelligence Service
 * Port: 4750
 *
 * AI-powered predictions for jewelry industry:
 * - Bridal conversion prediction
 * - Gold buying cycle prediction
 * - Price sensitivity analysis
 * - Inventory recommendations
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  requestId: string;
  timestamp: string;
}

interface BridalPredictionRequest {
  customerId: string;
  engagementHistory: {
    visits: number;
    purchases: number;
    avgOrderValue: number;
    categories: string[];
    lastVisit: string;
  };
  demographicData: {
    age: number;
    location: string;
    income: 'low' | 'medium' | 'high';
  };
  occasionData?: {
    weddingSeason: boolean;
    festivalNearby: boolean;
  };
}

interface BridalPredictionResult {
  conversionProbability: number;
  confidence: number;
  recommendedActions: string[];
  estimatedValue: number;
  timeframe: 'immediate' | '30_days' | '90_days' | 'future';
}

interface GoldCycleRequest {
  customerId: string;
  purchaseHistory: {
    totalPurchases: number;
    totalWeight: number;
    avgWeight: number;
    lastPurchaseDate: string;
    avgGapDays: number;
  };
  marketIndicators?: {
    goldPriceTrend: 'rising' | 'falling' | 'stable';
    season: 'wedding' | 'festival' | 'general';
  };
}

interface GoldCycleResult {
  nextPurchaseLikelihood: number;
  predictedDate: string;
  predictedWeight: number;
  predictedValue: number;
  confidence: number;
  triggers: string[];
}

interface PriceSensitivityRequest {
  customerId: string;
  productCategory: string;
  currentPrice: number;
  customerSegmentation: {
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    lifetimeValue: number;
    purchaseFrequency: number;
  };
}

interface PriceSensitivityResult {
  sensitivityScore: number;
  optimalPrice: number;
  priceRange: { min: number; max: number };
  elasticity: number;
  recommendedDiscount: number;
  segmentInsight: string;
}

interface InventoryRecommendation {
  category: string;
  currentStock: number;
  recommendedStock: number;
  turnoverRate: number;
  daysUntilStockout: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  action: string;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const bridalPredictionSchema = z.object({
  customerId: z.string().min(1),
  engagementHistory: z.object({
    visits: z.number().int().min(0),
    purchases: z.number().int().min(0),
    avgOrderValue: z.number().min(0),
    categories: z.array(z.string()),
    lastVisit: z.string(),
  }),
  demographicData: z.object({
    age: z.number().int().min(18).max(100),
    location: z.string().min(1),
    income: z.enum(['low', 'medium', 'high']),
  }),
  occasionData: z
    .object({
      weddingSeason: z.boolean(),
      festivalNearby: z.boolean(),
    })
    .optional(),
});

const goldCycleSchema = z.object({
  customerId: z.string().min(1),
  purchaseHistory: z.object({
    totalPurchases: z.number().int().min(0),
    totalWeight: z.number().min(0),
    avgWeight: z.number().min(0),
    lastPurchaseDate: z.string(),
    avgGapDays: z.number().int().min(1),
  }),
  marketIndicators: z
    .object({
      goldPriceTrend: z.enum(['rising', 'falling', 'stable']),
      season: z.enum(['wedding', 'festival', 'general']),
    })
    .optional(),
});

const priceSensitivitySchema = z.object({
  customerId: z.string().min(1),
  productCategory: z.string().min(1),
  currentPrice: z.number().min(0),
  customerSegmentation: z.object({
    tier: z.enum(['bronze', 'silver', 'gold', 'platinum']),
    lifetimeValue: z.number().min(0),
    purchaseFrequency: z.number().min(0),
  }),
});

// =============================================================================
// MOCK PREDICTION ENGINES
// =============================================================================

/**
 * Mock bridal conversion prediction
 * In production, this would call ML models from HOJAI Feature Store
 */
function predictBridalConversion(
  data: BridalPredictionRequest
): BridalPredictionResult {
  // Calculate base probability from engagement metrics
  const engagementScore =
    (data.engagementHistory.visits * 0.1 +
      data.engagementHistory.purchases * 0.2 +
      Math.min(data.engagementHistory.avgOrderValue / 1000, 1)) /
    3;

  // Demographic multiplier
  const incomeMultiplier = { low: 0.5, medium: 0.8, high: 1.2 };
  const demographicScore =
    (data.demographicData.age / 100) *
    incomeMultiplier[data.demographicData.income];

  // Occasion bonus
  let occasionBonus = 0;
  if (data.occasionData) {
    if (data.occasionData.weddingSeason) occasionBonus += 0.15;
    if (data.occasionData.festivalNearby) occasionBonus += 0.1;
  }

  const conversionProbability = Math.min(
    0.95,
    Math.max(0.05, engagementScore * 0.5 + demographicScore * 0.3 + occasionBonus)
  );

  // Determine timeframe
  let timeframe: BridalPredictionResult['timeframe'] = 'future';
  if (conversionProbability > 0.8) {
    timeframe = 'immediate';
  } else if (conversionProbability > 0.6) {
    timeframe = '30_days';
  } else if (conversionProbability > 0.4) {
    timeframe = '90_days';
  }

  // Estimated value based on income tier
  const estimatedValueMap = { low: 50000, medium: 150000, high: 500000 };
  const estimatedValue = estimatedValueMap[data.demographicData.income];

  return {
    conversionProbability: Math.round(conversionProbability * 100) / 100,
    confidence: 0.75 + Math.random() * 0.2,
    recommendedActions:
      conversionProbability > 0.7
        ? [
            'Schedule personal consultation',
            'Offer exclusive bridal collection preview',
            'Provide EMI options',
          ]
        : [
            'Nurture with wedding content',
            'Invite to store events',
            'Share testimonial videos',
          ],
    estimatedValue,
    timeframe,
  };
}

/**
 * Mock gold buying cycle prediction
 */
function predictGoldCycle(data: GoldCycleRequest): GoldCycleResult {
  const { purchaseHistory } = data;

  // Calculate next purchase probability
  const daysSinceLastPurchase = Math.floor(
    (Date.now() - new Date(purchaseHistory.lastPurchaseDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const cycleRatio = daysSinceLastPurchase / purchaseHistory.avgGapDays;
  const nextPurchaseLikelihood = Math.min(0.95, cycleRatio * 0.8);

  // Predict next purchase date
  const daysUntilNextPurchase = Math.max(
    0,
    Math.round(purchaseHistory.avgGapDays - daysSinceLastPurchase)
  );
  const predictedDate = new Date(
    Date.now() + daysUntilNextPurchase * 24 * 60 * 60 * 1000
  ).toISOString();

  // Predicted weight (with some variance)
  const weightVariance = 0.8 + Math.random() * 0.4;
  const predictedWeight = purchaseHistory.avgWeight * weightVariance;

  // Predicted value
  const estimatedGoldPricePerGram = 7500; // Mock gold price
  const predictedValue = Math.round(predictedWeight * estimatedGoldPricePerGram);

  // Triggers based on market indicators
  const triggers: string[] = [];
  if (data.marketIndicators) {
    if (data.marketIndicators.goldPriceTrend === 'falling')
      triggers.push('Price drop opportunity');
    if (data.marketIndicators.season === 'wedding')
      triggers.push('Wedding season demand');
    if (data.marketIndicators.season === 'festival')
      triggers.push('Festival gifting occasion');
  }

  if (cycleRatio > 1.2) {
    triggers.push('Overdue for purchase cycle');
  }

  return {
    nextPurchaseLikelihood: Math.round(nextPurchaseLikelihood * 100) / 100,
    predictedDate,
    predictedWeight: Math.round(predictedWeight * 100) / 100,
    predictedValue,
    confidence: 0.7 + Math.random() * 0.2,
    triggers: triggers.length > 0 ? triggers : ['Regular cycle purchase'],
  };
}

/**
 * Mock price sensitivity analysis
 */
function analyzePriceSensitivity(
  data: PriceSensitivityRequest
): PriceSensitivityResult {
  const { customerSegmentation, currentPrice } = data;

  // Calculate sensitivity based on tier
  const tierSensitivity = {
    bronze: 0.8,
    silver: 0.6,
    gold: 0.4,
    platinum: 0.2,
  };
  const sensitivityScore = tierSensitivity[customerSegmentation.tier];

  // Calculate optimal price (5-15% discount for high sensitivity)
  const discountFactor = sensitivityScore * 0.15;
  const optimalPrice = currentPrice * (1 - discountFactor);

  // Price range
  const priceRange = {
    min: currentPrice * (1 - sensitivityScore * 0.25),
    max: currentPrice * (1 + sensitivityScore * 0.1),
  };

  // Elasticity
  const elasticity = -1 * (1 + sensitivityScore * 2);

  // Recommended discount
  const recommendedDiscount =
    customerSegmentation.tier === 'platinum'
      ? 0
      : Math.round(sensitivityScore * 20);

  // Segment insight
  const segmentInsights = {
    bronze: 'Price-conscious segment, strong discount motivation',
    silver: 'Value-conscious, balanced price-quality expectation',
    gold: 'Quality-focused, moderate discount sensitivity',
    platinum: 'Premium segment, service and exclusivity valued over price',
  };

  return {
    sensitivityScore: Math.round(sensitivityScore * 100) / 100,
    optimalPrice: Math.round(optimalPrice),
    priceRange: {
      min: Math.round(priceRange.min),
      max: Math.round(priceRange.max),
    },
    elasticity: Math.round(elasticity * 100) / 100,
    recommendedDiscount,
    segmentInsight: segmentInsights[customerSegmentation.tier],
  };
}

/**
 * Mock inventory recommendations
 */
function getInventoryRecommendations(): InventoryRecommendation[] {
  const categories = [
    { name: 'Bangles', turnoverRate: 2.5 },
    { name: 'Necklaces', turnoverRate: 1.8 },
    { name: 'Rings', turnoverRate: 3.2 },
    { name: 'Earrings', turnoverRate: 2.9 },
    { name: 'Chains', turnoverRate: 2.1 },
    { name: 'Mangalsutra', turnoverRate: 1.5 },
    { name: 'Pendents', turnoverRate: 2.7 },
    { name: 'Bangles Gold', turnoverRate: 3.5 },
  ];

  return categories.map((cat) => {
    const currentStock = Math.floor(50 + Math.random() * 200);
    const recommendedStock = Math.floor(
      currentStock * (0.8 + Math.random() * 0.6)
    );
    const daysUntilStockout = Math.floor(30 + Math.random() * 60);

    let priority: InventoryRecommendation['priority'] = 'medium';
    if (daysUntilStockout < 15) priority = 'critical';
    else if (daysUntilStockout < 30) priority = 'high';
    else if (daysUntilStockout > 50) priority = 'low';

    let action = 'Monitor';
    if (priority === 'critical') action = 'Urgent restock required';
    else if (priority === 'high') action = 'Order more stock soon';
    else if (priority === 'low') action = 'Consider reducing order quantity';

    return {
      category: cat.name,
      currentStock,
      recommendedStock,
      turnoverRate: cat.turnoverRate,
      daysUntilStockout,
      priority,
      action,
    };
  });
}

// =============================================================================
// EXPRESS SERVER
// =============================================================================

const PORT = 4750;
const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(compression());
app.use(express.json({ limit: "10kb" }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as Request & { requestId: string }).requestId = uuidv4();
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  const response: ApiResponse<{ service: string; status: string }> = {
    success: true,
    data: {
      service: 'jewelry-intelligence',
      status: 'healthy',
    },
    requestId: uuidv4(),
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

// API Health check
app.get('/api/health', (_req: Request, res: Response) => {
  const response: ApiResponse<{
    service: string;
    version: string;
    uptime: number;
    predictions: Record<string, number>;
  }> = {
    success: true,
    data: {
      service: 'jewelry-intelligence',
      version: '1.0.0',
      uptime: process.uptime(),
      predictions: {
        bridal: 0,
        goldCycle: 0,
        priceSensitivity: 0,
        inventory: 0,
      },
    },
    requestId: uuidv4(),
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * POST /api/predict/bridal
 * Predict bridal conversion probability
 */
app.post('/api/predict/bridal', (req: Request, res: Response) => {
  try {
    const validation = bridalPredictionSchema.safeParse(req.body);

    if (!validation.success) {
      const response: ApiResponse = {
        success: false,
        error: `Validation failed: ${validation.error.message}`,
        requestId: (req as Request & { requestId: string }).requestId,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    const result = predictBridalConversion(validation.data);

    const response: ApiResponse<BridalPredictionResult> = {
      success: true,
      data: result,
      requestId: (req as Request & { requestId: string }).requestId,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
      requestId: (req as Request & { requestId: string }).requestId,
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/predict/gold-cycle
 * Predict gold buying cycle
 */
app.post('/api/predict/gold-cycle', (req: Request, res: Response) => {
  try {
    const validation = goldCycleSchema.safeParse(req.body);

    if (!validation.success) {
      const response: ApiResponse = {
        success: false,
        error: `Validation failed: ${validation.error.message}`,
        requestId: (req as Request & { requestId: string }).requestId,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    const result = predictGoldCycle(validation.data);

    const response: ApiResponse<GoldCycleResult> = {
      success: true,
      data: result,
      requestId: (req as Request & { requestId: string }).requestId,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
      requestId: (req as Request & { requestId: string }).requestId,
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/analyze/price-sensitivity
 * Analyze customer price sensitivity
 */
app.post('/api/analyze/price-sensitivity', (req: Request, res: Response) => {
  try {
    const validation = priceSensitivitySchema.safeParse(req.body);

    if (!validation.success) {
      const response: ApiResponse = {
        success: false,
        error: `Validation failed: ${validation.error.message}`,
        requestId: (req as Request & { requestId: string }).requestId,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    const result = analyzePriceSensitivity(validation.data);

    const response: ApiResponse<PriceSensitivityResult> = {
      success: true,
      data: result,
      requestId: (req as Request & { requestId: string }).requestId,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
      requestId: (req as Request & { requestId: string }).requestId,
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/inventory/recommendations
 * Get inventory recommendations
 */
app.get('/api/inventory/recommendations', (_req: Request, res: Response) => {
  try {
    const result = getInventoryRecommendations();

    const response: ApiResponse<InventoryRecommendation[]> = {
      success: true,
      data: result,
      requestId: uuidv4(),
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
      requestId: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

// 404 handler
app.use((_req: Request, res: Response) => {
  const response: ApiResponse = {
    success: false,
    error: 'Not found',
    requestId: uuidv4(),
    timestamp: new Date().toISOString(),
  };
  res.status(404).json(response);
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  const response: ApiResponse = {
    success: false,
    error: 'Internal server error',
    requestId: uuidv4(),
    timestamp: new Date().toISOString(),
  };
  res.status(500).json(response);
});

// Start server
app.listen(PORT, () => {
  console.log(`Jewelry Intelligence Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API health: http://localhost:${PORT}/api/health`);
});

export default app;
