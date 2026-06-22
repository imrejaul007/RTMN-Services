import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';

import { bspRoutes } from './routes';

const app = express();
const PORT = process.env.PORT || 4890;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

const limiter = rateLimit({ windowMs: 900000, max: 100 });
app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'hojai-whatsapp-bsp', version: '1.0.0' });
});

app.get('/health/live', (req, res) => res.json({ status: 'alive' }));
app.get('/health/ready', async (req, res) => {
  const mongo = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ready', mongodb: mongo });
});

app.use('/api', bspRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.statusCode || 500).json({ success: false, error: err.message });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

async function start() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai_whatsapp_bsp';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║           HOJAI WHATSAPP BSP - Direct Business API      ║
╠════════════════════════════════════════════════════════════╣
║  Port:     ${PORT}                                          ║
║  Health:   http://localhost:${PORT}/health                    ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

start();

export default app;
