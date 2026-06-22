/**
 * HOJAI Unreal Technical Artist Agent
 * Port: 5111
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import chatRouter from './routes/chat';

const PORT = 5111;
const SERVICE_NAME = 'unreal-technical-artist';

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

app.get('/health', (req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, timestamp: new Date().toISOString() }));
app.get('/health/live', (req, res) => res.json({ status: 'ok' }));
app.get('/health/ready', (req, res) => res.json({ status: 'ready' }));

app.get('/api/info', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    version: '1.0.0',
    description: 'Visual pipeline specialist for UE5',
    capabilities: {
      material_editor: true,
      niagara: true,
      pcg: true,
      nanite: true
    }
  });
});

app.use('/api/chat', chatRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err: any, req: express.Request, res: express.Response, next: any) => {
  console.error(`[${SERVICE_NAME}] Error:`, err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(\`
╔═══════════════════════════════════════════════════════════╗
║  HOJAI Unreal Technical Artist Agent                ║
║  Port: ${PORT}                                               ║
║  Status: RUNNING                                          ║
╚═══════════════════════════════════════════════════════════╝
  \`);
});

export default app;
