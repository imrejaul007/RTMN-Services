/**
 * GlamAI - Salon Intelligence OS
 *
 * Unified AI layer for salon operations that orchestrates:
 * - Beauty MemoryOS (customer beauty profiles)
 * - REZ Mind Salon (recommendations, pricing, churn)
 * - Salon AI agents (booking, campaigns, retention)
 * - Client Beauty Twin (digital twin data)
 *
 * This is the brain that makes the salon "know you better than you know yourself"
 */

import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { glamaService } from './services/glamaService.js';
import { beautyMemoryService } from './services/beautyMemoryService.js';
import { servicePlanService } from './services/servicePlanService.js';
import { stylistService } from './services/stylistService.js';
import { customerService } from './services/customerService.js';
import { inventoryService } from './services/inventoryService.js';
import { recommendationService } from './services/recommendationService.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
const PORT = parseInt(process.env.GLAMAI_PORT || '3000', 10);

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/glamai';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', async (req: Request, res: Response) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'glamai',
    version: '1.0.0',
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    }
  };
  res.json(health);
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', (req: Request, res: Response) => {
  res.json({ status: 'ready' });
});

// GlamAI API Routes

/**
 * Customer Beauty Profile
 * GET /api/customers/:customerId/profile - Get full beauty profile
 * PUT /api/customers/:customerId/profile - Update beauty profile
 */
app.get('/api/customers/:customerId/profile', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const profile = await beautyMemoryService.getCustomerProfile(customerId);
    res.json({ success: true, data: profile });
  } catch (error) {
    logger.error('Error getting customer profile:', error);
    res.status(500).json({ success: false, error: 'Failed to get profile' });
  }
});

app.put('/api/customers/:customerId/profile', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const profileData = req.body;
    const profile = await beautyMemoryService.updateCustomerProfile(customerId, profileData);
    res.json({ success: true, data: profile });
  } catch (error) {
    logger.error('Error updating customer profile:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

/**
 * Service Plan Generation
 * POST /api/customers/:customerId/service-plan - Generate personalized service plan
 */
app.post('/api/customers/:customerId/service-plan', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { currentServices, stylistId, budget } = req.body;
    const plan = await servicePlanService.generatePlan(customerId, currentServices, stylistId, budget);
    res.json({ success: true, data: plan });
  } catch (error) {
    logger.error('Error generating service plan:', error);
    res.status(500).json({ success: false, error: 'Failed to generate plan' });
  }
});

/**
 * Beauty Memory Operations
 * POST /api/memory/hair-color - Record hair color formula
 * POST /api/memory/stylist-note - Add stylist note
 * POST /api/memory/product-reaction - Record product reaction
 * GET /api/memory/:customerId/history - Get beauty memory history
 */
app.post('/api/memory/hair-color', async (req: Request, res: Response) => {
  try {
    const { customerId, colorFormula, stylistId, stylistName, date, serviceId } = req.body;
    const memory = await beautyMemoryService.recordHairColor(customerId, colorFormula, stylistId, stylistName, date ? new Date(date) : new Date(), serviceId);
    res.json({ success: true, data: memory });
  } catch (error) {
    logger.error('Error recording hair color:', error);
    res.status(500).json({ success: false, error: 'Failed to record' });
  }
});

app.post('/api/memory/stylist-note', async (req: Request, res: Response) => {
  try {
    const { customerId, note, stylistId, stylistName, category } = req.body;
    const memory = await beautyMemoryService.addStylistNote(customerId, note, stylistId, stylistName, category);
    res.json({ success: true, data: memory });
  } catch (error) {
    logger.error('Error adding stylist note:', error);
    res.status(500).json({ success: false, error: 'Failed to add note' });
  }
});

app.post('/api/memory/product-reaction', async (req: Request, res: Response) => {
  try {
    const { customerId, productId, productName, reaction, notes } = req.body;
    const memory = await beautyMemoryService.recordProductReaction(customerId, productId, productName, reaction, notes);
    res.json({ success: true, data: memory });
  } catch (error) {
    logger.error('Error recording product reaction:', error);
    res.status(500).json({ success: false, error: 'Failed to record' });
  }
});

