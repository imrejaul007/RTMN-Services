import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

interface MessageRequest {
  channel: 'email' | 'sms' | 'whatsapp';
  to: string;
  from?: string;
  subject?: string;
  body: string;
  metadata?: Record<string, any>;
  scheduled_at?: string;
}

interface MessageResponse {
  id: string;
  channel: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  to: string;
  from: string;
  message_id?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// In-memory message log
const messageLog: MessageResponse[] = [];

// Validate message request
function validateMessage(req: MessageRequest): string | null {
  if (!req.channel || !['email', 'sms', 'whatsapp'].includes(req.channel)) {
    return 'Invalid channel. Must be email, sms, or whatsapp.';
  }
  if (!req.to) {
    return 'Recipient (to) is required.';
  }
  if (!req.body || req.body.trim().length === 0) {
    return 'Message body is required.';
  }
  if (req.channel === 'email' && !req.subject) {
    return 'Email subject is required.';
  }
  return null;
}

// Generate mock message ID based on channel
function generateMessageId(channel: string): string {
  const prefix = channel === 'email' ? 'msg_' : channel === 'sms' ? 'sms_' : 'wa_';
  return prefix + randomUUID().slice(0, 12);
}

// POST /api/message/send - Send message
router.post('/send', (req: Request, res: Response) => {
  const message = req.body as MessageRequest;

  const validationError = validateMessage(message);
  if (validationError) {
    res.status(400).json({
      success: false,
      error: validationError
    });
    return;
  }

  // Generate message ID
  const messageId = generateMessageId(message.channel);

  // Mock send response
  const response: MessageResponse = {
    id: randomUUID(),
    channel: message.channel,
    status: 'sent',
    to: message.to,
    from: message.from || getDefaultFrom(message.channel),
    message_id: messageId,
    timestamp: new Date().toISOString(),
    metadata: message.metadata
  };

  // Log message
  messageLog.push(response);

  // Simulate email-specific data
  if (message.channel === 'email') {
    response.metadata = {
      ...response.metadata,
      subject: message.subject,
      provider: 'sendgrid',
      message_id: messageId + '@rtmn.io',
      tracking_enabled: true,
      opens_tracked: true,
      clicks_tracked: true
    };
  }

  // Simulate SMS-specific data
  if (message.channel === 'sms') {
    response.metadata = {
      ...response.metadata,
      segments: Math.ceil(message.body.length / 160),
      provider: 'twilio',
      cost: '$0.0075'
    };
  }

  // Simulate WhatsApp-specific data
  if (message.channel === 'whatsapp') {
    response.metadata = {
      ...response.metadata,
      provider: 'whatsapp-business',
      template_name: 'custom',
      media_urls: []
    };
  }

  res.status(201).json({
    success: true,
    data: response,
    message: `${message.channel.toUpperCase()} message sent successfully`
  });
});

// GET /api/message/status/:id - Get message status
router.get('/status/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const message = messageLog.find(m => m.id === id || m.message_id === id);

  if (!message) {
    res.status(404).json({
      success: false,
      error: 'Message not found'
    });
    return;
  }

  // Mock delivery status update
  const statusUpdate = {
    ...message,
    status: 'delivered' as const,
    delivered_at: new Date(Date.now() + 5000).toISOString()
  };

  res.json({
    success: true,
    data: statusUpdate
  });
});

// GET /api/message/log - Get message log
router.get('/log', (req: Request, res: Response) => {
  const { limit = '50', channel, status } = req.query;

  let filtered = [...messageLog];

  if (channel) {
    filtered = filtered.filter(m => m.channel === channel);
  }

  if (status) {
    filtered = filtered.filter(m => m.status === status);
  }

  // Sort by timestamp descending
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const limitNum = Math.min(parseInt(limit as string) || 50, 500);
  filtered = filtered.slice(0, limitNum);

  res.json({
    success: true,
    data: {
      messages: filtered,
      total: filtered.length,
      stats: {
        total: messageLog.length,
        by_channel: {
          email: messageLog.filter(m => m.channel === 'email').length,
          sms: messageLog.filter(m => m.channel === 'sms').length,
          whatsapp: messageLog.filter(m => m.channel === 'whatsapp').length
        },
        by_status: {
          sent: messageLog.filter(m => m.status === 'sent').length,
          delivered: messageLog.filter(m => m.status === 'delivered').length,
          failed: messageLog.filter(m => m.status === 'failed').length
        }
      }
    }
  });
});

function getDefaultFrom(channel: string): string {
  switch (channel) {
    case 'email':
      return process.env.EMAIL_FROM || 'noreply@rtmn.io';
    case 'sms':
      return process.env.TWILIO_PHONE_NUMBER || '+1234567890';
    case 'whatsapp':
      return process.env.TWILIO_PHONE_NUMBER || '+1234567890';
    default:
      return 'unknown';
  }
}

export default router;
