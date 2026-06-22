/**
 * HOJAI Communications Service
 * Port: 4520
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4520', 10);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Types
interface Message {
  id: string;
  from: string;
  to: string;
  type: 'email' | 'sms' | 'push' | 'whatsapp';
  subject?: string;
  body: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
}

interface Template {
  id: string;
  name: string;
  type: string;
  subject?: string;
  body: string;
  variables: string[];
}

const messages = new Map<string, Message>();
const templates = new Map<string, Template>();

// Health
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'hojai-communications', version: '1.0.0', uptime: process.uptime() });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', (req: Request, res: Response) => {
  res.json({ status: 'ready' });
});

app.get('/metrics', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  res.send('service_up 1\n');
});

// Send message
app.post('/api/messages', (req: Request, res: Response) => {
  const { from, to, type, subject, body } = req.body;

  if (!to || !body) {
    return res.status(400).json({ error: 'to and body are required' });
  }

  const message: Message = {
    id: uuidv4(),
    from: from || 'hojai@system.com',
    to,
    type: type || 'email',
    subject,
    body,
    status: 'pending',
  };

  messages.set(message.id, message);

  // Simulate sending
  setTimeout(() => {
    message.status = 'sent';
    message.sentAt = new Date();
    messages.set(message.id, message);

    setTimeout(() => {
      message.status = 'delivered';
      message.deliveredAt = new Date();
      messages.set(message.id, message);
    }, 100);
  }, 50);

  res.status(201).json({ success: true, message });
});

// Get messages
app.get('/api/messages', (req: Request, res: Response) => {
  const { type, status, from, to } = req.query;

  let list = Array.from(messages.values());

  if (type) list = list.filter(m => m.type === type);
  if (status) list = list.filter(m => m.status === status);
  if (from) list = list.filter(m => m.from === from);
  if (to) list = list.filter(m => m.to === to);

  res.json({ count: list.length, messages: list });
});

// Get message by ID
app.get('/api/messages/:id', (req: Request, res: Response) => {
  const message = messages.get(req.params.id);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }
  res.json(message);
});

// Templates
app.get('/api/templates', (req: Request, res: Response) => {
  const { type } = req.query;
  let list = Array.from(templates.values());

  if (type) list = list.filter(t => t.type === type);

  res.json({ count: list.length, templates: list });
});

app.post('/api/templates', (req: Request, res: Response) => {
  const { name, type, subject, body, variables } = req.body;

  if (!name || !body) {
    return res.status(400).json({ error: 'name and body are required' });
  }

  const template: Template = {
    id: uuidv4(),
    name,
    type: type || 'email',
    subject,
    body,
    variables: variables || [],
  };

  templates.set(template.id, template);
  res.status(201).json({ success: true, template });
});

app.post('/api/templates/:id/send', (req: Request, res: Response) => {
  const template = templates.get(req.params.id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const { to, variables } = req.body;

  let body = template.body;
  if (variables) {
    Object.entries(variables).forEach(([key, value]) => {
      body = body.replace(`{{${key}}}`, String(value));
    });
  }

  const message: Message = {
    id: uuidv4(),
    from: 'hojai@system.com',
    to,
    type: template.type as any,
    subject: template.subject,
    body,
    status: 'pending',
  };

  messages.set(message.id, message);

  setTimeout(() => {
    message.status = 'sent';
    message.sentAt = new Date();
    messages.set(message.id, message);
  }, 50);

  res.status(201).json({ success: true, message });
});

// Stats
app.get('/api/stats', (req: Request, res: Response) => {
  const typeCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};

  messages.forEach(m => {
    typeCounts[m.type] = (typeCounts[m.type] || 0) + 1;
    statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;
  });

  res.json({
    total: messages.size,
    byType: typeCounts,
    byStatus: statusCounts,
  });
});

app.listen(PORT, () => {
  console.log(`\n📧 HOJAI Communications Service (${PORT})\n`);
});

export default app;