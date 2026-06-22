/**
 * Genie Learning OS - Languages, Business School, Skills
 *
 * This service powers Learning OS pillar:
 * - Languages (7 languages with speaking practice)
 * - Business School (MBA curriculum)
 * - Skills (coding, design, cooking, etc.)
 * - Personalized curriculum
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { requireAuth } from '@rtmn/shared/auth';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

import languageRoutes from './routes/language.js';
import businessRoutes from './routes/business.js';
import skillsRoutes from './routes/skills.js';
import curriculumRoutes from './routes/curriculum.js';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4722;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());


app.use(requireAuth);const storage = { enrollments: new PersistentMap('collection-1', { serviceName: 'genie-learning-os' }), progress: new PersistentMap('collection-2', { serviceName: 'genie-learning-os' }) };
app.locals.storage = storage;

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'genie-learning-os',
    port: PORT,
    version: '1.0.0',
    capabilities: ['languages', 'business-school', 'skills', 'curriculum'],
    timestamp: new Date().toISOString()
  });
});
app.get('/ready', (req, res) => res.json({ ready: true }));

app.use('/', languageRoutes);
app.use('/', businessRoutes);
app.use('/', skillsRoutes);
app.use('/', curriculumRoutes);

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           GENIE LEARNING OS v1.0.0                        ║
║                                                                ║
║  📚 Learn Languages, Business, Skills                     ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                               ║
║                                                                ║
║  Features:                                                     ║
║  • 7 Languages with Speaking Practice                         ║
║  • Business School (MBA Curriculum)                          ║
║  • Technical & Life Skills                                   ║
║  • Personalized Learning Paths                                ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

export default app;
