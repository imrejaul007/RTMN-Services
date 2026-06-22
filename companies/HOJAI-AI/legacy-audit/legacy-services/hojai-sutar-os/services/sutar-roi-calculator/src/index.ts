import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

// Import middleware
import { requestLogger, errorLogger } from './middleware/logging.js';
import { apiRateLimiter, strictRateLimiter } from './middleware/rateLimiter.js';

// Import routes
import roiRoutes from './routes/roi.js';

// Import types
import { HealthResponse, ApiResponse } from './types/index.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4259;
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const START_TIME = Date.now();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ENVIRONMENT === 'production' ? false : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Rate limiting
app.use('/api/', apiRateLimiter);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  const health: HealthResponse = {
    status: 'healthy',
    service: 'sutar-roi-calculator',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
  };
  res.json(health);
});

// Service info endpoint
app.get('/api/v1/info', (_req: Request, res: Response) => {
  const response: ApiResponse<object> = {
    success: true,
    data: {
      name: 'sutar-roi-calculator',
      description: 'ROI Calculator - Return on Investment Analysis Service',
      version: '1.0.0',
      features: [
        'ROI calculation',
        'Cost-benefit analysis',
        'Break-even analysis',
        'Profit margin calculation',
        'Investment projections',
        'Performance tracking',
        'Historical ROI tracking',
        'SimulationOS integration',
        'EconomyOS integration',
      ],
      endpoints: {
        calculate: {
          roi: 'POST /api/v1/calculate/roi',
          costBenefit: 'POST /api/v1/calculate/cost-benefit',
          breakEven: 'POST /api/v1/calculate/break-even',
          profitMargin: 'POST /api/v1/calculate/profit-margin',
          projection: 'POST /api/v1/calculate/projection',
        },
        investments: {
          list: 'GET /api/v1/investments',
          get: 'GET /api/v1/investments/:id',
          create: 'POST /api/v1/investments',
          update: 'PUT /api/v1/investments/:id',
          delete: 'DELETE /api/v1/investments/:id',
          roi: 'GET /api/v1/investments/:id/roi',
          performance: 'GET /api/v1/investments/:id/performance',
          returns: 'POST /api/v1/investments/:id/returns',
          costs: 'POST /api/v1/investments/:id/costs',
          benefits: 'POST /api/v1/investments/:id/benefits',
        },
        simulation: {
          roi: 'POST /api/v1/simulate/roi',
        },
        metrics: {
          external: 'GET /api/v1/metrics/external',
        },
      },
    },
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

// Intent endpoint (SUTAR OS protocol)
app.post('/api/v1/intent', async (req: Request, res: Response) => {
  try {
    const { type, payload } = req.body;
    console.log(`[INTENT] ${type}:`, JSON.stringify(payload));

    // Import services
    const { ROICalculatorService } = await import('./services/roiCalculator.js');
    const { InvestmentStorageService } = await import('./services/investmentStorage.js');

    // Handle different intent types
    let responseData: unknown = {};

    switch (type) {
      case 'calculate_roi':
        responseData = ROICalculatorService.calculateROI(payload);
        break;
      case 'cost_benefit_analysis':
        responseData = ROICalculatorService.calculateCostBenefit(payload);
        break;
      case 'break_even_analysis':
        responseData = ROICalculatorService.calculateBreakEven(payload);
        break;
      case 'profit_margin_calculation':
        responseData = ROICalculatorService.calculateProfitMargin(payload);
        break;
      case 'investment_projection':
        responseData = ROICalculatorService.generateProjection(payload);
        break;
      case 'create_investment':
        responseData = InvestmentStorageService.createInvestment(payload);
        break;
      case 'get_investment':
        responseData = InvestmentStorageService.getInvestment(payload.id) || { error: 'Not found' };
        break;
      default:
        responseData = { status: 'unknown_intent_type' };
    }

    res.json({
      success: true,
      data: {
        intentId: uuidv4(),
        type,
        status: 'processed',
        result: responseData,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

// Event endpoint (SUTAR OS protocol)
app.post('/api/v1/event', async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;
    console.log(`[EVENT] ${type}:`, JSON.stringify(data));

    res.json({
      success: true,
      data: {
        eventId: uuidv4(),
        type,
        status: 'processed',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

// API routes
app.use('/api/v1', roiRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use(errorLogger);

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: ENVIRONMENT === 'production' ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('SUTAR-ROI-CALCULATOR');
  console.log('='.repeat(60));
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${ENVIRONMENT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Info: http://localhost:${PORT}/api/v1/info`);
  console.log('='.repeat(60));
  console.log('Ready to calculate ROI!');
  console.log('='.repeat(60));
});

export default app;
