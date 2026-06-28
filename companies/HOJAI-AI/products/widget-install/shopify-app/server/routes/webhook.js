/**
 * Shopify Webhook Handlers
 */
import express from 'express';
import Shopify from '@shopify/shopify-api';
import { storage } from '../services/storage.js';

const router = express.Router();

// App uninstalled
router.post('/app/uninstalled', async (req, res) => {
  try {
    const shop = req.headers['x-shopify-shop-domain'];
    console.log('App uninstalled:', shop);

    // Clean up all data
    await storage.deleteSession(shop);
    await storage.deleteShopData(shop);

    res.status(200).send('OK');
  } catch (e) {
    console.error('Webhook error:', e);
    res.status(500).send('Webhook processing failed');
  }
});

// Shop update
router.post('/shop/update', async (req, res) => {
  try {
    const shop = req.body?.shop_domain;
    const shopData = {
      name: req.body?.name,
      email: req.body?.email,
      domain: req.body?.domain,
      updatedAt: new Date().toISOString()
    };

    await storage.storeShopMeta(shop, shopData);
    res.status(200).send('OK');
  } catch (e) {
    res.status(500).send('Failed');
  }
});

// Order created
router.post('/orders/create', async (req, res) => {
  try {
    const order = req.body;
    console.log('New order:', order.id, order.name);

    // Track order event
    await storage.trackEvent('orders/create', {
      orderId: order.id,
      orderName: order.name,
      total: order.total_price,
      customerId: order.customer?.id,
      email: order.email
    });

    res.status(200).send('OK');
  } catch (e) {
    res.status(500).send('Failed');
  }
});

// Order updated
router.post('/orders/updated', async (req, res) => {
  try {
    const order = req.body;
    await storage.trackEvent('orders/updated', {
      orderId: order.id,
      status: order.fulfillment_status
    });
    res.status(200).send('OK');
  } catch (e) {
    res.status(500).send('Failed');
  }
});

// Customer data request (GDPR)
router.post('/customers/data_request', async (req, res) => {
  try {
    const { customer_id, customer_email } = req.body;
    console.log('GDPR data request:', customer_email);

    // Respond with customer data
    res.status(200).send('OK');
  } catch (e) {
    res.status(500).send('Failed');
  }
});

// Customer data erasure (GDPR)
router.post('/customers/redact', async (req, res) => {
  try {
    const { customer_id, customer_email } = req.body;
    console.log('GDPR data erasure:', customer_email);

    // Delete customer data
    await storage.deleteCustomerData(customer_email);

    res.status(200).send('OK');
  } catch (e) {
    res.status(500).send('Failed');
  }
});

// Products update
router.post('/products/create', async (req, res) => {
  try {
    const product = req.body;
    await storage.trackEvent('products/create', {
      productId: product.id,
      title: product.title
    });
    res.status(200).send('OK');
  } catch (e) {
    res.status(500).send('Failed');
  }
});

router.post('/products/update', async (req, res) => {
  try {
    const product = req.body;
    await storage.trackEvent('products/update', {
      productId: product.id,
      title: product.title
    });
    res.status(200).send('OK');
  } catch (e) {
    res.status(500).send('Failed');
  }
});

export default router;