app.get('/api/memory/:customerId/history', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { type, limit } = req.query;
    const history = await beautyMemoryService.getMemoryHistory(customerId, type as string, parseInt(limit as string) || 50);
    res.json({ success: true, data: history });
  } catch (error) {
    logger.error('Error getting memory history:', error);
    res.status(500).json({ success: false, error: 'Failed to get history' });
  }
});

/**
 * Stylist Operations
 * GET /api/stylists/:stylistId/customers - Get stylist's customers
 * GET /api/stylists/:stylistId/today - Get today's appointments with customer context
 * GET /api/stylists/:stylistId/customer/:customerId - Get customer context for service
 */
app.get('/api/stylists/:stylistId/customers', async (req: Request, res: Response) => {
  try {
    const { stylistId } = req.params;
    const customers = await stylistService.getStylistCustomers(stylistId);
    res.json({ success: true, data: customers });
  } catch (error) {
    logger.error('Error getting stylist customers:', error);
    res.status(500).json({ success: false, error: 'Failed to get customers' });
  }
});

app.get('/api/stylists/:stylistId/today', async (req: Request, res: Response) => {
  try {
    const { stylistId } = req.params;
    const today = await stylistService.getTodayAppointments(stylistId);
    res.json({ success: true, data: today });
  } catch (error) {
    logger.error('Error getting today appointments:', error);
    res.status(500).json({ success: false, error: 'Failed to get appointments' });
  }
});

app.get('/api/stylists/:stylistId/customer/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const context = await stylistService.getCustomerContext(customerId);
    res.json({ success: true, data: context });
  } catch (error) {
    logger.error('Error getting customer context:', error);
    res.status(500).json({ success: false, error: 'Failed to get context' });
  }
});

/**
 * Stylist Actions (during service)
 * POST /api/stylists/note - Add note during service
 * POST /api/stylists/service-complete - Record service completion
 * POST /api/stylists/color - Record hair color
 * POST /api/stylists/product-reaction - Record product reaction
 */
app.post('/api/stylists/note', async (req: Request, res: Response) => {
  try {
    const { customerId, stylistId, stylistName, note, category } = req.body;
    await stylistService.addServiceNote(customerId, stylistId, stylistName, note, category);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error adding service note:', error);
    res.status(500).json({ success: false, error: 'Failed to add note' });
  }
});

app.post('/api/stylists/service-complete', async (req: Request, res: Response) => {
  try {
    const { customerId, stylistId, stylistName, serviceId, serviceName, products, notes, satisfaction } = req.body;
    await stylistService.recordServiceCompletion(
      customerId,
      stylistId,
      stylistName,
      serviceId,
      serviceName,
      products || [],
      notes,
      satisfaction
    );
    res.json({ success: true });
  } catch (error) {
    logger.error('Error recording service completion:', error);
    res.status(500).json({ success: false, error: 'Failed to record' });
  }
});

app.post('/api/stylists/color', async (req: Request, res: Response) => {
  try {
    const { customerId, stylistId, stylistName, colorFormula, serviceId } = req.body;
    await stylistService.recordHairColor(customerId, stylistId, stylistName, colorFormula, serviceId);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error recording hair color:', error);
    res.status(500).json({ success: false, error: 'Failed to record' });
  }
});

app.post('/api/stylists/product-reaction', async (req: Request, res: Response) => {
  try {
    const { customerId, productId, productName, reaction, notes } = req.body;
    await stylistService.recordProductReaction(customerId, productId, productName, reaction, notes);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error recording product reaction:', error);
    res.status(500).json({ success: false, error: 'Failed to record' });
  }
});

/**
 * Customer Intelligence
 * GET /api/customers/:customerId/intelligence - Get full customer intelligence
 * GET /api/customers/:customerId/recommendations - Get personalized recommendations
 */
