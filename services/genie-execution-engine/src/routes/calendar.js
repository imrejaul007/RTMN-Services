const express = require('express');
const router = express.Router();

// In-memory calendar storage
const events = new Map();
const schedules = new Map();

// Event types
const eventTypes = [
  { id: 'meeting', name: 'Meeting', icon: '📅', color: '#3498DB' },
  { id: 'task', name: 'Task Due', icon: '✅', color: '#E74C3C' },
  { id: 'reminder', name: 'Reminder', icon: '⏰', color: '#F39C12' },
  { id: 'appointment', name: 'Appointment', icon: '🏥', color: '#9B59B6' },
  { id: 'deadline', name: 'Deadline', icon: '⚠️', color: '#E74C3C' },
  { id: 'event', name: 'Event', icon: '🎉', color: '#1ABC9C' }
];

// Create event
router.post('/', (req, res) => {
  const { userId, title, description, start, end, type, attendees, location, recurrence, reminders } = req.body;

  if (!userId || !title || !start) {
    return res.status(400).json({
      success: false,
      error: 'userId, title, and start are required'
    });
  }

  const event = {
    id: `event-${Date.now()}`,
    userId,
    title,
    description: description || '',
    start,
    end: end || start,
    type: type || 'event',
    attendees: attendees || [],
    location: location || '',
    recurrence: recurrence || null,
    reminders: reminders || [{ type: 'notification', minutes: 15 }],
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!events.has(userId)) {
    events.set(userId, []);
  }
  events.get(userId).push(event);

  res.json({
    success: true,
    message: 'Event created',
    data: {
      event,
      conflicts: checkConflicts(userId, event)
    }
  });
});

// Get events
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  const { start, end, type, view } = req.query;

  let userEvents = events.get(userId) || [];

  // Filter by date range
  if (start && end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    userEvents = userEvents.filter(e => {
      const eventStart = new Date(e.start);
      return eventStart >= startDate && eventStart <= endDate;
    });
  }

  // Filter by type
  if (type) {
    userEvents = userEvents.filter(e => e.type === type);
  }

  // Sort by start time
  userEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

  // Group by date for calendar view
  if (view === 'calendar') {
    const grouped = {};
    userEvents.forEach(e => {
      const date = new Date(e.start).toDateString();
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(e);
    });
    return res.json({
      success: true,
      data: {
        events: userEvents,
        byDate: grouped
      }
    });
  }

  res.json({
    success: true,
    data: {
      events: userEvents,
      count: userEvents.length
    }
  });
});

// Get day view
router.get('/:userId/day', (req, res) => {
  const { userId } = req.params;
  const { date } = req.query;

  const targetDate = new Date(date || new Date());
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  let userEvents = (events.get(userId) || []).filter(e => {
    const eventStart = new Date(e.start);
    return eventStart >= dayStart && eventStart <= dayEnd;
  });

  userEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

  // Generate time slots
  const timeSlots = [];
  for (let h = 0; h < 24; h++) {
    timeSlots.push({
      hour: h,
      events: userEvents.filter(e => new Date(e.start).getHours() === h)
    });
  }

  res.json({
    success: true,
    data: {
      date: targetDate.toISOString().split('T')[0],
      events: userEvents,
      timeSlots,
      summary: {
        totalEvents: userEvents.length,
        meetingHours: userEvents.filter(e => e.type === 'meeting').length,
        freeHours: 24 - userEvents.reduce((sum, e) => {
          const duration = (new Date(e.end) - new Date(e.start)) / (1000 * 60 * 60);
          return sum + duration;
        }, 0)
      }
    }
  });
});

// Update event
router.put('/:eventId', (req, res) => {
  const { eventId } = req.params;
  const updates = req.body;

  let event = null;
  for (const userEvents of events.values()) {
    const found = userEvents.find(e => e.id === eventId);
    if (found) {
      event = found;
      break;
    }
  }

  if (!event) {
    return res.status(404).json({
      success: false,
      error: 'Event not found'
    });
  }

  const allowedUpdates = ['title', 'description', 'start', 'end', 'type', 'attendees', 'location', 'recurrence', 'reminders', 'status'];
  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
      event[field] = updates[field];
    }
  });
  event.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'Event updated',
    data: {
      event,
      conflicts: checkConflicts(event.userId, event)
    }
  });
});

