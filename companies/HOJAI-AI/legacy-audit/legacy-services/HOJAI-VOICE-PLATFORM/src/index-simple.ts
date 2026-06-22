/**
 * HOJAI Voice Platform - Simplified Entry Point
 * Port: 4850
 *
 * Enterprise Voice AI for customer interactions
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4850', 10);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// ============================================
// TYPES
// ============================================

interface VoiceSession {
  id: string;
  userId: string;
  language: string;
  voice: string;
  transcript: string[];
  response: string;
  createdAt: Date;
  endedAt?: Date;
}

interface VoiceRequest {
  text?: string;
  audioUrl?: string;
  language?: string;
  voice?: string;
  userId?: string;
}

interface VoiceResponse {
  text: string;
  audioUrl?: string;
  confidence: number;
  language: string;
  duration?: number;
}

// In-memory session storage
const sessions = new Map<string, VoiceSession>();

// ============================================
// HEALTH ENDPOINTS
// ============================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'hojai-voice-platform',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', (req: Request, res: Response) => {
  res.json({ status: 'ready' });
});

app.get('/metrics', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  res.send(`
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total ${sessions.size}
# HELP service_up Service availability
# TYPE service_up gauge
service_up 1
  `.trim());
});

// ============================================
// VOICE API
// ============================================

/**
 * Text-to-Speech endpoint
 */
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, language = 'en', voice = 'alice' } = req.body as VoiceRequest;

    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    // Simulate TTS processing
    const response: VoiceResponse = {
      text,
      language,
      confidence: 0.95,
      duration: text.length * 0.05, // Approximate duration
    };

    res.json({ success: true, ...response });
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'TTS processing failed' });
  }
});

/**
 * Speech-to-Text endpoint
 */
app.post('/api/stt', async (req: Request, res: Response) => {
  try {
    const { audioUrl, language = 'en' } = req.body as VoiceRequest;

    if (!audioUrl) {
      return res.status(400).json({ error: 'audioUrl is required' });
    }

    // Simulate STT processing
    const transcript = 'Sample transcribed text from audio';

    res.json({
      success: true,
      transcript,
      language,
      confidence: 0.92,
    });
  } catch (error) {
    console.error('STT error:', error);
    res.status(500).json({ error: 'STT processing failed' });
  }
});

/**
 * Start a voice session
 */
app.post('/api/sessions', async (req: Request, res: Response) => {
  try {
    const { userId, language = 'en', voice = 'alice' } = req.body as VoiceRequest;

    const session: VoiceSession = {
      id: uuidv4(),
      userId: userId || 'anonymous',
      language,
      voice,
      transcript: [],
      response: '',
      createdAt: new Date(),
    };

    sessions.set(session.id, session);

    res.status(201).json({
      success: true,
      sessionId: session.id,
      language: session.language,
      voice: session.voice,
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * Process voice input in session
 */
app.post('/api/sessions/:id/input', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { text, audioUrl } = req.body as VoiceRequest;

    const session = sessions.get(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Process input
    if (text) {
      session.transcript.push(text);
    }

    // Generate response (simulated)
    const response = text
      ? `I heard you say: ${text}. How can I help you further?`
      : 'Please provide your input.';

    session.response = response;

    res.json({
      success: true,
      response,
      transcript: session.transcript,
    });
  } catch (error) {
    console.error('Input processing error:', error);
    res.status(500).json({ error: 'Failed to process input' });
  }
});

/**
 * End voice session
 */
app.post('/api/sessions/:id/end', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const session = sessions.get(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.endedAt = new Date();
    sessions.delete(id);

    res.json({
      success: true,
      sessionId: id,
      duration: (session.endedAt.getTime() - session.createdAt.getTime()) / 1000,
      transcriptLength: session.transcript.length,
    });
  } catch (error) {
    console.error('Session end error:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

/**
 * Get session details
 */
app.get('/api/sessions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const session = sessions.get(id);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({ success: true, session });
});

/**
 * List active sessions
 */
app.get('/api/sessions', (req: Request, res: Response) => {
  const activeSessions = Array.from(sessions.values())
    .filter(s => !s.endedAt)
    .map(s => ({
      id: s.id,
      userId: s.userId,
      language: s.language,
      voice: s.voice,
      transcriptLength: s.transcript.length,
      createdAt: s.createdAt,
    }));

  res.json({ success: true, count: activeSessions.length, sessions: activeSessions });
});

// ============================================
// VOICE AGENTS
// ============================================

/**
 * Customer Service Voice Agent
 */
app.post('/api/agents/customer-service', async (req: Request, res: Response) => {
  try {
    const { query, context } = req.body;

    // Simulated customer service response
    const responses = [
      { intent: 'order_status', response: 'Your order is being processed and will be delivered within 3-5 business days.' },
      { intent: 'refund', response: 'I have initiated a refund for your order. You will receive the amount within 5-7 business days.' },
      { intent: 'product_info', response: 'Our product features include free shipping, 30-day returns, and 24/7 customer support.' },
      { intent: 'complaint', response: 'I sincerely apologize for the inconvenience. I have escalated your concern to our support team.' },
    ];

    const matched = responses.find(r => query?.toLowerCase().includes(r.intent.replace('_', ' ')));
    const response = matched?.response || 'Thank you for contacting us. How can I assist you today?';

    res.json({
      success: true,
      response,
      intent: matched?.intent || 'general',
      confidence: 0.85,
    });
  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({ error: 'Agent processing failed' });
  }
});

/**
 * Voice Commerce Agent
 */
app.post('/api/agents/commerce', async (req: Request, res: Response) => {
  try {
    const { product, action, quantity = 1 } = req.body;

    if (!product) {
      return res.status(400).json({ error: 'product is required' });
    }

    // Simulated commerce response
    const response = action === 'order'
      ? `Order confirmed for ${quantity} x ${product}. Total amount will be charged to your account.`
      : `Product information for ${product}: High quality, best price guaranteed. Would you like to order?`;

    res.json({
      success: true,
      response,
      product,
      action: action || 'info',
      quantity,
    });
  } catch (error) {
    console.error('Commerce agent error:', error);
    res.status(500).json({ error: 'Commerce agent processing failed' });
  }
});

// ============================================
// SUPPORTED LANGUAGES
// ============================================

app.get('/api/languages', (req: Request, res: Response) => {
  res.json({
    success: true,
    languages: [
      { code: 'en-IN', name: 'English (India)', native: 'English' },
      { code: 'hi', name: 'Hindi', native: 'हिंदी' },
      { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
      { code: 'te', name: 'Telugu', native: 'తెలుగు' },
      { code: 'bn', name: 'Bengali', native: 'বাংলা' },
      { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
      { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
      { code: 'mr', name: 'Marathi', native: 'मराठी' },
      { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
      { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
      { code: 'ar', name: 'Arabic', native: 'العربية' },
      { code: 'ar-SA', name: 'Arabic (Saudi)', native: 'العربية السعودية' },
    ],
  });
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🎙️  HOJAI Voice Platform (${PORT})                   ║
║   Enterprise Voice AI for Customer Interactions       ║
║                                                       ║
║   Endpoints:                                        ║
║   GET  /health                                     ║
║   POST /api/tts                                     ║
║   POST /api/stt                                     ║
║   POST /api/sessions                                ║
║   POST /api/sessions/:id/input                      ║
║   POST /api/agents/customer-service                 ║
║   POST /api/agents/commerce                         ║
║   GET  /api/languages                               ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;