/**
 * RAZO KEYBOARD - UNIFIED SERVICE
 *
 * Connects all RAZO services together
 * Single entry point for keyboard integration
 */

import express from 'express';
import cors from 'cors';

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
// SERVICE REGISTRY
// ============================================

const RAZO_SERVICES = {
  // Core
  cloud: { port: 4631, name: 'RAZO Cloud', desc: 'Sync + Voice' },
  vault: { port: 4632, name: 'RAZO Vault', desc: 'Passwords + Passkeys' },
  search: { port: 4633, name: 'RAZO Search', desc: 'App Launcher' },
  ai: { port: 4634, name: 'RAZO AI', desc: 'Genie + CoPilot + Grammar' },
  cleanup: { port: 4635, name: 'RAZO Cleanup', desc: 'Text cleanup' },
  snippets: { port: 4636, name: 'RAZO Snippets', desc: 'Phrase expansion' },

  // NEW - Core missing pieces
  predictive: { port: 4640, name: 'RAZO Predictive', desc: 'Next-word + Autocorrect' },
  intentRouter: { port: 4650, name: 'RAZO Intent Router', desc: 'Voice Typing vs Genie Mode' },
  suggestions: { port: 4651, name: 'RAZO Smart Suggestions', desc: 'Genie Briefs + Cards' },
  actionCards: { port: 4652, name: 'RAZO Action Cards', desc: 'Do It For Me' },
  commandBar: { port: 4653, name: 'RAZO Command Bar', desc: 'Slash commands' },
  deepLinks: { port: 4654, name: 'RAZO Deep Links', desc: 'Universal URLs' },
  keyboardFeed: { port: 4655, name: 'RAZO Keyboard Feed', desc: "Today's Story" },

  // Genie
  genieVoice: { port: 4760, name: 'Genie Voice', desc: 'Personal AI' },
  relationship: { port: 4702, name: 'Genie Relationship', desc: 'Relationship tracking' },

  // Memory
  memoryTier: { port: 4521, name: 'Memory Tier', desc: 'L1-L5 memory' },

  // Voice Ecosystem
  commTwin: { port: 4700, name: 'Communication Twin', desc: 'Voice style sync' },
  skillnet: { port: 4701, name: 'SkillNet Bridge', desc: 'Professional learning' },
  voiceSynthesis: { port: 4702, name: 'Voice Synthesis', desc: 'Personalized voice' },
  dashboard: { port: 4703, name: 'Learning Dashboard', desc: 'Analytics' },
};

// ============================================
// UNIFIED API
// ============================================

// Health check - all services
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'razo-unified',
    version: '1.0.0',
    services: Object.keys(RAZO_SERVICES).length,
    timestamp: new Date().toISOString(),
  });
});

// Get all service ports
app.get('/api/services', (req, res) => {
  res.json({
    services: RAZO_SERVICES,
    total: Object.keys(RAZO_SERVICES).length,
  });
});

// Voice mode selection
app.post('/api/voice/mode', async (req, res) => {
  const { text, userId, context } = req.body;

  // This routes to Intent Router (port 4650)
  // For now, return mock routing decision

  const lower = text?.toLowerCase() || '';

  let mode = 'voice_typing';
  let intent = null;

  if (lower.includes('hey genie') || lower.includes('genie')) {
    mode = 'genie';
    intent = 'general';
  } else if (lower.includes('hey copilot') || lower.includes('copilot')) {
    mode = 'copilot';
    intent = 'business';
  } else if (lower.includes('book') || lower.includes('order') || lower.includes('send')) {
    mode = 'action';
    intent = 'booking';
  }

  res.json({
    mode,
    intent,
    text: text,
    userId,
    // Which service to call
    route: {
      voiceTyping: 'voice-typing',
      genie: `http://localhost:${RAZO_SERVICES.genieVoice.port}/api/voice`,
      copilot: `http://localhost:${RAZO_SERVICES.ai.port}/copilot`,
      action: `http://localhost:${RAZO_SERVICES.actionCards.port}/api/execute`,
    },
  });
});

// Get keyboard suggestions
app.get('/api/keyboard/:userId', async (req, res) => {
  const { userId } = req.params;

  // This combines:
  // 1. Smart Suggestions (4651)
  // 2. Keyboard Feed (4655)
  // 3. Predictive (4640)

  res.json({
    userId,
    greeting: 'Good Morning',
    suggestions: [],
    feed: [],
    predictions: [],
    command: null,
  });
});

