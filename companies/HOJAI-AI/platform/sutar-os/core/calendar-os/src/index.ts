import { requireAuth } from '@rtmn/shared/auth';
/**
 * Calendar OS - Production Implementation
 * Events, scheduling, availability, calendar integrations
 * Port: 4875
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4875;
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json());

// ============ TYPES ============
interface CalendarEvent {
  id: string; title: string; description: string; start: string; end: string; allDay: boolean;
  attendees: string[]; location?: string; recurrence?: string; reminders: number[]; status: string;
  createdBy: string; organizer?: string; color?: string; url?: string; visibility: 'public' | 'private';
  attachments?: { name: string; url: string }[]; metadata: Record<string, string>;
}
interface Availability { userId: string; date: string; slots: { start: string; end: string; available: boolean }[]; }
const events = new Map<string, CalendarEvent>();
const availability = new Map<string, Availability[]>();
const calendars = new Map<string, { userId: string; name: string; color: string; visible: boolean }>();

// Seed calendars
calendars.set('work', { userId: 'u1', name: 'Work', color: '#0066FF', visible: true });
calendars.set('personal', { userId: 'u1', name: 'Personal', color: '#00AA66', visible: true });

// ============ HEALTH ============
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'calendar-os', uptime: Math.floor((Date.now() - START_TIME) / 1000), events: events.size }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

// ============ EVENTS ============
app.get('/api/events', (req, res) => {
  const { from, to, attendee, calendarId, visibility } = req.query;
  let result = Array.from(events.values());
  if (from) result = result.filter(e => e.start >= from);
  if (to) result = result.filter(e => e.end <= to);
  if (attendee) result = result.filter(e => e.attendees.includes(attendee as string));
  if (visibility) result = result.filter(e => e.visibility === visibility);
  result.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  res.json({ total: result.length, events: result });
});

app.get('/api/events/:id', (req, res) => {
  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

app.post('/api/events',requireAuth,  (req, res) => {
  const { title, description, start, end, allDay, attendees, location, reminders, createdBy, color, visibility } = req.body;
  if (!title || !start || !end) return res.status(400).json({ error: 'title, start, end required' });
  const id = uuidv4();
  events.set(id, { id, title, description: description || '', start, end, allDay: allDay || false, attendees: attendees || [], location, reminders: reminders || [15], status: 'confirmed', createdBy: createdBy || 'system', color, visibility: visibility || 'public', metadata: {} });
  res.status(201).json(events.get(id));
});

app.put('/api/events/:id',requireAuth,  (req, res) => {
  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  Object.assign(event, req.body);
  res.json(event);
});

app.delete('/api/events/:id',requireAuth,  (req, res) => {
  if (!events.has(req.params.id)) return res.status(404).json({ error: 'Event not found' });
  events.delete(req.params.id);
  res.json({ success: true });
});

// ============ CONFLICTS ============
app.get('/api/conflicts', (req, res) => {
  const { userId, start, end } = req.query;
  if (!userId || !start || !end) return res.status(400).json({ error: 'userId, start, end required' });
  const conflicts = Array.from(events.values()).filter(e => e.attendees.includes(userId as string) && e.start < end && e.end > start);
  res.json({ hasConflicts: conflicts.length > 0, conflicts });
});

// ============ AVAILABILITY ============
app.post('/api/availability',requireAuth,  (req, res) => {
  const { attendees, duration, startDate, endDate } = req.body;
  if (!attendees || !duration) return res.status(400).json({ error: 'attendees and duration required' });
  const slots = [];
  const start = new Date(startDate || Date.now());
  const end = new Date(endDate || start.getTime() + 86400000);
  for (let d = start.getTime(); d < end.getTime(); d += 3600000) {
    const slotStart = new Date(d).toISOString();
    const slotEnd = new Date(d + duration * 60000).toISOString();
    const hasConflict = Array.from(events.values()).some(e => e.attendees.some(a => attendees.includes(a)) && e.start < slotEnd && e.end > slotStart);
    if (!hasConflict) slots.push({ start: slotStart, end: slotEnd });
  }
  res.json({ availableSlots: slots.slice(0, 10) });
});

// ============ CALENDARS ============
app.get('/api/calendars', (req, res) => {
  const { userId } = req.query;
  let result = Array.from(calendars.values());
  if (userId) result = result.filter(c => c.userId === userId);
  res.json({ calendars: result });
});

app.post('/api/calendars',requireAuth,  (req, res) => {
  const { userId, name, color } = req.body;
  if (!userId || !name) return res.status(400).json({ error: 'userId, name required' });
  const id = uuidv4();
  calendars.set(id, { userId, name, color: color || '#888888', visible: true });
  res.status(201).json(calendars.get(id));
});

// ============ STATS ============
app.get('/api/stats', (_req, res) => {
  const all = Array.from(events.values());
  res.json({ total: all.length, byVisibility: { public: all.filter(e => e.visibility === 'public').length, private: all.filter(e => e.visibility === 'private').length } });
});

app.listen(PORT, () => console.log(`[calendar-os] listening on :${PORT}`));
export default app;