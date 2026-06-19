/**
 * Genie Companion Service - Emotional AI, Mood Tracking, Journaling
 *
 * The heart of Genie's personal connection with users.
 * Builds emotional understanding, tracks moods, generates journals,
 * remembers personal stories, and creates a lifelong companion relationship.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

import companionRoutes from './routes/companion.js';
import moodRoutes from './routes/mood.js';
import journalRoutes from './routes/journal.js';
import storyRoutes from './routes/story.js';
import emotionRoutes from './routes/emotion.js';

const app = express();
const PORT = process.env.PORT || 4716;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// In-memory storage (replace with database in production)
const storage = {
  moods: new Map(),
  journals: new Map(),
  stories: new Map(),
  emotionalContext: new Map(),
  relationshipLevels: new Map(),
  conversations: new Map()
};

// Share storage with routes
app.locals.storage = storage;

// Routes
app.use('/', companionRoutes);
app.use('/mood', moodRoutes);
app.use('/journal', journalRoutes);
app.use('/story', storyRoutes);
app.use('/emotion', emotionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'genie-companion-service',
    port: PORT,
    version: '1.0.0',
    capabilities: [
      'emotional-intelligence',
      'mood-tracking',
      'journaling',
      'story-memory',
      'relationship-building',
      'daily-checkins',
      'celebrations',
      'reflection-prompts'
    ],
    timestamp: new Date().toISOString()
  });
});

// Readiness check
app.get('/ready', async (req, res) => {
  const services = {
    companion: true,
    mood: true,
    journal: true,
    story: true,
    emotion: true
  };

  const allReady = Object.values(services).every(s => s);

  res.json({
    ready: allReady,
    services,
    timestamp: new Date().toISOString()
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

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           GENIE COMPANION SERVICE v1.0.0                      ║
║                                                                ║
║  ❤️  Emotional AI & Personal Connection                       ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                               ║
║                                                                ║
║  Features:                                                     ║
║  • Emotional Intelligence                                      ║
║  • Mood Tracking & Analysis                                    ║
║  • Journal Generation                                          ║
║  • Life Story Memory                                           ║
║  • Relationship Building                                       ║
║  • Daily Check-ins                                             ║
║  • Celebrations & Milestones                                   ║
║  • Reflection Prompts                                          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
