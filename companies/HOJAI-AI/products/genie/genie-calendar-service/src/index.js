/**
 * Genie Calendar Service
 *
 * Personal calendar for Genie AI - integrates with MemoryOS and TwinOS
 * Features: Events, scheduling, conflict detection, availability, reminders
 *
 * Port: 4709
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { installReadinessRoutes, autoSeed, normalizeSeedData } = require('@rtmn/shared/lib/genie-readiness');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const { format, parseISO, isWithinInterval, addMinutes, differenceInMinutes } = require('date-fns');
require('dotenv').config();

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4709;
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} | ${req.method} ${req.path} | ${res.statusCode} | ${duration}ms`);
  });
  next();
});

// ==================== DATA MODELS ====================

/**
 * Event Types
 */
const EVENT_TYPES = {
  MEETING: 'meeting',
  REMINDER: 'reminder',
  TASK: 'task',
  BLOCKED: 'blocked',
  OUT_OF_OFFICE: 'out_of_office',
  TRAVEL: 'travel',
  FOCUS: 'focus',
  BREAK: 'break'
};

/**
 * Event Status
 */
const EVENT_STATUS = {
  CONFIRMED: 'confirmed',
  TENTATIVE: 'tentative',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
};

// ==================== STORAGE ====================

const events = new PersistentMap('events', { serviceName: 'genie-calendar-service' });          // eventId -> event
const reminders = new PersistentMap('reminders', { serviceName: 'genie-calendar-service' });       // reminderId -> reminder
const calendars = new PersistentMap('calendars', { serviceName: 'genie-calendar-service' });       // userId -> calendar config
const recurringEvents = new PersistentMap('recurring-events', { serviceName: 'genie-calendar-service' }); // eventId -> recurring config

// ==================== SAMPLE DATA ====================

const sampleEvents = [
  {
    id: 'evt-001',
    userId: 'user-1',
    title: 'Team Standup',
    description: 'Daily standup meeting',
    type: EVENT_TYPES.MEETING,
    status: EVENT_STATUS.CONFIRMED,
    startTime: '2026-06-18T09:00:00Z',
    endTime: '2026-06-18T09:30:00Z',
    timezone: 'Asia/Kolkata',
    location: 'Zoom',
    attendees: ['rahul@rez.money', 'priya@rez.money'],
    recurrence: null,
    reminders: [15], // minutes before
    linkedMemory: null,
    linkedTwin: 'personal',
    color: '#4F46E5',
    createdAt: '2026-06-17T10:00:00Z',
    updatedAt: '2026-06-17T10:00:00Z'
  },
  {
    id: 'evt-002',
    userId: 'user-1',
    title: 'Product Demo - Rahul',
    description: 'Demo to potential customer',
    type: EVENT_TYPES.MEETING,
    status: EVENT_STATUS.CONFIRMED,
    startTime: '2026-06-18T14:00:00Z',
    endTime: '2026-06-18T15:00:00Z',
    timezone: 'Asia/Kolkata',
    location: 'Google Meet',
    attendees: ['rahul@rez.money', 'customer@example.com'],
    recurrence: null,
    reminders: [30, 60],
    linkedMemory: 'mem-123',
    linkedTwin: 'personal',
    color: '#10B981',
    createdAt: '2026-06-17T11:00:00Z',
    updatedAt: '2026-06-17T11:00:00Z'
  },
  {
    id: 'evt-003',
    userId: 'user-1',
    title: 'Focus Time - Deep Work',
    description: 'Uninterrupted work session',
    type: EVENT_TYPES.FOCUS,
    status: EVENT_STATUS.CONFIRMED,
    startTime: '2026-06-18T10:00:00Z',
    endTime: '2026-06-18T12:00:00Z',
    timezone: 'Asia/Kolkata',
    location: null,
    attendees: [],
    recurrence: { pattern: 'daily', count: 5 },
    reminders: [5],
    linkedTwin: 'productivity',
    color: '#F59E0B',
    createdAt: '2026-06-17T12:00:00Z',
    updatedAt: '2026-06-17T12:00:00Z'
  }
];

