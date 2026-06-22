import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { whatsAppService } from '../services';
import crypto from 'crypto';

const router = Router();

const SendMessageSchema = z.object({
  to: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  type: z.enum(['text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'template', 'interactive']),
  text: z.object({ body: z.string().max(4096) }).optional(),
  image: z.object({ link: z.string().url().optional(), id: z.string().optional(), caption: z.string().optional() }).optional(),
  video: z.object({ link: z.string().url().optional(), id: z.string().optional(), caption: z.string().optional() }).optional(),
  audio: z.object({ link: z.string().url().optional(), id: z.string().optional() }).optional(),
  document: z.object({ link: z.string().url().optional(), id: z.string().optional(), caption: z.string().optional(), filename: z.string().optional() }).optional(),
  location: z.object({ latitude: z.number(), longitude: z.number(), name: z.string().optional(), address: z.string().optional() }).optional(),
  template: z.object({ name: z.string(), language: z.object({ code: z.string() }), components: z.array(z.any()).optional() }).optional(),
  interactive: z.any().optional()
});

// Verify webhook
router.get('/webhook/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (whatsAppService.verifyWebhook(mode as string, token as string, challenge as string)) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Webhook callback
router.post('/webhook/whatsapp', async (req: Request, res: Response) => {
  try {
    // Verify signature
    const signature = req.headers['x-hub-signature-256'] as string;
    const body = JSON.stringify(req.body);

    if (!verifySignature(body, signature)) {
      console.warn('Invalid webhook signature');
      return res.sendStatus(403);
    }

    const entry = req.body.entry?.[0];
    if (!entry) {
      return res.sendStatus(200);
    }

    // Process messages
    const changes = entry.changes || [];
    for (const change of changes) {
      const value = change.value;

      // Handle incoming messages
      if (value.messages) {
        for (const message of value.messages) {
          // Mark as delivered
          await whatsAppService.markAsRead(message.id);

          // Emit to connected clients (Socket.IO would handle this in production)
          console.log('Incoming message:', {
            from: message.from,
            type: message.type,
            text: message.text?.body
          });
        }
      }

      // Handle status updates
      if (value.statuses) {
        for (const status of value.statuses) {
          console.log('Message status:', {
            id: status.id,
            status: status.status,
            recipient: status.recipient_id
          });
        }
      }

      // Handle opt-in/opt-out
      if (value.contacts) {
        for (const contact of value.contacts) {
          console.log('Contact update:', contact.wa_id);
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

// Send message
router.post('/send', async (req: Request, res: Response) => {
  try {
    const validation = SendMessageSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.errors });
    }

    const messageId = await whatsAppService.send(validation.data);
    res.json({ success: true, messageId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send text
router.post('/send/text', async (req: Request, res: Response) => {
  try {
    const { to, body } = req.body;
    if (!to || !body) {
      return res.status(400).json({ success: false, error: 'to and body required' });
    }

    const result = await whatsAppService.sendText(to, body);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send image
router.post('/send/image', async (req: Request, res: Response) => {
  try {
    const { to, url, caption } = req.body;
    if (!to || !url) {
      return res.status(400).json({ success: false, error: 'to and url required' });
    }

    const result = await whatsAppService.sendImage(to, url, caption);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send video
router.post('/send/video', async (req: Request, res: Response) => {
  try {
    const { to, url, caption } = req.body;
    if (!to || !url) {
      return res.status(400).json({ success: false, error: 'to and url required' });
    }

    const result = await whatsAppService.sendVideo(to, url, caption);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send audio
router.post('/send/audio', async (req: Request, res: Response) => {
  try {
    const { to, url } = req.body;
    if (!to || !url) {
      return res.status(400).json({ success: false, error: 'to and url required' });
    }

    const result = await whatsAppService.sendAudio(to, url);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send document
router.post('/send/document', async (req: Request, res: Response) => {
  try {
    const { to, url, filename, caption } = req.body;
    if (!to || !url) {
      return res.status(400).json({ success: false, error: 'to and url required' });
    }

    const result = await whatsAppService.sendDocument(to, url, filename, caption);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send location
router.post('/send/location', async (req: Request, res: Response) => {
  try {
    const { to, latitude, longitude, name, address } = req.body;
    if (!to || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, error: 'to, latitude, longitude required' });
    }

    const result = await whatsAppService.sendLocation(to, latitude, longitude, name, address);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send buttons
router.post('/send/buttons', async (req: Request, res: Response) => {
  try {
    const { to, body, buttons, header } = req.body;
    if (!to || !body || !buttons) {
      return res.status(400).json({ success: false, error: 'to, body, and buttons required' });
    }

    const result = await whatsAppService.sendButtons(to, body, buttons, header);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send list
router.post('/send/list', async (req: Request, res: Response) => {
  try {
    const { to, body, buttonText, sections, header } = req.body;
    if (!to || !body || !buttonText || !sections) {
      return res.status(400).json({ success: false, error: 'to, body, buttonText, and sections required' });
    }

    const result = await whatsAppService.sendList(to, body, buttonText, sections, header);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send template
router.post('/send/template', async (req: Request, res: Response) => {
  try {
    const { to, templateName, languageCode, components } = req.body;
    if (!to || !templateName) {
      return res.status(400).json({ success: false, error: 'to and templateName required' });
    }

    const result = await whatsAppService.sendTemplate(to, templateName, languageCode, components);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get templates
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const templates = await whatsAppService.getTemplates();
    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create template
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const { name, language, category, components } = req.body;
    if (!name || !language || !category || !components) {
      return res.status(400).json({ success: false, error: 'name, language, category, and components required' });
    }

    const result = await whatsAppService.createTemplate({ name, language, category, components });
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get message status
router.get('/messages/:id/status', async (req: Request, res: Response) => {
  try {
    const status = await whatsAppService.getMessageStatus(req.params.id);
    res.json({ success: true, ...status });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload media
router.post('/media/upload', async (req: Request, res: Response) => {
  try {
    const { url, type } = req.body;
    if (!url || !type) {
      return res.status(400).json({ success: false, error: 'url and type required' });
    }

    const result = await whatsAppService.uploadMedia(url, type);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download media
router.get('/media/:id', async (req: Request, res: Response) => {
  try {
    const buffer = await whatsAppService.downloadMedia(req.params.id);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper: Verify webhook signature
function verifySignature(body: string, signature: string): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET || '';
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature || ''),
    Buffer.from(expectedSignature)
  );
}

export default router;
