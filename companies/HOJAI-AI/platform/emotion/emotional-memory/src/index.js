import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4761;

app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory stores
const emotionalMemories = new Map();  // entity -> timeline
const relationshipEmotions = new Map();  // relationship -> emotional history

// Store emotional event
function storeEmotion(entityId, emotion) {
  if (!emotionalMemories.has(entityId)) {
    emotionalMemories.set(entityId, []);
  }

  const timeline = emotionalMemories.get(entityId);
  timeline.push({
    ...emotion,
    timestamp: emotion.timestamp || new Date().toISOString(),
    id: `emotion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  });

  return timeline[timeline.length - 1];
}

// Get emotional timeline
function getTimeline(entityId, options = {}) {
  const { startDate, endDate, limit = 100 } = options;
  const timeline = emotionalMemories.get(entityId) || [];

  let filtered = timeline;

  if (startDate) {
    filtered = filtered.filter(e => new Date(e.timestamp) >= new Date(startDate));
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.timestamp) <= new Date(endDate));
  }

  return filtered.slice(-limit);
}

// Calculate emotional trends
function calculateTrends(timeline) {
  if (timeline.length < 2) {
    return { trend: 'insufficient_data', change: 0 };
  }

  const recent = timeline.slice(-5);
  const older = timeline.slice(-10, -5);

  if (older.length === 0) {
    return { trend: 'new_data', change: 0 };
  }

  const recentAvg = recent.reduce((sum, e) => sum + (e.intensity || 0.5), 0) / recent.length;
  const olderAvg = older.reduce((sum, e) => sum + (e.intensity || 0.5), 0) / older.length;

  const change = recentAvg - olderAvg;

  return {
    trend: change > 0.2 ? 'improving' : change < -0.2 ? 'declining' : 'stable',
    change: Math.round(change * 100) / 100,
    recentAvg: Math.round(recentAvg * 100) / 100,
    olderAvg: Math.round(olderAvg * 100) / 100
  };
}

// Store relationship emotion
function storeRelationshipEmotion(relId, emotion) {
  if (!relationshipEmotions.has(relId)) {
    relationshipEmotions.set(relId, []);
  }

  const history = relationshipEmotions.get(relId);
  history.push({
    ...emotion,
    timestamp: new Date().toISOString(),
    id: `rel-emotion-${Date.now()}`
  });

  return history[history.length - 1];
}

// POST /emotion - Store emotion
app.post('/emotion', (req, res) => {
  const { entityId, emotion, intensity, context, source } = req.body;

  if (!entityId || !emotion) {
    return res.status(400).json({ error: 'entityId and emotion are required' });
  }

  const stored = storeEmotion(entityId, { emotion, intensity, context, source });

  res.json({ success: true, memory: stored });
});

// POST /emotion/batch - Batch store
app.post('/emotion/batch', (req, res) => {
  const { entityId, emotions } = req.body;

  if (!entityId || !emotions || !Array.isArray(emotions)) {
    return res.status(400).json({ error: 'entityId and emotions array required' });
  }

  const stored = emotions.map(e => storeEmotion(entityId, e));

  res.json({ success: true, memories: stored, count: stored.length });
});

// GET /emotion/:entityId - Get emotional timeline
app.get('/emotion/:entityId', (req, res) => {
  const { entityId } = req.params;
  const { startDate, endDate, limit } = req.query;

  const timeline = getTimeline(entityId, { startDate, endDate, limit });
  const trends = calculateTrends(timeline);

  res.json({
    entityId,
    timeline,
    trends,
    count: timeline.length
  });
});

// GET /emotion/:entityId/summary - Get emotional summary
app.get('/emotion/:entityId/summary', (req, res) => {
  const { entityId } = req.params;
  const timeline = emotionalMemories.get(entityId) || [];

  const emotionCounts = {};
  for (const e of timeline) {
    emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1;
  }

  const mostCommon = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])[0];

  const avgIntensity = timeline.length > 0
    ? timeline.reduce((sum, e) => sum + (e.intensity || 0.5), 0) / timeline.length
    : 0;

  res.json({
    entityId,
    emotionCounts,
    dominantEmotion: mostCommon?.[0] || 'unknown',
    emotionCount: mostCommon?.[1] || 0,
    avgIntensity: Math.round(avgIntensity * 100) / 100,
    totalEvents: timeline.length,
    firstEvent: timeline[0]?.timestamp,
    lastEvent: timeline[timeline.length - 1]?.timestamp
  });
});

// POST /relationship - Store relationship emotion
app.post('/relationship', (req, res) => {
  const { relationshipId, emotion, intensity, mutual } = req.body;

  if (!relationshipId || !emotion) {
    return res.status(400).json({ error: 'relationshipId and emotion required' });
  }

  const stored = storeRelationshipEmotion(relationshipId, {
    emotion,
    intensity: intensity || 0.5,
    mutual: mutual || false
  });

  res.json({ success: true, memory: stored });
});

// GET /relationship/:id - Get relationship emotional history
app.get('/relationship/:id', (req, res) => {
  const { id } = req.params;
  const history = relationshipEmotions.get(id) || [];

  const trends = calculateTrends(history);

  res.json({
    relationshipId: id,
    history,
    trends,
    count: history.length
  });
});

// GET /relationships/:entityId - Get all relationships for entity
app.get('/relationships/:entityId', (req, res) => {
  const { entityId } = req.params;

  const relationships = [];

  for (const [relId, history] of relationshipEmotions) {
    if (relId.includes(entityId)) {
      const trends = calculateTrends(history);
      relationships.push({
        relationshipId: relId,
        eventCount: history.length,
        currentTrend: trends.trend,
        lastEmotion: history[history.length - 1]
      });
    }
  }

  res.json({ relationships, count: relationships.length });
});

// POST /query - Query emotional memories
app.post('/query', (req, res) => {
  const { entityIds, emotion, startDate, endDate, minIntensity } = req.body;

  const results = [];

  for (const entityId of (entityIds || [])) {
    const timeline = getTimeline(entityId, { startDate, endDate });

    let filtered = timeline;
    if (emotion) {
      filtered = filtered.filter(e => e.emotion === emotion);
    }
    if (minIntensity !== undefined) {
      filtered = filtered.filter(e => (e.intensity || 0.5) >= minIntensity);
    }

    if (filtered.length > 0) {
      results.push({ entityId, events: filtered, count: filtered.length });
    }
  }

  res.json({ results, totalEvents: results.reduce((sum, r) => sum + r.count, 0) });
});

// GET /health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'emotional-memory',
    port: PORT,
    entities: emotionalMemories.size,
    relationships: relationshipEmotions.size
  });
});

app.listen(PORT, () => {
  console.log(`Emotional Memory running on port ${PORT}`);
});

export default app;