sampleEvents.forEach(e => events.set(e.id, e));

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if two events conflict
 */
function hasConflict(event1, event2) {
  const start1 = new Date(event1.startTime);
  const end1 = new Date(event1.endTime);
  const start2 = new Date(event2.startTime);
  const end2 = new Date(event2.endTime);

  return start1 < end2 && end1 > start2;
}

/**
 * Find conflicts for an event
 */
function findConflicts(event, excludeId = null) {
  const conflicts = [];

  events.forEach((e) => {
    if (e.id === excludeId || e.userId !== event.userId) return;
    if (e.status === EVENT_STATUS.CANCELLED) return;

    if (hasConflict(event, e)) {
      conflicts.push({
        eventId: e.id,
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
        type: e.type
      });
    }
  });

  return conflicts;
}

/**
 * Calculate available time slots
 */
function findAvailableSlots(date, duration, userId, buffer = 15) {
  const slots = [];
  const workStart = 9; // 9 AM
  const workEnd = 18; // 6 PM

  const dateStr = format(date, 'yyyy-MM-dd');
  const dayEvents = Array.from(events.values()).filter(e => {
    return e.userId === userId &&
           e.status !== EVENT_STATUS.CANCELLED &&
           format(new Date(e.startTime), 'yyyy-MM-dd') === dateStr;
  }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  let currentTime = new Date(date);
  currentTime.setHours(workStart, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(workEnd, 0, 0, 0);

  while (currentTime < endOfDay) {
    const slotEnd = addMinutes(currentTime, duration);

    if (slotEnd > endOfDay) break;

    // Check if slot conflicts with any event
    const testEvent = {
      startTime: currentTime.toISOString(),
      endTime: slotEnd.toISOString(),
      userId
    };

    const conflicts = dayEvents.filter(e => hasConflict(testEvent, e));

    if (conflicts.length === 0) {
      slots.push({
        start: currentTime.toISOString(),
        end: slotEnd.toISOString(),
        available: true
      });
    }

    currentTime = addMinutes(currentTime, 30); // 30-minute intervals
  }

  return slots;
}

/**
 * Get upcoming events
 */
function getUpcomingEvents(userId, days = 7) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

  return Array.from(events.values())
    .filter(e => {
      if (e.userId !== userId) return false;
      if (e.status === EVENT_STATUS.CANCELLED) return false;

      const eventDate = new Date(e.startTime);
      return eventDate >= now && eventDate <= futureDate;
    })
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
}

/**
 * Generate recurring events
 */
function generateRecurringEvents(baseEvent, recurring) {
  const instances = [];
  const { pattern, count = 10, endDate } = recurring;

  let currentDate = new Date(baseEvent.startTime);
  const duration = differenceInMinutes(
    new Date(baseEvent.endTime),
    new Date(baseEvent.startTime)
  );

  for (let i = 0; i < count; i++) {
    const instance = {
      ...baseEvent,
      id: `${baseEvent.id}-r${i}`,
      startTime: currentDate.toISOString(),
      endTime: addMinutes(currentDate, duration).toISOString(),
      isRecurringInstance: true,
      parentEventId: baseEvent.id
    };

    instances.push(instance);

    // Move to next occurrence
    switch (pattern) {
      case 'daily':
        currentDate = new Date(currentDate.getTime() + (24 * 60 * 60 * 1000));
        break;
      case 'weekly':
        currentDate = new Date(currentDate.getTime() + (7 * 24 * 60 * 60 * 1000));
        break;
      case 'weekdays':
        do {
          currentDate = new Date(currentDate.getTime() + (24 * 60 * 60 * 1000));
        } while (currentDate.getDay() === 0 || currentDate.getDay() === 6);
        break;
      case 'monthly':
        currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
        break;
      default:
        break;
    }

    if (endDate && currentDate > new Date(endDate)) break;
  }

  return instances;
}

// ==================== API ENDPOINTS ====================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'genie-calendar-service',
    version: '1.0.0',
    port: PORT,
    uptime: process.uptime(),
    totalEvents: events.size
  });
});

