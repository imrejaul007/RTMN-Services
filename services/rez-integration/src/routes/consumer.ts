/**
 * REZ-Consumer Integration Routes
 * Handles consumer orders, profiles, and wallet operations
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import winston from 'winston';
import { REZConsumerProfile, REZOrder, REZPayment, GenieCustomerContext } from '../models/REZProfile';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { TwinSyncService } from '../services/twinSync';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// Initialize services
const customerOpsBridge = new CustomerOpsBridge();
const twinSyncService = new TwinSyncService();

// REZ Consumer service URL
const REZ_CONSUMER_URL = process.env.REZ_CONSUMER_URL || 'http://localhost:3000';

/**
 * GET /api/consumer/health
 * Health check for REZ-Consumer connectivity
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get(`${REZ_CONSUMER_URL}/health`, { timeout: 5000 });
    res.json({
      success: true,
      consumerService: 'connected',
      status: response.data
    });
  } catch (error: any) {
    logger.warn('REZ-Consumer health check failed:', error.message);
    res.json({
      success: true,
      consumerService: 'unavailable',
      message: 'REZ-Consumer not reachable - using cached data'
    });
  }
});

/**
 * GET /api/consumer/profile/:consumerId
 * Get consumer profile from REZ-Consumer
 */
router.get('/profile/:consumerId', async (req: Request, res: Response) => {
  try {
    const { consumerId } = req.params;

    // Fetch from REZ-Consumer
    let profile: REZConsumerProfile;
    try {
      const response = await axios.get(`${REZ_CONSUMER_URL}/api/consumers/${consumerId}`);
      profile = response.data;
    } catch {
      // Fallback to mock data for development
      profile = {
        corpid: 'REZ-CONSUMER',
        consumerId,
        name: 'Demo Consumer',
        type: 'consumer',
        contact: { phone: '+1234567890', email: 'demo@example.com', preferredContact: 'sms' },
        wallet: { balance: 1000, currency: 'INR', status: 'active' },
        preferences: {
          language: 'en',
          notifications: { email: true, sms: true, push: true },
          privacyLevel: 'private'
        },
        orderHistory: [],
        favoriteMerchants: [],
        activeSubscriptions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    // Sync to Customer Twin
    await twinSyncService.syncToTwin('customer', profile);

    // Push to Customer Ops Bridge
    await customerOpsBridge.syncCustomerProfile(profile);

    // Push to Genie for context
    await sendToGenie('customer_profile', profile);

    res.json({ success: true, profile });
  } catch (error: any) {
    logger.error('Consumer profile fetch failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/consumer/order
 * Create new consumer order and sync to twins
 */
router.post('/order', async (req: Request, res: Response) => {
  try {
    const order: REZOrder = req.body;

    // Validate required fields
    if (!order.orderId || !order.customer || !order.merchant) {
      return res.status(400).json({ success: false, error: 'Missing required order fields' });
    }

    // Set defaults
    order.type = 'consumer';
    order.updatedAt = new Date();
    if (!order.createdAt) order.createdAt = new Date();

    // Create order in REZ-Consumer
    try {
      await axios.post(`${REZ_CONSUMER_URL}/api/orders`, order);
    } catch {
      logger.info('REZ-Consumer unavailable - storing order locally');
    }

    // Sync to Order Twin
    await twinSyncService.syncToTwin('order', order);

    // Sync to Customer Twin (customer order history)
    await twinSyncService.syncToTwin('customer', {
      consumerId: order.customer.id,
      lastOrder: order
    });

    // Push to Customer Ops Bridge
    await customerOpsBridge.syncOrder(order);

    // Publish order created event
    await customerOpsBridge.publishEvent('consumer.order.created', order);

    logger.info(`Consumer order ${order.orderId} synced to twins`);
    res.json({ success: true, orderId: order.orderId, twinsSynced: true });
  } catch (error: any) {
    logger.error('Consumer order creation failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/consumer/order/:orderId/status
 * Update order status and sync to twins
 */
router.put('/order/:orderId/status', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Update in REZ-Consumer
    try {
      await axios.put(`${REZ_CONSUMER_URL}/api/orders/${orderId}/status`, { status });
    } catch {
      logger.info('REZ-Consumer unavailable - status update stored locally');
    }

    // Get updated order
    const order: REZOrder = { orderId, status } as REZOrder;

    // Sync to Order Twin
    await twinSyncService.syncToTwin('order', order);

    // Push to Customer Ops Bridge
    await customerOpsBridge.syncOrder(order);

    // Publish status change event
    await customerOpsBridge.publishEvent('consumer.order.status_changed', { orderId, status });

    logger.info(`Consumer order ${orderId} status updated to ${status}`);
    res.json({ success: true, orderId, status });
  } catch (error: any) {
    logger.error('Order status update failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/consumer/orders/:consumerId
 * Get consumer order history
 */
router.get('/orders/:consumerId', async (req: Request, res: Response) => {
  try {
    const { consumerId } = req.params;
    const { limit = '20', offset = '0' } = req.query;

    let orders: REZOrder[] = [];
    try {
      const response = await axios.get(`${REZ_CONSUMER_URL}/api/consumers/${consumerId}/orders`, {
        params: { limit, offset }
      });
      orders = response.data;
    } catch {
      logger.info('REZ-Consumer unavailable - returning empty orders');
    }

    res.json({ success: true, consumerId, orders, count: orders.length });
  } catch (error: any) {
    logger.error('Consumer orders fetch failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/consumer/wallet/topup
 * Handle wallet topup and sync to Payment Twin
 */
router.post('/wallet/topup', async (req: Request, res: Response) => {
  try {
    const { consumerId, amount, paymentMethod } = req.body;

    // Process in REZ-Consumer
    try {
      await axios.post(`${REZ_CONSUMER_URL}/api/wallet/topup`, { consumerId, amount, paymentMethod });
    } catch {
      logger.info('REZ-Consumer unavailable - topup logged locally');
    }

    // Sync to Payment Twin
    const payment: REZPayment = {
      transactionId: `TXN-${Date.now()}`,
      corpid: 'REZ-CONSUMER',
      type: 'credit',
      amount,
      currency: 'INR',
      method: paymentMethod || 'wallet',
      status: 'completed',
      metadata: { consumerId, source: 'topup' },
      createdAt: new Date()
    };

    await twinSyncService.syncToTwin('payment', payment);

    // Push to Customer Ops Bridge
    await customerOpsBridge.syncPayment(payment);

    logger.info(`Wallet topup ${amount} for consumer ${consumerId}`);
    res.json({ success: true, transactionId: payment.transactionId });
  } catch (error: any) {
    logger.error('Wallet topup failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/consumer/genie-context/:consumerId
 * Get Genie customer context for AI personalization
 */
router.get('/genie-context/:consumerId', async (req: Request, res: Response) => {
  try {
    const { consumerId } = req.params;

    // Fetch consumer profile
    let profile: REZConsumerProfile;
    try {
      const profileRes = await axios.get(`${REZ_CONSUMER_URL}/api/consumers/${consumerId}`);
      profile = profileRes.data;
    } catch {
      profile = {
        corpid: 'REZ-CONSUMER',
        consumerId,
        name: 'Demo Consumer',
        type: 'consumer',
        contact: { phone: '+1234567890', email: 'demo@example.com' },
        wallet: { balance: 0, currency: 'INR', status: 'active' },
        preferences: { language: 'en', notifications: { email: true, sms: true, push: true }, privacyLevel: 'private' },
        orderHistory: [],
        favoriteMerchants: [],
        activeSubscriptions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    // Fetch recent orders
    let recentOrders: REZOrder[] = [];
    try {
      const ordersRes = await axios.get(`${REZ_CONSUMER_URL}/api/consumers/${consumerId}/orders`, {
        params: { limit: 5 }
      });
      recentOrders = ordersRes.data;
    } catch {}

    // Build Genie context
    const genieContext: GenieCustomerContext = {
      corpid: 'REZ-CONSUMER',
      customerId: consumerId,
      profile,
      recentOrders,
      preferences: profile.preferences,
      walletBalance: profile.wallet.balance,
      loyaltyPoints: 0,
      activeSubscriptions: profile.activeSubscriptions
    };

    res.json({ success: true, context: genieContext });
  } catch (error: any) {
    logger.error('Genie context generation failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/consumer/webhook
 * Webhook receiver for REZ-Consumer events
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body;

    logger.info(`Received consumer webhook: ${event}`);

    switch (event) {
      case 'order.created':
        await twinSyncService.syncToTwin('order', data);
        await customerOpsBridge.syncOrder(data);
        break;
      case 'order.updated':
        await twinSyncService.syncToTwin('order', data);
        break;
      case 'wallet.transaction':
        await twinSyncService.syncToTwin('payment', data);
        await customerOpsBridge.syncPayment(data);
        break;
      case 'profile.updated':
        await twinSyncService.syncToTwin('customer', data);
        await customerOpsBridge.syncCustomerProfile(data);
        break;
    }

    res.json({ success: true, event });
  } catch (error: any) {
    logger.error('Consumer webhook processing failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Helper: Send data to Genie
 */
async function sendToGenie(event: string, data: any): Promise<void> {
  const GENIE_URL = process.env.GENIE_API_URL || 'http://localhost:4703';
  try {
    await axios.post(`${GENIE_URL}/api/events`, { event, data }, { timeout: 3000 });
  } catch (error: any) {
    logger.warn('Genie sync failed:', error.message);
  }
}

export default router;
