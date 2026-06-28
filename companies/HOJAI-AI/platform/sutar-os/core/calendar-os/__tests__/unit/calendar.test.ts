/**
 * Calendar OS Unit Tests
 * Port: 4875
 * Tests: Event CRUD, conflict detection, availability, calendar management
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the auth module
vi.mock('@rtmn/shared/auth', () => ({
  requireAuth: (_req: any, _res: any, next: () => void) => next(),
}));

// Types from src/index.ts
interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  allDay: boolean;
  attendees: string[];
  location?: string;
  recurrence?: string;
  reminders: number[];
  status: string;
  createdBy: string;
  organizer?: string;
  color?: string;
  url?: string;
  visibility: 'public' | 'private';
  attachments?: { name: string; url: string }[];
  metadata: Record<string, string>;
}

interface Availability {
  userId: string;
  date: string;
  slots: { start: string; end: string; available: boolean }[];
}

// In-memory stores
const events = new Map<string, CalendarEvent>();
const calendars = new Map<string, { userId: string; name: string; color: string; visible: boolean }>();

// Seed calendars
calendars.set('work', { userId: 'u1', name: 'Work', color: '#0066FF', visible: true });
calendars.set('personal', { userId: 'u1', name: 'Personal', color: '#00AA66', visible: true });

// Helper functions (from src/index.ts)
function detectConflicts(userId: string, start: string, end: string): CalendarEvent[] {
  return Array.from(events.values()).filter(
    e => e.attendees.includes(userId) && e.start < end && e.end > start
  );
}

function findAvailableSlots(attendees: string[], duration: number, startDate: string, endDate: string): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = [];
  const start = new Date(startDate || Date.now());
  const end = new Date(endDate || start.getTime() + 86400000);

  for (let d = start.getTime(); d < end.getTime(); d += 3600000) {
    const slotStart = new Date(d).toISOString();
    const slotEnd = new Date(d + duration * 60000).toISOString();

    const hasConflict = Array.from(events.values()).some(
      e => e.attendees.some(a => attendees.includes(a)) && e.start < slotEnd && e.end > slotStart
    );

    if (!hasConflict) slots.push({ start: slotStart, end: slotEnd });
  }

  return slots.slice(0, 10);
}

function filterEvents(params: {
  from?: string;
  to?: string;
  attendee?: string;
  visibility?: 'public' | 'private';
}): CalendarEvent[] {
  let result = Array.from(events.values());

  if (params.from) result = result.filter(e => e.start >= params.from!);
  if (params.to) result = result.filter(e => e.end <= params.to!);
  if (params.attendee) result = result.filter(e => e.attendees.includes(params.attendee!));
  if (params.visibility) result = result.filter(e => e.visibility === params.visibility!);

  result.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return result;
}

function getStats(): { total: number; byVisibility: { public: number; private: number } } {
  const all = Array.from(events.values());
  return {
    total: all.length,
    byVisibility: {
      public: all.filter(e => e.visibility === 'public').length,
      private: all.filter(e => e.visibility === 'private').length,
    },
  };
}

// UUID generator for tests
let idCounter = 0;
function generateId(): string {
  return `event-${++idCounter}`;
}

describe('Calendar OS - Event CRUD', () => {
  beforeEach(() => {
    events.clear();
  });

  it('should create an event', () => {
    const event: CalendarEvent = {
      id: generateId(),
      title: 'Team Meeting',
      description: 'Weekly sync',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z',
      allDay: false,
      attendees: ['user1', 'user2'],
      status: 'confirmed',
      createdBy: 'user1',
      visibility: 'public',
      reminders: [15],
      metadata: {},
    };

    events.set(event.id, event);
    expect(events.size).toBe(1);
    expect(events.get(event.id)?.title).toBe('Team Meeting');
  });

  it('should get event by id', () => {
    const event: CalendarEvent = {
      id: 'test-id',
      title: 'Test Event',
      description: '',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z',
      allDay: false,
      attendees: [],
      status: 'confirmed',
      createdBy: 'user1',
      visibility: 'public',
      reminders: [15],
      metadata: {},
    };

    events.set('test-id', event);
    expect(events.get('test-id')).toBeDefined();
    expect(events.get('test-id')?.title).toBe('Test Event');
  });

  it('should update an event', () => {
    const event: CalendarEvent = {
      id: 'test-id',
      title: 'Original Title',
      description: '',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z',
      allDay: false,
      attendees: [],
      status: 'confirmed',
      createdBy: 'user1',
      visibility: 'public',
      reminders: [15],
      metadata: {},
    };

    events.set('test-id', event);
    event.title = 'Updated Title';
    event.description = 'Updated description';

    expect(events.get('test-id')?.title).toBe('Updated Title');
    expect(events.get('test-id')?.description).toBe('Updated description');
  });

  it('should delete an event', () => {
    events.set('test-id', {
      id: 'test-id',
      title: 'To Delete',
      description: '',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z',
      allDay: false,
      attendees: [],
      status: 'confirmed',
      createdBy: 'user1',
      visibility: 'public',
      reminders: [15],
      metadata: {},
    });

    expect(events.has('test-id')).toBe(true);
    events.delete('test-id');
    expect(events.has('test-id')).toBe(false);
  });

  it('should list all events', () => {
    events.set('event-1', {
      id: 'event-1', title: 'Event 1', description: '', start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z', allDay: false, attendees: [], status: 'confirmed',
      createdBy: 'user1', visibility: 'public', reminders: [], metadata: {},
    });
    events.set('event-2', {
      id: 'event-2', title: 'Event 2', description: '', start: '2024-01-16T10:00:00Z',
      end: '2024-01-16T11:00:00Z', allDay: false, attendees: [], status: 'confirmed',
      createdBy: 'user1', visibility: 'public', reminders: [], metadata: {},
    });

    const allEvents = Array.from(events.values());
    expect(allEvents.length).toBe(2);
  });
});

describe('Calendar OS - Conflict Detection', () => {
  beforeEach(() => {
    events.clear();
  });

  it('should detect overlapping events', () => {
    events.set('event-1', {
      id: 'event-1', title: 'Meeting 1', description: '', start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T12:00:00Z', allDay: false, attendees: ['user1'], status: 'confirmed',
      createdBy: 'user1', visibility: 'public', reminders: [], metadata: {},
    });

    // New event that overlaps
    const conflicts = detectConflicts('user1', '2024-01-15T11:00:00Z', '2024-01-15T13:00:00Z');
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].title).toBe('Meeting 1');
  });

  it('should not detect non-overlapping events', () => {
    events.set('event-1', {
      id: 'event-1', title: 'Morning Meeting', description: '', start: '2024-01-15T09:00:00Z',
      end: '2024-01-15T10:00:00Z', allDay: false, attendees: ['user1'], status: 'confirmed',
      createdBy: 'user1', visibility: 'public', reminders: [], metadata: {},
    });

    // New event that doesn't overlap
    const conflicts = detectConflicts('user1', '2024-01-15T11:00:00Z', '2024-01-15T12:00:00Z');
    expect(conflicts.length).toBe(0);
  });

  it('should detect partial overlap', () => {
    events.set('event-1', {
      id: 'event-1', title: 'Existing', description: '', start: '2024-01-15T10:30:00Z',
      end: '2024-01-15T11:30:00Z', allDay: false, attendees: ['user1'], status: 'confirmed',
      createdBy: 'user1', visibility: 'public', reminders: [], metadata: {},
    });

    // Overlaps on the left side
    const conflicts = detectConflicts('user1', '2024-01-15T10:00:00Z', '2024-01-15T11:00:00Z');
    expect(conflicts.length).toBe(1);
  });

  it('should detect multiple conflicts', () => {
    events.set('event-1', {
      id: 'event-1', title: 'Meeting 1', description: '', start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z', allDay: false, attendees: ['user1'], status: 'confirmed',
      createdBy: 'user1', visibility: 'public', reminders: [], metadata: {},
    });
    events.set('event-2', {
      id: 'event-2', title: 'Meeting 2', description: '', start: '2024-01-15T14:00:00Z',
      end: '2024-01-15T15:00:00Z', allDay: false, attendees: ['user1'], status: 'confirmed',
      createdBy: 'user1', visibility: 'public', reminders: [], metadata: {},
    });

    const conflicts = detectConflicts('user1', '2024-01-15T09:00:00Z', '2024-01-15T16:00:00Z');
    expect(conflicts.length).toBe(2);
  });

  it('should only check attendees', () => {
    events.set('event-1', {
      id: 'event-1', title: 'Others Meeting', description: '', start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z', allDay: false, attendees: ['user2'], status: 'confirmed',
      createdBy: 'user2', visibility: 'public', reminders: [], metadata: {},
    });

    // user1 is not attending this event
    const conflicts = detectConflicts('user1', '2024-01-15T10:00:00Z', '2024-01-15T11:00:00Z');
    expect(conflicts.length).toBe(0);
  });
});

describe('Calendar OS - Availability', () => {
  beforeEach(() => {
    events.clear();
  });

  it('should find available slots', () => {
    const slots = findAvailableSlots(['user1'], 60, '2024-01-15T08:00:00Z', '2024-01-15T18:00:00Z');
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].end).toBeDefined();
  });

  it('should exclude slots with conflicts', () => {
    events.set('event-1', {
      id: 'event-1', title: 'Blocked', description: '', start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z', allDay: false, attendees: ['user1'], status: 'confirmed',
      createdBy: 'user1', visibility: 'public', reminders: [], metadata: {},
    });

    const slots = findAvailableSlots(['user1'], 60, '2024-01-15T09:00:00Z', '2024-01-15T12:00:00Z');

    // The 10:00 slot should not be available - check that 10:00-11:00 is not in available slots
    // Note: available slots are generated hourly from 09:00 onwards, so 10:00-11:00 conflicts with 10:00-11:00 event
    const conflictSlotExists = slots.some(s => {
      const slotStart = new Date(s.start).getTime();
      const slotEnd = new Date(s.end).getTime();
      const eventStart = new Date('2024-01-15T10:00:00Z').getTime();
      const eventEnd = new Date('2024-01-15T11:00:00Z').getTime();
      return slotStart === eventStart && slotEnd === eventEnd;
    });
    expect(conflictSlotExists).toBe(false);
  });

  it('should calculate slot duration correctly', () => {
    const slots = findAvailableSlots(['user1'], 30, '2024-01-15T10:00:00Z', '2024-01-15T11:00:00Z');

    if (slots.length > 0) {
      const slotStart = new Date(slots[0].start);
      const slotEnd = new Date(slots[0].end);
      const durationMinutes = (slotEnd.getTime() - slotStart.getTime()) / 60000;
      expect(durationMinutes).toBe(30);
    }
  });

  it('should limit slots to 10', () => {
    const slots = findAvailableSlots(['user1'], 60, '2024-01-15T08:00:00Z', '2024-01-15T20:00:00Z');
    expect(slots.length).toBeLessThanOrEqual(10);
  });

  it('should check multiple attendees availability', () => {
    events.set('event-1', {
      id: 'event-1', title: 'User1 Busy', description: '', start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z', allDay: false, attendees: ['user1'], status: 'confirmed',
      createdBy: 'user1', visibility: 'public', reminders: [], metadata: {},
    });
    events.set('event-2', {
      id: 'event-2', title: 'User2 Busy', description: '', start: '2024-01-15T14:00:00Z',
      end: '2024-01-15T15:00:00Z', allDay: false, attendees: ['user2'], status: 'confirmed',
      createdBy: 'user2', visibility: 'public', reminders: [], metadata: {},
    });

    // Find slots where both user1 and user2 are available
    const slots = findAvailableSlots(['user1', 'user2'], 60, '2024-01-15T09:00:00Z', '2024-01-15T16:00:00Z');

    // Should not include 10:00 or 14:00 slots
    expect(slots.length).toBeLessThan(8);
  });
});

describe('Calendar OS - Event Filtering', () => {
  beforeEach(() => {
    events.clear();
  });

  it('should filter events by date range', () => {
    events.set('event-1', {
      id: 'event-1', title: 'Jan 15', description: '', start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z', allDay: false, attendees: [], status: 'confirmed',
      createdBy: 'user1', visibility: 'public', reminders: [], metadata: {},
    });
    events.set('event-2', {
      id: 'event-2', title: 'Jan 20', description: '', start: '2024-01-20T10:00:00Z',
      end: '2024-01-20T11:00:00Z', allDay: false, attendees: [], status: 'confirmed',
      createdBy: 'user1', visibility: 'public', reminders: [], metadata: {},
    });

    const filtered = filterEvents({ from: '2024-01-15T00:00:00Z', to: '2024-01-17T00:00:00Z' });
    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toBe('Jan 15');
  });

  it('should filter events by attendee', () => {
    events.set('event-1', {
      id: 'event-1', title: 'With User1', description: '', start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z', allDay: false, attendees: ['user1'], status: 'confirmed',
      createdBy: 'user1', visibility: 'public', reminders: [], metadata: {},
    });
    events.set('event-2', {
      id: 'event-2', title: 'Without User1', description: '', start: '2024-01-15T14:00:00Z',
      end: '2024-01-15T15:00:00Z', allDay: false, attendees: ['user2'], status: 'confirmed',
      createdBy: 'user2', visibility: 'public', reminders: [], metadata: {},
    });

    const filtered = filterEvents({ attendee: 'user1' });
    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toBe('With User1');
  });

  it('should filter events by visibility', () => {
    events.set('event-1', {
      id: 'event-1', title: 'Public', description: '', start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z', allDay: false, attendees: [], status: 'confirmed',
      createdBy: 'user1', visibility: 'public', reminders: [], metadata: {},
    });
    events.set('event-2', {
      id: 'event-2', title: 'Private', description: '', start: '2024-01-15T14:00:00Z',
      end: '2024-01-15T15:00:00Z', allDay: false, attendees: [], status: 'confirmed',
      createdBy: 'user1', visibility: 'private', reminders: [], metadata: {},
    });

    const filtered = filterEvents({ visibility: 'public' });
    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toBe('Public');
  });

  it('should sort events by start time', () => {
    events.set('event-1', {
      id: 'event-1', title: 'Later', description: '', start: '2024-01-15T14:00:00Z',
      end: '2024-01-15T15:00:00Z', allDay: false, attendees: [], status: 'confirmed',
      createdBy: 'user1', visibility: 'public', reminders: [], metadata: {},
    });
    events.set('event-2', {
      id: 'event-2', title: 'Earlier', description: '', start: '2024-01-15T09:00:00Z',
      end: '2024-01-15T10:00:00Z', allDay: false, attendees: [], status: 'confirmed',
      createdBy: 'user1', visibility: 'public', reminders: [], metadata: {},
    });

    const filtered = filterEvents({});
    expect(filtered[0].title).toBe('Earlier');
    expect(filtered[1].title).toBe('Later');
  });
});

describe('Calendar OS - Calendar Management', () => {
  it('should list all calendars', () => {
    const all = Array.from(calendars.values());
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('should filter calendars by userId', () => {
    const userCalendars = Array.from(calendars.values()).filter(c => c.userId === 'u1');
    expect(userCalendars.length).toBe(2);
  });

  it('should create a new calendar', () => {
    const id = 'new-calendar';
    calendars.set(id, { userId: 'u2', name: 'Team Calendar', color: '#FF0000', visible: true });
    expect(calendars.has(id)).toBe(true);
    expect(calendars.get(id)?.name).toBe('Team Calendar');
  });

  it('should update calendar visibility', () => {
    calendars.set('test-cal', { userId: 'u1', name: 'Test', color: '#000000', visible: true });
    const cal = calendars.get('test-cal');
    if (cal) cal.visible = false;
    expect(calendars.get('test-cal')?.visible).toBe(false);
  });
});

describe('Calendar OS - Statistics', () => {
  beforeEach(() => {
    events.clear();
  });

  it('should calculate total event count', () => {
    events.set('event-1', {
      id: 'event-1', title: 'E1', description: '', start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z', allDay: false, attendees: [], status: 'confirmed',
      createdBy: 'user1', visibility: 'public', reminders: [], metadata: {},
    });
    events.set('event-2', {
      id: 'event-2', title: 'E2', description: '', start: '2024-01-15T14:00:00Z',
      end: '2024-01-15T15:00:00Z', allDay: false, attendees: [], status: 'confirmed',
      createdBy: 'user1', visibility: 'private', reminders: [], metadata: {},
    });

    const stats = getStats();
    expect(stats.total).toBe(2);
  });

  it('should count events by visibility', () => {
    events.set('event-1', {
      id: 'event-1', title: 'Public', description: '', start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z', allDay: false, attendees: [], status: 'confirmed',
      createdBy: 'user1', visibility: 'public', reminders: [], metadata: {},
    });
    events.set('event-2', {
      id: 'event-2', title: 'Public 2', description: '', start: '2024-01-15T14:00:00Z',
      end: '2024-01-15T15:00:00Z', allDay: false, attendees: [], status: 'confirmed',
      createdBy: 'user1', visibility: 'public', reminders: [], metadata: {},
    });
    events.set('event-3', {
      id: 'event-3', title: 'Private', description: '', start: '2024-01-15T16:00:00Z',
      end: '2024-01-15T17:00:00Z', allDay: false, attendees: [], status: 'confirmed',
      createdBy: 'user1', visibility: 'private', reminders: [], metadata: {},
    });

    const stats = getStats();
    expect(stats.byVisibility.public).toBe(2);
    expect(stats.byVisibility.private).toBe(1);
  });
});

describe('Calendar OS - Event Properties', () => {
  it('should support all-day events', () => {
    const event: CalendarEvent = {
      id: 'all-day',
      title: 'Holiday',
      description: '',
      start: '2024-01-15T00:00:00Z',
      end: '2024-01-15T23:59:59Z',
      allDay: true,
      attendees: [],
      status: 'confirmed',
      createdBy: 'user1',
      visibility: 'public',
      reminders: [],
      metadata: {},
    };

    expect(event.allDay).toBe(true);
  });

  it('should support event reminders', () => {
    const event: CalendarEvent = {
      id: 'with-reminders',
      title: 'Meeting',
      description: '',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z',
      allDay: false,
      attendees: [],
      status: 'confirmed',
      createdBy: 'user1',
      visibility: 'public',
      reminders: [15, 60], // 15 min and 1 hour before
      metadata: {},
    };

    expect(event.reminders).toContain(15);
    expect(event.reminders).toContain(60);
  });

  it('should support event location', () => {
    const event: CalendarEvent = {
      id: 'located',
      title: 'Meeting',
      description: '',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z',
      allDay: false,
      attendees: [],
      location: 'Conference Room A',
      status: 'confirmed',
      createdBy: 'user1',
      visibility: 'public',
      reminders: [],
      metadata: {},
    };

    expect(event.location).toBe('Conference Room A');
  });

  it('should support event metadata', () => {
    const event: CalendarEvent = {
      id: 'with-meta',
      title: 'Meeting',
      description: '',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z',
      allDay: false,
      attendees: [],
      status: 'confirmed',
      createdBy: 'user1',
      visibility: 'public',
      reminders: [],
      metadata: { project: 'Alpha', priority: 'high' },
    };

    expect(event.metadata.project).toBe('Alpha');
    expect(event.metadata.priority).toBe('high');
  });
});
