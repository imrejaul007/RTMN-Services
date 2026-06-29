/**
 * Finance Department Pack
 *
 * Tenant-aware finance service.
 * Port: 4801
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import financeRoutes from './routes';

const PORT = process.env.PORT || 4801;
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'finance-department-pack',
    version: '1.0.0',
    port: PORT,
  });
});

// Finance routes
app.use('/', financeRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║       Finance Department Pack                          ║
║                                                       ║
║  Service running on port ${PORT}                          ║
║                                                       ║
║  Modules:                                             ║
║    POST /api/invoices        - Create invoice          ║
║    GET  /api/invoices       - List invoices           ║
║    POST /api/payments       - Create payment          ║
║    GET  /api/payments       - List payments           ║
║    POST /api/expenses       - Create expense          ║
║    GET  /api/expenses      - List expenses          ║
║    GET  /api/accounting/chart-of-accounts            ║
║    GET  /api/accounting/trial-balance                ║
║    GET  /api/treasury/balances                      ║
║    GET  /api/reports/balance-sheet                  ║
║    GET  /api/reports/p&l                            ║
║                                                       ║
║  Tenant Headers:                                       ║
║    X-Tenant-ID: <company_id>                         ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
