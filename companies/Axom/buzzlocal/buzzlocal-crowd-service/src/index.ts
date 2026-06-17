/**
 * BuzzLocal Crowd Service - Main Entry
 * Real-time crowd intelligence
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4240;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'buzzlocal-crowd-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🧠 BuzzLocal Crowd Service - Port ${PORT}`);
});

export default app;
