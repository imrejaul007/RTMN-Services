import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4763;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Analytics data store
const emotionData = [];
const conversationAnalytics = new Map();

// Analyze emotion patterns
function analyzePatterns(data, timeframe = 'day') {
  const analysis = {
    summary: calculateSummary(data),
    trends: calculateTrends(data),
    distribution: calculateDistribution(data),
    alerts: detectAlerts(data)
  };
  return analysis;
}

function calculateSummary(data) {
  if (data.length === 0) return { total: 0, avgIntensity: 0, dominant: 'none' };

  const emotionCounts = {};
  let totalIntensity = 0;

  for (const d of data) {
    emotionCounts[d.emotion] = (emotionCounts[d.emotion] || 0) + 1;
    totalIntensity += d.intensity || 0.5;
  }

  const dominant = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])[0];

  return {
    total: data.length,
    avgIntensity: totalIntensity / data.length,
    dominant: dominant?.[0] || 'none',
    emotionCounts
  };
}

function calculateTrends(data) {
  const trends = {
    improving: 0,
    declining: 0,
    stable: 0
  };

  const sorted = data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const recent = sorted.slice(-5);
  const older = sorted.slice(-10, -5);

  if (older.length === 0) return trends;

  const recentAvg = recent.reduce((sum, d) => sum + (d.intensity || 0.5), 0) / recent.length;
  const olderAvg = older.reduce((sum, d) => sum + (d.intensity || 0.5), 0) / older.length;

  if (recentAvg > olderAvg + 0.1) trends.improving = 1;
  else if (recentAvg < olderAvg - 0.1) trends.declining = 1;
  else trends.stable = 1;

  return trends;
}

function calculateDistribution(data) {
  const dist = {};
  for (const d of data) {
    dist[d.emotion] = (dist[d.emotion] || 0) + 1;
  }
  const total = data.length || 1;
  for (const [emotion, count] of Object.entries(dist)) {
    dist[emotion] = { count, percentage: (count / total) * 100 };
  }
  return dist;
}

function detectAlerts(data) {
  const alerts = [];

  // High frustration alerts
  const frustratedCount = data.filter(d => d.emotion === 'frustrated').length;
  if (frustratedCount > 5) {
    alerts.push({ type: 'high_frustration', severity: 'high', count: frustratedCount });
  }

  // Rapid mood swings
  if (data.length > 3) {
    const emotions = data.slice(-5).map(d => d.emotion);
    const unique = new Set(emotions).size;
    if (unique > 3) {
      alerts.push({ type: 'mood_swings', severity: 'medium', emotions: unique });
    }
  }

  return alerts;
}

// POST /analytics/track - Track emotion data
app.post('/analytics/track', (req, res) => {
  const { conversationId, emotion, intensity, timestamp } = req.body;

  if (!emotion) {
    return res.status(400).json({ error: 'Emotion is required' });
  }

  const entry = {
    id: `emotion-${Date.now()}`,
    conversationId,
    emotion,
    intensity: intensity || 0.5,
    timestamp: timestamp || new Date().toISOString()
  };

  emotionData.push(entry);

  res.json({ success: true, entry });
});

// POST /analytics/analyze - Analyze emotion data
app.post('/analytics/analyze', (req, res) => {
  const { conversationId, timeframe, filters } = req.body;

  let data = conversationId
    ? emotionData.filter(d => d.conversationId === conversationId)
    : emotionData;

  if (filters?.emotion) {
    data = data.filter(d => d.emotion === filters.emotion);
  }

  const analysis = analyzePatterns(data, timeframe);

  res.json({
    conversationId,
    analysis,
    dataPoints: data.length
  });
});

// GET /analytics/summary - Get overall summary
app.get('/analytics/summary', (req, res) => {
  const analysis = analyzePatterns(emotionData);

  res.json({
    totalConversations: conversationAnalytics.size,
    totalEmotions: emotionData.length,
    analysis
  });
});

// GET /analytics/distribution - Get emotion distribution
app.get('/analytics/distribution', (req, res) => {
  const distribution = calculateDistribution(emotionData);

  res.json({
    distribution,
    total: emotionData.length
  });
});

// POST /conversation/start - Start tracking conversation
app.post('/conversation/start', (req, res) => {
  const { conversationId, metadata } = req.body;

  conversationAnalytics.set(conversationId, {
    id: conversationId,
    startTime: new Date().toISOString(),
    emotions: [],
    metadata
  });

  res.json({ success: true, conversationId });
});

// POST /conversation/:id/emotion - Add emotion to conversation
app.post('/conversation/:id/emotion', (req, res) => {
  const { id } = req.params;
  const { emotion, intensity, context } = req.body;

  const conversation = conversationAnalytics.get(id);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  conversation.emotions.push({
    emotion,
    intensity,
    context,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true });
});

// GET /conversation/:id/summary - Get conversation summary
app.get('/conversation/:id/summary', (req, res) => {
  const { id } = req.params;
  const conversation = conversationAnalytics.get(id);

  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  const analysis = analyzePatterns(conversation.emotions);

  res.json({
    conversationId: id,
    duration: Date.now() - new Date(conversation.startTime).getTime(),
    emotionCount: conversation.emotions.length,
    analysis
  });
});

// GET /health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'emotion-analytics',
    port: PORT,
    conversations: conversationAnalytics.size,
    emotionDataPoints: emotionData.length
  });
});

app.listen(PORT, () => {
  console.log(`Emotion Analytics running on port ${PORT}`);
});

export default app;
