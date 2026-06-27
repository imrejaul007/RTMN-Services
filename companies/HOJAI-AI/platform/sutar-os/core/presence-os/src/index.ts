/**
 * Presence OS - Production Implementation
 * User presence, availability, timezone management
 * Port: 4880
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4880;
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json());

// ============ TYPES ============

interface UserPresence {
  userId: string;
  name: string;
  email: string;
  status: 'online' | 'away' | 'busy' | 'dnd' | 'offline';
  statusMessage?: string;
  statusEmoji?: string;
  lastSeen: string;
  lastActivity?: string;
  inMeeting: boolean;
  meetingId?: string;
  location?: string;
  timezone: string;
  workingHours: { start: string; end: string; days: number[] };
  capabilities: string[];
  device?: 'desktop' | 'mobile' | 'tablet' | 'web';
}

interface PresenceEvent {
  id: string;
  userId: string;
  previousStatus: string;
  newStatus: string;
  timestamp: string;
  source: 'manual' | 'automatic' | 'system';
}

interface AvailabilitySlot {
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
  meetingId?: string;
}

interface Meeting {
  id: string;
  title: string;
  participants: string[];
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'active' | 'ended';
}

// ============ STORES ============

const users = new Map<string, UserPresence>();
const history: PresenceEvent[] = [];
const availability = new Map<string, AvailabilitySlot[]>();
const meetings = new Map<string, Meeting>();

// ============ SEED DATA ============

const seedUsers: UserPresence[] = [
  { userId: 'u1', name: 'Alice Engineer', email: 'alice@company.com', status: 'online', lastSeen: new Date().toISOString(), inMeeting: false, timezone: 'America/New_York', workingHours: { start: '09:00', end: '17:00', days: [1, 2, 3, 4, 5] }, capabilities: ['React', 'Node.js'] },
  { userId: 'u2', name: 'Bob Designer', email: 'bob@company.com', status: 'busy', statusMessage: 'In design review', lastSeen: new Date().toISOString(), inMeeting: true, timezone: 'Europe/London', workingHours: { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] }, capabilities: ['Figma', 'UI Design'] },
  { userId: 'u3', name: 'Carol Manager', email: 'carol@company.com', status: 'away', statusMessage: 'Lunch break', lastSeen: new Date(Date.now() - 1800000).toISOString(), inMeeting: false, timezone: 'Asia/Tokyo', workingHours: { start: '10:00', end: '19:00', days: [1, 2, 3, 4, 5] }, capabilities: ['Leadership', 'Agile'] },
  { userId: 'u4', name: 'David Developer', email: 'david@company.com', status: 'dnd', statusMessage: 'Deep work', lastSeen: new Date().toISOString(), inMeeting: false, timezone: 'America/Los_Angeles', workingHours: { start: '08:00', end: '16:00', days: [1, 2, 3, 4, 5] }, capabilities: ['Python', 'AWS'] },
  { userId: 'u5', name: 'Eve QA', email: 'eve@company.com', status: 'offline', lastSeen: new Date(Date.now() - 86400000).toISOString(), inMeeting: false, timezone: 'Europe/Berlin', workingHours: { start: '09:00', end: '17:00', days: [1, 2, 3, 4, 5] }, capabilities: ['Testing', 'Selenium'] },
];
seedUsers.forEach(u => users.set(u.userId, u));

// ============ VALIDATION ============

const UpdatePresenceSchema = z.object({
  userId: z.string(),
  status: z.enum(['online', 'away', 'busy', 'dnd', 'offline']).optional(),
  statusMessage: z.string().optional(),
  statusEmoji: z.string().optional(),
  inMeeting: z.boolean().optional(),
  location: z.string().optional(),
});

// ============ HEALTH ============

app.get('/health', (_req, res) => res.json({
  status: 'ok', service: 'presence-os',
  uptime: Math.floor((Date.now() - START_TIME) / 1000),
  users: users.size, online: Array.from(users.values()).filter(u => u.status === 'online').length,
}));
app.get('/ready', (_req, res) => res.json({ ready: true }));

// ============ USERS ============

app.get('/api/users', (req, res) => {
  const { status, timezone, inMeeting, search } = req.query;
  let result = Array.from(users.values());
  if (status) result = result.filter(u => u.status === status);
  if (timezone) result = result.filter(u => u.timezone === timezone);
  if (inMeeting === 'true') result = result.filter(u => u.inMeeting);
  if (search) result = result.filter(u => u.name.toLowerCase().includes((search as string).toLowerCase()) || u.email.toLowerCase().includes((search as string).toLowerCase()));
  res.json({ total: result.length, users: result });
});

app.get('/api/users/:userId', (req, res) => {
  const user = users.get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.post('/api/users', (req, res) => {
  const { userId, name, email, timezone, capabilities } = req.body;
  if (!userId || !name) return res.status(400).json({ error: 'userId, name required' });

  const user: UserPresence = {
    userId, name, email: email || `${userId}@company.com`,
    status: 'offline', lastSeen: new Date().toISOString(),
    inMeeting: false, timezone: timezone || 'UTC',
    workingHours: { start: '09:00', end: '17:00', days: [1, 2, 3, 4, 5] },
    capabilities: capabilities || [],
  };
  users.set(userId, user);
  res.status(201).json(user);
});

app.patch('/api/users/:userId', (req, res) => {
  const user = users.get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  Object.assign(user, req.body);
  user.lastSeen = new Date().toISOString();
  res.json(user);
});

app.delete('/api/users/:userId', (req, res) => {
  if (!users.has(req.params.userId)) return res.status(404).json({ error: 'User not found' });
  users.delete(req.params.userId);
  res.json({ success: true });
});

// ============ STATUS UPDATE ============

app.post('/api/update', (req, res) => {
  try {
    const data = UpdatePresenceSchema.parse(req.body);
    const user = users.get(data.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = new Date().toISOString();
    if (data.status && data.status !== user.status) {
      history.push({
        id: uuidv4(), userId: user.userId,
        previousStatus: user.status, newStatus: data.status,
        timestamp: now, source: 'manual',
      });
      if (history.length > 10000) history.splice(0, history.length - 10000);
    }

    if (data.status) user.status = data.status;
    if (data.statusMessage !== undefined) user.statusMessage = data.statusMessage;
    if (data.statusEmoji !== undefined) user.statusEmoji = data.statusEmoji;
    if (data.inMeeting !== undefined) user.inMeeting = data.inMeeting;
    if (data.location !== undefined) user.location = data.location;
    user.lastSeen = now;
    user.lastActivity = now;

    res.json(user);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bulk-update', (req, res) => {
  const { updates } = req.body;
  if (!updates?.length) return res.status(400).json({ error: 'updates array required' });

  const results = updates.map((u: { userId: string; status: string }) => {
    const user = users.get(u.userId);
    if (user) {
      user.status = u.status;
      user.lastSeen = new Date().toISOString();
      return { userId: u.userId, success: true };
    }
    return { userId: u.userId, success: false };
  });

  res.json({ results });
});

// ============ HISTORY ============

app.get('/api/history/:userId', (req, res) => {
  const events = history.filter(e => e.userId === req.params.userId);
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const limit = parseInt(req.query.limit as string) || 50;
  res.json({ total: events.length, events: events.slice(0, limit) });
});

// ============ MEETINGS ============

app.get('/api/meetings', (req, res) => {
  const { status, participant } = req.query;
  let result = Array.from(meetings.values());
  if (status) result = result.filter(m => m.status === status);
  if (participant) result = result.filter(m => m.participants.includes(participant as string));
  res.json({ total: result.length, meetings: result });
});

app.get('/api/meeting', (req, res) => {
  const inMeeting = Array.from(users.values()).filter(u => u.inMeeting);
  const activeMeetings = Array.from(meetings.values()).filter(m => m.status === 'active');
  res.json({ count: inMeeting.length, users: inMeeting, meetings: activeMeetings });
});

app.post('/api/meetings', (req, res) => {
  const { title, participants, startTime, endTime } = req.body;
  if (!title || !participants?.length) return res.status(400).json({ error: 'title, participants required' });

  const id = uuidv4();
  const meeting: Meeting = { id, title, participants, startTime: startTime || new Date().toISOString(), endTime: endTime || '', status: 'scheduled' };
  meetings.set(id, meeting);

  participants.forEach(pId => {
    const user = users.get(pId);
    if (user) { user.inMeeting = true; user.meetingId = id; }
  });

  res.status(201).json(meeting);
});

app.post('/api/meetings/:id/start', (req, res) => {
  const meeting = meetings.get(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

  meeting.status = 'active';
  meeting.participants.forEach(pId => {
    const user = users.get(pId);
    if (user) { user.inMeeting = true; user.meetingId = meeting.id; }
  });

  res.json(meeting);
});

app.post('/api/meetings/:id/end', (req, res) => {
  const meeting = meetings.get(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

  meeting.status = 'ended';
  meeting.participants.forEach(pId => {
    const user = users.get(pId);
    if (user) { user.inMeeting = false; user.meetingId = undefined; }
  });

  res.json(meeting);
});

// ============ AVAILABILITY ============

app.get('/api/availability/:userId', (req, res) => {
  const { date, startTime, endTime } = req.query;
  const user = users.get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const slots = availability.get(user.userId) || [];
  const filtered = slots.filter(s => (!date || s.date === date) && s.available);

  // Check working hours
  const now = new Date();
  const currentHour = now.getHours();
  const [startHour] = user.workingHours.start.split(':').map(Number);
  const [endHour] = user.workingHours.end.split(':').map(Number);

  const isInWorkingHours = currentHour >= startHour && currentHour < endHour;
  const isWorkingDay = user.workingHours.days.includes(now.getDay());

  res.json({
    user, available: user.status === 'online' && !user.inMeeting && isInWorkingHours && isWorkingDay,
    workingHours: user.workingHours,
    meetings: Array.from(meetings.values()).filter(m => m.participants.includes(user.userId) && m.status !== 'ended'),
    customSlots: filtered,
  });
});

app.post('/api/availability', (req, res) => {
  const { userId, date, startTime, endTime, available } = req.body;
  if (!userId || !date) return res.status(400).json({ error: 'userId, date required' });

  if (!availability.has(userId)) availability.set(userId, []);
  availability.get(userId)!.push({ userId, date, startTime: startTime || '', endTime: endTime || '', available: available ?? true });

  res.json({ success: true });
});

// ============ STATUS SUGGESTIONS ============

app.get('/api/suggestions/:userId', (req, res) => {
  const user = users.get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const now = new Date();
  const hour = now.getHours();
  const suggestions: { status: string; message: string }[] = [];

  if (hour < 9) suggestions.push({ status: 'offline', message: 'Before work hours' });
  if (hour >= 18) suggestions.push({ status: 'offline', message: 'After work hours' });
  if (user.inMeeting) suggestions.push({ status: 'busy', message: 'You are in a meeting' });

  const activeMeetings = Array.from(meetings.values()).filter(m => m.participants.includes(user.userId) && m.status === 'active');
  if (activeMeetings.length > 0) {
    suggestions.push({ status: 'dnd', message: `In meeting: ${activeMeetings[0].title}` });
  }

  res.json({ current: user.status, suggestions });
});

// ============ STATS ============

app.get('/api/stats', (_req, res) => {
  const all = Array.from(users.values());
  res.json({
    total: all.length,
    byStatus: {
      online: all.filter(u => u.status === 'online').length,
      away: all.filter(u => u.status === 'away').length,
      busy: all.filter(u => u.status === 'busy').length,
      dnd: all.filter(u => u.status === 'dnd').length,
      offline: all.filter(u => u.status === 'offline').length,
    },
    inMeetings: all.filter(u => u.inMeeting).length,
    activeMeetings: Array.from(meetings.values()).filter(m => m.status === 'active').length,
  });
});

app.listen(PORT, () => console.log(`[presence-os] listening on :${PORT}`));
export default app;