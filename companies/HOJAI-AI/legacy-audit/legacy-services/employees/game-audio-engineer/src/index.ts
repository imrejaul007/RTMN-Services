/**
 * HOJAI Game Audio Engineer Agent
 * Port: 5101
 *
 * Interactive audio specialist for game audio
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import chatRouter from './routes/chat';

const PORT = 5101;
const SERVICE_NAME = 'game-audio-engineer';

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
    description: 'Interactive audio specialist for game audio',
    capabilities: {
      fmod_integration: true,
      wwise_integration: true,
      adaptive_music: true,
      spatial_audio: true,
      audio_budgeting: true
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
║  HOJAI Game Audio Engineer Agent                        ║
║  Port: ${PORT}                                               ║
║  Status: RUNNING                                          ║
╠═══════════════════════════════════════════════════════════╣
║  Specializations:                                        ║
║  - FMOD/Wwise Integration                               ║
║  - Adaptive Music Systems                               ║
║  - Spatial Audio                                         ║
║  - Audio Budget Management                               ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
