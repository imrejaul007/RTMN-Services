/**
 * GENIE Calendar Service - Routes
 * Version: 1.0.0 | Date: June 13, 2026
 */

import { Router, Request, Response, NextFunction } from 'express';
import { tenantMiddleware } from '../middleware/tenant.js';
import * as calendarService from '../services/calendarService.js';

const router = Router();
router.use(tenantMiddleware());

function createResponse(success: boolean, data?: unknown, error?: { code: string; message: string }) {
  return { success, ...(data !== undefined && { data }), ...(error && { error }), meta: { timestamp: new Date().toISOString(), requestId: `req_${Date.now()}` } };
}

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/calendars - List calendars
router.get('/calendars', asyncHandler(async (req, res) => {
  const calendars = await calendarService.getCalendars(req.userId!);
  res.json(createResponse(true, { calendars }));
}));

// POST /api/calendars - Create calendar
router.post('/calendars', asyncHandler(async (req, res) => {
  const calendar = await calendarService.createCalendar(req.userId!, req.body);
  res.status(201).json(createResponse(true, calendar));
}));

// GET /api/events - List events
router.get('/events', asyncHandler(async (req, res) => {
  const result = await calendarService.getEvents(req.userId!, {
    start_date: req.query.start_date as string,
    end_date: req.query.end_date as string,
    calendar_id: req.query.calendar_id as string,
    page: parseInt(req.query.page as string) || 1,
    pageSize: parseInt(req.query.pageSize as string) || 20,
  });
  res.json(createResponse(true, result));
}));

// POST /api/events - Create event
router.post('/events', asyncHandler(async (req, res) => {
  const event = await calendarService.createEvent(req.userId!, req.body);
  res.status(201).json(createResponse(true, event));
}));

// GET /api/events/today - Today's events
router.get('/events/today', asyncHandler(async (req, res) => {
  const events = await calendarService.getTodayEvents(req.userId!);
  res.json(createResponse(true, { events }));
}));

// GET /api/events/upcoming - Upcoming events
router.get('/events/upcoming', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const events = await calendarService.getUpcomingEvents(req.userId!, limit);
  res.json(createResponse(true, { events }));
}));

// GET /api/events/:id - Get event
router.get('/events/:id', asyncHandler(async (req, res) => {
  const event = await calendarService.getEvent(req.params.id, req.userId!);
  if (!event) {
    res.status(404).json(createResponse(false, undefined, { code: 'NOT_FOUND', message: 'Event not found' }));
    return;
  }
  res.json(createResponse(true, event));
}));

// PATCH /api/events/:id - Update event
router.patch('/events/:id', asyncHandler(async (req, res) => {
  const event = await calendarService.updateEvent(req.params.id, req.userId!, req.body);
  if (!event) {
    res.status(404).json(createResponse(false, undefined, { code: 'NOT_FOUND', message: 'Event not found' }));
    return;
  }
  res.json(createResponse(true, event));
}));

// DELETE /api/events/:id - Delete event
router.delete('/events/:id', asyncHandler(async (req, res) => {
  const deleted = await calendarService.deleteEvent(req.params.id, req.userId!);
  if (!deleted) {
    res.status(404).json(createResponse(false, undefined, { code: 'NOT_FOUND', message: 'Event not found' }));
    return;
  }
  res.json(createResponse(true, { deleted: true }));
}));

// GET /api/events/conflicts - Check conflicts
router.get('/events/conflicts', asyncHandler(async (req, res) => {
  const { start_time, end_time } = req.query;
  if (!start_time || !end_time) {
    res.status(400).json(createResponse(false, undefined, { code: 'VALIDATION_ERROR', message: 'start_time and end_time required' }));
    return;
  }
  const conflicts = await calendarService.getConflicts(req.userId!, start_time as string, end_time as string);
  res.json(createResponse(true, { conflicts }));
}));

export default router;
