/**
 * BuzzLocal Society Service - Main Entry
 * Apartment/Community management
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4210;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'buzzlocal-society-service', timestamp: new Date().toISOString() });
});

app.get('/api/societies', (_req, res) => {
  res.json({
    success: true,
    data: { societies: [] },
    meta: { timestamp: new Date().toISOString() },
  });
});

app.listen(PORT, () => {
  console.log(`🏢 BuzzLocal Society Service - Port ${PORT}`);
});

export default app;
