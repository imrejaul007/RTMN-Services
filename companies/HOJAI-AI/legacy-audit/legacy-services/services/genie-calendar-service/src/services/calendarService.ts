/**
 * GENIE Calendar Service - Business Logic
 * Version: 1.0.0 | Date: June 13, 2026
 */

import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger.js';
import { CalendarEvent, Calendar, CreateEventSchema, UpdateEventSchema } from '../types.js';

const logger = createLogger('calendar-service');

// In-memory storage (replace with database in production)
const calendars = new Map<string, Calendar>();
const events = new Map<string, CalendarEvent>();

export async function createCalendar(
  userId: string,
  input: { provider: string; name: string; color?: string; access_level?: string }
): Promise<Calendar> {
  const calendar: Calendar = {
    id: uuidv4(),
    user_id: userId,
    provider: input.provider as Calendar['provider'],
    name: input.name,
    color: input.color || '#3b82f6',
    access_level: (input.access_level as Calendar['access_level']) || 'owner',
    synced_at: new Date().toISOString(),
  };
  calendars.set(calendar.id, calendar);
  logger.info('calendar_created', { calendarId: calendar.id, userId });
  return calendar;
}

export async function getCalendars(userId: string): Promise<Calendar[]> {
  return Array.from(calendars.values()).filter(c => c.user_id === userId);
}

export async function createEvent(
  userId: string,
  input: {
    calendar_id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    timezone?: string;
    location?: string;
    attendees?: { name: string; email: string }[];
    reminders?: { minutes_before: number; type: string }[];
  }
): Promise<CalendarEvent> {
  const parseResult = CreateEventSchema.safeParse(input);
  if (!parseResult.success) {
    throw new Error(`Validation failed: ${parseResult.error.message}`);
  }

  const event: CalendarEvent = {
    id: uuidv4(),
    user_id: userId,
    calendar_id: input.calendar_id,
    title: input.title,
    description: input.description,
    start_time: input.start_time,
    end_time: input.end_time,
    timezone: input.timezone || 'Asia/Kolkata',
    location: input.location,
    status: 'confirmed',
    attendees: (input.attendees || []).map(a => ({
      id: uuidv4(),
      name: a.name,
      email: a.email,
      status: 'pending' as const,
    })),
    reminders: (input.reminders || []).map(r => ({
      id: uuidv4(),
      minutes_before: r.minutes_before,
      type: r.type as CalendarEvent['reminders'][0]['type'],
      sent: false,
    })),
    source: 'manual',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  events.set(event.id, event);
  logger.info('event_created', { eventId: event.id, userId, title: event.title });
  return event;
}

export async function getEvent(eventId: string, userId: string): Promise<CalendarEvent | null> {
  const event = events.get(eventId);
  if (!event || event.user_id !== userId) return null;
  return event;
}

export async function getEvents(
  userId: string,
  query: {
    start_date?: string;
    end_date?: string;
    calendar_id?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<{ events: CalendarEvent[]; total: number }> {
  let userEvents = Array.from(events.values()).filter(e => e.user_id === userId);

  if (query.calendar_id) {
    userEvents = userEvents.filter(e => e.calendar_id === query.calendar_id);
  }
  if (query.start_date) {
    userEvents = userEvents.filter(e => new Date(e.start_time) >= new Date(query.start_date!));
  }
  if (query.end_date) {
    userEvents = userEvents.filter(e => new Date(e.end_time) <= new Date(query.end_date!));
  }

  userEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const start = (page - 1) * pageSize;
  const paginated = userEvents.slice(start, start + pageSize);

  return { events: paginated, total: userEvents.length };
}

export async function updateEvent(
  eventId: string,
  userId: string,
  input: {
    title?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    status?: 'confirmed' | 'tentative' | 'cancelled';
  }
): Promise<CalendarEvent | null> {
  const event = events.get(eventId);
  if (!event || event.user_id !== userId) return null;

  const parseResult = UpdateEventSchema.safeParse(input);
  if (!parseResult.success) {
    throw new Error(`Validation failed: ${parseResult.error.message}`);
  }

  const updated: CalendarEvent = {
    ...event,
    ...input,
    updated_at: new Date().toISOString(),
  };

  events.set(eventId, updated);
  logger.info('event_updated', { eventId, userId });
  return updated;
}

export async function deleteEvent(eventId: string, userId: string): Promise<boolean> {
  const event = events.get(eventId);
  if (!event || event.user_id !== userId) return false;
  events.delete(eventId);
  logger.info('event_deleted', { eventId, userId });
  return true;
}

export async function getUpcomingEvents(userId: string, limit: number = 10): Promise<CalendarEvent[]> {
  const now = new Date();
  return Array.from(events.values())
    .filter(e => e.user_id === userId && new Date(e.start_time) >= now && e.status !== 'cancelled')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, limit);
}

export async function getTodayEvents(userId: string): Promise<CalendarEvent[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return Array.from(events.values())
    .filter(e => {
      const start = new Date(e.start_time);
      return e.user_id === userId && start >= today && start < tomorrow;
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
}

export async function getConflicts(
  userId: string,
  start_time: string,
  end_time: string
): Promise<CalendarEvent[]> {
  const start = new Date(start_time);
  const end = new Date(end_time);

  return Array.from(events.values())
    .filter(e => {
      if (e.user_id !== userId) return false;
      const eventStart = new Date(e.start_time);
      const eventEnd = new Date(e.end_time);
      return (start < eventEnd && end > eventStart);
    });
}
