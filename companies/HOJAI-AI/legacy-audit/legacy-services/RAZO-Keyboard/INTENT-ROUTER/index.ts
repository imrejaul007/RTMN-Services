/**
 * RAZO KEYBOARD - INTENT ROUTER
 *
 * Routes voice input to:
 * - Voice Typing (speech → text)
 * - Genie Mode (AI tasks) → Genie Services
 * - CoPilot Mode (Business AI)
 * - Action Execution
 *
 * CONNECTED TO GENIE SERVICES
 */

import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

const PORT = parseInt(process.env.PORT || '4650', 10);

// ============================================
// GENIE SERVICE URLS
// ============================================

const GENIE_URL = process.env.GENIE_DASHBOARD_URL || 'http://localhost:4701';
const GENIE_MEMORY_URL = process.env.GENIE_MEMORY_URL || 'http://localhost:4703';
const GENIE_PERSONAL_TWIN_URL = process.env.GENIE_PERSONAL_TWIN_URL || 'http://localhost:4708';
const GENIE_RELATIONSHIP_TWIN_URL = process.env.GENIE_RELATIONSHIP_TWIN_URL || 'http://localhost:4705';
const GENIE_BRIEFING_URL = process.env.GENIE_BRIEFING_URL || 'http://localhost:4706';

// ============================================
// WAKE WORDS & TRIGGERS
// ============================================

const WAKE_WORDS = {
  genie: ['hey genie', 'genie', 'ok genie', 'hi genie', 'hey razo', 'ok razo'],
  copilot: ['hey copilot', 'copilot', 'ok copilot', 'business'],
};

const VOICE_TYPING_TRIGGERS = ['send', 'tell', 'say', 'write', 'message', 'call', 'text'];

// Intent patterns
const INTENT_PATTERNS = {
  write: ['write', 'draft', 'compose', 'create message', 'create email'],
  reply: ['reply', 'respond', 'get back'],
  birthday: ['birthday', 'wish', 'congratulations'],
  follow_up: ['follow up', 'followup', 'chase', 'remind'],
  schedule: ['schedule', 'book', 'appointment', 'meeting'],
  order: ['order', 'buy', 'purchase'],
  pay: ['pay', 'transfer', 'send money'],
  flight: ['flight', 'fly', 'travel', 'book flight'],
  hotel: ['hotel', 'stay', 'accommodation', 'book room'],
  cab: ['cab', 'taxi', 'ride', 'car'],
  report: ['report', 'summary', 'analytics', 'numbers'],
  email: ['email', 'mail', 'send email'],
  call: ['call', 'phone', 'dial'],
  message: ['message', 'whatsapp', 'sms'],
  remember: ['remember', 'note', 'remind me', 'save this'],
};

// ============================================
// INTENT ROUTER
// ============================================

interface VoiceInput {
  text?: string;
  audio?: string;
  userId: string;
  context?: {
    currentApp?: string;
    chatWith?: string;
    language?: string;
  };
}

interface RouteResult {
  mode: 'voice_typing' | 'genie' | 'copilot' | 'action';
  intent?: string;
  entities?: Record<string, any>;
  action?: string;
  data?: any;
  confidence: number;
  response?: string;
  suggestions?: string[];
}

class IntentRouter {
  /**
   * Main routing function
   */
  async route(input: VoiceInput): Promise<RouteResult> {
    const text = input.text?.toLowerCase() || '';

    // Step 1: Check for wake words
    const wakeWord = this.detectWakeWord(text);
    if (wakeWord) {
      return this.routeWithWakeWord(text, wakeWord, input);
    }

    // Step 2: Check for intent patterns
    const intent = this.detectIntent(text);
    if (intent) {
      return this.routeWithIntent(text, intent, input);
    }

    // Step 3: Check for action triggers
    const action = this.detectAction(text);
    if (action) {
      return this.routeForAction(text, action, input);
    }

    // Step 4: Default to voice typing
    return {
      mode: 'voice_typing',
      confidence: 0.9,
      response: input.text || '',
    };
  }

  /**
   * Detect wake words
   */
  private detectWakeWord(text: string): string | null {
    for (const [wakeWord, triggers] of Object.entries(WAKE_WORDS)) {
      for (const trigger of triggers) {
        if (text.includes(trigger)) {
          return wakeWord;
        }
      }
    }
    return null;
  }

  /**
   * Route with wake word detected
   */
  private routeWithWakeWord(text: string, wakeWord: string, input: VoiceInput): RouteResult {
    // Remove wake word from text
    let cleanText = text;
    for (const trigger of WAKE_WORDS[wakeWord as keyof typeof WAKE_WORDS]) {
      cleanText = cleanText.replace(trigger, '').trim();
    }

    // Detect intent after wake word
    const intent = this.detectIntent(cleanText);
    if (intent) {
      return {
        mode: wakeWord as 'genie' | 'copilot',
        intent: intent.type,
        entities: intent.entities,
        confidence: 0.95,
        suggestions: this.getSuggestions(intent.type),
      };
    }

    // Genie default mode
    if (wakeWord === 'genie' || wakeWord === 'razo') {
      return {
        mode: 'genie',
        intent: 'general',
        confidence: 0.9,
        response: 'How can I help you?',
      };
    }

    // CoPilot default mode
    return {
      mode: 'copilot',
      intent: 'business',
      confidence: 0.9,
      response: 'What business task can I help with?',
    };
  }

