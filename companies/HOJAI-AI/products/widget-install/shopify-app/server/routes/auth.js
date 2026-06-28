/**
 * Shopify OAuth Routes
 */
import express from 'express';
import Shopify from '@shopify/shopify-api';
import { storage } from '../services/storage.js';

const router = express.Router();

// Start OAuth
router.get('/shopify', async (req, res) => {
  try {
    const { shop } = req.query;
    if (!shop) {
      return res.status(400).send('Missing shop parameter');
    }

    // Validate shop domain
    if (!shop.includes('.myshopify.com') && !shop.includes('.shopify.com')) {
      return res.status(400).send('Invalid shop domain');
    }

    // Build auth URL
    const authUrl = await Shopify.Auth.beginAuth(
      req, res, shop,
      '/auth/callback',
      process.env.NODE_ENV === 'production'
    );

    res.redirect(authUrl);
  } catch (e) {
    console.error('Auth start error:', e);
    res.status(500).send('Failed to start OAuth');
  }
});

// OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { shop, code } = req.query;

    // Complete OAuth
    const session = await Shopify.Auth.completeAuth(req, res);

    // Store session securely (NOT in metafields!)
    await storage.storeSession(shop, {
      accessToken: session.accessToken,
      scope: session.scope,
      expiresAt: session.expiresAt
    });

    // Redirect to app
    res.redirect(`/?shop=${shop}&auth=success`);
  } catch (e) {
    console.error('Auth callback error:', e);
    res.status(500).send('Authentication failed');
  }
});

// Check auth status
router.get('/status', async (req, res) => {
  try {
    const { shop } = req.query;
    if (!shop) return res.status(400).json({ error: 'Missing shop' });

    const session = await storage.getSession(shop);
    res.json({
      authenticated: !!session,
      shop,
      hasToken: !!session?.accessToken
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Uninstall
router.delete('/shop', async (req, res) => {
  try {
    const { shop } = req.body;
    await storage.deleteSession(shop);
    await storage.deleteShopData(shop);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
