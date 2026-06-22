/**
 * HOJAI Game Designer Agent
 * Port: 5100
 *
 * Systems and mechanics architect for game design
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import chatRouter from './routes/chat';

const PORT = 5100;
const SERVICE_NAME = 'game-designer';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(compression());
app.use(express.json({ limit: "10kb" }));

app.use(rateLimit({ windowMs: 60 * 1000, max: 100 }));

// Health endpoints
app.get('/health', (req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, timestamp: new Date().toISOString() }));
app.get('/health/live', (req, res) => res.json({ status: 'ok' }));
app.get('/health/ready', (req, res) => res.json({ status: 'ready' }));

// Info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    version: '1.0.0',
    description: 'Systems and mechanics architect for game design',
    capabilities: {
      game_design: true,
      gdd_authoring: true,
      gameplay_loop_design: true,
      economy_balancing: true,
      player_psychology: true,
      progression_design: true
    }
  });
});

// Chat endpoint
app.use('/api/chat', chatRouter);

// Error handlers
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err: any, req: express.Request, res: express.Response, next: any) => {
  console.error(`[${SERVICE_NAME}] Error:`, err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  HOJAI Game Designer Agent                              ║
║  Port: ${PORT}                                               ║
║  Status: RUNNING                                          ║
╠═══════════════════════════════════════════════════════════╣
║  Specializations:                                        ║
║  - Game Design Documents (GDD)                            ║
║  - Gameplay Loop Architecture                            ║
║  - Economy Balancing                                      ║
║  - Player Onboarding                                      ║
║  - Progression Systems                                    ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