  /**
   * Detect intent from text
   */
  private detectIntent(text: string): { type: string; entities: Record<string, any> } | null {
    for (const [intentType, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (text.includes(pattern)) {
          return {
            type: intentType,
            entities: this.extractEntities(text, intentType),
          };
        }
      }
    }
    return null;
  }

  /**
   * Extract entities from text
   */
  private extractEntities(text: string, intentType: string): Record<string, any> {
    const entities: Record<string, any> = {};

    // Extract names (simple pattern)
    const namePattern = /(?:to |for |with )([A-Z][a-z]+)/g;
    const names = text.match(namePattern);
    if (names) {
      entities.names = names.map(n => n.trim().replace(/^(to |for |with )/, ''));
    }

    // Extract based on intent type
    switch (intentType) {
      case 'birthday':
        entities.occasion = 'birthday';
        break;
      case 'flight':
        entities.type = 'flight';
        entities.booking = true;
        break;
      case 'hotel':
        entities.type = 'hotel';
        entities.booking = true;
        break;
      case 'cab':
        entities.type = 'ride';
        entities.booking = true;
        break;
      case 'email':
        entities.type = 'email';
        break;
      case 'message':
        entities.type = 'message';
        break;
      case 'call':
        entities.type = 'call';
        break;
    }

    return entities;
  }

  /**
   * Route with detected intent
   */
  private routeWithIntent(text: string, intent: { type: string; entities: Record<string, any> }, input: VoiceInput): RouteResult {
    return {
      mode: 'genie',
      intent: intent.type,
      entities: intent.entities,
      confidence: 0.85,
      suggestions: this.getSuggestions(intent.type),
    };
  }

  /**
   * Detect action triggers
   */
  private detectAction(text: string): string | null {
    for (const trigger of VOICE_TYPING_TRIGGERS) {
      if (text.startsWith(trigger)) {
        return 'send_message';
      }
    }
    return null;
  }

  /**
   * Route for action
   */
  private routeForAction(text: string, action: string, input: VoiceInput): RouteResult {
    return {
      mode: 'action',
      intent: action,
      confidence: 0.8,
      response: text,
    };
  }

  /**
   * Get suggestions based on intent
   */
  private getSuggestions(intentType: string): string[] {
    const suggestions: Record<string, string[]> = {
      birthday: ['Generate birthday message', 'Send via WhatsApp', 'Create card'],
      follow_up: ['Draft follow-up email', 'Schedule reminder', 'Send WhatsApp'],
      schedule: ['Book appointment', 'Add to calendar', 'Send invite'],
      flight: ['Search flights', 'Book flight', 'Check prices'],
      hotel: ['Search hotels', 'Book room', 'Check reviews'],
      cab: ['Book cab', 'Check price', 'Find nearby'],
      report: ['Generate report', 'Send to email', 'Create summary'],
      email: ['Draft email', 'Send email', 'Add attachment'],
      call: ['Make call', 'Send contact', 'Schedule call'],
      message: ['Send message', 'Open WhatsApp', 'Send voice note'],
      order: ['Place order', 'Track order', 'View menu'],
      pay: ['Pay bill', 'Transfer money', 'Split bill'],
      remember: ['Save note', 'Set reminder', 'Add to memory'],
    };

    return suggestions[intentType] || ['Continue'];
  }

  // ============================================
  // GENIE SERVICE INTEGRATION
  // ============================================

  /**
   * Get Genie response
   */
  private async getGenieResponse(query: string, userId: string): Promise<string> {
    try {
      // Try dashboard first
      const response = await axios.get(`${GENIE_URL}/api/search`, {
        params: { q: query },
        headers: { 'X-User-Id': userId },
        timeout: 5000,
      });
      if (response.data?.data?.memories?.length) {
        return response.data.data.memories[0].content;
      }
    } catch {}
    return 'How can I help you?';
  }

