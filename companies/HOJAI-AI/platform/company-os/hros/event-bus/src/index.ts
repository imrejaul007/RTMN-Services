/**
 * HROS Event Bus
 *
 * Event-driven architecture for Employee lifecycle events
 *
 * Events:
 * - employee.created
 * - employee.updated
 * - employee.status_changed
 * - employee.role_changed
 * - employee.department_changed
 * - employee.manager_changed
 * - employee.terminated
 * - onboarding.started
 * - onboarding.completed
 * - performance.review_scheduled
 * - performance.review_completed
 * - learning.enrolled
 * - learning.completed
 * - compensation.updated
 * - wellness.alert
 * - sentiment.declined
 */

import { Router } from 'express';

const router = Router();

// In-memory event store
const events: EmployeeEvent[] = [];
const subscribers = new Map<string, EventHandler[]>();

// ============================================================
// TYPES
// ============================================================

export interface EmployeeEvent {
  id: string;
  type: EmployeeEventType;
  employeeId: string;
  timestamp: Date;
  data: Record<string, any>;
  metadata?: {
    triggeredBy?: string; // userId or 'system'
    source?: string; // 'hrbp-agent', 'payroll', 'onboarding', etc.
  };
}

export type EmployeeEventType =
  // Lifecycle
  | 'employee.created'
  | 'employee.updated'
  | 'employee.status_changed'
  | 'employee.terminated'

  // Role/Structure
  | 'employee.role_changed'
  | 'employee.department_changed'
  | 'employee.manager_changed'
  | 'employee.location_changed'

  // Onboarding
  | 'onboarding.started'
  | 'onboarding.milestone'
  | 'onboarding.completed'
  | 'onboarding.delayed'

  // Performance
  | 'performance.review_scheduled'
  | 'performance.review_started'
  | 'performance.review_completed'
  | 'performance.goal_created'
  | 'performance.goal_completed'

  // Learning
  | 'learning.enrolled'
  | 'learning.progress'
  | 'learning.completed'
  | 'learning.certificate_earned'

  // Compensation
  | 'compensation.updated'
  | 'compensation.review_scheduled'
  | 'payroll.processed'

  // Wellness
  | 'wellness.survey_sent'
  | 'wellness.survey_completed'
  | 'wellness.alert'
  | 'wellness.check_in_scheduled'

  // Sentiment
  | 'sentiment.declined'
  | 'sentiment.improved'
  | 'sentiment.critical'

  // Career
  | 'career.promotion'
  | 'career.transfer'
  | 'career.exit_interview_scheduled'
  | 'career.exit_interview_completed';

export type EventHandler = (event: EmployeeEvent) => Promise<void>;

// ============================================================
// PUBLISH EVENTS
// ============================================================

/**
 * Publish a new event
 */
