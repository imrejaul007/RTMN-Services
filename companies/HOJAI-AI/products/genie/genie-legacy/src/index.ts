/**
 * Digital Legacy API — Express server
 * Spec Part 35: Digital Legacy
 * Port: 4755
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { ArchiveBuilder } from './services/archiveBuilder.js';
import { generateChapter } from './services/lifeStoryWriter.js';
import { FamilyHistory } from './services/familyHistory.js';

const PORT = parseInt(process.env.PORT || '4755', 10);
const SERVICE_NAME = 'genie-legacy';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, service: SERVICE_NAME });
});

// Schemas
const EntrySchema = z.object({
  userId: z.string().min(1),
  type: z.enum(['memory', 'lesson', 'story', 'family_history', 'value', 'writing']),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(['private', 'family', 'public']).optional(),
  recipients: z.array(z.string()).optional(),
});

const FamilyMemberSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  relationship: z.string().min(1),
  birthdate: z.string().optional(),
  photos: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const ChapterSchema = z.object({
  userId: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  memories: z.array(z.string()),
});

// GET /api/legacy/:userId — Dashboard
app.get('/api/legacy/:userId', async (req, res, next) => {
  try {
    const stats = await ArchiveBuilder.getStats(req.params.userId);
    const recent = (await ArchiveBuilder.getEntries(req.params.userId)).slice(0, 5);

    res.json({
      success: true,
      data: { stats, recent },
      meta: { userId: req.params.userId, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/legacy/entry — Add legacy entry
app.post('/api/legacy/entry', async (req, res, next) => {
  try {
    const data = EntrySchema.parse(req.body);
    const entry = await ArchiveBuilder.addEntry(
      data.userId,
      data.type,
      data.title,
      data.content,
      {
        tags: data.tags,
        visibility: data.visibility,
        recipients: data.recipients,
      }
    );
    res.json({
      success: true,
      data: entry,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/legacy/:userId/entries — Get entries
app.get('/api/legacy/:userId/entries', async (req, res, next) => {
  try {
    const type = req.query.type as any;
    const entries = await ArchiveBuilder.getEntries(req.params.userId, type);
    res.json({
      success: true,
      data: entries,
      meta: { count: entries.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/legacy/chapter — Generate chapter
app.post('/api/legacy/chapter', async (req, res, next) => {
  try {
    const data = ChapterSchema.parse(req.body);
    const chapter = await generateChapter(
      data.userId,
      { from: new Date(data.from), to: new Date(data.to) },
      data.memories
    );
    res.json({
      success: true,
      data: chapter,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/legacy/family — Add family member
app.post('/api/legacy/family', async (req, res, next) => {
  try {
    const data = FamilyMemberSchema.parse(req.body);
    const member = await FamilyHistory.addMember(
      data.userId,
      data.name,
      data.relationship,
      {
        birthdate: data.birthdate ? new Date(data.birthdate) : undefined,
        photos: data.photos,
        notes: data.notes,
      }
    );
    res.json({
      success: true,
      data: member,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/legacy/:userId/family — Get family members
app.get('/api/legacy/:userId/family', async (req, res, next) => {
  try {
    const members = await FamilyHistory.getMembers(req.params.userId);
    res.json({
      success: true,
      data: members,
      meta: { count: members.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[${SERVICE_NAME}] Error:`, err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL', message: err.message },
  });
});

const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║      ${SERVICE_NAME.toUpperCase()} v1.0.0                 ║
║      Digital Legacy — Archive for future generations      ║
╠══════════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                       ║
║  Status:      RUNNING                                       ║
║  Features:                                                 ║
║    ✓ Legacy entries (memories, lessons, stories)         ║
║    ✓ AI-assisted life chapter generation                  ║
║    ✓ Family history tracking                              ║
║    ✓ Privacy controls (private/family/public)            ║
║    ✓ Archive statistics                                    ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log(`[${SERVICE_NAME}] SIGTERM received`);
  server.close(() => process.exit(0));
});

export default app;