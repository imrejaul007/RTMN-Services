/**
 * Genie Relationship OS - Human Relationship Intelligence
 *
 * This is NOT a business CRM.
 * This is your PERSONAL relationship intelligence system.
 *
 * It helps you:
 * - Remember people and their stories
 * - Track interactions and relationship health
 * - Know when to reconnect with people
 * - Understand your social patterns
 * - Build stronger relationships
 * - Never miss important dates
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { requireAuth } from '@rtmn/shared/auth';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

import peopleRoutes from './routes/people.js';
import interactionsRoutes from './routes/interactions.js';
import healthRoutes from './routes/health.js';
import remindersRoutes from './routes/reminders.js';
import intelligenceRoutes from './routes/intelligence.js';
import giftsRoutes from './routes/gifts.js';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4718;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());


app.use(requireAuth);// In-memory storage
const storage = {
  people: new PersistentMap('collection-1', { serviceName: 'genie-relationship-os' }), // userId -> array of people
  interactions: new PersistentMap('collection-2', { serviceName: 'genie-relationship-os' }), // userId -> array of interactions
  reminders: new PersistentMap('collection-3', { serviceName: 'genie-relationship-os' }), // userId -> array of reminders
  relationshipHealth: new PersistentMap('collection-4', { serviceName: 'genie-relationship-os' }), // userId -> relationship health data
  giftIdeas: new PersistentMap('collection-5', { serviceName: 'genie-relationship-os' }) // userId -> gift ideas
};

// Share storage with routes
app.locals.storage = storage;

// Routes
app.use('/', peopleRoutes);
app.use('/', interactionsRoutes);
app.use('/', healthRoutes);
app.use('/', remindersRoutes);
app.use('/', intelligenceRoutes);
app.use('/', giftsRoutes);

// Health check
app.get('/health', (req, res) => {
  const userCount = storage.people.size;
  const totalPeople = Array.from(storage.people.values())
    .reduce((sum, arr) => sum + arr.length, 0);
  const totalInteractions = Array.from(storage.interactions.values())
    .reduce((sum, arr) => sum + arr.length, 0);

  res.json({
    status: 'healthy',
    service: 'genie-relationship-os',
    port: PORT,
    version: '1.0.0',
    stats: {
      users: userCount,
      totalPeople,
      totalInteractions
    },
    capabilities: [
      'personal-crm',
      'relationship-health',
      'reconnect-reminders',
      'birthday-tracker',
      'interaction-logging',
      'gift-suggestions',
      'social-insights',
      'weak-tie-alerts'
    ],
    timestamp: new Date().toISOString()
  });
});

// Readiness check
app.get('/ready', async (req, res) => {
  res.json({
    ready: true,
    service: 'genie-relationship-os',
    version: '1.0.0'
  });
});

// Dashboard overview
app.get('/api/:userId/dashboard', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  const people = storage.people.get(userId) || [];
  const interactions = storage.interactions.get(userId) || [];
  const reminders = storage.reminders.get(userId) || [];

  // Calculate stats
  const stats = {
    totalPeople: people.length,
    byCategory: countBy(people, 'category'),
    byRelationship: countBy(people, 'relationshipType'),
    totalInteractions: interactions.length,
    recentInteractions: interactions
      .filter(i => new Date(i.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .length,
    upcomingReminders: reminders.filter(r => r.status === 'pending').length,
    relationshipHealth: calculateOverallHealth(people)
  };

  // Find people needing attention
  const needsAttention = findPeopleNeedingAttention(people);

  // Today's reminders
  const todayReminders = reminders.filter(r => {
    const reminderDate = new Date(r.remindAt).toDateString();
    const today = new Date().toDateString();
    return reminderDate === today && r.status === 'pending';
  });

  res.json({
    success: true,
    userId,
    stats,
    needsAttention: needsAttention.slice(0, 5),
    todayReminders
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.path
  });
});

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           GENIE RELATIONSHIP OS v1.0.0                    ║
║                                                                ║
║  👥 Human Relationship Intelligence                          ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                               ║
║                                                                ║
║  Features:                                                     ║
║  • Personal CRM                                                ║
║  • Relationship Health Tracking                               ║
║  • Reconnect Reminders                                         ║
║  • Birthday Tracker                                            ║
║  • Gift Suggestions                                           ║
║  • Social Insights                                            ║
║  • Weak Tie Alerts                                             ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

// Helper functions
function countBy(arr, key) {
  const counts = {};
  arr.forEach(item => {
    const val = item[key] || 'unknown';
    counts[val] = (counts[val] || 0) + 1;
  });
  return counts;
}

function calculateOverallHealth(people) {
  if (people.length === 0) return 100;

  let totalHealth = 0;
  people.forEach(p => {
    // Higher importance = higher expected frequency
    const expectedFrequency = p.importance >= 8 ? 7 : p.importance >= 5 ? 14 : 30;
    const daysSince = p.lastContact
      ? Math.floor((Date.now() - new Date(p.lastContact)) / (1000 * 60 * 60 * 24))
      : 999;

    // Health score based on recency vs expected
    let health = 100 - (daysSince / expectedFrequency * 100);
    health = Math.max(0, Math.min(100, health));

    // Boost for importance
    if (p.importance >= 8 && daysSince <= 7) health = Math.min(100, health + 20);

    totalHealth += health;
  });

  return Math.round(totalHealth / people.length);
}

function findPeopleNeedingAttention(people) {
  return people
    .map(p => {
      const daysSince = p.lastContact
        ? Math.floor((Date.now() - new Date(p.lastContact)) / (1000 * 60 * 60 * 24))
        : 999;

      const expectedFrequency = p.importance >= 8 ? 7 : p.importance >= 5 ? 14 : 30;
      const daysOverdue = daysSince - expectedFrequency;

      return {
        ...p,
        daysSince,
        daysOverdue: Math.max(0, daysOverdue),
        priority: p.importance * (1 + daysOverdue / 30)
      };
    })
    .filter(p => p.daysOverdue > 0)
    .sort((a, b) => b.priority - a.priority);
}

export default app;