// Execute action
app.post('/api/execute', async (req, res) => {
  const { type, action, data, userId } = req.body;

  // Route to appropriate service
  switch (type) {
    case 'birthday':
      // Route to Action Cards (4652)
      res.json({ routed: 'action-cards', action });
      break;
    case 'deeplink':
      // Route to Deep Links (4654)
      res.json({ routed: 'deep-links', action });
      break;
    case 'genie':
      // Route to Genie (4760)
      res.json({ routed: 'genie', action });
      break;
    case 'command':
      // Route to Command Bar (4653)
      res.json({ routed: 'command-bar', action });
      break;
    default:
      res.json({ error: 'Unknown action type' });
  }
});

// Contextual typing suggestions
app.post('/api/typing', async (req, res) => {
  const { text, userId, app } = req.body;

  const lower = text?.toLowerCase() || '';
  const suggestions: any[] = [];

  // Context-aware suggestions
  if (lower.includes('flight')) {
    suggestions.push({
      type: 'deeplink',
      text: 'Search flights',
      icon: '✈️',
      action: 'airzy://flight-search',
    });
  }

  if (lower.includes('hotel')) {
    suggestions.push({
      type: 'deeplink',
      text: 'Book hotel',
      icon: '🏨',
      action: 'stayown://search',
    });
  }

  if (lower.includes('cab') || lower.includes('taxi')) {
    suggestions.push({
      type: 'deeplink',
      text: 'Book cab',
      icon: '🚗',
      action: 'khaimove://book',
    });
  }

  if (lower.includes('report') || lower.includes('sales')) {
    suggestions.push({
      type: 'genie',
      text: 'Generate report',
      icon: '📊',
      action: 'copilot://report',
    });
  }

  if (lower.includes('birthday')) {
    suggestions.push({
      type: 'genie',
      text: 'Generate birthday message',
      icon: '🎂',
      action: 'birthday:generate',
    });
  }

  if (lower.includes('email') || lower.includes('mail')) {
    suggestions.push({
      type: 'genie',
      text: 'Draft email',
      icon: '📧',
      action: 'email:draft',
    });
  }

  if (lower.startsWith('/')) {
    // Command bar
    suggestions.push({
      type: 'command',
      text: 'Command',
      icon: '⚡',
      action: 'command-bar',
    });
  }

  res.json({
    text,
    suggestions,
    count: suggestions.length,
  });
});

// Quick actions
app.get('/api/quick/:userId', async (req, res) => {
  const { userId } = req.params;

  const quickActions = [
    { label: 'Flight', icon: '✈️', action: 'airzy://flight-search', type: 'deeplink' },
    { label: 'Hotel', icon: '🏨', action: 'stayown://search', type: 'deeplink' },
    { label: 'Cab', icon: '🚗', action: 'khaimove://book', type: 'deeplink' },
    { label: 'Pay', icon: '💰', action: 'rezwallet://pay', type: 'deeplink' },
    { label: 'Doctor', icon: '🏥', action: 'risacare://doctor', type: 'deeplink' },
    { label: 'Food', icon: '🍔', action: 'nexha://food', type: 'deeplink' },
    { label: 'Genie', icon: '🤖', action: 'genie://ask', type: 'genie' },
    { label: 'Report', icon: '📊', action: 'copilot://report', type: 'copilot' },
  ];

  res.json({
    userId,
    actions: quickActions,
  });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🎹 RAZO KEYBOARD - UNIFIED SERVICE (${PORT})                  ║
║                                                                   ║
║   ═══════════════════════════════════════════════════════════    ║
║                                                                   ║
║   RAZO SERVICES (Ports 4631-4636):                                ║
║   • Cloud (4631) • Vault (4632) • Search (4633)                  ║
║   • AI (4634) • Cleanup (4635) • Snippets (4636)                  ║
║                                                                   ║
║   NEW - CORE FEATURES (Ports 4640-4655):                         ║
║   • Predictive (4640) - Next-word + Autocorrect                  ║
║   • Intent Router (4650) - Voice Typing vs Genie                 ║
║   • Smart Suggestions (4651) - Genie Briefs                       ║
║   • Action Cards (4652) - Do It For Me                            ║
║   • Command Bar (4653) - /flight /hotel /wallet                  ║
║   • Deep Links (4654) - rez:// universal URLs                    ║
║   • Keyboard Feed (4655) - Today's Story                          ║
║                                                                   ║
║   CONNECTED SERVICES:                                            ║
║   • Genie Voice (4760) • Memory (4521) • Twin (4700)             ║
║                                                                   ║
║   ═══════════════════════════════════════════════════════════    ║
║                                                                   ║
║   QUICK START:                                                   ║
║   POST /api/voice/mode     - Route voice input                   ║
║   GET  /api/keyboard/:uid  - Get keyboard suggestions            ║
║   POST /api/typing         - Contextual typing suggestions       ║
║   GET  /api/quick/:uid     - Quick actions                       ║
║   POST /api/execute        - Execute action                     ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});

export default app;