/**
 * Scheduler Routes
 * HTTP endpoints for managing scheduled research tasks
 *
 * REUSES: Scheduler service
 */

import { Router } from 'express';
import { scheduler, ScheduleConfig } from '@hojai/internet-os-scheduler';

export const schedulerRoutes = Router();

// List all schedules
schedulerRoutes.get('/', async (_req, res) => {
  try {
    const schedules = scheduler.listSchedules();
    res.json({
      schedules,
      count: schedules.length,
      stats: scheduler.getStats(),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get a specific schedule
schedulerRoutes.get('/:id', async (req, res) => {
  try {
    const schedule = scheduler.getSchedule(req.params.id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create a schedule
schedulerRoutes.post('/', async (req, res) => {
  try {
    const { id, agentType, cron, input, enabled } = req.body;

    if (!id || !agentType || !cron) {
      return res.status(400).json({
        error: 'Required fields: id, agentType, cron'
      });
    }

    const schedule = scheduler.addSchedule({
      id,
      agentType,
      cron,
      input: input || {},
      enabled: enabled ?? true,
    });

    res.status(201).json(schedule);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Delete a schedule
schedulerRoutes.delete('/:id', async (req, res) => {
  try {
    const deleted = scheduler.removeSchedule(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Enable/disable a schedule
schedulerRoutes.post('/:id/:action', async (req, res) => {
  try {
    const action = req.params.action;
    if (action !== 'enable' && action !== 'disable') {
      return res.status(400).json({
        error: 'Action must be "enable" or "disable"',
      });
    }

    const success = scheduler.setEnabled(req.params.id, action === 'enable');
    if (!success) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({ success: true, enabled: action === 'enable' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Run a schedule immediately
schedulerRoutes.post('/:id/run', async (req, res) => {
  try {
    const report = await scheduler.runNow(req.params.id);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get scheduler stats
schedulerRoutes.get('/stats', async (_req, res) => {
  try {
    res.json(scheduler.getStats());
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Start all schedules
schedulerRoutes.post('/start', async (_req, res) => {
  try {
    scheduler.start();
    res.json({ success: true, isRunning: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Stop all schedules
schedulerRoutes.post('/stop', async (_req, res) => {
  try {
    scheduler.stop();
    res.json({ success: true, isRunning: false });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});