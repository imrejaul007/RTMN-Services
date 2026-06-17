import { Router, Request, Response } from 'express';
import { BriefingScheduler } from '../services/scheduler';
import { ScheduleBriefingRequest, ApiResponse, NotificationChannel } from '../types';

const router = Router();
const scheduler = BriefingScheduler.getInstance();

// Get schedule for a tenant
router.get('/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const schedule = scheduler.getSchedule(tenantId);

    const response: ApiResponse<{
      tenantId: string;
      enabled: boolean;
      time: string;
      timezone: string;
      channels: NotificationChannel[];
      nextRun: Date | null;
    }> = {
      success: true,
      data: {
        tenantId,
        enabled: schedule.enabled,
        time: schedule.time,
        timezone: schedule.timezone,
        channels: schedule.channels,
        nextRun: scheduler.getNextRun(tenantId)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch schedule'
    });
  }
});

// Update schedule for a tenant
router.put('/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { time, timezone, channels, enabled } = req.body as ScheduleBriefingRequest;

    if (!time || !timezone) {
      return res.status(400).json({
        success: false,
        error: 'time and timezone are required'
      });
    }

    // Validate channels if provided
    if (channels) {
      const validChannels = channels.filter(c =>
        ['email', 'whatsapp', 'slack'].includes(c.type) && c.enabled
      );
      if (validChannels.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one valid notification channel is required'
        });
      }
    }

    scheduler.updateSchedule(tenantId, {
      enabled: enabled !== undefined ? enabled : true,
      time,
      timezone,
      channels: channels || scheduler.getSchedule(tenantId).channels
    });

    const response: ApiResponse<{
      tenantId: string;
      schedule: {
        time: string;
        timezone: string;
        channels: NotificationChannel[];
        nextRun: Date | null;
      };
    }> = {
      success: true,
      message: 'Schedule updated successfully',
      data: {
        tenantId,
        schedule: {
          time,
          timezone,
          channels: channels || scheduler.getSchedule(tenantId).channels,
          nextRun: scheduler.getNextRun(tenantId)
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update schedule'
    });
  }
});

// Enable/disable schedule
router.patch('/:tenantId/status', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'enabled must be a boolean'
      });
    }

    scheduler.updateSchedule(tenantId, { enabled });

    const response: ApiResponse<{ tenantId: string; enabled: boolean }> = {
      success: true,
      message: `Schedule ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: { tenantId, enabled }
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating schedule status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update schedule status'
    });
  }
});

// Test schedule notification
router.post('/:tenantId/test', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { channels, testMessage } = req.body;

    const result = await scheduler.sendTestNotification(tenantId, channels, testMessage);

    const response: ApiResponse<{ success: boolean; results: unknown[] }> = {
      success: true,
      data: result
    };

    res.json(response);
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

// Get all scheduled tenants
router.get('/', async (req: Request, res: Response) => {
  try {
    const allSchedules = scheduler.getAllSchedules();

    const response: ApiResponse<{
      total: number;
      schedules: Record<string, {
        enabled: boolean;
        time: string;
        timezone: string;
        channels: NotificationChannel[];
        nextRun: Date | null;
      }>;
    }> = {
      success: true,
      data: {
        total: Object.keys(allSchedules).length,
        schedules: allSchedules
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching all schedules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch schedules'
    });
  }
});

// Delete schedule for a tenant
router.delete('/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    scheduler.removeSchedule(tenantId);

    const response: ApiResponse<{ tenantId: string }> = {
      success: true,
      message: 'Schedule removed successfully',
      data: { tenantId }
    };

    res.json(response);
  } catch (error) {
    console.error('Error removing schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove schedule'
    });
  }
});

export default router;