// Readiness check
app.get('/ready', (req, res) => {
  res.json({ status: 'ready', service: 'genie-calendar-service' });
});

// Service info
app.get('/', (req, res) => {
  res.json({
    service: 'Genie Calendar Service',
    version: '1.0.0',
    description: 'Personal calendar for Genie AI',
    eventTypes: EVENT_TYPES,
    endpoints: {
      events: 'GET/POST /api/events',
      event: 'GET/PUT/DELETE /api/events/:id',
      availability: 'GET /api/availability',
      conflicts: 'GET /api/conflicts',
      today: 'GET /api/events/today',
      upcoming: 'GET /api/events/upcoming',
      search: 'GET /api/events/search',
      types: 'GET /api/types'
    }
  });
});

// ==================== EVENT TYPES ====================

app.get('/api/types', (req, res) => {
  res.json({
    eventTypes: EVENT_TYPES,
    eventStatuses: EVENT_STATUS
  });
});

// ==================== EVENTS CRUD ====================

// Get all events
app.get('/api/events', (req, res) => {
  const { userId, startDate, endDate, type, status, limit = 100 } = req.query;

  let result = Array.from(events.values());

  if (userId) result = result.filter(e => e.userId === userId);
  if (type) result = result.filter(e => e.type === type);
  if (status) result = result.filter(e => e.status === status);

  if (startDate) {
    result = result.filter(e => new Date(e.startTime) >= new Date(startDate));
  }
  if (endDate) {
    result = result.filter(e => new Date(e.endTime) <= new Date(endDate));
  }

  // Sort by start time
  result.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  res.json({
    events: result.slice(0, parseInt(limit)),
    total: result.length
  });
});

// Get today's events
app.get('/api/events/today', (req, res) => {
  const { userId } = req.query;
  const today = format(new Date(), 'yyyy-MM-dd');

  let result = Array.from(events.values()).filter(e => {
    if (userId && e.userId !== userId) return false;
    if (e.status === EVENT_STATUS.CANCELLED) return false;
    return format(new Date(e.startTime), 'yyyy-MM-dd') === today;
  });

  result.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  res.json({
    date: today,
    events: result,
    total: result.length
  });
});

// Get upcoming events
app.get('/api/events/upcoming', (req, res) => {
  const { userId, days = 7 } = req.query;

  const result = getUpcomingEvents(userId || 'user-1', parseInt(days));

  res.json({
    events: result,
    total: result.length,
    days: parseInt(days)
  });
});

// Search events
app.get('/api/events/search', (req, res) => {
  const { q, userId, startDate, endDate, type } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  let result = Array.from(events.values()).filter(e => {
    const searchText = `${e.title} ${e.description || ''}`.toLowerCase();
    if (!searchText.includes(q.toLowerCase())) return false;
    if (userId && e.userId !== userId) return false;
    if (type && e.type !== type) return false;
    if (e.status === EVENT_STATUS.CANCELLED) return false;
    return true;
  });

  res.json({
    query: q,
    events: result,
    total: result.length
  });
});

// Get single event
app.get('/api/events/:id', (req, res) => {
  const event = events.get(req.params.id);

  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  // Include recurring instances if applicable
  let instances = [];
  if (event.recurrence) {
    instances = generateRecurringEvents(event, event.recurrence);
  }

  res.json({
    event,
    recurringInstances: instances
  });
});