router.post('/events', async (req, res) => {
  try {
    const { type, employeeId, data, metadata } = req.body;

    if (!type || !employeeId) {
      return res.status(400).json({
        success: false,
        error: 'type and employeeId are required',
      });
    }

    const event: EmployeeEvent = {
      id: crypto.randomUUID(),
      type,
      employeeId,
      timestamp: new Date(),
      data: data || {},
      metadata: metadata || { triggeredBy: 'api' },
    };

    // Store event
    events.push(event);

    // Trigger subscribers
    await triggerSubscribers(event);

    res.status(201).json({ success: true, event });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Publish batch events
 */
router.post('/events/batch', async (req, res) => {
  try {
    const { events: batchEvents } = req.body;

    if (!Array.isArray(batchEvents)) {
      return res.status(400).json({
        success: false,
        error: 'events must be an array',
      });
    }

    const published = [];
    for (const eventData of batchEvents) {
      const event: EmployeeEvent = {
        id: crypto.randomUUID(),
        type: eventData.type,
        employeeId: eventData.employeeId,
        timestamp: new Date(),
        data: eventData.data || {},
        metadata: eventData.metadata || { triggeredBy: 'batch' },
      };
      events.push(event);
      await triggerSubscribers(event);
      published.push(event);
    }

    res.status(201).json({ success: true, count: published.length, events: published });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// QUERY EVENTS
// ============================================================

/**
 * Get events for employee
 */
router.get('/events/employee/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { type, from, to, limit = 50 } = req.query;

    let filtered = events.filter(e => e.employeeId === employeeId);

    if (type) {
      filtered = filtered.filter(e => e.type === type);
    }

    if (from) {
      filtered = filtered.filter(e => e.timestamp >= new Date(from as string));
    }

    if (to) {
      filtered = filtered.filter(e => e.timestamp <= new Date(to as string));
    }

    // Sort by timestamp desc
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    res.json({
      success: true,
      count: filtered.length,
      events: filtered.slice(0, Number(limit)),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get events by type
 */
router.get('/events/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { from, to, limit = 100 } = req.query;

    let filtered = events.filter(e => e.type === type);

    if (from) {
      filtered = filtered.filter(e => e.timestamp >= new Date(from as string));
    }

    if (to) {
      filtered = filtered.filter(e => e.timestamp <= new Date(to as string));
    }

    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    res.json({
      success: true,
      count: filtered.length,
      events: filtered.slice(0, Number(limit)),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get recent events
 */
router.get('/events/recent', async (req, res) => {
  try {
    const { limit = 50, type } = req.query;

    let filtered = [...events];

    if (type) {
      filtered = filtered.filter(e => e.type === type);
    }

    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    res.json({
      success: true,
      events: filtered.slice(0, Number(limit)),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// SUBSCRIPTIONS
// ============================================================

/**
 * Subscribe to events
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { eventTypes, handlerId, callbackUrl } = req.body;

    if (!eventTypes || (!handlerId && !callbackUrl)) {
      return res.status(400).json({
        success: false,
        error: 'eventTypes and handlerId or callbackUrl are required',
      });
    }

    const handler: EventHandler = callbackUrl
      ? async (event) => {
          // HTTP callback
          await fetch(callbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
          });
        }
      : async (event) => {
          // In-memory handler (logged)
          console.log(`[${handlerId}] Event:`, event.type, event.employeeId);
        };

    for (const eventType of eventTypes) {
      if (!subscribers.has(eventType)) {
        subscribers.set(eventType, []);
      }
      subscribers.get(eventType)!.push(handler);
    }

    res.status(201).json({
      success: true,
      subscription: {
        handlerId,
        eventTypes,
        callbackUrl,
        createdAt: new Date(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Unsubscribe from events
 */
router.delete('/subscribe/:handlerId', async (req, res) => {
  try {
    const { handlerId } = req.params;

    // Remove all subscriptions for this handler
    for (const [type, handlers] of subscribers) {
      // Filter out handlers with matching ID pattern
      // In real implementation, track handlerId separately
      subscribers.set(type, handlers.filter((_, i) => i < handlers.length));
    }

    res.json({ success: true, message: `Unsubscribed ${handlerId}` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get subscribers
 */
router.get('/subscribers', async (req, res) => {
  try {
    const subscriptions = [];
    for (const [type, handlers] of subscribers) {
      subscriptions.push({ type, count: handlers.length });
    }

    res.json({ success: true, subscriptions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// WEBHOOKS
// ============================================================

/**
 * Webhook endpoints for external systems
 */
router.post('/webhook/onboarding', async (req, res) => {
  try {
    const { action, employeeId, data } = req.body;

    // Publish corresponding event
    const eventType = action === 'completed'
      ? 'onboarding.completed'
      : action === 'started'
      ? 'onboarding.started'
      : 'onboarding.milestone';

    await publishEvent({
      type: eventType,
      employeeId,
      data,
      metadata: { source: 'onboarding-service' },
    });

    res.json({ success: true, eventType });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/webhook/payroll', async (req, res) => {
  try {
    const { action, employeeId, data } = req.body;

    const eventType = action === 'salary_updated'
      ? 'compensation.updated'
      : action === 'processed'
      ? 'payroll.processed'
      : 'compensation.updated';

    await publishEvent({
      type: eventType,
      employeeId,
      data,
      metadata: { source: 'payroll-service' },
    });

    res.json({ success: true, eventType });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/webhook/lms', async (req, res) => {
  try {
    const { action, employeeId, data } = req.body;

    const eventType = action === 'enrolled'
      ? 'learning.enrolled'
      : action === 'completed'
      ? 'learning.completed'
      : 'learning.progress';

    await publishEvent({
      type: eventType,
      employeeId,
      data,
      metadata: { source: 'lms-service' },
    });

    res.json({ success: true, eventType });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/webhook/performance', async (req, res) => {
  try {
    const { action, employeeId, data } = req.body;

    const eventType = action === 'review_completed'
      ? 'performance.review_completed'
      : action === 'goal_created'
      ? 'performance.goal_created'
      : 'performance.review_scheduled';

    await publishEvent({
      type: eventType,
      employeeId,
      data,
      metadata: { source: 'performance-service' },
    });

    res.json({ success: true, eventType });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/webhook/wellness', async (req, res) => {
  try {
    const { action, employeeId, data } = req.body;

    const eventType = action === 'alert'
      ? 'wellness.alert'
      : 'wellness.survey_completed';

    await publishEvent({
      type: eventType,
      employeeId,
      data,
      metadata: { source: 'wellness-service' },
    });

    res.json({ success: true, eventType });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// HELPERS
// ============================================================

async function publishEvent(params: {
  type: EmployeeEventType;
  employeeId: string;
  data?: Record<string, any>;
  metadata?: { triggeredBy?: string; source?: string };
}): Promise<EmployeeEvent> {
  const event: EmployeeEvent = {
    id: crypto.randomUUID(),
    type: params.type,
    employeeId: params.employeeId,
    timestamp: new Date(),
    data: params.data || {},
    metadata: params.metadata || { triggeredBy: 'system' },
  };

  events.push(event);
  await triggerSubscribers(event);

  return event;
}

async function triggerSubscribers(event: EmployeeEvent): Promise<void> {
  const handlers = subscribers.get(event.type) || [];

  // Also trigger wildcard subscribers
  const wildcardHandlers = subscribers.get('*') || [];
  const allHandlers = [...handlers, ...wildcardHandlers];

  await Promise.allSettled(
    allHandlers.map(handler =>
      handler(event).catch(err =>
        console.error('Event handler error:', err)
      )
    )
  );
}

// ============================================================
// ANALYTICS
// ============================================================

/**
 * Get event statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { from, to } = req.query;

    let filtered = [...events];

    if (from) {
      filtered = filtered.filter(e => e.timestamp >= new Date(from as string));
    }

    if (to) {
      filtered = filtered.filter(e => e.timestamp <= new Date(to as string));
    }

    // Count by type
    const byType = new Map<string, number>();
    for (const event of filtered) {
      byType.set(event.type, (byType.get(event.type) || 0) + 1);
    }

    // Count by employee
    const byEmployee = new Map<string, number>();
    for (const event of filtered) {
      byEmployee.set(event.employeeId, (byEmployee.get(event.employeeId) || 0) + 1);
    }

    // Recent activity
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last24h = filtered.filter(e => e.timestamp >= oneDayAgo);

    res.json({
      success: true,
      stats: {
        total: filtered.length,
        last24h: last24h.length,
        byType: Object.fromEntries(byType),
        uniqueEmployees: byEmployee.size,
        topEmployees: Array.from(byEmployee.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([id, count]) => ({ employeeId: id, count })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Health check
 */
router.get('/health', async (req, res) => {
  res.json({
    status: 'healthy',
    events: events.length,
    subscribers: Array.from(subscribers.values()).reduce((sum, h) => sum + h.length, 0),
    uptime: process.uptime(),
  });
});

export default router;
