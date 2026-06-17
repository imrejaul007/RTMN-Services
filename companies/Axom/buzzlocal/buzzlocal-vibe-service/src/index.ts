/**
 * BuzzLocal Vibe Service
 * Local vibes, mood, atmosphere detection
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4290;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'buzzlocal-vibe-service' });
});

// Get local vibe
app.get('/api/vibes/:areaId', (_req, res) => {
  res.json({
    success: true,
    data: {
      areaId: 'mock',
      vibe: 'lively',
      crowdLevel: 60,
      noiseLevel: 50,
      energy: 'high'
    }
  });
});

// Report vibe
app.post('/api/vibes', (req, res) => {
  const { areaId, userId, vibe, crowdLevel } = req.body;
  res.json({
    success: true,
    data: { id: `vibe-${Date.now()}`, areaId, vibe, crowdLevel }
  });
});

app.listen(PORT, () => {
  console.log(`🎵 BuzzLocal Vibe Service - Port ${PORT}`);
});

export default app;