// Create event
app.post('/api/events',requireAuth,  (req, res) => {
  const {
    userId,
    title,
    description,
    type = EVENT_TYPES.MEETING,
    startTime,
    endTime,
    timezone = 'Asia/Kolkata',
    location,
    attendees = [],
    recurrence,
    reminders = [15],
    linkedMemory,
    linkedTwin,
    color
  } = req.body;

  // Validation
  if (!title || !startTime || !endTime) {
    return res.status(400).json({ error: 'Title, startTime, and endTime are required' });
  }

  const event = {
    id: `evt-${uuidv4().slice(0, 8)}`,
    userId: userId || 'user-1',
    title,
    description,
    type,
    status: EVENT_STATUS.CONFIRMED,
    startTime,
    endTime,
    timezone,
    location,
    attendees,
    recurrence,
    reminders,
    linkedMemory,
    linkedTwin: linkedTwin || 'personal',
    color: color || '#4F46E5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Check for conflicts
  const conflicts = findConflicts(event);
  if (conflicts.length > 0) {
    event.status = EVENT_STATUS.TENTATIVE;
    event.conflicts = conflicts;
  }

  events.set(event.id, event);

  res.status(201).json({
    event,
    conflicts,
    hasConflicts: conflicts.length > 0
  });
});

// Update event
app.put('/api/events/:id',requireAuth,  (req, res) => {
  const event = events.get(req.params.id);

  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const allowedUpdates = [
    'title', 'description', 'type', 'status', 'startTime', 'endTime',
    'timezone', 'location', 'attendees', 'recurrence', 'reminders', 'color'
  ];

  const updates = {};
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const updatedEvent = {
    ...event,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  // Check for conflicts if time changed
  if (updates.startTime || updates.endTime) {
    const conflicts = findConflicts(updatedEvent, event.id);
    updatedEvent.conflicts = conflicts;
  }

  events.set(event.id, updatedEvent);

  res.json(updatedEvent);
});

// Delete event
app.delete('/api/events/:id',requireAuth,  (req, res) => {
  const event = events.get(req.params.id);

  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  // Soft delete - mark as cancelled
  event.status = EVENT_STATUS.CANCELLED;
  event.updatedAt = new Date().toISOString();
  event.cancelledAt = new Date().toISOString();

  events.set(event.id, event);

  res.json({ success: true, event });
});

// ==================== AVAILABILITY ====================

// Find available time slots
app.get('/api/availability', (req, res) => {
  const { userId, date, duration = 60 } = req.query;

  if (!userId || !date) {
    return res.status(400).json({ error: 'userId and date are required' });
  }

  const slots = findAvailableSlots(
    new Date(date),
    parseInt(duration),
    userId
  );

  res.json({
    userId,
    date,
    duration: parseInt(duration),
    availableSlots: slots,
    totalSlots: slots.length
  });
});

// Find best meeting time
app.post('/api/availability/find',requireAuth,  (req, res) => {
  const { userIds, duration = 60, startDate, endDate, preference = 'morning' } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'userIds array is required' });
  }

  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + (7 * 24 * 60 * 60 * 1000));

  const suggestions = [];
  let currentDate = new Date(start);

  while (currentDate <= end) {
    // Filter by preference
    const hour = preference === 'morning' ? 9 : preference === 'afternoon' ? 14 : 10;

    for (let h = hour; h < hour + 4; h++) {
      const slotStart = new Date(currentDate);
      slotStart.setHours(h, 0, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + (parseInt(duration) * 60 * 1000));

      // Check all users are available
      const allAvailable = userIds.every(userId => {
        const conflicts = Array.from(events.values()).filter(e =>
          e.userId === userId &&
          e.status !== EVENT_STATUS.CANCELLED &&
          hasConflict({ startTime: slotStart.toISOString(), endTime: slotEnd.toISOString() }, e)
        );
        return conflicts.length === 0;
      });

      if (allAvailable) {
        suggestions.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          score: preference === 'morning' && h < 12 ? 10 : 8
        });
      }
    }

    currentDate = new Date(currentDate.getTime() + (24 * 60 * 60 * 1000));
  }

  // Sort by score
  suggestions.sort((a, b) => b.score - a.score);

  res.json({
    suggestions: suggestions.slice(0, 10),
    allUsers: userIds,
    duration
  });
});

