import { describe, it, expect } from 'vitest';

// Calendar Connector Constants
const EVENT_TYPES = ['meeting', 'appointment', 'reminder', 'task', 'out_of_office'];

describe('Calendar Connector', () => {
  describe('Event Types', () => {
    it('should have all event types', () => {
      expect(EVENT_TYPES).toContain('meeting');
      expect(EVENT_TYPES).toContain('appointment');
      expect(EVENT_TYPES).toContain('reminder');
    });
  });

  describe('Event Validation', () => {
    const validateEvent = (event: {
      title?: string;
      start?: string;
      end?: string;
      attendees?: string[];
      organizer?: string;
      location?: string;
      recurring?: boolean;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!event.title) errors.push('title is required');
      if (!event.start) errors.push('start is required');
      if (event.start && isNaN(Date.parse(event.start))) {
        errors.push('invalid start date');
      }
      if (event.end && event.start && new Date(event.end) < new Date(event.start)) {
        errors.push('end must be after start');
      }
      if (event.attendees && !Array.isArray(event.attendees)) {
        errors.push('attendees must be an array');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct event', () => {
      const result = validateEvent({
        title: 'Team Meeting',
        start: '2026-06-27T10:00:00Z',
        end: '2026-06-27T11:00:00Z',
        attendees: ['user1@example.com', 'user2@example.com'],
        organizer: 'organizer@example.com',
        location: 'Conference Room A',
        recurring: false
      });
      expect(result.valid).toBe(true);
    });

    it('should require title and start', () => {
      const result = validateEvent({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('title is required');
      expect(result.errors).toContain('start is required');
    });

    it('should reject invalid start date', () => {
      const result = validateEvent({ title: 'Test', start: 'not-a-date' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('invalid start date');
    });
  });

  describe('Event Filtering', () => {
    const filterEvents = (
      events: Array<{ start: string; end: string; title: string }>,
      filters: { start?: string; end?: string }
    ) => {
      let filtered = [...events];

      if (filters.start) filtered = filtered.filter(e => e.start >= filters.start!);
      if (filters.end) filtered = filtered.filter(e => e.end <= filters.end!);

      return filtered;
    };

    it('should filter by start date', () => {
      const events = [
        { start: '2026-06-25T10:00:00Z', end: '2026-06-25T11:00:00Z', title: 'Past' },
        { start: '2026-06-28T10:00:00Z', end: '2026-06-28T11:00:00Z', title: 'Future' }
      ];
      const results = filterEvents(events, { start: '2026-06-27T00:00:00Z' });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Future');
    });
  });

  describe('Conflict Detection', () => {
    const hasConflict = (
      events: Array<{ start: string; end: string; title: string }>,
      newStart: string,
      newEnd: string
    ): boolean => {
      const start = new Date(newStart).getTime();
      const end = new Date(newEnd).getTime();

      return events.some(e => {
        const eStart = new Date(e.start).getTime();
        const eEnd = new Date(e.end).getTime();
        return start < eEnd && end > eStart;
      });
    };

    it('should detect time conflicts', () => {
      const events = [
        { start: '2026-06-27T10:00:00Z', end: '2026-06-27T11:00:00Z', title: 'Meeting 1' }
      ];
      expect(hasConflict(events, '2026-06-27T10:30:00Z', '2026-06-27T11:30:00Z')).toBe(true);
      expect(hasConflict(events, '2026-06-27T12:00:00Z', '2026-06-27T13:00:00Z')).toBe(false);
    });
  });

  describe('Busy Time Analysis', () => {
    const analyzeBusyTime = (
      events: Array<{ start: string; end: string }>,
      date: string
    ) => {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayEvents = events.filter(e => {
        const start = new Date(e.start);
        return start >= dayStart && start <= dayEnd;
      });

      const totalMinutes = dayEvents.reduce((sum, e) => {
        const start = new Date(e.start).getTime();
        const end = new Date(e.end).getTime();
        return sum + (end - start) / (1000 * 60);
      }, 0);

      return {
        eventCount: dayEvents.length,
        busyMinutes: totalMinutes,
        freeMinutes: 24 * 60 - totalMinutes
      };
    };

    it('should calculate busy time', () => {
      const events = [
        { start: '2026-06-27T09:00:00Z', end: '2026-06-27T10:00:00Z' },
        { start: '2026-06-27T14:00:00Z', end: '2026-06-27T15:30:00Z' }
      ];
      const analysis = analyzeBusyTime(events, '2026-06-27T00:00:00Z');
      expect(analysis.eventCount).toBe(2);
      expect(analysis.busyMinutes).toBe(90);
      expect(analysis.freeMinutes).toBe(1350); // 24*60 - 90
    });
  });

  describe('Event Duration', () => {
    const calculateDuration = (start: string, end: string): number => {
      const startTime = new Date(start).getTime();
      const endTime = new Date(end).getTime();
      return (endTime - startTime) / (1000 * 60);
    };

    it('should calculate duration in minutes', () => {
      const duration = calculateDuration('2026-06-27T10:00:00Z', '2026-06-27T11:30:00Z');
      expect(duration).toBe(90);
    });
  });

  describe('Attendee Management', () => {
    const validateAttendees = (attendees: string[]): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (attendees.length === 0) errors.push('at least one attendee required');
      attendees.forEach(email => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push(`invalid email: ${email}`);
        }
      });

      return { valid: errors.length === 0, errors };
    };

    it('should validate attendee emails', () => {
      const result = validateAttendees(['user1@example.com', 'user2@example.com']);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid emails', () => {
      const result = validateAttendees(['valid@example.com', 'invalid-email']);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid email'))).toBe(true);
    });

    it('should require at least one attendee', () => {
      const result = validateAttendees([]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('at least one attendee required');
    });
  });

  describe('Recurring Event Expansion', () => {
    const expandRecurring = (
      baseEvent: { title: string; start: string; end: string },
      occurrences: number
    ): Array<{ title: string; start: string; end: string; occurrence: number }> => {
      const events: Array<{ title: string; start: string; end: string; occurrence: number }> = [];
      const baseStart = new Date(baseEvent.start);
      const baseEnd = new Date(baseEvent.end);

      for (let i = 0; i < occurrences; i++) {
        const start = new Date(baseStart);
        start.setDate(start.getDate() + i * 7);
        const end = new Date(baseEnd);
        end.setDate(end.getDate() + i * 7);

        events.push({
          title: baseEvent.title,
          start: start.toISOString(),
          end: end.toISOString(),
          occurrence: i + 1
        });
      }

      return events;
    };

    it('should expand recurring events', () => {
      const events = expandRecurring(
        { title: 'Weekly Sync', start: '2026-06-27T10:00:00Z', end: '2026-06-27T11:00:00Z' },
        4
      );
      expect(events).toHaveLength(4);
      expect(events[0].occurrence).toBe(1);
      expect(events[3].occurrence).toBe(4);
    });
  });
});