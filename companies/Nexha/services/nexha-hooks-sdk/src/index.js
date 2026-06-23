import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import router from './routes/index.js';
import { processDeliveries } from './services/hooksService.js';

const PORT = parseInt(process.env.PORT, 10) || 4386;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexha_hooks';

async function main() {
  if (process.env.NODE_ENV !== 'test') {
    await mongoose.connect(MONGODB_URI);
    console.log(`[nexha-hooks-sdk] connected to mongodb`);
  }

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('tiny'));

  app.get('/health', (req, res) => res.json({ ok: true, service: 'nexha-hooks-sdk', port: PORT }));
  app.get('/ready', (req, res) => res.json({ ok: true, status: mongoose.connection.readyState === 1 ? 'ready' : 'not-ready' }));

  app.use('/api', router);

  app.use((err, req, res, next) => {
    console.error('[nexha-hooks-sdk] unhandled', err);
    res.status(500).json({ error: 'internal_error' });
  });

  app.listen(PORT, () => {
    console.log(`[nexha-hooks-sdk] listening on :${PORT}`);
  });
}

main().catch((err) => {
  console.error('[nexha-hooks-sdk] fatal', err);
  process.exit(1);
});
