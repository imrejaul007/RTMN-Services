/**
 * BuzzLocal Safety Service - Main Entry
 * SOS, alerts, trusted circles
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4220;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'buzzlocal-safety-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🛡️ BuzzLocal Safety Service - Port ${PORT}`);
});

export default app;