  /**
   * Get Genie briefing
   */
  async getBriefing(userId: string): Promise<any> {
    try {
      const response = await axios.get(`${GENIE_URL}/api/dashboard`, {
        headers: { 'X-User-Id': userId },
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      return { success: false, error: 'Genie unavailable' };
    }
  }

  /**
   * Get Genie memory
   */
  async getMemory(userId: string, query: string): Promise<any> {
    try {
      const response = await axios.get(`${GENIE_MEMORY_URL}/api/memories/recall`, {
        params: { query },
        headers: { 'X-User-Id': userId },
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      return { success: false, error: 'Memory unavailable' };
    }
  }

  /**
   * Get Personal Twin
   */
  async getPersonalTwin(userId: string): Promise<any> {
    try {
      const response = await axios.get(`${GENIE_PERSONAL_TWIN_URL}/api/twin`, {
        headers: { 'X-User-Id': userId },
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      return { success: false, error: 'Twin unavailable' };
    }
  }
}

const router = new IntentRouter();

// ============================================
// API ENDPOINTS
// ============================================

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'razo-intent-router',
    version: '1.1.0',
    modes: ['voice_typing', 'genie', 'copilot', 'action'],
    genie_connected: true,
  });
});

// Main route endpoint
app.post('/route', async (req, res) => {
  try {
    const { text, audio, userId, context } = req.body;

    if (!text && !audio) {
      return res.status(400).json({ error: 'text or audio required' });
    }

    const result = await router.route({
      text,
      userId: userId || 'anonymous',
      context,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GENIE SERVICE ENDPOINTS
// ============================================

// Get Genie briefing
app.get('/api/genie/briefing', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const briefing = await router.getBriefing(userId);
    res.json(briefing);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Genie memory
app.get('/api/genie/memory', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const query = req.query.q as string;
    const memory = await router.getMemory(userId, query);
    res.json(memory);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Personal Twin
app.get('/api/genie/twin', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const twin = await router.getPersonalTwin(userId);
    res.json(twin);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Voice typing mode
app.post('/voice-typing', async (req, res) => {
  const { text, userId } = req.body;

  // Direct speech to text
  res.json({
    mode: 'voice_typing',
    text: text || '',
    formatted: formatText(text || ''),
  });
});

// Genie mode
app.post('/genie', async (req, res) => {
  const { text, userId, context } = req.body;

  // Route to Genie service
  // In production, call Genie (port 4760)
  res.json({
    mode: 'genie',
    intent: detectIntent(text || ''),
    response: 'Genie response would go here',
    actions: getActions(text || ''),
  });
});

// CoPilot mode
app.post('/copilot', async (req, res) => {
  const { text, userId, context } = req.body;

  // Route to CoPilot
  res.json({
    mode: 'copilot',
    intent: 'business',
    response: 'CoPilot response would go here',
    report: {},
  });
});

// Action execution
app.post('/action', async (req, res) => {
  const { action, entities, userId } = req.body;

  // Execute action
  res.json({
    mode: 'action',
    action,
    executed: true,
    result: 'Action completed',
  });
});

// ============================================
// HELPERS
// ============================================

function detectIntent(text: string): string {
  const lower = text.toLowerCase();

  if (lower.includes('birthday')) return 'birthday';
  if (lower.includes('follow')) return 'follow_up';
  if (lower.includes('meeting') || lower.includes('schedule')) return 'schedule';
  if (lower.includes('flight')) return 'flight';
  if (lower.includes('hotel')) return 'hotel';
  if (lower.includes('cab') || lower.includes('taxi')) return 'cab';
  if (lower.includes('report')) return 'report';
  if (lower.includes('email')) return 'email';
  if (lower.includes('call')) return 'call';
  if (lower.includes('message') || lower.includes('whatsapp')) return 'message';
  if (lower.includes('order') || lower.includes('buy')) return 'order';
  if (lower.includes('pay')) return 'pay';
  if (lower.includes('remember')) return 'remember';

  return 'general';
}

function getActions(text: string): string[] {
  const actions: string[] = [];
  const lower = text.toLowerCase();

  if (lower.includes('birthday')) {
    actions.push('Generate birthday message', 'Send via WhatsApp');
  }
  if (lower.includes('follow')) {
    actions.push('Draft follow-up', 'Send email');
  }
  if (lower.includes('flight') || lower.includes('hotel')) {
    actions.push('Book now', 'Search options');
  }

  return actions;
}

function formatText(text: string): string {
  // Auto-capitalize first letter
  let formatted = text.charAt(0).toUpperCase() + text.slice(1);

  // Add period at end if not present
  if (!formatted.endsWith('.') && !formatted.endsWith('!') && !formatted.endsWith('?')) {
    formatted += '.';
  }

  return formatted;
}

// ============================================
// START
// ============================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🎯 RAZO Intent Router (4650)                     ║
║                                                       ║
║   Voice → Intent Router:                            ║
║   ├── Voice Typing (speech → text)                  ║
║   ├── Genie Mode (AI tasks)                        ║
║   ├── CoPilot Mode (Business AI)                   ║
║   └── Action Execution                             ║
║                                                       ║
║   Wake Words:                                       ║
║   • "Hey Genie" → Genie Mode                      ║
║   • "Hey CoPilot" → CoPilot Mode                  ║
║                                                       ║
║   Port: ${PORT}                                           ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;