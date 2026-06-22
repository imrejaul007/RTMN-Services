import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';

import { rcsRoutes } from './routes';

const app = express();
const PORT = process.env.PORT || 4900;

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
  res.json({ status: 'ok', service: 'hojai-rcs-service', version: '1.0.0' });
});

app.get('/health/live', (req, res) => res.json({ status: 'alive' }));
app.get('/health/ready', async (req, res) => {
  const mongo = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ready', mongodb: mongo });
});

// Providers info
app.get('/api/providers', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'jio', name: 'Jio RCS', status: 'active' },
      { id: 'airtel', name: 'Airtel RCS', status: 'coming_soon' },
      { id: 'vi', name: 'Vi RCS', status: 'coming_soon' }
    ]
  });
});

app.use('/api/rcs', rcsRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.statusCode || 500).json({ success: false, error: err.message });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

async function start() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai_rcs';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║           HOJAI RCS - Rich Communication Services   ║
╠════════════════════════════════════════════════════════════╣
║  Port:     ${PORT}                                          ║
║  Health:   http://localhost:${PORT}/health                    ║
║  Providers: Jio, Airtel, Vi                           ║
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
