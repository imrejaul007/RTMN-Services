/**
 * Calendar Module - Event Management
 *
 * Handles scheduling, rescheduling, and cancelling calendar events
 */

import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import {
  CalendarEvent,
  CreateEventInput,
  UpdateEventInput,
  Attendee,
  ApiResponse
} from '../types.js';

const router = Router();

// ============================================================================
// IN-MEMORY STORE (Mock Implementation)
// In production, replace with MongoDB/PostgreSQL
// ============================================================================

const events: Map<string, CalendarEvent> = new Map();

// ============================================================================
// HELPERS
// ============================================================================

function generateEventId(): string {
  return `evt_${Date.now()}_${uuid().split('-')[0]}`;
}

function parseDate(dateStr: string): Date {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return date;
}

function validateEventInput(input: CreateEventInput): void {
  if (!input.title?.trim()) {
    throw new Error('Title is required');
  }
  if (!input.startTime) {
    throw new Error('Start time is required');
  }
  if (!input.endTime) {
    throw new Error('End time is required');
  }

  const start = parseDate(input.startTime);
  const end = parseDate(input.endTime);

  if (end <= start) {
    throw new Error('End time must be after start time');
  }
}

function serializeEvent(event: CalendarEvent): CalendarEvent {
  return {
    ...event,
    startTime: new Date(event.startTime),
    endTime: new Date(event.endTime),
    createdAt: new Date(event.createdAt),
    updatedAt: new Date(event.updatedAt),
    recurrence: event.recurrence ? {
      ...event.recurrence,
      endDate: event.recurrence.endDate ? new Date(event.recurrence.endDate) : undefined
    } : undefined
  };
}

function getUserId(req: Request): string {
  return (req.headers['x-user-id'] as string) || 'default-user';
}