// ==================== CONFLICTS ====================

// Check conflicts for a time range
app.post('/api/conflicts',requireAuth,  (req, res) => {
  const { userId, startTime, endTime, excludeEventId } = req.body;

  if (!userId || !startTime || !endTime) {
    return res.status(400).json({ error: 'userId, startTime, and endTime are required' });
  }

  const testEvent = { userId, startTime, endTime };
  const conflicts = findConflicts(testEvent, excludeEventId);

  res.json({
    hasConflicts: conflicts.length > 0,
    conflicts
  });
});

// Get all conflicts for a user
app.get('/api/conflicts/:userId', (req, res) => {
  const { userId } = req.params;
  const { days = 7 } = req.query;

  const futureDate = new Date(Date.now() + (parseInt(days) * 24 * 60 * 60 * 1000));

  const userEvents = Array.from(events.values()).filter(e =>
    e.userId === userId &&
    e.status !== EVENT_STATUS.CANCELLED &&
    new Date(e.startTime) >= new Date() &&
    new Date(e.startTime) <= futureDate
  );

  const conflicts = [];

  for (let i = 0; i < userEvents.length; i++) {
    for (let j = i + 1; j < userEvents.length; j++) {
      if (hasConflict(userEvents[i], userEvents[j])) {
        conflicts.push({
          event1: { id: userEvents[i].id, title: userEvents[i].title },
          event2: { id: userEvents[j].id, title: userEvents[j].title },
          overlap: {
            start: userEvents[i].startTime > userEvents[j].startTime ?
                   userEvents[i].startTime : userEvents[j].startTime,
            end: userEvents[i].endTime < userEvents[j].endTime ?
                 userEvents[i].endTime : userEvents[j].endTime
          }
        });
      }
    }
  }

  res.json({
    userId,
    conflicts,
    total: conflicts.length
  });
});

// ==================== REMINDERS ====================

// Get reminders for an event
app.get('/api/events/:id/reminders', (req, res) => {
  const event = events.get(req.params.id);

  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const reminders_list = event.reminders.map(minutes => ({
    eventId: event.id,
    minutesBefore: minutes,
    remindAt: new Date(new Date(event.startTime).getTime() - (minutes * 60 * 1000)).toISOString(),
    message: `${event.title} starts in ${minutes} minutes`
  }));

  res.json({ reminders: reminders_list });
});

// Add reminder
app.post('/api/events/:id/reminders',requireAuth,  (req, res) => {
  const event = events.get(req.params.id);

  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const { minutesBefore } = req.body;

  if (!event.reminders) event.reminders = [];
  event.reminders.push(minutesBefore);
  event.updatedAt = new Date().toISOString();

  events.set(event.id, event);

  res.json({ success: true, reminders: event.reminders });
});

// ==================== DAY VIEW ====================

// Get day summary
app.get('/api/day/:date', (req, res) => {
  const { userId, date } = req.query;
  const targetDate = req.params.date;

  const dayEvents = Array.from(events.values()).filter(e => {
    if (userId && e.userId !== userId) return false;
    if (e.status === EVENT_STATUS.CANCELLED) return false;
    return format(new Date(e.startTime), 'yyyy-MM-dd') === targetDate;
  });

  // Group by type
  const byType = {};
  dayEvents.forEach(e => {
    if (!byType[e.type]) byType[e.type] = [];
    byType[e.type].push(e);
  });

  // Calculate statistics
  const totalHours = dayEvents.reduce((sum, e) => {
    return sum + differenceInMinutes(new Date(e.endTime), new Date(e.startTime)) / 60;
  }, 0);

  const meetingHours = dayEvents
    .filter(e => e.type === EVENT_TYPES.MEETING)
    .reduce((sum, e) => sum + differenceInMinutes(new Date(e.endTime), new Date(e.startTime)) / 60, 0);

  res.json({
    date: targetDate,
    userId: userId || 'user-1',
    events: dayEvents.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
    total: dayEvents.length,
    statistics: {
      totalHours: Math.round(totalHours * 10) / 10,
      meetingHours: Math.round(meetingHours * 10) / 10,
      freeHours: Math.round((8 - totalHours) * 10) / 10,
      byType: Object.fromEntries(
        Object.entries(byType).map(([k, v]) => [k, v.length])
      )
    }
  });
});

