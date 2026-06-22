/**
 * HOJAI General Assistant AI
 * Port: 4863
 *
 * AI-powered assistant for business operations - scheduling, reminders, tasks, notes
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

const PORT = 4863;
const SERVICE_NAME = 'assistant-ai';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(compression());
app.use(express.json({ limit: "10kb" }));

// Rate limiting
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100
}));

// ============================================
// IN-MEMORY STORES
// ============================================

interface Task {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  due_date?: string;
  assignee?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface Note {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface Reminder {
  id: string;
  tenant_id: string;
  title: string;
  message: string;
  scheduled_at: string;
  repeat?: 'daily' | 'weekly' | 'monthly';
  completed: boolean;
  created_at: string;
}

interface CalendarEvent {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  attendees?: string[];
  location?: string;
  reminder_minutes_before: number;
  created_at: string;
}

const tasks = new Map<string, Task>();
const notes = new Map<string, Note>();
const reminders = new Map<string, Reminder>();
const events = new Map<string, CalendarEvent>();

// ============================================
// HELPERS
// ============================================

function getTenantId(req: Request): string | null {
  return (req.headers['x-tenant-id'] as string) || null;
}

function successResponse(data: any) {
  return { success: true, data };
}

function errorResponse(code: string, message: string) {
  return { success: false, error: { code, message } };
}

// Health endpoints
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/health/ready', (req: Request, res: Response) => {
  res.json({ status: 'ready' });
});

// Info endpoint
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    service: SERVICE_NAME,
    version: '1.0.0',
    description: 'AI-powered general assistant for task management, notes, reminders, and calendar',
    capabilities: {
      task_management: true,
      note_taking: true,
      reminders: true,
      calendar: true,
      scheduling: true,
      ai_suggestions: true
    },
    endpoints: {
      tasks: '/api/tasks',
      notes: '/api/notes',
      reminders: '/api/reminders',
      calendar: '/api/calendar',
      stats: '/api/stats'
    }
  });
});

// ============================================
// TASKS API
// ============================================

app.get('/api/tasks', (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json(errorResponse('MISSING_TENANT', 'X-Tenant-Id required'));

  const taskList = Array.from(tasks.values())
    .filter(t => t.tenant_id === tenantId)
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  res.json(successResponse(taskList));
});

app.post('/api/tasks', (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json(errorResponse('MISSING_TENANT', 'X-Tenant-Id required'));

  const { title, description, priority = 'medium', due_date, assignee, tags = [] } = req.body;

  if (!title) return res.status(400).json(errorResponse('VALIDATION', 'Title is required'));

  const task: Task = {
    id: uuidv4(),
    tenant_id: tenantId,
    title,
    description,
    priority,
    status: 'pending',
    due_date,
    assignee,
    tags,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  tasks.set(task.id, task);

  res.status(201).json(successResponse(task));
});

app.put('/api/tasks/:id', (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json(errorResponse('MISSING_TENANT', 'X-Tenant-Id required'));

  const task = tasks.get(req.params.id);
  if (!task || task.tenant_id !== tenantId) {
    return res.status(404).json(errorResponse('NOT_FOUND', 'Task not found'));
  }

  const { title, description, priority, status, due_date, assignee, tags } = req.body;

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (priority !== undefined) task.priority = priority;
  if (status !== undefined) task.status = status;
  if (due_date !== undefined) task.due_date = due_date;
  if (assignee !== undefined) task.assignee = assignee;
  if (tags !== undefined) task.tags = tags;
  task.updated_at = new Date().toISOString();

  tasks.set(task.id, task);
  res.json(successResponse(task));
});

app.delete('/api/tasks/:id', (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json(errorResponse('MISSING_TENANT', 'X-Tenant-Id required'));

  const task = tasks.get(req.params.id);
  if (!task || task.tenant_id !== tenantId) {
    return res.status(404).json(errorResponse('NOT_FOUND', 'Task not found'));
  }

  tasks.delete(req.params.id);
  res.json(successResponse({ deleted: true }));
});

// ============================================
// NOTES API
// ============================================

app.get('/api/notes', (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json(errorResponse('MISSING_TENANT', 'X-Tenant-Id required'));

  const noteList = Array.from(notes.values())
    .filter(n => n.tenant_id === tenantId)
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  res.json(successResponse(noteList));
});

app.post('/api/notes', (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json(errorResponse('MISSING_TENANT', 'X-Tenant-Id required'));

  const { title, content, tags = [], pinned = false } = req.body;

  if (!title) return res.status(400).json(errorResponse('VALIDATION', 'Title is required'));

  const note: Note = {
    id: uuidv4(),
    tenant_id: tenantId,
    title,
    content: content || '',
    tags,
    pinned,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  notes.set(note.id, note);
  res.status(201).json(successResponse(note));
});

app.put('/api/notes/:id', (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json(errorResponse('MISSING_TENANT', 'X-Tenant-Id required'));

  const note = notes.get(req.params.id);
  if (!note || note.tenant_id !== tenantId) {
    return res.status(404).json(errorResponse('NOT_FOUND', 'Note not found'));
  }

  const { title, content, tags, pinned } = req.body;

  if (title !== undefined) note.title = title;
  if (content !== undefined) note.content = content;
  if (tags !== undefined) note.tags = tags;
  if (pinned !== undefined) note.pinned = pinned;
  note.updated_at = new Date().toISOString();

  notes.set(note.id, note);
  res.json(successResponse(note));
});

app.delete('/api/notes/:id', (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json(errorResponse('MISSING_TENANT', 'X-Tenant-Id required'));

  const note = notes.get(req.params.id);
  if (!note || note.tenant_id !== tenantId) {
    return res.status(404).json(errorResponse('NOT_FOUND', 'Note not found'));
  }

  notes.delete(req.params.id);
  res.json(successResponse({ deleted: true }));
});

// ============================================
// REMINDERS API
// ============================================

app.get('/api/reminders', (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json(errorResponse('MISSING_TENANT', 'X-Tenant-Id required'));

  const reminderList = Array.from(reminders.values())
    .filter(r => r.tenant_id === tenantId && !r.completed)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  res.json(successResponse(reminderList));
});

app.post('/api/reminders', (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json(errorResponse('MISSING_TENANT', 'X-Tenant-Id required'));

  const { title, message, scheduled_at, repeat } = req.body;

  if (!title || !scheduled_at) {
    return res.status(400).json(errorResponse('VALIDATION', 'Title and scheduled_at are required'));
  }

  const reminder: Reminder = {
    id: uuidv4(),
    tenant_id: tenantId,
    title,
    message: message || '',
    scheduled_at,
    repeat,
    completed: false,
    created_at: new Date().toISOString()
  };

  reminders.set(reminder.id, reminder);
  res.status(201).json(successResponse(reminder));
});

app.post('/api/reminders/:id/complete', (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json(errorResponse('MISSING_TENANT', 'X-Tenant-Id required'));

  const reminder = reminders.get(req.params.id);
  if (!reminder || reminder.tenant_id !== tenantId) {
    return res.status(404).json(errorResponse('NOT_FOUND', 'Reminder not found'));
  }

  reminder.completed = true;

  // If repeating, create next reminder
  if (reminder.repeat) {
    const nextDate = new Date(reminder.scheduled_at);
    if (reminder.repeat === 'daily') nextDate.setDate(nextDate.getDate() + 1);
    else if (reminder.repeat === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
    else if (reminder.repeat === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);

    reminders.set(uuidv4(), {
      ...reminder,
      id: uuidv4(),
      scheduled_at: nextDate.toISOString(),
      completed: false,
      created_at: new Date().toISOString()
    });
  }

  reminders.set(reminder.id, reminder);
  res.json(successResponse(reminder));
});

app.delete('/api/reminders/:id', (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json(errorResponse('MISSING_TENANT', 'X-Tenant-Id required'));

  const reminder = reminders.get(req.params.id);
  if (!reminder || reminder.tenant_id !== tenantId) {
    return res.status(404).json(errorResponse('NOT_FOUND', 'Reminder not found'));
  }

  reminders.delete(req.params.id);
  res.json(successResponse({ deleted: true }));
});

// ============================================
// CALENDAR API
// ============================================

app.get('/api/calendar', (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json(errorResponse('MISSING_TENANT', 'X-Tenant-Id required'));

  const { start_date, end_date } = req.query;

  let eventList = Array.from(events.values())
    .filter(e => e.tenant_id === tenantId);

  if (start_date) {
    eventList = eventList.filter(e => e.start_time >= start_date);
  }
  if (end_date) {
    eventList = eventList.filter(e => e.start_time <= end_date);
  }

  eventList.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  res.json(successResponse(eventList));
});

app.post('/api/calendar', (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json(errorResponse('MISSING_TENANT', 'X-Tenant-Id required'));

  const { title, description, start_time, end_time, attendees, location, reminder_minutes_before = 15 } = req.body;

  if (!title || !start_time || !end_time) {
    return res.status(400).json(errorResponse('VALIDATION', 'Title, start_time, and end_time are required'));
  }

  const event: CalendarEvent = {
    id: uuidv4(),
    tenant_id: tenantId,
    title,
    description,
    start_time,
    end_time,
    attendees,
    location,
    reminder_minutes_before,
    created_at: new Date().toISOString()
  };

  events.set(event.id, event);
  res.status(201).json(successResponse(event));
});

app.delete('/api/calendar/:id', (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json(errorResponse('MISSING_TENANT', 'X-Tenant-Id required'));

  const event = events.get(req.params.id);
  if (!event || event.tenant_id !== tenantId) {
    return res.status(404).json(errorResponse('NOT_FOUND', 'Event not found'));
  }

  events.delete(req.params.id);
  res.json(successResponse({ deleted: true }));
});

// ============================================
// STATS API
// ============================================

app.get('/api/stats', (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json(errorResponse('MISSING_TENANT', 'X-Tenant-Id required'));

  const tenantTasks = Array.from(tasks.values()).filter(t => t.tenant_id === tenantId);
  const tenantNotes = Array.from(notes.values()).filter(n => n.tenant_id === tenantId);
  const tenantReminders = Array.from(reminders.values()).filter(r => r.tenant_id === tenantId);
  const tenantEvents = Array.from(events.values()).filter(e => e.tenant_id === tenantId);

  res.json(successResponse({
    tasks: {
      total: tenantTasks.length,
      pending: tenantTasks.filter(t => t.status === 'pending').length,
      in_progress: tenantTasks.filter(t => t.status === 'in_progress').length,
      completed: tenantTasks.filter(t => t.status === 'completed').length,
      overdue: tenantTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length
    },
    notes: {
      total: tenantNotes.length,
      pinned: tenantNotes.filter(n => n.pinned).length
    },
    reminders: {
      total: tenantReminders.length,
      pending: tenantReminders.filter(r => !r.completed).length,
      completed: tenantReminders.filter(r => r.completed).length
    },
    calendar: {
      total: tenantEvents.length,
      upcoming: tenantEvents.filter(e => new Date(e.start_time) > new Date()).length
    }
  }));
});

// ============================================
// AI EXECUTE ENDPOINT
// ============================================

app.post('/api/execute', async (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json(errorResponse('MISSING_TENANT', 'X-Tenant-Id required'));

  const { action, params } = req.body;

  try {
    let result;

    switch (action) {
      case 'create_task':
        result = await createTask(tenantId, params);
        break;
      case 'list_tasks':
        result = listTasks(tenantId);
        break;
      case 'create_note':
        result = await createNote(tenantId, params);
        break;
      case 'schedule_meeting':
        result = await scheduleMeeting(tenantId, params);
        break;
      case 'set_reminder':
        result = await setReminder(tenantId, params);
        break;
      case 'get_summary':
        result = getSummary(tenantId);
        break;
      default:
        return res.status(400).json(errorResponse('UNKNOWN_ACTION', `Unknown action: ${action}`));
    }

    res.json(successResponse(result));
  } catch (error: any) {
    res.status(500).json(errorResponse('EXECUTION_ERROR', error.message));
  }
});

async function createTask(tenantId: string, params: any) {
  const task: Task = {
    id: uuidv4(),
    tenant_id: tenantId,
    title: params.title,
    description: params.description,
    priority: params.priority || 'medium',
    status: 'pending',
    due_date: params.due_date,
    tags: params.tags || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  tasks.set(task.id, task);
  return task;
}

function listTasks(tenantId: string) {
  return Array.from(tasks.values()).filter(t => t.tenant_id === tenantId);
}

async function createNote(tenantId: string, params: any) {
  const note: Note = {
    id: uuidv4(),
    tenant_id: tenantId,
    title: params.title,
    content: params.content || '',
    tags: params.tags || [],
    pinned: params.pinned || false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  notes.set(note.id, note);
  return note;
}

async function scheduleMeeting(tenantId: string, params: any) {
  const event: CalendarEvent = {
    id: uuidv4(),
    tenant_id: tenantId,
    title: params.title,
    description: params.description,
    start_time: params.start_time,
    end_time: params.end_time,
    attendees: params.attendees,
    location: params.location,
    reminder_minutes_before: 15,
    created_at: new Date().toISOString()
  };
  events.set(event.id, event);
  return event;
}

async function setReminder(tenantId: string, params: any) {
  const reminder: Reminder = {
    id: uuidv4(),
    tenant_id: tenantId,
    title: params.title,
    message: params.message || '',
    scheduled_at: params.scheduled_at,
    repeat: params.repeat,
    completed: false,
    created_at: new Date().toISOString()
  };
  reminders.set(reminder.id, reminder);
  return reminder;
}

function getSummary(tenantId: string) {
  const tenantTasks = Array.from(tasks.values()).filter(t => t.tenant_id === tenantId);
  const tenantNotes = Array.from(notes.values()).filter(n => n.tenant_id === tenantId);
  const tenantReminders = Array.from(reminders.values()).filter(r => r.tenant_id === tenantId && !r.completed);

  return {
    tasks_today: tenantTasks.filter(t => t.due_date && t.due_date.startsWith(new Date().toISOString().split('T')[0])).length,
    tasks_pending: tenantTasks.filter(t => t.status === 'pending').length,
    notes_count: tenantNotes.length,
    reminders_upcoming: tenantReminders.length
  };
}

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json(errorResponse('NOT_FOUND', 'Endpoint not found'));
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error(`[${SERVICE_NAME}] Error:`, err);
  res.status(500).json(errorResponse('INTERNAL_ERROR', 'Internal server error'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  HOJAI General Assistant AI                              ║
║  Port: ${PORT}                                               ║
║  Status: RUNNING                                          ║
╠═══════════════════════════════════════════════════════════╣
║  Capabilities:                                            ║
║  - Task Management                                        ║
║  - Note Taking                                             ║
║  - Reminders                                               ║
║  - Calendar & Scheduling                                   ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
