/**
 * Shopify App Server
 * HOJAI SiteOS Shopify App - OAuth + App Bridge
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Shopify, ApiVersion } from '@shopify/shopify-api';
import authRoutes from './routes/auth.js';
import webhookRoutes from './routes/webhook.js';
import widgetRoutes from './routes/widget.js';
import { storage } from './services/storage.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Shopify config
Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_CLIENT_ID,
  API_SECRET_KEY: process.env.SHOPIFY_CLIENT_SECRET,
  SCOPES: process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_orders',
  HOST_NAME: process.env.SHOPIFY_APP_URL?.replace(/https?:\/\//, ''),
  API_VERSION: ApiVersion.October23,
  IS_EMBEDDED_APP: true,
  SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(),
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use('/auth', authRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/api/widget', widgetRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'hojai-shopify-app', port: PORT });
});

// Start server
app.listen(PORT, () => {
  console.log(`HOJAI Shopify App running on port ${PORT}`);
});

export default app;
