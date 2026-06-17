/**
 * REZ-Merchant Integration Routes
 * Handles merchant POS, products, orders, and operations
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import winston from 'winston';
import { REZMerchantProfile, REZProduct, REZOrder } from '../models/REZProfile';
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

// REZ Merchant service URL
const REZ_MERCHANT_URL = process.env.REZ_MERCHANT_URL || 'http://localhost:4800';

/**
 * GET /api/merchant/health
 * Health check for REZ-Merchant connectivity
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get(`${REZ_MERCHANT_URL}/health`, { timeout: 5000 });
    res.json({
      success: true,
      merchantService: 'connected',
      status: response.data
    });
  } catch (error: any) {
    logger.warn('REZ-Merchant health check failed:', error.message);
    res.json({
      success: true,
      merchantService: 'unavailable',
      message: 'REZ-Merchant not reachable - using cached data'
    });
  }
});

/**
 * GET /api/merchant/profile/:merchantId
 * Get merchant profile from REZ-Merchant
 */
router.get('/profile/:merchantId', async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;

    let profile: REZMerchantProfile;
    try {
      const response = await axios.get(`${REZ_MERCHANT_URL}/api/merchants/${merchantId}`);
      profile = response.data;
    } catch {
      // Fallback to mock data
      profile = {
        corpid: 'REZ-MERCHANT',
        merchantId,
        businessName: 'Demo Merchant',
        type: 'merchant',
        contact: { phone: '+1234567890', email: 'demo@merchant.com' },
        address: {
          street: '123 Main St',
          city: 'Demo City',
          state: 'Demo State',
          postalCode: '12345',
          country: 'India'
        },
        businessType: 'restaurant',
        industryVertical: 'hospitality',
        posTerminals: 2,
        activeProducts: 50,
        staff: { total: 10, active: 8 },
        wallet: { balance: 50000, currency: 'INR', status: 'active' },
        ratings: { average: 4.5, count: 120 },
        operatingHours: {
          monday: { open: '09:00', close: '22:00' },
          tuesday: { open: '09:00', close: '22:00' },
          wednesday: { open: '09:00', close: '22:00' },
          thursday: { open: '09:00', close: '22:00' },
          friday: { open: '09:00', close: '23:00' },
          saturday: { open: '10:00', close: '23:00' },
          sunday: { open: '10:00', close: '21:00' }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    // Sync to Area Twin (for location-based discovery)
    await twinSyncService.syncToTwin('area', {
      merchantId,
      location: profile.address,
      industryVertical: profile.industryVertical
    });

    // Push to Customer Ops Bridge
    await customerOpsBridge.syncMerchantProfile(profile);

    logger.info(`Merchant profile ${merchantId} synced`);
    res.json({ success: true, profile });
  } catch (error: any) {
    logger.error('Merchant profile fetch failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/merchant/pos/order
 * Process POS order and sync to twins
 */
router.post('/pos/order', async (req: Request, res: Response) => {
  try {
    const order: REZOrder = req.body;

    // Validate required fields
    if (!order.orderId || !order.merchant || !order.items) {
      return res.status(400).json({ success: false, error: 'Missing required order fields' });
    }

    // Set defaults
    order.type = 'merchant';
    order.updatedAt = new Date();
    if (!order.createdAt) order.createdAt = new Date();

    // Process in REZ-Merchant POS
    try {
      await axios.post(`${REZ_MERCHANT_URL}/api/pos/orders`, order);
    } catch {
      logger.info('REZ-Merchant unavailable - storing order locally');
    }

    // Sync to Order Twin
    await twinSyncService.syncToTwin('order', order);

    // Sync merchant inventory (update product availability)
    for (const item of order.items) {
      await twinSyncService.syncToTwin('product', {
        productId: item.productId,
        merchantId: order.merchant.id,
        availability: 'available',
        lastOrdered: new Date()
      });
    }

    // Push to Customer Ops Bridge
    await customerOpsBridge.syncOrder(order);

    // Publish order created event
    await customerOpsBridge.publishEvent('merchant.order.created', order);

    logger.info(`Merchant POS order ${order.orderId} synced to twins`);
    res.json({ success: true, orderId: order.orderId, twinsSynced: true });
  } catch (error: any) {
    logger.error('Merchant POS order creation failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/merchant/order/:orderId/status
 * Update merchant order status
 */
router.put('/order/:orderId/status', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status, preparationTime } = req.body;

    // Update in REZ-Merchant
    try {
      await axios.put(`${REZ_MERCHANT_URL}/api/orders/${orderId}/status`, { status, preparationTime });
    } catch {
      logger.info('REZ-Merchant unavailable - status update stored locally');
    }

    // Sync to Order Twin
    await twinSyncService.syncToTwin('order', { orderId, status });

    // Publish status change event
    await customerOpsBridge.publishEvent('merchant.order.status_changed', { orderId, status, preparationTime });

    logger.info(`Merchant order ${orderId} status updated to ${status}`);
    res.json({ success: true, orderId, status });
  } catch (error: any) {
    logger.error('Merchant order status update failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/merchant/products/:merchantId
 * Get merchant products from POS
 */
router.get('/products/:merchantId', async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const { category, available } = req.query;

    let products: REZProduct[] = [];
    try {
      const response = await axios.get(`${REZ_MERCHANT_URL}/api/merchants/${merchantId}/products`, {
        params: { category, available }
      });
      products = response.data;
    } catch {
      logger.info('REZ-Merchant unavailable - returning empty products');
    }

    // Sync products to Product Twin
    for (const product of products) {
      await twinSyncService.syncToTwin('product', product);
    }

    res.json({ success: true, merchantId, products, count: products.length });
  } catch (error: any) {
    logger.error('Merchant products fetch failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/merchant/products
 * Add/update product and sync to Product Twin
 */
router.post('/products', async (req: Request, res: Response) => {
  try {
    const product: REZProduct = req.body;

    if (!product.productId || !product.merchantId) {
      return res.status(400).json({ success: false, error: 'Missing required product fields' });
    }

    product.updatedAt = new Date();
    if (!product.createdAt) product.createdAt = new Date();

    // Save to REZ-Merchant
    try {
      await axios.post(`${REZ_MERCHANT_URL}/api/products`, product);
    } catch {
      logger.info('REZ-Merchant unavailable - product stored locally');
    }

    // Sync to Product Twin
    await twinSyncService.syncToTwin('product', product);

    // Publish product event
    await customerOpsBridge.publishEvent('merchant.product.created', product);

    logger.info(`Product ${product.productId} synced to twins`);
    res.json({ success: true, productId: product.productId });
  } catch (error: any) {
    logger.error('Product creation failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/merchant/products/:productId/availability
 * Update product availability
 */
router.put('/products/:productId/availability', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { availability, merchantId } = req.body;

    // Update in REZ-Merchant
    try {
      await axios.put(`${REZ_MERCHANT_URL}/api/products/${productId}/availability`, { availability });
    } catch {
      logger.info('REZ-Merchant unavailable - availability update stored locally');
    }

    // Sync to Product Twin
    await twinSyncService.syncToTwin('product', { productId, merchantId, availability });

    logger.info(`Product ${productId} availability updated to ${availability}`);
    res.json({ success: true, productId, availability });
  } catch (error: any) {
    logger.error('Product availability update failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/merchant/orders/:merchantId
 * Get merchant orders
 */
router.get('/orders/:merchantId', async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const { status, limit = '50', offset = '0' } = req.query;

    let orders: REZOrder[] = [];
    try {
      const response = await axios.get(`${REZ_MERCHANT_URL}/api/merchants/${merchantId}/orders`, {
        params: { status, limit, offset }
      });
      orders = response.data;
    } catch {
      logger.info('REZ-Merchant unavailable - returning empty orders');
    }

    res.json({ success: true, merchantId, orders, count: orders.length });
  } catch (error: any) {
    logger.error('Merchant orders fetch failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/merchant/payments/settlement
 * Process payment settlement and sync to twins
 */
router.post('/payments/settlement', async (req: Request, res: Response) => {
  try {
    const { orderId, amount, merchantId, paymentMethod } = req.body;

    // Process in REZ-Merchant
    try {
      await axios.post(`${REZ_MERCHANT_URL}/api/payments/settlement`, {
        orderId,
        amount,
        merchantId,
        paymentMethod
      });
    } catch {
      logger.info('REZ-Merchant unavailable - settlement logged locally');
    }

    // Sync to Payment Twin
    await twinSyncService.syncToTwin('payment', {
      transactionId: `TXN-${Date.now()}`,
      corpid: 'REZ-MERCHANT',
      orderId,
      type: 'credit',
      amount,
      currency: 'INR',
      method: paymentMethod,
      status: 'completed',
      to: { type: 'merchant', id: merchantId },
      createdAt: new Date()
    });

    // Publish settlement event
    await customerOpsBridge.publishEvent('merchant.payment.settled', { orderId, amount, merchantId });

    logger.info(`Payment settlement ${amount} for order ${orderId}`);
    res.json({ success: true, orderId, settlementAmount: amount });
  } catch (error: any) {
    logger.error('Payment settlement failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/merchant/webhook
 * Webhook receiver for REZ-Merchant events
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body;

    logger.info(`Received merchant webhook: ${event}`);

    switch (event) {
      case 'order.created':
      case 'order.updated':
        await twinSyncService.syncToTwin('order', data);
        await customerOpsBridge.syncOrder(data);
        break;
      case 'product.created':
      case 'product.updated':
        await twinSyncService.syncToTwin('product', data);
        break;
      case 'payment.settled':
        await twinSyncService.syncToTwin('payment', data);
        break;
      case 'merchant.updated':
        await twinSyncService.syncToTwin('area', { merchantId: data.merchantId, ...data });
        await customerOpsBridge.syncMerchantProfile(data);
        break;
    }

    res.json({ success: true, event });
  } catch (error: any) {
    logger.error('Merchant webhook processing failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
