import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4891;

app.use(helmet());
app.use(cors());
app.use(express.json());

const voiceStats = new Map();

// Track voice interaction
function trackInteraction(corpId, metadata = {}) {
  const stats = voiceStats.get(corpId) || {
    corpId,
    totalCalls: 0,
    totalDuration: 0,
    avgConfidence: 0,
    emotions: {},
    interactions: []
  };

  stats.totalCalls++;
  stats.totalDuration += metadata.duration || 0;

  if (metadata.emotion) {
    stats.emotions[metadata.emotion] = (stats.emotions[metadata.emotion] || 0) + 1;
  }

  stats.interactions.push({
    timestamp: new Date().toISOString(),
    ...metadata
  });

  voiceStats.set(corpId, stats);
  return stats;
}

// Get dashboard data
function getDashboard(corpId) {
  const stats = voiceStats.get(corpId);
  if (!stats) return null;

  const emotionRanking = Object.entries(stats.emotions)
    .sort((a, b) => b[1] - a[1])
    .map(([emotion, count]) => ({ emotion, count }));

  return {
    ...stats,
    avgDuration: stats.totalCalls > 0 ? stats.totalDuration / stats.totalCalls : 0,
    emotionRanking,
    sentiment: emotionRanking[0]?.emotion || 'neutral'
  };
}

app.post('/track', (req, res) => {
  const { corpId, duration, emotion, sentiment } = req.body;

  if (!corpId) {
    return res.status(400).json({ error: 'corpId required' });
  }

  const stats = trackInteraction(corpId, { duration, emotion, sentiment });
  res.json({ success: true, stats });
});

app.get('/dashboard/:corpId', (req, res) => {
  const { corpId } = req.params;
  const dashboard = getDashboard(corpId);

  if (!dashboard) {
    return res.json({ corpId, stats: null, message: 'No data yet' });
  }

  res.json({ corpId, dashboard });
});

app.get('/analytics/overview', (req, res) => {
  const overview = {
    totalUsers: voiceStats.size,
    totalInteractions: 0,
    avgConfidence: 0
  };

  for (const stats of voiceStats.values()) {
    overview.totalInteractions += stats.totalCalls;
  }

  res.json(overview);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'voice-analytics-dashboard', port: PORT });
});

app.listen(PORT, () => console.log(`Voice Analytics Dashboard running on port ${PORT}`));
export default app;
