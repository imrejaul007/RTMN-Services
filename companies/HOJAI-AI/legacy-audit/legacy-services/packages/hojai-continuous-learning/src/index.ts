/**
 * HOJAI Continuous Learning Service
 * Learn from EVERYTHING: chats, signals, events, conversions
 */

import express from 'express';
import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(express.json({ limit: "10kb" }));

// ============================================
// LEARNING MODELS
// ============================================

// Chat patterns learned
const ChatPattern = mongoose.model('ChatPattern', new mongoose.Schema({
  patternId: String,
  intent: String,
  query: String,
  response: String,
  success: Boolean,
  refinement: String,
  confidence: Number,
  usageCount: Number,
  createdAt: Date
}));

// Signal patterns
const SignalPattern = mongoose.model('SignalPattern', new mongoose.Schema({
  patternId: String,
  signalType: String,
  userAction: String,
  outcome: String,
  success: Boolean,
  createdAt: Date
}));

// Event patterns
const EventPattern = mongoose.model('EventPattern', new mongoose.Schema({
  patternId: String,
  eventType: String,
  context: mongoose.Schema.Types.Mixed,
  success: Boolean,
  improvement: String,
  createdAt: Date
}));

// Conversion learnings
const ConversionLearning = mongoose.model('ConversionLearning', new mongoose.Schema({
  learningId: String,
  trigger: String,
  action: String,
  result: String,
  success: Boolean,
  revenue: Number,
  createdAt: Date
}));

// Correction learnings
const CorrectionLearning = mongoose.model('CorrectionLearning', new mongoose.Schema({
  correctionId: String,
  wrong: String,
  correct: String,
  context: String,
  improvement: String,
  createdAt: Date
}));

// ============================================
// LEARN FROM CHAT
// ============================================

app.post('/learn/chat', async (req, res) => {
  const { intent, query, response, success, refinement } = req.body;

  // Find existing pattern or create new
  const existing = await ChatPattern.findOne({ query });
  if (existing) {
    existing.usageCount++;
    existing.success = success;
    if (refinement) existing.refinement = refinement;
    existing.confidence = (existing.confidence + (success ? 0.1 : -0.1)) / 2;
    await existing.save();
    res.json({ learned: true, patternId: existing.patternId });
  } else {
    const pattern = new ChatPattern({
      patternId: uuid(),
      intent,
      query,
      response,
      success,
      confidence: success ? 0.8 : 0.5,
      usageCount: 1
    });
    await pattern.save();
    res.json({ learned: true, patternId: pattern.patternId });
  }
});

// Get best response for query
app.get('/learn/chat/:query', async (req, res) => {
  const patterns = await ChatPattern.find({ query: req.params.query })
    .sort({ confidence: -1, usageCount: -1 })
    .limit(5);
  res.json({ patterns });
});

// ============================================
// LEARN FROM SIGNAL
// ============================================

app.post('/learn/signal', async (req, res) => {
  const { signalType, userAction, outcome } = req.body;

  const pattern = new SignalPattern({
    patternId: uuid(),
    signalType,
    userAction,
    outcome,
    success: outcome === 'success'
  });
  await pattern.save();
  res.json({ learned: true });
});

// Get signal insights
app.get('/learn/signals/:type', async (req, res) => {
  const patterns = await SignalPattern.find({ signalType: req.params.type });
  const insights = patterns.reduce((acc: any, p) => {
    if (!acc[p.userAction]) acc[p.userAction] = { total: 0, success: 0 };
    acc[p.userAction].total++;
    if (p.success) acc[p.userAction].success++;
    return acc;
  }, {});
  res.json({ insights });
});

// ============================================
// LEARN FROM EVENT
// ============================================

app.post('/learn/event', async (req, res) => {
  const { eventType, context, success, improvement } = req.body;

  const pattern = new EventPattern({
    patternId: uuid(),
    eventType,
    context,
    success,
    improvement
  });
  await pattern.save();
  res.json({ learned: true });
});

// ============================================
// LEARN FROM CONVERSION
// ============================================

app.post('/learn/conversion', async (req, res) => {
  const { trigger, action, result, revenue } = req.body;

  const learning = new ConversionLearning({
    learningId: uuid(),
    trigger,
    action,
    result,
    success: result === 'success' || result === 'converted',
    revenue
  });
  await learning.save();
  res.json({ learned: true });
});

// Get conversion insights
app.get('/learn/conversions', async (req, res) => {
  const learnings = await ConversionLearning.find().sort({ createdAt: -1 });
  const insights = {
    total: learnings.length,
    successRate: learnings.filter(l => l.success).length / learnings.length,
    totalRevenue: learnings.reduce((sum, l) => sum + (l.revenue || 0), 0)
  };
  res.json({ learnings, insights });
});

// ============================================
// LEARN FROM CORRECTION
// ============================================

app.post('/learn/correction', async (req, res) => {
  const { wrong, correct, context, improvement } = req.body;

  const correction = new CorrectionLearning({
    correctionId: uuid(),
    wrong,
    correct,
    context,
    improvement
  });
  await correction.save();
  res.json({ learned: true, correctionId: correction.correctionId });
});

// Get corrections for AI
app.get('/learn/corrections', async (req, res) => {
  const corrections = await CorrectionLearning.find()
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({ corrections });
});

// ============================================
// BATCH LEARN - Learn from everything
// ============================================

app.post('/learn/batch', async (req, res) => {
  const { chats, signals, events, conversions, corrections } = req.body;

  const results = {};

  if (chats) {
    for (const chat of chats) {
      await new ChatPattern({ patternId: uuid(), ...chat }).save();
    }
    results.chats = chats.length;
  }

  if (signals) {
    for (const signal of signals) {
      await new SignalPattern({ patternId: uuid(), ...signal }).save();
    }
    results.signals = signals.length;
  }

  if (events) {
    for (const event of events) {
      await new EventPattern({ patternId: uuid(), ...event }).save();
    }
    results.events = events.length;
  }

  if (conversions) {
    for (const conv of conversions) {
      await new ConversionLearning({ learningId: uuid(), ...conv }).save();
    }
    results.conversions = conversions.length;
  }

  if (corrections) {
    for (const corr of corrections) {
      await new CorrectionLearning({ correctionId: uuid(), ...corr }).save();
    }
    results.corrections = corrections.length;
  }

  res.json({ learned: true, results });
});

// ============================================
// GET ALL LEARNINGS
// ============================================

app.get('/learn/all', async (req, res) => {
  const [chats, signals, events, conversions, corrections] = await Promise.all([
    ChatPattern.countDocuments(),
    SignalPattern.countDocuments(),
    EventPattern.countDocuments(),
    ConversionLearning.countDocuments(),
    CorrectionLearning.countDocuments()
  ]);

  res.json({
    totalLearnings: chats + signals + events + conversions + corrections,
    byType: { chats, signals, events, conversions, corrections }
  });
});

// ============================================
// HEALTH
// ============================================

app.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'continuous-learning' });
});

// ============================================
// START
// ============================================

mongoose.connect('mongodb://localhost:27017/hojai-continuous-learning')
  .then(() => console.log('Continuous Learning on port 4891'))
  .then(() => app.listen(4891));

export default app;
