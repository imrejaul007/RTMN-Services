/**
 * Executive Assistant - Calendar Tool
 * Version: 1.0.0 | Date: June 2, 2026
 * Purpose: Calendar management tool for scheduling events
 */

import { z } from 'zod';
import type { Tool, ToolResult } from '../../core/src/BaseAgent.js';

// ============================================================================
// Calendar Data Store (In-Memory)
// ============================================================================

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: string[];
  organizer: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'confirmed' | 'tentative' | 'cancelled';
}

class CalendarStore {
  private events: Map<string, CalendarEvent> = new Map();

  createEvent(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'status'>): CalendarEvent {
    const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const newEvent: CalendarEvent = {
      ...event,
      id,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    };
    this.events.set(id, newEvent);
    return newEvent;
  }

  getEvent(id: string): CalendarEvent | undefined {
    return this.events.get(id);
  }

  getEventsByDateRange(start: Date, end: Date): CalendarEvent[] {
    return Array.from(this.events.values()).filter(event => {
      return event.startTime >= start && event.startTime <= end;
    });
  }

  getEventsByOrganizer(organizer: string): CalendarEvent[] {
    return Array.from(this.events.values()).filter(event => {
      return event.organizer === organizer;
    });
  }

  updateEvent(id: string, updates: Partial<CalendarEvent>): CalendarEvent | undefined {
    const event = this.events.get(id);
    if (!event) return undefined;

    const updated: CalendarEvent = {
      ...event,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    this.events.set(id, updated);
    return updated;
  }

  deleteEvent(id: string): boolean {
    return this.events.delete(id);
  }

  getAvailability(date: Date, durationMinutes: number): { start: Date; end: Date; available: boolean }[] {
    const slots: { start: Date; end: Date; available: boolean }[] = [];
    const dayStart = new Date(date);
    dayStart.setHours(9, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(17, 0, 0, 0);

    const dayEvents = this.getEventsByDateRange(dayStart, dayEnd).filter(e => e.status !== 'cancelled');

    let current = new Date(dayStart);
    while (current < dayEnd) {
      const slotEnd = new Date(current.getTime() + durationMinutes * 60000);
      if (slotEnd > dayEnd) break;

      const hasConflict = dayEvents.some(event => {
        return (current >= event.startTime && current < event.endTime) ||
               (slotEnd > event.startTime && slotEnd <= event.endTime) ||
               (current <= event.startTime && slotEnd >= event.endTime);
      });

      slots.push({
        start: new Date(current),
        end: slotEnd,
        available: !hasConflict,
      });

      current = slotEnd;
    }

    return slots;
  }

  getFreeBusy(organizer: string, start: Date, end: Date): { start: Date; end: Date; busy: boolean }[] {
    const events = this.getEventsByOrganizer(organizer).filter(e => e.status !== 'cancelled');
    const busyPeriods: { start: Date; end: Date; busy: boolean }[] = [];

    for (const event of events) {
      if (event.startTime >= start && event.startTime <= end) {
        busyPeriods.push({
          start: event.startTime,
          end: event.endTime,
          busy: true,
        });
      }
    }

    return busyPeriods;
  }
}

const calendarStore = new CalendarStore();

// ============================================================================
// Parameter Schemas
// ============================================================================

const CreateEventSchema = z.object({
  title: z.string().describe('Event title'),
  startTime: z.string().describe('Start time in ISO 8601 format'),
  durationMinutes: z.number().min(15).max(480).describe('Duration in minutes'),
  description: z.string().optional().describe('Event description'),
  location: z.string().optional().describe('Event location'),
  attendees: z.array(z.string().email()).optional().describe('Attendee email addresses'),
  organizer: z.string().describe('Organizer email'),
});

const UpdateEventSchema = z.object({
  eventId: z.string().describe('Event ID to update'),
  title: z.string().optional(),
  startTime: z.string().optional(),
  durationMinutes: z.number().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  attendees: z.array(z.string().email()).optional(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
});

const GetEventsSchema = z.object({
  startDate: z.string().optional().describe('Start date filter (ISO 8601)'),
  endDate: z.string().optional().describe('End date filter (ISO 8601)'),
  organizer: z.string().optional(),
});

const GetAvailabilitySchema = z.object({
  date: z.string().describe('Date to check availability (ISO 8601)'),
  durationMinutes: z.number().min(15).max(480).describe('Duration in minutes'),
});

const GetFreeBusySchema = z.object({
  organizer: z.string().describe('Organizer email'),
  startDate: z.string().describe('Start date (ISO 8601)'),
  endDate: z.string().describe('End date (ISO 8601)'),
});

const DeleteEventSchema = z.object({
  eventId: z.string().describe('Event ID to delete'),
});

// ============================================================================
// Tool Implementations
// ============================================================================

async function createEventHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = CreateEventSchema.parse(params);
    const startTime = new Date(args.startTime);
    const endTime = new Date(startTime.getTime() + args.durationMinutes * 60000);

    const event = calendarStore.createEvent({
      title: args.title,
      description: args.description,
      startTime,
      endTime,
      location: args.location,
      attendees: args.attendees || [],
      organizer: args.organizer,
    });

    return {
      success: true,
      data: {
        eventId: event.id,
        event: {
          title: event.title,
          description: event.description,
          startTime: event.startTime.toISOString(),
          endTime: event.endTime.toISOString(),
          location: event.location,
          attendees: event.attendees,
          status: event.status,
        },
        message: `Event "${event.title}" created successfully for ${event.startTime.toLocaleString()}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create event',
    };
  }
}

async function updateEventHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = UpdateEventSchema.parse(params);
    const updates: Partial<CalendarEvent> = {};

    if (args.title) updates.title = args.title;
    if (args.description) updates.description = args.description;
    if (args.location) updates.location = args.location;
    if (args.attendees) updates.attendees = args.attendees;
    if (args.status) updates.status = args.status;

    if (args.startTime) {
      updates.startTime = new Date(args.startTime);
      if (args.durationMinutes) {
        updates.endTime = new Date(updates.startTime.getTime() + args.durationMinutes * 60000);
      }
    } else if (args.durationMinutes) {
      const event = calendarStore.getEvent(args.eventId);
      if (event) {
        updates.endTime = new Date(event.startTime.getTime() + args.durationMinutes * 60000);
      }
    }

    const event = calendarStore.updateEvent(args.eventId, updates);

    if (!event) {
      return {
        success: false,
        error: `Event with ID "${args.eventId}" not found`,
      };
    }

    return {
      success: true,
      data: {
        eventId: event.id,
        event: {
          title: event.title,
          description: event.description,
          startTime: event.startTime.toISOString(),
          endTime: event.endTime.toISOString(),
          location: event.location,
          attendees: event.attendees,
          status: event.status,
        },
        message: `Event "${event.title}" updated successfully`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update event',
    };
  }
}

async function getEventsHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetEventsSchema.parse(params);

    let events: CalendarEvent[];

    if (args.organizer) {
      events = calendarStore.getEventsByOrganizer(args.organizer);
    } else if (args.startDate && args.endDate) {
      events = calendarStore.getEventsByDateRange(new Date(args.startDate), new Date(args.endDate));
    } else {
      // Return today's events
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      events = calendarStore.getEventsByDateRange(today, tomorrow);
    }

    return {
      success: true,
      data: {
        events: events.map(e => ({
          id: e.id,
          title: e.title,
          description: e.description,
          startTime: e.startTime.toISOString(),
          endTime: e.endTime.toISOString(),
          location: e.location,
          attendees: e.attendees,
          organizer: e.organizer,
          status: e.status,
        })),
        count: events.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get events',
    };
  }
}

async function getAvailabilityHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetAvailabilitySchema.parse(params);
    const slots = calendarStore.getAvailability(new Date(args.date), args.durationMinutes);

    return {
      success: true,
      data: {
        date: args.date,
        durationMinutes: args.durationMinutes,
        slots: slots.map(s => ({
          start: s.start.toISOString(),
          end: s.end.toISOString(),
          available: s.available,
          time: s.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        })),
        availableSlots: slots.filter(s => s.available).length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check availability',
    };
  }
}

async function getFreeBusyHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetFreeBusySchema.parse(params);
    const periods = calendarStore.getFreeBusy(
      args.organizer,
      new Date(args.startDate),
      new Date(args.endDate)
    );

    return {
      success: true,
      data: {
        organizer: args.organizer,
        periods: periods.map(p => ({
          start: p.start.toISOString(),
          end: p.end.toISOString(),
          busy: p.busy,
        })),
        busyCount: periods.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get free/busy',
    };
  }
}

async function deleteEventHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = DeleteEventSchema.parse(params);
    const event = calendarStore.getEvent(args.eventId);

    if (!event) {
      return {
        success: false,
        error: `Event with ID "${args.eventId}" not found`,
      };
    }

    calendarStore.deleteEvent(args.eventId);

    return {
      success: true,
      data: {
        eventId: args.eventId,
        message: `Event "${event.title}" deleted successfully`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete event',
    };
  }
}

// ============================================================================
// Calendar Tools Export
// ============================================================================

export const calendarTools: Tool[] = [
  {
    name: 'create_event',
    description: 'Create a calendar event with title, time, duration, location, and attendees',
    parameters: [
      { name: 'title', description: 'Event title', schema: z.string() },
      { name: 'startTime', description: 'Start time in ISO 8601 format', schema: z.string() },
      { name: 'durationMinutes', description: 'Duration in minutes', schema: z.number().min(15).max(480) },
      { name: 'description', description: 'Event description (optional)', schema: z.string().optional() },
      { name: 'location', description: 'Event location (optional)', schema: z.string().optional() },
      { name: 'attendees', description: 'Attendee email addresses (optional)', schema: z.array(z.string().email()).optional() },
      { name: 'organizer', description: 'Organizer email', schema: z.string() },
    ],
    execute: createEventHandler,
  },
  {
    name: 'update_event',
    description: 'Update an existing calendar event',
    parameters: [
      { name: 'eventId', description: 'Event ID to update', schema: z.string() },
      { name: 'title', description: 'New title (optional)', schema: z.string().optional() },
      { name: 'startTime', description: 'New start time in ISO 8601 format (optional)', schema: z.string().optional() },
      { name: 'durationMinutes', description: 'New duration in minutes (optional)', schema: z.number().optional() },
      { name: 'description', description: 'New description (optional)', schema: z.string().optional() },
      { name: 'location', description: 'New location (optional)', schema: z.string().optional() },
      { name: 'attendees', description: 'New attendees (optional)', schema: z.array(z.string().email()).optional() },
      { name: 'status', description: 'New status (optional)', schema: z.enum(['confirmed', 'tentative', 'cancelled']).optional() },
    ],
    execute: updateEventHandler,
  },
  {
    name: 'get_events',
    description: 'Get calendar events by date range or organizer',
    parameters: [
      { name: 'startDate', description: 'Start date filter (optional)', schema: z.string().optional() },
      { name: 'endDate', description: 'End date filter (optional)', schema: z.string().optional() },
      { name: 'organizer', description: 'Filter by organizer (optional)', schema: z.string().optional() },
    ],
    execute: getEventsHandler,
  },
  {
    name: 'get_availability',
    description: 'Check available time slots for a given date and duration',
    parameters: [
      { name: 'date', description: 'Date to check (ISO 8601)', schema: z.string() },
      { name: 'durationMinutes', description: 'Duration needed in minutes', schema: z.number().min(15).max(480) },
    ],
    execute: getAvailabilityHandler,
  },
  {
    name: 'get_freebusy',
    description: 'Get free/busy periods for an organizer',
    parameters: [
      { name: 'organizer', description: 'Organizer email', schema: z.string() },
      { name: 'startDate', description: 'Start date (ISO 8601)', schema: z.string() },
      { name: 'endDate', description: 'End date (ISO 8601)', schema: z.string() },
    ],
    execute: getFreeBusyHandler,
  },
  {
    name: 'delete_event',
    description: 'Delete a calendar event',
    parameters: [
      { name: 'eventId', description: 'Event ID to delete', schema: z.string() },
    ],
    execute: deleteEventHandler,
  },
];

// Export the store for testing
export { CalendarStore, calendarStore };