// Delete event
router.delete('/:eventId', (req, res) => {
  const { eventId } = req.params;

  for (const [userId, userEvents] of events.entries()) {
    const index = userEvents.findIndex(e => e.id === eventId);
    if (index !== -1) {
      userEvents.splice(index, 1);
      res.json({ success: true, message: 'Event deleted' });
      return;
    }
  }

  res.status(404).json({ success: false, error: 'Event not found' });
});

// Check availability
router.post('/:userId/availability', (req, res) => {
  const { userId } = req.params;
  const { start, end, duration } = req.body;

  if (!start || !end) {
    return res.status(400).json({
      success: false,
      error: 'start and end are required'
    });
  }

  const userEvents = events.get(userId) || [];
  const busySlots = userEvents
    .filter(e => e.status !== 'cancelled')
    .filter(e => {
      const eventStart = new Date(e.start);
      const eventEnd = new Date(e.end);
      const rangeStart = new Date(start);
      const rangeEnd = new Date(end);
      return eventStart < rangeEnd && eventEnd > rangeStart;
    })
    .map(e => ({ start: e.start, end: e.end, title: e.title }));

  // Find free slots
  const freeSlots = findFreeSlots(new Date(start), new Date(end), busySlots, duration || 30);

  res.json({
    success: true,
    data: {
      busySlots,
      freeSlots,
      availability: freeSlots.length > 0 ? 'available' : 'no-free-slots'
    }
  });
});

// Create recurring event
router.post('/:userId/recurring', (req, res) => {
  const { userId } = req.params;
  const { title, description, startTime, duration, recurrence, endDate } = req.body;

  if (!title || !startTime || !recurrence) {
    return res.status(400).json({
      success: false,
      error: 'title, startTime, and recurrence are required'
    });
  }

  const recurringEvents = generateRecurringEvents(userId, title, description, startTime, duration, recurrence, endDate);

  if (!events.has(userId)) {
    events.set(userId, []);
  }
  events.get(userId).push(...recurringEvents);

  res.json({
    success: true,
    message: `${recurringEvents.length} recurring events created`,
    data: {
      events: recurringEvents,
      recurrence,
      nextEvents: recurringEvents.slice(0, 5)
    }
  });
});

// Get event types
router.get('/types/all', (req, res) => {
  res.json({
    success: true,
    data: eventTypes
  });
});

// Helper functions
function checkConflicts(userId, event) {
  const userEvents = events.get(userId) || [];
  return userEvents.filter(e => {
    if (e.id === event.id || e.status === 'cancelled') return false;
    const eStart = new Date(e.start);
    const eEnd = new Date(e.end);
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return eStart < eventEnd && eEnd > eventStart;
  });
}

function findFreeSlots(start, end, busySlots, duration) {
  const freeSlots = [];
  const durationMs = duration * 60 * 1000;

  let current = new Date(start);

  while (current + durationMs <= end) {
    const slotEnd = new Date(current.getTime() + durationMs);
    const isFree = !busySlots.some(busy => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      return current < busyEnd && slotEnd > busyStart;
    });

    if (isFree) {
      freeSlots.push({ start: current.toISOString(), end: slotEnd.toISOString() });
    }

    current = new Date(current.getTime() + 30 * 60 * 1000); // Check every 30 min
  }

  return freeSlots.slice(0, 10); // Return max 10 slots
}

function generateRecurringEvents(userId, title, description, startTime, duration, recurrence, endDate) {
  const events = [];
  const maxEvents = 52; // 1 year of weekly
  const end = endDate ? new Date(endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  let current = new Date(startTime);
  let count = 0;

  while (current <= end && count < maxEvents) {
    const eventEnd = new Date(current.getTime() + (duration || 60) * 60 * 1000);

    events.push({
      id: `event-${Date.now()}-${count}`,
      userId,
      title,
      description: description || '',
      start: current.toISOString(),
      end: eventEnd.toISOString(),
      type: 'event',
      recurrence: recurrence.type,
      parentId: `parent-${Date.now()}`,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    });

    // Calculate next occurrence
    switch (recurrence.type || recurrence) {
      case 'daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'biweekly':
        current.setDate(current.getDate() + 14);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
      default:
        current.setDate(current.getDate() + 7);
    }

    count++;
  }

  return events;
}

module.exports = router;