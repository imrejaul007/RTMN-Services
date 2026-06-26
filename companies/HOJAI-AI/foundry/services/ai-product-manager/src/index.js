/**
 * HOJAI Studio - AI Product Manager Service
 * Feedback analysis and roadmap suggestions
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4760;
app.use(express.json());

const projects = new Map(); // projectId -> PM data
const feedback = []; // all feedback
const insights = []; // AI-generated insights
const roadmaps = []; // generated roadmaps

// Feedback categories
const CATEGORIES = {
  feature: { label: 'Feature Request', score: 1 },
  bug: { label: 'Bug Report', score: 2 },
  complaint: { label: 'Complaint', score: -1 },
  compliment: { label: 'Compliment', score: 2 },
  question: { label: 'Question', score: 0 },
  idea: { label: 'Idea', score: 1 }
};

// Sentiment analysis (simulated)
function analyzeSentiment(text) {
  const positive = ['great', 'love', 'amazing', 'excellent', 'awesome', 'good', 'best', 'perfect'];
  const negative = ['bad', 'hate', 'terrible', 'awful', 'worst', 'slow', 'broken', 'crash'];

  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  words.forEach(w => {
    if (positive.includes(w)) score += 1;
    if (negative.includes(w)) score -= 1;
  });

  if (score > 1) return 'positive';
  if (score < -1) return 'negative';
  return 'neutral';
}

// Extract entities (simplified)
function extractEntities(text) {
  const entities = {
    features: [],
    products: [],
    actions: []
  };

  const featurePatterns = ['feature', 'option', 'button', 'screen', 'page', 'function'];
  const actionPatterns = ['add', 'remove', 'fix', 'improve', 'change', 'update'];

  const words = text.toLowerCase().split(/\s+/);
  words.forEach((w, i) => {
    if (featurePatterns.includes(w) && words[i - 1]) entities.features.push(words[i - 1]);
    if (actionPatterns.includes(w) && words[i + 1]) entities.actions.push(`${w} ${words[i + 1]}`);
  });

  return entities;
}

// REST API - Projects
app.post('/api/projects', (req, res) => {
  const { projectId, name, industry } = req.body;
  projects.set(projectId, {
    projectId,
    name,
    industry,
    feedbackCount: 0,
    sentimentScore: 0,
    topFeatures: [],
    topIssues: [],
    createdAt: new Date().toISOString()
  });
  res.json(projects.get(projectId));
});

// REST API - Submit Feedback
app.post('/api/feedback', (req, res) => {
  const { projectId, userId, text, source = 'app', rating, metadata = {} } = req.body;

  const category = detectCategory(text);
  const sentiment = analyzeSentiment(text);
  const entities = extractEntities(text);

  const item = {
    id: uuidv4(),
    projectId,
    userId,
    text,
    source,
    rating,
    category: category.key,
    sentiment,
    entities,
    priority: calculatePriority(category, sentiment, rating),
    status: 'new',
    createdAt: new Date().toISOString(),
    insights: []
  };

  feedback.push(item);

  // Update project stats
  const project = projects.get(projectId);
  if (project) {
    project.feedbackCount++;
    if (sentiment === 'positive') project.sentimentScore++;
    if (sentiment === 'negative') project.sentimentScore--;
  }

  res.json(item);
});

// REST API - Get Feedback
app.get('/api/feedback', (req, res) => {
  const { projectId, category, sentiment, status, priority, limit = 100 } = req.query;
  let list = feedback;

  if (projectId) list = list.filter(f => f.projectId === projectId);
  if (category) list = list.filter(f => f.category === category);
  if (sentiment) list = list.filter(f => f.sentiment === sentiment);
  if (status) list = list.filter(f => f.status === status);
  if (priority) list = list.filter(f => f.priority === priority);

  list.sort((a, b) => b.priority - a.priority);
  res.json(list.slice(0, parseInt(limit)));
});

// REST API - Analyze Feedback
app.get('/api/feedback/:projectId/analyze', (req, res) => {
  const projectFeedback = feedback.filter(f => f.projectId === req.params.projectId);

  const analysis = {
    projectId: req.params.projectId,
    total: projectFeedback.length,
    byCategory: {},
    bySentiment: { positive: 0, neutral: 0, negative: 0 },
    avgRating: 0,
    topFeatures: [],
    topIssues: [],
    trends: analyzeTrends(projectFeedback),
    generatedAt: new Date().toISOString()
  };

  projectFeedback.forEach(f => {
    analysis.byCategory[f.category] = (analysis.byCategory[f.category] || 0) + 1;
    analysis.bySentiment[f.sentiment]++;
    if (f.rating) analysis.avgRating += f.rating;
  });

  analysis.avgRating = projectFeedback.length > 0 ? analysis.avgRating / projectFeedback.length : 0;

  // Find top features/issues
  const featureCounts = {};
  projectFeedback.forEach(f => {
    f.entities.features.forEach(feat => {
      featureCounts[feat] = (featureCounts[feat] || 0) + 1;
    });
  });

  analysis.topFeatures = Object.entries(featureCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const issueFeedback = projectFeedback.filter(f => f.category === 'bug' || f.category === 'complaint');
  analysis.topIssues = issueFeedback.slice(0, 5);

  insights.push({ id: uuidv4(), projectId: req.params.projectId, type: 'analysis', ...analysis });

  res.json(analysis);
});

// REST API - Generate Roadmap
app.post('/api/roadmap', (req, res) => {
  const { projectId, horizon = '3months' } = req.body;
  const projectFeedback = feedback.filter(f => f.projectId === projectId);

  const roadmap = {
    id: uuidv4(),
    projectId,
    horizon,
    quarters: generateQuarters(horizon),
    items: generateRoadmapItems(projectFeedback, horizon),
    createdAt: new Date().toISOString()
  };

  roadmaps.push(roadmap);

  res.json(roadmap);
});

app.get('/api/roadmap/:projectId', (req, res) => {
  const roadmap = roadmaps.find(r => r.projectId === req.params.projectId);
  if (!roadmap) return res.status(404).json({ error: 'No roadmap found' });
  res.json(roadmap);
});

// REST API - Suggestions
app.get('/api/suggestions/:projectId', (req, res) => {
  const projectFeedback = feedback.filter(f => f.projectId === req.params.projectId);

  const suggestions = [];

  // High-priority issues
  const issues = projectFeedback.filter(f => f.priority > 5);
  if (issues.length > 0) {
    suggestions.push({
      type: 'fix',
      title: 'Critical issues need attention',
      items: issues.slice(0, 3).map(i => ({ text: i.text, priority: i.priority })),
      impact: 'high'
    });
  }

  // Missing features
  const featureRequests = projectFeedback.filter(f => f.category === 'feature');
  if (featureRequests.length > 5) {
    suggestions.push({
      type: 'feature',
      title: 'Feature requests trending',
      items: featureRequests.slice(0, 3).map(i => ({ text: i.text })),
      impact: 'medium'
    });
  }

  // User satisfaction
  const negative = projectFeedback.filter(f => f.sentiment === 'negative');
  if (negative.length > 10) {
    suggestions.push({
      type: 'research',
      title: 'Users expressing frustration',
      items: negative.slice(0, 3).map(i => ({ text: i.text })),
      impact: 'high'
    });
  }

  res.json(suggestions);
});

// REST API - Export
app.get('/api/export/:projectId', (req, res) => {
  const { format = 'json' } = req.query;
  const projectFeedback = feedback.filter(f => f.projectId === req.params.projectId);

  if (format === 'csv') {
    const csv = ['id,text,category,sentiment,rating,priority,createdAt'];
    projectFeedback.forEach(f => {
      csv.push(`${f.id},"${f.text.replace(/"/g, '""')}",${f.category},${f.sentiment},${f.rating || ''},${f.priority},${f.createdAt}`);
    });
    res.set('Content-Type', 'text/csv');
    res.send(csv.join('\n'));
  } else {
    res.json(projectFeedback);
  }
});

function detectCategory(text) {
  const lower = text.toLowerCase();
  if (lower.includes('bug') || lower.includes('crash') || lower.includes('error')) return CATEGORIES.bug;
  if (lower.includes('add') || lower.includes('would be nice') || lower.includes('should have')) return CATEGORIES.feature;
  if (lower.includes('hate') || lower.includes('terrible') || lower.includes('frustrated')) return CATEGORIES.complaint;
  if (lower.includes('love') || lower.includes('great') || lower.includes('awesome')) return CATEGORIES.compliment;
  if (lower.includes('how to') || lower.includes('?') || lower.includes('what is')) return CATEGORIES.question;
  return CATEGORIES.idea;
}

function calculatePriority(category, sentiment, rating) {
  let priority = 5;
  priority += category.score * 2;
  if (sentiment === 'negative') priority += 3;
  if (sentiment === 'positive') priority -= 1;
  if (rating && rating < 3) priority += 2;
  if (rating && rating > 4) priority -= 1;
  return Math.max(1, Math.min(10, priority));
}

function analyzeTrends(feedback) {
  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

  const thisWeek = feedback.filter(f => new Date(f.createdAt) > weekAgo);
  const lastWeek = feedback.filter(f => new Date(f.createdAt) > twoWeeksAgo && new Date(f.createdAt) <= weekAgo);

  const positiveTrend = thisWeek.filter(f => f.sentiment === 'positive').length > lastWeek.filter(f => f.sentiment === 'positive').length;

  return {
    volume: { current: thisWeek.length, previous: lastWeek.length, change: thisWeek.length - lastWeek.length },
    sentiment: { positiveTrend },
    topCategory: Object.entries(
      thisWeek.reduce((acc, f) => { acc[f.category] = (acc[f.category] || 0) + 1; return acc; }, {})
    ).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'
  };
}

function generateQuarters(horizon) {
  const quarters = [];
  const now = new Date();
  for (let i = 0; i < parseInt(horizon); i++) {
    const q = Math.floor((now.getMonth() + i * 3) / 3) % 4 + 1;
    const year = now.getFullYear() + Math.floor((now.getMonth() + i * 3) / 12);
    quarters.push(`Q${q} ${year}`);
  }
  return quarters;
}

function generateRoadmapItems(feedback, horizon) {
  const items = [];
  const features = feedback.filter(f => f.category === 'feature').slice(0, 5);
  const bugs = feedback.filter(f => f.category === 'bug').slice(0, 3);

  bugs.forEach((bug, i) => {
    items.push({ title: `Fix: ${bug.text.slice(0, 50)}`, type: 'bug', quarter: 'Q1', priority: 10 - i });
  });

  features.forEach((feat, i) => {
    items.push({ title: feat.text.slice(0, 50), type: 'feature', quarter: `Q${i + 2}`, priority: 5 - i });
  });

  return items;
}

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'ai-product-manager', feedback: feedback.length }));
app.listen(PORT, () => console.log(`AI Product Manager running on port ${PORT}`));
