/**
 * Calendar Connector
 * Port: 4795
 * Google Calendar / Outlook integration
 */

import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
const app = express();
const PORT = parseInt(process.env.PORT || '4795', 10);
app.use(express.json());

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  attendees: string[];
  organizer: string;
  location?: string;
  recurring: boolean;
}

const events = new Map<string, CalendarEvent[]>();

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'calendar-connector', version: '1.0.0', connected: !!(process.env.GOOGLE_CALENDAR_ID || process.env.OUTLOOK_CLIENT_ID) }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.get('/api/events/:userId', (req, res) => {
  const { start, end } = req.query;
  let userEvents = events.get(req.params.userId) || [];
  if (start) userEvents = userEvents.filter(e => e.start >= (start as string));
  if (end) userEvents = userEvents.filter(e => e.end <= (end as string));
  res.json({ success: true, data: { events: userEvents, total: userEvents.length } });
});

app.post('/api/events/:userId',requireAuth,  (req, res) => {
  const { title, start, end, attendees, location } = req.body;
  if (!title || !start) return res.status(400).json({ success: false, error: 'title and start required' });

  const event: CalendarEvent = { id: `evt_${Date.now()}`, title, start, end: end || start, attendees: attendees || [], organizer: req.params.userId, location, recurring: false };
  const userEvents = events.get(req.params.userId) || [];
  userEvents.push(event);
  events.set(req.params.userId, userEvents);
  res.status(201).json({ success: true, data: event });
});

app.get('/api/observer/events/:userId', (req, res) => {
  const { days = 7 } = req.query;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(days));
  const userEvents = (events.get(req.params.userId) || []).filter(e => new Date(e.start) >= cutoff);
  const evts = userEvents.map(e => ({ source: 'calendar', type: 'meeting', employeeId: req.params.userId, timestamp: e.start, data: { title: e.title, attendees: e.attendees, duration: e.end } }));
  res.json({ success: true, data: { events: evts, total: evts.length } });
});

const server = app.listen(PORT, () => console.log(`Calendar Connector - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
