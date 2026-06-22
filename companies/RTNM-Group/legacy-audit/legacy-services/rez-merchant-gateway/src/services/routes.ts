/**
 * Unified Gateway Routes
 *
 * Single API surface for all merchant operations.
 * Routes requests to appropriate upstream services.
 */

import { Router, Request, Response } from 'express';
import { MerchantGateway } from './gateway.js';
import { logger } from './logger.js';

interface AuthenticatedRequest extends Request {
  merchant?: any;
  internalService?: string;
}

export function gatewayRouter(router?: Router): Router {
  const r = router || Router();
  const gateway = new MerchantGateway();

  /**
   * ============================================
   * UNIFIED MERCHANT ENDPOINTS
   * ============================================
   */

  /**
   * GET /api/v1/profile
   * Get unified merchant profile with all aggregated data
   */
  r.get('/profile', async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.merchant?.merchantId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const profile = await gateway.getUnifiedProfile(
        req.merchant.merchantId,
        req.headers.authorization?.substring(7) || ''
      );

      res.json({ success: true, data: profile });
    } catch (error: any) {
      logger.error('Profile fetch failed', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch profile' });
    }
  });

  /**
   * GET /api/v1/dashboard
   * Get unified dashboard metrics
   */
  r.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.merchant?.merchantId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const metrics = await gateway.getDashboardMetrics(
        req.merchant.merchantId,
        req.headers.authorization?.substring(7) || ''
      );

      res.json({ success: true, data: metrics });
    } catch (error: any) {
      logger.error('Dashboard fetch failed', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch dashboard' });
    }
  });

  /**
   * ============================================
   * ORDERS
   * ============================================
   */

  /**
   * GET /api/v1/orders
   * List merchant orders
   */
  r.get('/orders', async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.merchant?.merchantId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { limit = 20, offset = 0, status } = req.query;
      const orders = await gateway.getMerchantOrders(
        req.merchant.merchantId,
        req.headers.authorization?.substring(7) || ''
      );

      res.json({ success: true, data: orders });
    } catch (error: any) {
      logger.error('Orders fetch failed', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch orders' });
    }
  });

  /**
   * ============================================
   * CUSTOMERS
   * ============================================
   */

  /**
   * GET /api/v1/customers
   * List merchant customers
   */
  r.get('/customers', async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.merchant?.merchantId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const customers = await gateway.getMerchantCustomers(
        req.merchant.merchantId,
        req.headers.authorization?.substring(7) || ''
      );

      res.json({ success: true, data: customers });
    } catch (error: any) {
      logger.error('Customers fetch failed', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch customers' });
    }
  });

  /**
   * ============================================
   * INVENTORY
   * ============================================
   */

  /**
   * GET /api/v1/inventory
   * List merchant inventory
   */
  r.get('/inventory', async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.merchant?.merchantId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const inventory = await gateway.getMerchantInventory(
        req.merchant.merchantId,
        req.headers.authorization?.substring(7) || ''
      );

      res.json({ success: true, data: inventory });
    } catch (error: any) {
      logger.error('Inventory fetch failed', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch inventory' });
    }
  });

  /**
   * GET /api/v1/inventory/low-stock
   * Get low stock alerts
   */
  r.get('/inventory/low-stock', async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.merchant?.merchantId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const inventory = await gateway.getMerchantInventory(
        req.merchant.merchantId,
        req.headers.authorization?.substring(7) || ''
      );

      const lowStock = (inventory.products || []).filter(
        (p: any) => p.stock <= (p.lowStockThreshold || 10)
      );

      res.json({ success: true, data: { items: lowStock, count: lowStock.length } });
    } catch (error: any) {
      logger.error('Low stock fetch failed', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch low stock' });
    }
  });

  /**
   * ============================================
   * FINANCIAL
   * ============================================
   */

  /**
   * GET /api/v1/financials
   * Get financial overview
   */
  r.get('/financials', async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.merchant?.merchantId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const financials = await gateway.getMerchantFinancials(
        req.merchant.merchantId,
        req.headers.authorization?.substring(7) || ''
      );

      res.json({ success: true, data: financials });
    } catch (error: any) {
      logger.error('Financials fetch failed', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch financials' });
    }
  });

  /**
   * GET /api/v1/financials/balance
   * Get wallet balance
   */
  r.get('/financials/balance', async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.merchant?.merchantId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const financials = await gateway.getMerchantFinancials(
        req.merchant.merchantId,
        req.headers.authorization?.substring(7) || ''
      );

      res.json({
        success: true,
        data: {
          balance: financials.wallet?.balance || 0,
          currency: 'INR',
          pending: financials.payments?.pending || 0
        }
      });
    } catch (error: any) {
      logger.error('Balance fetch failed', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch balance' });
    }
  });

  /**
   * ============================================
   * LOYALTY & ENGAGEMENT
   * ============================================
   */

  /**
   * GET /api/v1/loyalty
   * Get loyalty program stats
   */
  r.get('/loyalty', async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.merchant?.merchantId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const loyalty = await gateway.getMerchantLoyalty(
        req.merchant.merchantId,
        req.headers.authorization?.substring(7) || ''
      );

      res.json({ success: true, data: loyalty });
    } catch (error: any) {
      logger.error('Loyalty fetch failed', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch loyalty data' });
    }
  });

  /**
   * ============================================
   * MARKETING
   * ============================================
   */

  /**
   * GET /api/v1/marketing
   * Get marketing campaigns
   */
  r.get('/marketing', async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.merchant?.merchantId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const marketing = await gateway.getMerchantMarketing(
        req.merchant.merchantId,
        req.headers.authorization?.substring(7) || ''
      );

      res.json({ success: true, data: marketing });
    } catch (error: any) {
      logger.error('Marketing fetch failed', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch marketing' });
    }
  });

  /**
   * ============================================
   * B2B COMMERCE (NexTaBizz)
   * ============================================
   */

  /**
   * GET /api/v1/b2b/suppliers
   * List merchant suppliers
   */
  r.get('/b2b/suppliers', async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.merchant?.merchantId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const suppliers = await gateway.getMerchantSuppliers(
        req.merchant.merchantId,
        req.headers.authorization?.substring(7) || ''
      );

      res.json({ success: true, data: suppliers });
    } catch (error: any) {
      logger.error('Suppliers fetch failed', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch suppliers' });
    }
  });

  /**
   * GET /api/v1/b2b/purchase-orders
   * List purchase orders
   */
  r.get('/b2b/purchase-orders', async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.merchant?.merchantId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const orders = await gateway.getMerchantPurchaseOrders(
        req.merchant.merchantId,
        req.headers.authorization?.substring(7) || ''
      );

      res.json({ success: true, data: orders });
    } catch (error: any) {
      logger.error('Purchase orders fetch failed', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch purchase orders' });
    }
  });

  /**
   * ============================================
   * TRUST & SAFETY
   * ============================================
   */

  /**
   * GET /api/v1/trust
   * Get trust score and risk assessment
   */
  r.get('/trust', async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.merchant?.merchantId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const trust = await gateway.getMerchantTrust(
        req.merchant.merchantId,
        req.headers.authorization?.substring(7) || ''
      );

      res.json({ success: true, data: trust });
    } catch (error: any) {
      logger.error('Trust fetch failed', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch trust data' });
    }
  });

  /**
   * ============================================
   * AI RECOMMENDATIONS
   * ============================================
   */

  /**
   * GET /api/v1/ai/recommendations
   * Get AI-powered recommendations
   */
  r.get('/ai/recommendations', async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.merchant?.merchantId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const recommendations = await gateway.getAIRecommendations(
        req.merchant.merchantId,
        req.headers.authorization?.substring(7) || ''
      );

      res.json({ success: true, data: recommendations });
    } catch (error: any) {
      logger.error('AI recommendations fetch failed', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch recommendations' });
    }
  });

  return r;
}
