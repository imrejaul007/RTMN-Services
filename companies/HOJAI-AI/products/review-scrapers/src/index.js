/**
 * Review Scrapers
 * Port: 5456
 * Monitor reviews across Google, social, app stores
 */
const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const axios = require('axios');
const app = express();
const PORT = process.env.REVIEW_SCRAPERS_PORT || 5456;

app.use(express.json());

// In-memory stores
const reviews = new Map(); // source -> review[]
const alerts = []; // spike alerts

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'review-scrapers', sources: reviews.size, alerts: alerts.length, port: PORT });
});

// GET /api/reviews/:source - Fetch reviews from a source
app.get('/api/reviews/:source', (req, res) => {
  const { source } = req.params;
  const { since, limit } = req.query;

  let sourceReviews = reviews.get(source) || [];

  if (since) {
    const sinceDate = new Date(since);
    sourceReviews = sourceReviews.filter(r => new Date(r.date) >= sinceDate);
  }

  if (limit) sourceReviews = sourceReviews.slice(-parseInt(limit));

  res.json({ success: true, data: { source, count: sourceReviews.length, reviews: sourceReviews } });
});

// GET /api/reviews/all - Aggregate all reviews
app.get('/api/reviews/all', (req, res) => {
  const { since, limit } = req.query;
  let allReviews = [];

  for (const [source, sourceReviews] of reviews) {
    for (const review of sourceReviews) {
      allReviews.push({ ...review, source });
    }
  }

  if (since) {
    const sinceDate = new Date(since);
    allReviews = allReviews.filter(r => new Date(r.date) >= sinceDate);
  }

  allReviews.sort((a, b) => new Date(b.date) - new Date(a.date));
  if (limit) allReviews = allReviews.slice(0, parseInt(limit));

  // Calculate stats
  const stats = {
    total: allReviews.length,
    avgRating: allReviews.length > 0
      ? (allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / allReviews.length).toFixed(2)
      : 0,
    positive: allReviews.filter(r => r.rating >= 4).length,
    negative: allReviews.filter(r => r.rating <= 2).length,
    neutral: allReviews.filter(r => r.rating === 3).length,
    sentiment: calculateSentiment(allReviews)
  };

  res.json({ success: true, data: { reviews: allReviews, stats } });
});

// GET /api/reviews/alerts - Get complaint spike alerts
app.get('/api/reviews/alerts', (req, res) => {
  const { since, severity } = req.query;
  let filtered = [...alerts];

  if (since) {
    const sinceDate = new Date(since);
    filtered = filtered.filter(a => new Date(a.detectedAt) >= sinceDate);
  }
  if (severity) filtered = filtered.filter(a => a.severity === severity);

  res.json({ success: true, data: filtered });
});

// POST /api/reviews/ingest - Ingest reviews from external source
app.post('/api/reviews/ingest',requireAuth,  (req, res) => {
  const { source, reviews: newReviews } = req.body;
  if (!source || !Array.isArray(newReviews)) {
    return res.status(400).json({ success: false, error: 'source and reviews array are required' });
  }

  if (!reviews.has(source)) reviews.set(source, []);
  reviews.get(source).push(...newReviews.map(r => ({
    ...r, ingestedAt: new Date().toISOString()
  })));

  // Check for spikes
  checkForSpikes(source);

  res.json({ success: true, data: { ingested: newReviews.length } });
});

// GET /api/reviews/sentiment - Get sentiment analysis
app.get('/api/reviews/sentiment', (req, res) => {
  const { source, since, period } = req.query;

  let allReviews = [];
  if (source) {
    allReviews = reviews.get(source) || [];
  } else {
    for (const r of reviews.values()) allReviews.push(...r);
  }

  if (since) {
    const sinceDate = new Date(since);
    allReviews = allReviews.filter(r => new Date(r.date) >= sinceDate);
  }

  // Group by day/week
  const grouped = {};
  for (const review of allReviews) {
    const key = period === 'week'
      ? getWeekKey(review.date)
      : getDayKey(review.date);
    if (!grouped[key]) grouped[key] = { positive: 0, negative: 0, neutral: 0, total: 0 };
    const sentiment = analyzeSentiment(review.text || review.content || '');
    grouped[key][sentiment]++;
    grouped[key].total++;
  }

  // Calculate trends
  const trends = Object.entries(grouped).map(([period, data]) => ({
    period, ...data,
    score: data.total > 0 ? ((data.positive - data.negative) / data.total * 100).toFixed(1) : 0
  })).reverse();

  res.json({ success: true, data: { trends, overall: calculateSentiment(allReviews) } });
});