function getTenantId(req: Request): string {
  return (req.headers['x-tenant-id'] as string) || 'default';
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/calendar/events
 * Create a new calendar event
 */
router.post('/events', async (req: Request, res: Response) => {
  try {
    const input: CreateEventInput = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    validateEventInput(input);

    const attendees: Attendee[] = (input.attendees || []).map(att => ({
      ...att,
      id: `att_${uuid().split('-')[0]}`,
      status: 'pending'
    }));

    const event: CalendarEvent = {
      id: generateEventId(),
      userId,
      tenantId,
      title: input.title.trim(),
      description: input.description?.trim(),
      startTime: parseDate(input.startTime),
      endTime: parseDate(input.endTime),
      timezone: input.timezone || 'UTC',
      location: input.location?.trim(),
      attendees,
      reminders: input.reminders || [],
      recurrence: input.recurrence,
      status: 'confirmed',
      visibility: input.visibility || 'public',
      color: input.color,
      metadata: input.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    events.set(event.id, event);

    const response: ApiResponse<CalendarEvent> = {
      success: true,
      data: serializeEvent(event),
      message: 'Event created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create event';
    res.status(400).json({ success: false, error: message });
  }
});

/**
 * GET /api/calendar/events
 * List all events for the user
 */
router.get('/events', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const tenantId = getTenantId(req);
    const { startDate, endDate, status, search, page = '1', limit = '20' } = req.query;

    let filtered = Array.from(events.values()).filter(
      event => event.userId === userId && event.tenantId === tenantId && event.status !== 'cancelled'
    );

    // Filter by date range
    if (startDate) {
      const start = parseDate(startDate as string);
      filtered = filtered.filter(e => new Date(e.startTime) >= start);
    }
    if (endDate) {
      const end = parseDate(endDate as string);
      filtered = filtered.filter(e => new Date(e.endTime) <= end);
    }

    // Filter by status
    if (status) {
      filtered = filtered.filter(e => e.status === status);
    }

    // Search by title
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(searchLower) ||
        e.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by start time
    filtered.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const total = filtered.length;
    const totalPages = Math.ceil(total / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedEvents = filtered.slice(startIndex, startIndex + limitNum);

    const response: ApiResponse<CalendarEvent[]> = {
      success: true,
      data: paginatedEvents.map(serializeEvent),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list events';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/calendar/events/:id
 * Get a specific event
 */
router.get('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const event = events.get(id);

    if (!event || event.userId !== userId || event.tenantId !== tenantId) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    const response: ApiResponse<CalendarEvent> = {
      success: true,
      data: serializeEvent(event)
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get event';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * PATCH /api/calendar/events/:id
 * Update/reschedule an event
 */
router.patch('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const input: UpdateEventInput = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const event = events.get(id);

    if (!event || event.userId !== userId || event.tenantId !== tenantId) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Validate times if being updated
    if (input.startTime || input.endTime) {
      const startTime = input.startTime ? parseDate(input.startTime) : event.startTime;
      const endTime = input.endTime ? parseDate(input.endTime) : event.endTime;

      if (endTime <= startTime) {
        return res.status(400).json({
          success: false,
          error: 'End time must be after start time'
        });
      }
    }

    // Update fields
    if (input.title !== undefined) event.title = input.title.trim();
    if (input.description !== undefined) event.description = input.description?.trim();
    if (input.startTime !== undefined) event.startTime = parseDate(input.startTime);
    if (input.endTime !== undefined) event.endTime = parseDate(input.endTime);
    if (input.timezone !== undefined) event.timezone = input.timezone;
    if (input.location !== undefined) event.location = input.location?.trim();
    if (input.visibility !== undefined) event.visibility = input.visibility;
    if (input.color !== undefined) event.color = input.color;
    if (input.status !== undefined) event.status = input.status;
    if (input.reminders !== undefined) event.reminders = input.reminders;
    if (input.recurrence !== undefined) event.recurrence = input.recurrence;
    if (input.metadata !== undefined) event.metadata = input.metadata;

    event.updatedAt = new Date();

    const response: ApiResponse<CalendarEvent> = {
      success: true,
      data: serializeEvent(event),
      message: 'Event updated successfully'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update event';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/calendar/events/:id
 * Cancel/delete an event
 */
router.delete('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hardDelete } = req.query;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const event = events.get(id);

    if (!event || event.userId !== userId || event.tenantId !== tenantId) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    if (hardDelete === 'true') {
      // Permanently delete
      events.delete(id);
      res.json({
        success: true,
        message: 'Event permanently deleted'
      });
    } else {
      // Soft delete (mark as cancelled)
      event.status = 'cancelled';
      event.updatedAt = new Date();
      res.json({
        success: true,
        data: serializeEvent(event),
        message: 'Event cancelled'
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete event';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/calendar/events/:id/attendees
 * Add an attendee to an event
 */
router.post('/events/:id/attendees', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, name }: { email: string; name?: string } = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const event = events.get(id);

    if (!event || event.userId !== userId || event.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // Check if attendee already exists
    if (event.attendees?.some(a => a.email === email)) {
      return res.status(400).json({ success: false, error: 'Attendee already exists' });
    }

    const attendee: Attendee = {
      id: `att_${uuid().split('-')[0]}`,
      email,
      name,
      status: 'pending'
    };

    event.attendees = event.attendees || [];
    event.attendees.push(attendee);
    event.updatedAt = new Date();

    const response: ApiResponse<{ attendee: Attendee; event: CalendarEvent }> = {
      success: true,
      data: { attendee, event: serializeEvent(event) },
      message: 'Attendee added'
    };

    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add attendee';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/calendar/events/:id/attendees/:attendeeId
 * Remove an attendee from an event
 */
router.delete('/events/:id/attendees/:attendeeId', async (req: Request, res: Response) => {
  try {
    const { id, attendeeId } = req.params;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const event = events.get(id);

    if (!event || event.userId !== userId || event.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const attendeeIndex = event.attendees?.findIndex(a => a.id === attendeeId);

    if (attendeeIndex === undefined || attendeeIndex === -1) {
      return res.status(404).json({ success: false, error: 'Attendee not found' });
    }

    event.attendees!.splice(attendeeIndex, 1);
    event.updatedAt = new Date();

    const response: ApiResponse<CalendarEvent> = {
      success: true,
      data: serializeEvent(event),
      message: 'Attendee removed'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove attendee';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/calendar/availability
 * Check availability for a time slot
 */
router.get('/availability', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const tenantId = getTenantId(req);
    const { startTime, endTime, duration = '60' } = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'startTime and endTime are required'
      });
    }

    const start = parseDate(startTime as string);
    const end = parseDate(endTime as string);
    const durationMinutes = parseInt(duration as string);

    // Find conflicting events
    const userEvents = Array.from(events.values()).filter(
      e => e.userId === userId &&
           e.tenantId === tenantId &&
           e.status !== 'cancelled' &&
           new Date(e.startTime) < end &&
           new Date(e.endTime) > start
    );

    const availableSlots: Array<{ start: Date; end: Date }> = [];
    let currentTime = new Date(start);

    while (currentTime < end) {
      const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60000);
      const hasConflict = userEvents.some(e =>
        new Date(e.startTime) < slotEnd && new Date(e.endTime) > currentTime
      );

      if (!hasConflict && slotEnd <= end) {
        availableSlots.push({
          start: new Date(currentTime),
          end: slotEnd
        });
      }

      currentTime = slotEnd;
    }

    res.json({
      success: true,
      data: {
        requestedRange: { start, end },
        durationMinutes,
        availableSlots,
        hasConflict: userEvents.length > 0,
        conflictingEvents: userEvents.map(e => ({
          id: e.id,
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime
        }))
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check availability';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/calendar/freebusy
 * Get free/busy information for users
 */
router.get('/freebusy', async (req: Request, res: Response) => {
  try {
    const { emails, startTime, endTime } = req.query;

    if (!emails || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'emails, startTime, and endTime are required'
      });
    }

    const emailList = (emails as string).split(',').map(e => e.trim());
    const start = parseDate(startTime as string);
    const end = parseDate(endTime as string);

    const freeBusyData = emailList.map(email => {
      const busyEvents = Array.from(events.values()).filter(
        e => e.attendees?.some(a => a.email === email) &&
             e.status !== 'cancelled' &&
             new Date(e.startTime) < end &&
             new Date(e.endTime) > start
      );

      return {
        email,
       busy: busyEvents.map(e => ({
          start: e.startTime,
          end: e.endTime,
          title: e.title
        }))
      };
    });

    res.json({ success: true, data: freeBusyData });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get freebusy';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
