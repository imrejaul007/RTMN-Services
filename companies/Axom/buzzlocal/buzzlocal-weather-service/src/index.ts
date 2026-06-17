/**
 * BuzzLocal Weather Service - Main Entry
 * Localized weather intelligence
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4250;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'buzzlocal-weather-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🌤️ BuzzLocal Weather Service - Port ${PORT}`);
});

export default app;
