/**
 * SpiritualOS API — Express server
 * Spec Part 30: SpiritualOS
 * Port: 4751
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { getPrayerTimes } from './services/prayerTracker.js';
import { getRamadanStatus, getRamadanRecommendations } from './services/ramadanMode.js';
import {
  calculateZakat,
  getCharityReminders,
  getCharityRecommendations,
} from './services/charityReminder.js';

const PORT = parseInt(process.env.PORT || '4751', 10);
const SERVICE_NAME = 'genie-spiritual';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

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
const PrayerSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  timezone: z.string().optional(),
});

const ZakatSchema = z.object({
  savings: z.number(),
  gold: z.number().optional(),
  silver: z.number().optional(),
  businessAssets: z.number().optional(),
  liabilities: z.number().optional(),
});

// GET /api/spiritual/:userId — Dashboard
app.get('/api/spiritual/:userId', async (req, res, next) => {
  try {
    const ramadan = getRamadanStatus();
    res.json({
      success: true,
      data: {
        ramadan,
        ramadanRecommendations: ramadan.isRamadan ? getRamadanRecommendations() : null,
        daysUntilRamadan: ramadan.isRamadan ? 0 : ramadan.daysUntil,
      },
      meta: { userId: req.params.userId, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/spiritual/prayer — Get prayer times
app.post('/api/spiritual/prayer', async (req, res, next) => {
  try {
    const data = PrayerSchema.parse(req.body);
    const times = await getPrayerTimes(new Date(), { lat: data.lat, lng: data.lng }, data.timezone);
    res.json({
      success: true,
      data: times,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/spiritual/ramadan — Ramadan status
app.get('/api/spiritual/ramadan', async (req, res, next) => {
  try {
    const status = getRamadanStatus();
    const recommendations = status.isRamadan ? getRamadanRecommendations() : [];
    res.json({
      success: true,
      data: { ...status, recommendations },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/spiritual/zakat — Calculate zakat
app.post('/api/spiritual/zakat', async (req, res, next) => {
  try {
    const data = ZakatSchema.parse(req.body);
    const amount = calculateZakat(
      data.savings,
      data.gold || 0,
      data.silver || 0,
      data.businessAssets || 0,
      data.liabilities || 0
    );
    res.json({
      success: true,
      data: {
        zakatAmount: amount,
        currency: 'INR',
        calculation: {
          savings: data.savings,
          gold: data.gold || 0,
          silver: data.silver || 0,
          businessAssets: data.businessAssets || 0,
          liabilities: data.liabilities || 0,
        },
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/spiritual/charity — Charity reminders
app.get('/api/spiritual/charity', async (req, res, next) => {
  try {
    const reminders = getCharityReminders();
    const recommendations = getCharityRecommendations();
    res.json({
      success: true,
      data: { reminders, recommendations },
      meta: { timestamp: new Date().toISOString() },
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
║      ${SERVICE_NAME.toUpperCase()} v1.0.0                ║
║      SpiritualOS — Prayer times, Ramadan, Zakat          ║
╠══════════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                       ║
║  Status:      RUNNING                                       ║
║  Features:                                                 ║
║    ✓ Prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha)    ║
║    ✓ Ramadan mode with full schedule                     ║
║    ✓ Zakat calculator (2.5% above Nisab)                 ║
║    ✓ Charity reminders (Zakat, Sadaqah, Fitrah)          ║
║    ✓ Qibla direction                                       ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log(`[${SERVICE_NAME}] SIGTERM received`);
  server.close(() => process.exit(0));
});

export default app;