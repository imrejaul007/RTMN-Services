/**
 * Calendar OS - Events and Scheduling
 * Port: 4875
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4875;
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json());

interface CalendarEvent { id: string; title: string; description: string; start: string; end: string; allDay: boolean; attendees: string[]; location?: string; recurrence?: string; reminders: number[]; status: string; createdBy: string; }
const events = new Map<string, CalendarEvent>();

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'calendar-os', uptime: Math.floor((Date.now() - START_TIME) / 1000), events: events.size }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

app.get('/api/events', (req, res) => {
  const { from, to, attendee } = req.query;
  let result = Array.from(events.values());
  if (from) result = result.filter(e => e.start >= from);
  if (to) result = result.filter(e => e.end <= to);
  if (attendee) result = result.filter(e => e.attendees.includes(attendee as string));
  result.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  res.json({ events: result });
});

app.get('/api/events/:id', (req, res) => {
  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

app.post('/api/events', (req, res) => {
  const { title, description, start, end, allDay, attendees, location, reminders, createdBy } = req.body;
  const id = uuidv4();
  const event: CalendarEvent = { id, title, description: description || '', start, end, allDay: allDay || false, attendees: attendees || [], location, reminders: reminders || [15], status: 'confirmed', createdBy: createdBy || 'unknown' };
  events.set(id, event);
  res.status(201).json(event);
});

app.put('/api/events/:id', (req, res) => {
  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  Object.assign(event, req.body);
  res.json(event);
});

app.delete('/api/events/:id', (req, res) => {
  if (!events.has(req.params.id)) return res.status(404).json({ error: 'Event not found' });
  events.delete(req.params.id);
  res.json({ success: true });
});

app.get('/api/conflicts', (req, res) => {
  const { userId, start, end } = req.query;
  if (!userId || !start || !end) return res.status(400).json({ error: 'userId, start, end required' });
  const conflicts = Array.from(events.values()).filter(e => e.attendees.includes(userId as string) && e.start < end && e.end > start);
  res.json({ hasConflicts: conflicts.length > 0, conflicts });
});

app.post('/api/availability', (req, res) => {
  const { attendees, duration, startDate, endDate } = req.body;
  if (!attendees || !duration) return res.status(400).json({ error: 'attendees and duration required' });
  // Simple availability check
  const slots = [];
  const start = new Date(startDate || Date.now());
  const end = new Date(endDate || start.getTime() + 86400000);
  for (let d = start; d < end; d.setHours(d.getHours() + 1)) {
    const slotStart = d.toISOString();
    const slotEnd = new Date(d.getTime() + duration * 60000).toISOString();
    const hasConflict = Array.from(events.values()).some(e => e.attendees.some(a => attendees.includes(a)) && e.start < slotEnd && e.end > slotStart);
    if (!hasConflict) slots.push({ start: slotStart, end: slotEnd });
  }
  res.json({ availableSlots: slots.slice(0, 10) });
});

app.listen(PORT, () => console.log(`[calendar-os] listening on :${PORT}`));
export default app;