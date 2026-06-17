/**
 * BuzzLocal Business Service - Main Entry
 * Local business discovery
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4230;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'buzzlocal-business-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🏪 BuzzLocal Business Service - Port ${PORT}`);
});

export default app;
