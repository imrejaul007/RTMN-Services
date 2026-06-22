import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { instagramService } from './services';

const app = express();
const PORT = process.env.PORT || 4930;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ verify: (req: any, res, buf) => {
  req.rawBody = buf;
} }));

// Instagram webhook verification
app.get('/webhook/instagram', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN || 'verify_token';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Instagram webhook callback
app.post('/webhook/instagram', async (req, res) => {
  // Verify signature
  const signature = req.headers['x-hub-signature'];
  if (!verifySignature(req.rawBody, signature as string)) {
    console.warn('Invalid signature');
    return res.sendStatus(403);
  }

  try {
    await instagramService.handleWebhook(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

// Conversations
app.get('/api/conversations', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const conversations = await instagramService.getConversations(tenantId);
    res.json({ success: true, data: conversations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/conversations/:id/messages', async (req, res) => {
  try {
    const messages = await instagramService.getMessages(req.params.id);
    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send DM
app.post('/api/send-dm', async (req, res) => {
  try {
    const { igUserId, message } = req.body;
    if (!igUserId || !message) {
      return res.status(400).json({ success: false, error: 'igUserId and message required' });
    }
    const result = await instagramService.sendDM(igUserId, message);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Auto-replies
app.post('/api/auto-replies', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const autoReply = await instagramService.createAutoReply({ tenantId, ...req.body });
    res.status(201).json({ success: true, data: autoReply });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/auto-replies', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const autoReplies = await instagramService.getAutoReplies(tenantId);
    res.json({ success: true, data: autoReplies });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Campaigns
app.post('/api/campaigns', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const campaign = await instagramService.createCampaign({ tenantId, ...req.body });
    res.status(201).json({ success: true, data: campaign });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/campaigns', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const campaigns = await instagramService.getCampaigns(tenantId);
    res.json({ success: true, data: campaigns });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'hojai-instagram-agent', version: '1.0.0' });
});

function verifySignature(body: Buffer, signature: string): boolean {
  const appSecret = process.env.INSTAGRAM_APP_SECRET || '';
  if (!appSecret || !signature) return true; // Skip in dev

  const expected = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

async function start() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai_instagram';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    app.listen(PORT, () => {
      console.log(`\n╔═══════════════════════════════╗\n║ HOJAI INSTAGRAM AGENT (${PORT})\n╚═══════════════════════════════╝\n`);
    });
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

start();
export default app;