app.get('/api/customers/:customerId/intelligence', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const intelligence = await customerService.getCustomerIntelligence(customerId);
    res.json({ success: true, data: intelligence });
  } catch (error) {
    logger.error('Error getting customer intelligence:', error);
    res.status(500).json({ success: false, error: 'Failed to get intelligence' });
  }
});

app.get('/api/customers/:customerId/recommendations', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { context } = req.query;
    const recommendations = await recommendationService.getRecommendations(customerId, context as string);
    res.json({ success: true, data: recommendations });
  } catch (error) {
    logger.error('Error getting recommendations:', error);
    res.status(500).json({ success: false, error: 'Failed to get recommendations' });
  }
});

/**
 * Inventory Intelligence
 * GET /api/inventory/alerts - Get inventory alerts
 * GET /api/inventory/reorder - Get reorder recommendations
 * POST /api/inventory/reorder - Trigger reorder
 */
app.get('/api/inventory/alerts', async (req: Request, res: Response) => {
  try {
    const { salonId } = req.query;
    const alerts = await inventoryService.getAlerts(salonId as string);
    res.json({ success: true, data: alerts });
  } catch (error) {
    logger.error('Error getting inventory alerts:', error);
    res.status(500).json({ success: false, error: 'Failed to get alerts' });
  }
});

app.get('/api/inventory/reorder', async (req: Request, res: Response) => {
  try {
    const { salonId } = req.query;
    const reorder = await inventoryService.getReorderRecommendations(salonId as string);
    res.json({ success: true, data: reorder });
  } catch (error) {
    logger.error('Error getting reorder recommendations:', error);
    res.status(500).json({ success: false, error: 'Failed to get recommendations' });
  }
});

app.post('/api/inventory/reorder', async (req: Request, res: Response) => {
  try {
    const recommendation = req.body;
    const result = await inventoryService.triggerReorder(recommendation);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error triggering reorder:', error);
    res.status(500).json({ success: false, error: 'Failed to trigger reorder' });
  }
});

/**
 * Salon Dashboard
 * GET /api/salon/:salonId/dashboard - Get salon dashboard data
 */
app.get('/api/salon/:salonId/dashboard', async (req: Request, res: Response) => {
  try {
    const { salonId } = req.params;
    const dashboard = await glamaService.getSalonDashboard(salonId);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    logger.error('Error getting salon dashboard:', error);
    res.status(500).json({ success: false, error: 'Failed to get dashboard' });
  }
});

/**
 * Session Check-in (for when customer scans QR)
 * POST /api/session/checkin - Customer check-in
 */
app.post('/api/session/checkin', async (req: Request, res: Response) => {
  try {
    const { customerId, salonId, qrData } = req.body;
    const session = await glamaService.processCheckin(customerId, salonId, qrData);
    res.json({ success: true, data: session });
  } catch (error) {
    logger.error('Error processing checkin:', error);
    res.status(500).json({ success: false, error: 'Failed to check in' });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Initialize connections and start server
async function start() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    logger.info('Connected to MongoDB');

    // Initialize services with connections
    await glamaService.initialize({ mongoose, redis: null });
    await beautyMemoryService.initialize({ mongoose, redis: null });
    await servicePlanService.initialize({ mongoose, redis: null });
    await stylistService.initialize({ mongoose, redis: null });
    await customerService.initialize({ mongoose, redis: null });
    await inventoryService.initialize({ mongoose, redis: null });
    await recommendationService.initialize({ mongoose, redis: null });

    // Start server
    app.listen(PORT, () => {
      logger.info(`GlamAI running on port ${PORT}`);
      logger.info('GlamAI - Salon Intelligence OS initialized');
    });
  } catch (error) {
    logger.error('Failed to start GlamAI:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down GlamAI...');
  await mongoose.disconnect();
  process.exit(0);
});

start();

export { app };
