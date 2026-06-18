/**
 * Genie Memory Inbox Service
 *
 * Port: 4710
 *
 * Universal memory capture - everything lands here first.
 * Then AI auto-classifies into Twins.
 *
 * Memory Types:
 * - voice: Voice notes
 * - text: Text notes
 * - image: Photos/screenshots
 * - document: PDFs, files
 * - link: Bookmarks/URLs
 * - email: Email capture
 * - whatsapp: WhatsApp messages
 * - meeting: Meeting notes
 * - expense: Receipts/bills
 * - reminder: Reminders
 * - task: Tasks
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const MemoryClassifier = require('./services/classifier');
const MemoryRoutes = require('./routes/memories');
const CaptureRoutes = require('./routes/capture');
const TimelineRoutes = require('./routes/timeline');
const SearchRoutes = require('./routes/search');

const app = express();
const PORT = process.env.GENIE_INBOX_PORT || 4710;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request ID
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// In-memory storage (in production, use MongoDB/PostgreSQL)
const memories = new Map();
const tags = new Map();
const categories = new Map();
const reminders = new Map();

// Initialize default categories
const defaultCategories = [
  { id: 'personal', name: 'Personal', icon: '👤', color: '#6366f1' },
  { id: 'work', name: 'Work', icon: '💼', color: '#3b82f6' },
  { id: 'health', name: 'Health', icon: '❤️', color: '#ef4444' },
  { id: 'finance', name: 'Finance', icon: '💰', color: '#10b981' },
  { id: 'travel', name: 'Travel', icon: '✈️', color: '#f59e0b' },
  { id: 'family', name: 'Family', icon: '👨‍👩‍👧', color: '#ec4899' },
  { id: 'ideas', name: 'Ideas', icon: '💡', color: '#8b5cf6' },
  { id: 'important', name: 'Important', icon: '⭐', color: '#eab308' },
  { id: 'to-do', name: 'To Do', icon: '📋', color: '#14b8a6' },
  { id: 'later', name: 'Later', icon: '📌', color: '#6b7280' }
];
defaultCategories.forEach(cat => categories.set(cat.id, cat));

// Initialize default tags
const defaultTags = [
  'important', 'urgent', 'follow-up', 'waiting', 'ideas',
  'reference', 'archive', 'review', 'project', 'meeting'
];
defaultTags.forEach(tag => tags.set(tag, { name: tag, count: 0 }));

// Stats
const stats = {
  totalMemories: 0,
  byType: {},
  byCategory: {},
  today: 0,
  thisWeek: 0,
  thisMonth: 0
};

// Initialize classifier
const classifier = new MemoryClassifier({
  twinEndpoint: process.env.TWIN_OS_URL || 'http://localhost:4705',
  memoryOsEndpoint: process.env.MEMORY_OS_URL || 'http://localhost:4703'
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'genie-memory-inbox',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      totalMemories: memories.size,
      categories: categories.size,
      tags: tags.size
    }
  });
});

// Readiness check
app.get('/ready', (req, res) => {
  res.json({
    ready: true,
    services: {
      classifier: true,
      storage: true
    }
  });
});

// Routes
app.use('/api/memories', MemoryRoutes(memories, tags, categories, classifier));
app.use('/api/capture', CaptureRoutes(memories, classifier));
app.use('/api/timeline', TimelineRoutes(memories));
app.use('/api/search', SearchRoutes(memories, tags, categories));

// Categories CRUD
app.get('/api/categories', (req, res) => {
  res.json({
    success: true,
    categories: Array.from(categories.values())
  });
});

app.post('/api/categories', (req, res) => {
  const { name, icon, color } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Name required' });
  }

  const id = name.toLowerCase().replace(/\s+/g, '-');
  const category = { id, name, icon: icon || '📁', color: color || '#6b7280' };
  categories.set(id, category);

  res.status(201).json({ success: true, category });
});

app.delete('/api/categories/:id', (req, res) => {
  if (categories.has(req.params.id)) {
    categories.delete(req.params.id);
    res.json({ success: true, message: 'Category deleted' });
  } else {
    res.status(404).json({ success: false, error: 'Category not found' });
  }
});

// Tags
app.get('/api/tags', (req, res) => {
  res.json({
    success: true,
    tags: Array.from(tags.values())
  });
});

app.post('/api/tags', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Name required' });
  }

  const tagName = name.toLowerCase().trim();
  if (!tags.has(tagName)) {
    tags.set(tagName, { name: tagName, count: 0 });
  }

  res.status(201).json({ success: true, tag: tags.get(tagName) });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const mems = Array.from(memories.values());

  const typeCounts = {};
  const categoryCounts = {};

  mems.forEach(m => {
    typeCounts[m.type] = (typeCounts[m.type] || 0) + 1;
    categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
  });

  res.json({
    success: true,
    stats: {
      total: mems.length,
      today: mems.filter(m => new Date(m.createdAt) >= todayStart).length,
      thisWeek: mems.filter(m => new Date(m.createdAt) >= weekStart).length,
      thisMonth: mems.filter(m => new Date(m.createdAt) >= monthStart).length,
      byType: typeCounts,
      byCategory: categoryCounts
    }
  });
});

// Reminders
app.get('/api/reminders', (req, res) => {
  const { status = 'active', userId } = req.query;
  let result = Array.from(reminders.values());

  if (userId) {
    result = result.filter(r => r.userId === userId);
  }

  if (status === 'active') {
    result = result.filter(r => r.status === 'active' && new Date(r.dueDate) >= new Date());
  } else if (status === 'overdue') {
    result = result.filter(r => r.status === 'active' && new Date(r.dueDate) < new Date());
  } else if (status === 'completed') {
    result = result.filter(r => r.status === 'completed');
  }

  res.json({ success: true, reminders: result });
});

app.post('/api/reminders', (req, res) => {
  const { userId, text, dueDate, memoryId } = req.body;

  if (!text || !dueDate) {
    return res.status(400).json({ success: false, error: 'Text and dueDate required' });
  }

  const reminder = {
    id: uuidv4(),
    userId: userId || 'default',
    text,
    dueDate,
    memoryId,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  reminders.set(reminder.id, reminder);

  res.status(201).json({ success: true, reminder });
});

app.patch('/api/reminders/:id', (req, res) => {
  const reminder = reminders.get(req.params.id);
  if (!reminder) {
    return res.status(404).json({ success: false, error: 'Reminder not found' });
  }

  const { status, text, dueDate } = req.body;
  if (status) reminder.status = status;
  if (text) reminder.text = text;
  if (dueDate) reminder.dueDate = dueDate;

  reminders.set(reminder.id, reminder);

  res.json({ success: true, reminder });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🧠 Genie Memory Inbox started on port ${PORT}`);
  console.log(`   Universal capture for personal AI`);
  console.log(`   Capture types: voice, text, image, document, link, email, whatsapp, meeting, expense, reminder, task`);
});

// Export for testing
module.exports = app;