// POST /api/reviews/respond - Generate AI response
app.post('/api/reviews/respond',requireAuth,  (req, res) => {
  const { reviewId, source, responseType, tone } = req.body;

  const templates = {
    thank_you: 'Thank you for your wonderful review! We are delighted to hear about your positive experience. Your feedback means a lot to our team.',
    apology: 'We sincerely apologize for your experience. We take this seriously and will work to improve. Please contact us directly so we can make this right.',
    clarification: 'Thank you for bringing this to our attention. We would like to understand more about your experience. Please reach out to our team.',
    follow_up: 'Thank you for your feedback. We would love to follow up with you. Please share your contact details.'
  };

  res.json({
    success: true,
    data: {
      reviewId, source,
      suggestedResponse: templates[responseType] || templates.thank_you,
      tone: tone || 'professional'
    }
  });
});

// ─── Sentiment Analysis ───────────────────────────────────────────────────────

const positiveWords = ['great', 'excellent', 'amazing', 'love', 'best', 'wonderful', 'fantastic', 'awesome', 'perfect', 'recommend', 'helpful', 'friendly', 'quick', 'delicious', 'beautiful'];
const negativeWords = ['bad', 'terrible', 'awful', 'worst', 'hate', 'poor', 'disappointing', 'slow', 'rude', 'broken', 'expensive', 'overpriced', 'never', 'avoid', 'horrible'];

function analyzeSentiment(text) {
  const words = (text || '').toLowerCase().split(/\s+/);
  let score = 0;
  for (const word of words) {
    if (positiveWords.includes(word)) score++;
    if (negativeWords.includes(word)) score--;
  }
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

function calculateSentiment(reviews) {
  const counts = { positive: 0, negative: 0, neutral: 0 };
  for (const r of reviews) counts[analyzeSentiment(r.text || r.content || '')]++;
  const total = reviews.length || 1;
  return {
    positive: ((counts.positive / total) * 100).toFixed(1),
    negative: ((counts.negative / total) * 100).toFixed(1),
    neutral: ((counts.neutral / total) * 100).toFixed(1),
    score: (((counts.positive - counts.negative) / total) * 100).toFixed(1)
  };
}

function checkForSpikes(source) {
  const sourceReviews = reviews.get(source) || [];
  const now = Date.now();
  const dayMs = 86400000;

  // Last 7 days vs previous 7 days
  const recent = sourceReviews.filter(r => now - new Date(r.date).getTime() < dayMs * 7);
  const previous = sourceReviews.filter(r => {
    const d = now - new Date(r.date).getTime();
    return d >= dayMs * 7 && d < dayMs * 14;
  });

  if (previous.length === 0) return;

  const recentNeg = recent.filter(r => analyzeSentiment(r.text || '') === 'negative').length;
  const prevNeg = previous.filter(r => analyzeSentiment(r.text || '') === 'negative').length;

  if (recentNeg > prevNeg * 2 && recentNeg > 5) {
    alerts.push({
      id: `alert_${Date.now()}`,
      source, type: 'complaint_spike',
      description: `${source} complaints increased from ${prevNeg} to ${recentNeg} in 7 days`,
      severity: recentNeg > prevNeg * 3 ? 'high' : 'medium',
      detectedAt: new Date().toISOString(),
      stats: { recent: recentNeg, previous: prevNeg, increase: ((recentNeg - prevNeg) / prevNeg * 100).toFixed(0) + '%' }
    });
  }
}

function getDayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekKey(date) {
  const d = new Date(date);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return getDayKey(start);
}

// Seed with mock data for testing
const mockSources = ['google', 'app_store', 'play_store'];
for (const source of mockSources) {
  const mockReviews = Array.from({ length: 10 }, (_, i) => ({
    id: `${source}_${i}`,
    rating: Math.floor(Math.random() * 5) + 1,
    text: ['Great service!', 'Very helpful team', 'Had some issues', 'Excellent experience', 'Could be better'][i % 5],
    author: `User ${i + 1}`,
    date: new Date(Date.now() - i * dayMs).toISOString()
  }));
  reviews.set(source, mockReviews);
}
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



app.listen(PORT, () => {
  console.log(`Review Scrapers running on port ${PORT}`);
  console.log('Mock data seeded for:', [...reviews.keys()].join(', '));
});

module.exports = app;