// ==================== WEEK VIEW ====================

// Get week summary
app.get('/api/week', (req, res) => {
  const { userId, startDate } = req.query;
  const start = startDate ? new Date(startDate) : new Date();

  // Get start of week (Monday)
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(start.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);

  const weekData = [];

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(weekStart.getTime() + (i * 24 * 60 * 60 * 1000));
    const dateStr = format(dayDate, 'yyyy-MM-dd');

    const dayEvents = Array.from(events.values()).filter(e => {
      if (userId && e.userId !== userId) return false;
      if (e.status === EVENT_STATUS.CANCELLED) return false;
      return format(new Date(e.startTime), 'yyyy-MM-dd') === dateStr;
    });

    weekData.push({
      date: dateStr,
      dayName: format(dayDate, 'EEEE'),
      events: dayEvents,
      total: dayEvents.length
    });
  }

  // Calculate week statistics
  const allEvents = weekData.flatMap(d => d.events);
  const totalHours = allEvents.reduce((sum, e) =>
    sum + differenceInMinutes(new Date(e.endTime), new Date(e.startTime)) / 60, 0);

  res.json({
    weekStart: format(weekStart, 'yyyy-MM-dd'),
    weekEnd: format(new Date(weekStart.getTime() + (6 * 24 * 60 * 60 * 1000)), 'yyyy-MM-dd'),
    days: weekData,
    statistics: {
      totalEvents: allEvents.length,
      totalHours: Math.round(totalHours * 10) / 10,
      avgEventsPerDay: Math.round(allEvents.length / 7 * 10) / 10
    }
  });
});

// ==================== GENIE AI INTEGRATION ====================

