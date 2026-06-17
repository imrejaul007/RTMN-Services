import { Router, Request, Response } from 'express';
import { Notification, INotification } from '../models/Notification';
import { Template } from '../models/Template';
import { emailChannel } from '../channels/email';
import { smsChannel } from '../channels/sms';

const router = Router();

// Create notification
router.post('/', async (req: Request, res: Response) => {
  try {
    const { recipient, channel, subject, body, variables, metadata, scheduledAt } = req.body;

    if (!recipient || !channel || !body) {
      return res.status(400).json({ error: 'Missing required fields: recipient, channel, body' });
    }

    const notification = new Notification({
      recipient,
      channel,
      subject: subject || '',
      body,
      variables: variables || {},
      metadata: metadata || {},
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined
    });

    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Send notification immediately
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { recipient, channel, subject, body, variables, metadata } = req.body;

    if (!recipient || !channel || !body) {
      return res.status(400).json({ error: 'Missing required fields: recipient, channel, body' });
    }

    let result;
    if (channel === 'email') {
      result = await emailChannel.send({ to: recipient, subject: subject || '', body });
    } else if (channel === 'sms') {
      result = await smsChannel.send({ to: recipient, body });
    } else {
      return res.status(400).json({ error: `Unsupported channel: ${channel}` });
    }

    // Create notification record
    const notification = new Notification({
      recipient,
      channel,
      subject: subject || '',
      body,
      variables: variables || {},
      metadata: metadata || {},
      status: result.success ? 'sent' : 'failed',
      sentAt: result.success ? new Date() : undefined,
      error: result.error
    });

    await notification.save();

    res.json({
      success: result.success,
      notification,
      messageId: result.messageId,
      error: result.error
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Send using template
router.post('/send-template', async (req: Request, res: Response) => {
  try {
    const { templateName, channel, recipient, variables, metadata } = req.body;

    if (!templateName || !recipient) {
      return res.status(400).json({ error: 'Missing required fields: templateName, recipient' });
    }

    // Find template
    const template = await Template.findOne({ name: templateName, channel, isActive: true });
    if (!template) {
      return res.status(404).json({ error: `Template not found: ${templateName}` });
    }

    // Validate variables
    const missing = template.validateVariables(variables || {});
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing variables: ${missing.join(', ')}` });
    }

    // Render template
    const { subject, body } = template.render(variables || {});

    // Send notification
    let result;
    if (channel === 'email' || template.channel === 'email') {
      result = await emailChannel.send({ to: recipient, subject, body });
    } else if (channel === 'sms' || template.channel === 'sms') {
      result = await smsChannel.send({ to: recipient, body });
    } else {
      return res.status(400).json({ error: `Unsupported channel: ${channel || template.channel}` });
    }

    // Create notification record
    const notification = new Notification({
      recipient,
      channel: channel || template.channel,
      subject,
      body,
      variables: variables || {},
      metadata: { ...metadata, templateId: template._id, templateName: template.name },
      status: result.success ? 'sent' : 'failed',
      sentAt: result.success ? new Date() : undefined,
      error: result.error
    });

    await notification.save();

    res.json({
      success: result.success,
      notification,
      messageId: result.messageId,
      error: result.error
    });
  } catch (error) {
    console.error('Error sending template notification:', error);
    res.status(500).json({ error: 'Failed to send template notification' });
  }
});

// Get all notifications
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, channel, page = 1, limit = 20 } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (channel) query.channel = channel;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Notification.countDocuments(query);

    res.json({
      notifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get notification by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(notification);
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({ error: 'Failed to fetch notification' });
  }
});

// Update notification status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.status = status;
    if (status === 'delivered') {
      notification.deliveredAt = new Date();
    }

    await notification.save();
    res.json(notification);
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Get notification stats
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const stats = await Notification.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const byChannel = await Notification.aggregate([
      {
        $group: {
          _id: '$channel',
          count: { $sum: 1 }
        }
      }
    ]);

    const recent = await Notification.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.json({
      byStatus: stats,
      byChannel,
      last24h: recent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Delete notification
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ message: 'Notification deleted', notification });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export { router as notificationRoutes };
