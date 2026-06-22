import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { telecomBridge } from './services/TelecomService.js';
import { exotelService } from './services/ExotelService.js';
import { knowlarityService } from './services/KnowlarityService.js';

const app = express();
const PORT = process.env.PORT || 4860;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'hojai-telecom-bridge',
    provider: telecomBridge.getProvider(),
    exotelConfigured: exotelService.isConfigured(),
    knowlarityConfigured: knowlarityService.isConfigured()
  });
});

// ============ CALLS ============

// Make outbound call
app.post('/api/calls', async (req, res) => {
  try {
    const { to, from, agentId, customerId, context } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    const call = await telecomBridge.makeCall({
      to,
      from,
      agentId,
      customerId,
      context
    });

    res.json({ success: true, data: call });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get call metrics
app.get('/api/metrics', async (req, res) => {
  try {
    const { from, to } = req.query;
    const metrics = await telecomBridge.getMetrics({
      dateFrom: from ? new Date(from as string) : undefined,
      dateTo: to ? new Date(to as string) : undefined
    });

    res.json({ success: true, data: metrics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ CAMPAIGNS ============

// Create campaign
app.post('/api/campaigns', async (req, res) => {
  try {
    const { name, type, phoneNumbers, schedule, ivrFlowId } = req.body;

    if (!name || !phoneNumbers?.length) {
      return res.status(400).json({ error: 'Name and phone numbers required' });
    }

    const campaign = await telecomBridge.createCampaign({
      name,
      type: type || 'outbound',
      phoneNumbers,
      schedule: schedule ? new Date(schedule) : undefined,
      ivrFlowId,
      status: 'draft'
    });

    res.json({ success: true, data: campaign });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ SMS (Exotel) ============

// Send SMS
app.post('/api/sms', async (req, res) => {
  try {
    const { to, body, from } = req.body;

    if (!to || !body) {
      return res.status(400).json({ error: 'Phone number and message required' });
    }

    const result = await exotelService.sendSms(
      from || process.env.EXOTEL_SMS_SENDER || '',
      to,
      body
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ WEBHOOKS ============

// Exotel webhook
app.post('/webhooks/exotel', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const { CallSid, From, To, CallStatus, Duration, RecordingUrl } = req.body;

    console.log('[Exotel Webhook]', {
      callId: CallSid,
      from: From,
      to: To,
      status: CallStatus,
      duration: Duration
    });

    // Process webhook - emit to voice AI
    // This would integrate with your voice AI service

    res.sendStatus(200);
  } catch (error) {
    console.error('[Exotel Webhook] Error:', error);
    res.sendStatus(500);
  }
});

// Twilio webhook (fallback)
app.post('/webhooks/twilio', async (req, res) => {
  try {
    const { CallSid, From, To, CallStatus, RecordingUrl } = req.body;

    console.log('[Twilio Webhook]', {
      callId: CallSid,
      from: From,
      to: To,
      status: CallStatus
    });

    res.sendStatus(200);
  } catch (error) {
    console.error('[Twilio Webhook] Error:', error);
    res.sendStatus(500);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║        Hojai Telecom Bridge (${PORT})
╠══════════════════════════════════════════════════════════════════╣
║  Provider: ${telecomBridge.getProvider().padEnd(20)}                   ║
║  Exotel:   ${exotelService.isConfigured() ? '✓ Configured' : '✗ Not configured'}
║  Knowlarity: ${knowlarityService.isConfigured() ? '✓ Configured' : '✗ Not configured'}
╚══════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
