/**
 * BuzzLocal Feed Service - Main Entry
 */

import express from 'express';
import cors from 'cors';
import feedRoutes from './routes/feedRoutes';

const app = express();
const PORT = process.env.PORT || 4200;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'buzzlocal-feed-service', timestamp: new Date().toISOString() });
});

app.use('/api/feed', feedRoutes);

// Start
app.listen(PORT, () => {
  console.log(`\n📍 BuzzLocal Feed Service`);
  console.log(`   Port: ${PORT}`);
  console.log(`   http://localhost:${PORT}/health\n`);
});

export default app;
