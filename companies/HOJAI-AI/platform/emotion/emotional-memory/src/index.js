/**
 * Emotional Memory Service - v1.0.0
 * ==================================
 * Stores and retrieves emotional experiences over time.
 * Creates emotional timelines for entities (humans, companies, agents).
 *
 * Port: 4761
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4761;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Data stores
const emotionalMemories = new Map();
const emotionTrajectories = new Map();
const emotionalMilestones = new Map();
const emotionPatterns = new Map();

// Helpers
function getOrCreateMemories(entityId) {
  if (!emotionalMemories.has(entityId)) emotionalMemories.set(entityId, []);
  return emotionalMemories.get(entityId);
}

function getOrCreateTrajectory(entityId) {
  if (!emotionTrajectories.has(entityId)) emotionTrajectories.set(entityId, []);
  return emotionTrajectories.get(entityId);
}

function getOrCreateMilestones(entityId) {
  if (!emotionalMilestones.has(entityId)) emotionalMilestones.set(entityId, []);
  return emotionalMilestones.get(entityId);
}

function calculateIntensity(emotionData) {
  if (emotionData.confidence) return emotionData.confidence;
  const emotions = emotionData.emotions || {};
  const values = Object.values(emotions);
  if (values.length === 0) return 0.5;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function detectEmotionCategory(emotionData) {
  if (emotionData.primary) return emotionData.primary;
  const emotions = emotionData.emotions || {};
  const entries = Object.entries(emotions);
  if (entries.length === 0) return 'neutral';
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function calculateValence(emotion) {
  const positive = ['happy', 'excited', 'joyful', 'grateful', 'confident', 'satisfied'];
  const negative = ['angry', 'sad', 'frustrated', 'anxious', 'fearful', 'disappointed'];
  const lower = emotion.toLowerCase();
  if (positive.some(e => lower.includes(e))) return 1;
  if (negative.some(e => lower.includes(e))) return -1;
  return 0;
}

// POST /memory - Store emotional memory
app.post('/memory', (req, res) => {
  const { entityId, emotion, context, metadata, timestamp } = req.body;
  if (!entityId || !emotion) {
    return res.status(400).json({ error: 'entityId and emotion required' });
  }
  const memoryId = uuidv4();
  const memory = {
    id: memoryId,
    entityId,
    emotion: detectEmotionCategory({ primary: emotion }),
    emotions: typeof emotion === 'object' ? emotion : null,
    intensity: calculateIntensity(typeof emotion === 'object' ? emotion : {}),
    valence: calculateValence(emotion),
    context: context || 'general',
    metadata: metadata || {},
    timestamp: timestamp || new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  const memories = getOrCreateMemories(entityId);
  memories.push(memory);
  updateTrajectory(entityId, memory);
  const milestone = checkMilestone(entityId, memory);
  if (milestone) getOrCreateMilestones(entityId).push(milestone);
  res.json({ success: true, memory, trajectory: emotionTrajectories.get(entityId)?.slice(-5) });
});

// GET /memory/:entityId - Get memories
app.get('/memory/:entityId', (req, res) => {
  const { entityId } = req.params;
  const { days, limit, emotion } = req.query;
  let memories = emotionalMemories.get(entityId) || [];
  if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    memories = memories.filter(m => new Date(m.timestamp) > cutoff);
  }
  if (emotion) memories = memories.filter(m => m.emotion.toLowerCase().includes(emotion.toLowerCase()));
  memories.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (limit) memories = memories.slice(0, parseInt(limit));
  res.json({ entityId, memories, count: memories.length });
});

// GET /memory/:entityId/summary - Get summary
app.get('/memory/:entityId/summary', (req, res) => {
  const { entityId } = req.params;
  const { days } = req.query;
  let memories = emotionalMemories.get(entityId) || [];
  if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    memories = memories.filter(m => new Date(m.timestamp) > cutoff);
  }
  if (memories.length === 0) {
    return res.json({ entityId, summary: { totalMemories: 0, dominantEmotion: 'unknown', avgIntensity: 0 } });
  }
  const emotionCounts = {};
  let totalIntensity = 0;
  let positiveCount = 0, negativeCount = 0;
  memories.forEach(m => {
    emotionCounts[m.emotion] = (emotionCounts[m.emotion] || 0) + 1;
    totalIntensity += m.intensity;
    if (m.valence > 0) positiveCount++;
    if (m.valence < 0) negativeCount++;
  });
  const dominant = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];
  const stability = 1 - (Object.keys(emotionCounts).length / memories.length);
  res.json({
    entityId,
    summary: {
      totalMemories: memories.length,
      dominantEmotion: dominant ? dominant[0] : 'unknown',
      avgIntensity: totalIntensity / memories.length,
      emotionalStability: Math.max(0, stability),
      positiveRatio: positiveCount / memories.length,
      negativeRatio: negativeCount / memories.length
    }
  });
});

// Update trajectory
function updateTrajectory(entityId, memory) {
  const trajectory = getOrCreateTrajectory(entityId);
  if (trajectory.length > 0 && trajectory[trajectory.length - 1].emotion !== memory.emotion) {
    const last = trajectory[trajectory.length - 1];
    trajectory.push({
      id: uuidv4(), entityId, from: last.emotion, to: memory.emotion,
      intensity: memory.intensity, valence: memory.valence,
      change: memory.valence - last.valence, timestamp: memory.timestamp
    });
  } else if (trajectory.length === 0) {
    trajectory.push({
      id: uuidv4(), entityId, from: null, to: memory.emotion,
      intensity: memory.intensity, valence: memory.valence,
      change: 0, timestamp: memory.timestamp
    });
  }
  if (trajectory.length > 100) trajectory.shift();
}

// GET /trajectory/:entityId
app.get('/trajectory/:entityId', (req, res) => {
  const { entityId } = req.params;
  res.json({ entityId, trajectory: emotionTrajectories.get(entityId) || [], count: emotionTrajectories.get(entityId)?.length || 0 });
});

// Check milestone
function checkMilestone(entityId, memory) {
  const memories = getOrCreateMemories(entityId);
  if (memories.length === 1) {
    return { id: uuidv4(), entityId, type: 'first_memory', emotion: memory.emotion, description: 'First emotional memory', timestamp: memory.timestamp };
  }
  if (memory.intensity > 0.9) {
    return { id: uuidv4(), entityId, type: 'high_intensity', emotion: memory.emotion, intensity: memory.intensity, description: 'High intensity experience', timestamp: memory.timestamp };
  }
  return null;
}

// GET /milestones/:entityId
app.get('/milestones/:entityId', (req, res) => {
  const { entityId } = req.params;
  const milestones = emotionalMilestones.get(entityId) || [];
  milestones.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({ entityId, milestones, count: milestones.length });
});

// Detect patterns
function detectPatterns(entityId) {
  const memories = getOrCreateMemories(entityId);
  if (memories.length < 5) return { patterns: [], confidence: 0 };
  const patterns = [];
  const timePatterns = {};
  memories.forEach(m => {
    const hour = new Date(m.timestamp).getHours();
    const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
    if (!timePatterns[period]) timePatterns[period] = { count: 0, emotions: {} };
    timePatterns[period].count++;
    timePatterns[period].emotions[m.emotion] = (timePatterns[period].emotions[m.emotion] || 0) + 1;
  });
  for (const [period, data] of Object.entries(timePatterns)) {
    if (data.count >= 3) {
      const dominant = Object.entries(data.emotions).sort((a, b) => b[1] - a[1])[0];
      patterns.push({ type: 'time_of_day', value: period, dominantEmotion: dominant[0], frequency: data.count, confidence: data.count / memories.length });
    }
  }
  return { patterns, confidence: Math.min(1, memories.length / 20) };
}

// POST /patterns
app.post('/patterns', (req, res) => {
  const { entityId } = req.body;
  if (!entityId) return res.status(400).json({ error: 'entityId required' });
  const result = detectPatterns(entityId);
  emotionPatterns.set(entityId, result);
  res.json({ entityId, ...result });
});

// GET /patterns/:entityId
app.get('/patterns/:entityId', (req, res) => {
  const { entityId } = req.params;
  const patterns = emotionPatterns.get(entityId);
  if (!patterns) return res.json({ entityId, ...detectPatterns(entityId), fresh: true });
  res.json({ entityId, ...patterns, fresh: false });
});

// Search
app.get('/search', (req, res) => {
  const { q, entityId, emotion, limit } = req.query;
  if (!q && !entityId && !emotion) return res.status(400).json({ error: 'q, entityId, or emotion required' });
  let results = [];
  if (q) {
    emotionalMemories.forEach((memories) => {
      const matches = memories.filter(m => m.context.toLowerCase().includes(q.toLowerCase()));
      results.push(...matches);
    });
  }
  if (entityId) results.push(...(emotionalMemories.get(entityId) || []));
  if (emotion) {
    emotionalMemories.forEach((memories) => {
      results.push(...memories.filter(m => m.emotion.toLowerCase().includes(emotion.toLowerCase())));
    });
  }
  const seen = new Set();
  results = results.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
  results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (limit) results = results.slice(0, parseInt(limit));
  res.json({ query: q, results, count: results.length });
});

// DELETE /memory/:entityId/:memoryId
app.delete('/memory/:entityId/:memoryId', (req, res) => {
  const { entityId, memoryId } = req.params;
  const memories = emotionalMemories.get(entityId);
  if (!memories) return res.status(404).json({ error: 'Entity not found' });
  const index = memories.findIndex(m => m.id === memoryId);
  if (index === -1) return res.status(404).json({ error: 'Memory not found' });
  memories.splice(index, 1);
  res.json({ success: true, deletedId: memoryId });
});

// DELETE /memory/:entityId
app.delete('/memory/:entityId', (req, res) => {
  const { entityId } = req.params;
  emotionalMemories.delete(entityId);
  emotionTrajectories.delete(entityId);
  emotionalMilestones.delete(entityId);
  emotionPatterns.delete(entityId);
  res.json({ success: true, cleared: entityId });
});

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok', service: 'emotional-memory', port: PORT,
    entities: emotionalMemories.size,
    totalMemories: Array.from(emotionalMemories.values()).reduce((sum, m) => sum + m.length, 0)
  });
});

app.listen(PORT, () => console.log(`Emotional Memory Service running on port ${PORT}`));
export default app;