// Get context for AI
app.get('/api/context', (req, res) => {
  const { userId } = req.query;
  const now = new Date();

  const upcoming = getUpcomingEvents(userId || 'user-1', 3);
  const todayEvents = Array.from(events.values()).filter(e => {
    if (userId && e.userId !== userId) return false;
    if (e.status === EVENT_STATUS.CANCELLED) return false;
    return format(new Date(e.startTime), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
  });

  const nextEvent = upcoming[0];
  const currentEvent = todayEvents.find(e =>
    new Date(e.startTime) <= now && new Date(e.endTime) >= now
  );

  res.json({
    timestamp: now.toISOString(),
    nextEvent: nextEvent ? {
      title: nextEvent.title,
      startsIn: Math.round((new Date(nextEvent.startTime) - now) / 60000),
      attendees: nextEvent.attendees.length
    } : null,
    currentEvent: currentEvent ? {
      title: currentEvent.title,
      endsIn: Math.round((new Date(currentEvent.endTime) - now) / 60000)
    } : null,
    todayCount: todayEvents.length,
    todayHours: todayEvents.reduce((sum, e) =>
      sum + differenceInMinutes(new Date(e.endTime), new Date(e.startTime)) / 60, 0)
  });
});

// Natural language scheduling
app.post('/api/schedule',requireAuth,  (req, res) => {
  const { userId, title, description, duration = 60, preference } = req.body;

  // Find best time based on preference
  const now = new Date();
  const suggestions = [];

  for (let day = 0; day < 7; day++) {
    const date = new Date(now.getTime() + (day * 24 * 60 * 60 * 1000));
    const slots = findAvailableSlots(date, duration, userId || 'user-1');

    // Filter by preference
    const filtered = slots.filter(s => {
      const hour = new Date(s.start).getHours();
      if (preference === 'morning') return hour >= 9 && hour < 12;
      if (preference === 'afternoon') return hour >= 14 && hour < 17;
      return true;
    });

    suggestions.push(...filtered.slice(0, 2).map(s => ({
      ...s,
      day: format(date, 'EEEE'),
      date: format(date, 'yyyy-MM-dd')
    })));
  }

  res.json({
    title,
    duration,
    preference: preference || 'any',
    suggestions: suggestions.slice(0, 5)
  });
});

// ==================== STATISTICS ====================

app.get('/api/statistics', (req, res) => {
  const { userId } = req.query;

  const userEvents = Array.from(events.values()).filter(e =>
    userId ? e.userId === userId : true
  );

  const now = new Date();
  const thisMonth = userEvents.filter(e => {
    const d = new Date(e.startTime);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const typeStats = {};
  userEvents.forEach(e => {
    typeStats[e.type] = (typeStats[e.type] || 0) + 1;
  });

  res.json({
    totalEvents: userEvents.length,
    thisMonth: thisMonth.length,
    byType: typeStats,
    statusBreakdown: {
      confirmed: userEvents.filter(e => e.status === EVENT_STATUS.CONFIRMED).length,
      tentative: userEvents.filter(e => e.status === EVENT_STATUS.TENTATIVE).length,
      cancelled: userEvents.filter(e => e.status === EVENT_STATUS.CANCELLED).length
    }
  });
});

// ==================== ERROR HANDLING ====================

// Install readiness routes (LLM + DB + combined readiness) BEFORE the catch-all 404
// so /api/llm-health, /api/db-health, /api/readiness are not intercepted as 404s.
installReadinessRoutes(app, { serviceName: 'genie-calendar-service' });

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// ==================== SERVER STARTUP ====================

// Seed additional stores (events are already seeded by the inline sampleEvents block)
const calendarSeedPlans = [
  {
    store: calendars,
    items: normalizeSeedData([
      { id: 'demo-user', name: 'Demo User Calendar', defaultView: 'week', workStart: '09:00', workEnd: '18:00', timezone: 'Asia/Kolkata', color: '#4F46E5' },
      { id: 'demo-user-2', name: 'Second User Calendar', defaultView: 'day', workStart: '10:00', workEnd: '19:00', timezone: 'Asia/Kolkata', color: '#10B981' },
    ]),
  },
  {
    store: recurringEvents,
    items: normalizeSeedData([
      { id: 'rec-daily-standup', baseEventId: 'evt-001', pattern: 'daily', count: 30, createdBy: 'demo-user' },
      { id: 'rec-weekly-review', baseEventId: 'evt-002', pattern: 'weekly', count: 12, createdBy: 'demo-user' },
      { id: 'rec-focus-block', baseEventId: 'evt-003', pattern: 'weekdays', count: 20, createdBy: 'demo-user' },
    ]),
  },
];
const calSeeded = autoSeed(calendarSeedPlans, { serviceName: 'genie-calendar-service' });
if (calSeeded) console.log('[genie-calendar-service] demo data seeded');

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              Genie Calendar Service                          ║
╠═══════════════════════════════════════════════════════════════╣
║  Port:     ${PORT}                                                ║
║  Status:   Running                                              ║
║  Version:  1.0.0                                                ║
║                                                               ║
║  Features:                                                     ║
║  ├── Event CRUD with conflict detection                       ║
║  ├── Availability finder                                      ║
║  ├── Multi-user meeting scheduling                            ║
║  ├── Day/Week views                                           ║
║  ├── Natural language scheduling                              ║
║  ├── Recurring events                                         ║
║  └── Genie AI context integration                             ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

module.exports = app;
