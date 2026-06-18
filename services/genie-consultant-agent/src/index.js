/**
 * Genie Consultant Agent - Domain Expertise Router
 *
 * This service powers Genie's Consultant OS pillar.
 * It routes user queries to domain-specific expertise:
 * - Restaurant
 * - Hotel
 * - Startup
 * - Healthcare
 * - Legal
 * - HR
 * - Marketing
 * - Finance
 * - Real Estate
 * - Career
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

import consultantRoutes from './routes/consultant.js';
import domainRoutes from './routes/domain.js';

const app = express();
const PORT = process.env.PORT || 4720;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Storage
const storage = {
  consultations: new Map()
};

app.locals.storage = storage;

// Routes
app.use('/', consultantRoutes);
app.use('/', domainRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'genie-consultant-agent',
    port: PORT,
    version: '1.0.0',
    domains: [
      'restaurant', 'hotel', 'startup', 'healthcare',
      'legal', 'hr', 'marketing', 'finance',
      'realestate', 'career', 'retail', 'beauty',
      'fitness', 'travel', 'education', 'manufacturing',
      'construction', 'agriculture', 'sports', 'entertainment'
    ],
    capabilities: [
      'domain-routing',
      'expertise-matching',
      'advice-generation',
      'resource-recommendation'
    ],
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, service: 'genie-consultant-agent' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           GENIE CONSULTANT AGENT v1.0.0                    ║
║                                                                ║
║  💼 Domain Expertise Router                                ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                               ║
║                                                                ║
║  Domains:                                                     ║
║  • Restaurant  • Hotel     • Startup   • Healthcare          ║
║  • Legal      • HR        • Marketing • Finance              ║
║  • Real Estate • Career    • + 12 more                      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
