/**
 * RAZO KEYBOARD - COMMAND BAR
 *
 * Slash commands for ecosystem navigation
 * /flight, /hotel, /wallet, /report, etc.
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

const PORT = parseInt(process.env.PORT || '4653', 10);

// ============================================
// RTNM APP REGISTRY
// ============================================

interface RTNMApp {
  id: string;
  name: string;
  icon: string;
  commands: string[];
  deeplinks: {
    app: string;
    web: string;
  };
  actions: AppAction[];
}

interface AppAction {
  name: string;
  command: string;
  deeplink: string;
  icon: string;
}

const RTNM_APPS: RTNMApp[] = [
  // Airzy - Travel
  {
    id: 'airzy',
    name: 'Airzy',
    icon: '✈️',
    commands: ['flight', 'fly', 'travel', 'book flight', 'airline'],
    deeplinks: {
      app: 'airzy://',
      web: 'https://airzy.com',
    },
    actions: [
      { name: 'Search Flights', command: 'flight', deeplink: 'airzy://flight-search', icon: '🔍' },
      { name: 'My Bookings', command: 'bookings', deeplink: 'airzy://bookings', icon: '📋' },
      { name: 'Check In', command: 'checkin', deeplink: 'airzy://checkin', icon: '✅' },
      { name: 'Flight Status', command: 'status', deeplink: 'airzy://flight-status', icon: '✈️' },
    ],
  },

  // StayOwn - Hospitality
  {
    id: 'stayown',
    name: 'StayOwn',
    icon: '🏨',
    commands: ['hotel', 'stay', 'room', 'accommodation', 'booking', 'hostel'],
    deeplinks: {
      app: 'stayown://',
      web: 'https://stayown.com',
    },
    actions: [
      { name: 'Search Hotels', command: 'hotel', deeplink: 'stayown://search', icon: '🔍' },
      { name: 'My Stays', command: 'stays', deeplink: 'stayown://bookings', icon: '📋' },
      { name: 'Room Service', command: 'room', deeplink: 'stayown://room-service', icon: '🍽️' },
      { name: 'Checkout', command: 'checkout', deeplink: 'stayown://checkout', icon: '🏁' },
    ],
  },

  // KHAIRMOVE - Mobility
  {
    id: 'khaimove',
    name: 'KHAIRMOVE',
    icon: '🚗',
    commands: ['cab', 'taxi', 'ride', 'car', 'auto', 'bike', 'driver'],
    deeplinks: {
      app: 'khaimove://',
      web: 'https://khaimove.com',
    },
    actions: [
      { name: 'Book Cab', command: 'cab', deeplink: 'khaimove://book', icon: '🚗' },
      { name: 'Auto', command: 'auto', deeplink: 'khaimove://book?type=auto', icon: '🛺' },
      { name: 'Outstation', command: 'outstation', deeplink: 'khaimove://outstation', icon: '🛣️' },
      { name: 'Rental', command: 'rental', deeplink: 'khaimove://rental', icon: '🚙' },
    ],
  },

  // REZ Wallet - Finance
  {
    id: 'wallet',
    name: 'REZ Wallet',
    icon: '💰',
    commands: ['wallet', 'pay', 'money', 'transfer', 'send', 'receive', 'cashback'],
    deeplinks: {
      app: 'rezwallet://',
      web: 'https://wallet.rtnm.digital',
    },
    actions: [
      { name: 'Pay', command: 'pay', deeplink: 'rezwallet://pay', icon: '💳' },
      { name: 'Send Money', command: 'send', deeplink: 'rezwallet://send', icon: '💸' },
      { name: 'Scan QR', command: 'scan', deeplink: 'rezwallet://scan', icon: '📷' },
      { name: 'Transactions', command: 'history', deeplink: 'rezwallet://history', icon: '📜' },
    ],
  },

  // RisaCare - Healthcare
  {
    id: 'risacare',
    name: 'RisaCare',
    icon: '🏥',
    commands: ['doctor', 'medical', 'health', 'hospital', 'clinic', 'medicine', 'appointment'],
    deeplinks: {
      app: 'risacare://',
      web: 'https://risacare.com',
    },
    actions: [
      { name: 'Book Doctor', command: 'doctor', deeplink: 'risacare://doctor', icon: '👨‍⚕️' },
      { name: 'Book Appointment', command: 'appointment', deeplink: 'risacare://appointment', icon: '📅' },
      { name: 'Order Medicine', command: 'medicine', deeplink: 'risacare://pharmacy', icon: '💊' },
      { name: 'Health Records', command: 'records', deeplink: 'risacare://records', icon: '📋' },
    ],
  },

  // Nexha - Commerce
  {
    id: 'nexha',
    name: 'Nexha',
    icon: '🛒',
    commands: ['order', 'shop', 'buy', 'food', 'grocery', 'delivery', 'product'],
    deeplinks: {
      app: 'nexha://',
      web: 'https://nexha.com',
    },
    actions: [
      { name: 'Order Food', command: 'food', deeplink: 'nexha://food', icon: '🍔' },
      { name: 'Grocery', command: 'grocery', deeplink: 'nexha://grocery', icon: '🛒' },
      { name: 'Products', command: 'shop', deeplink: 'nexha://products', icon: '📦' },
      { name: 'Track Order', command: 'track', deeplink: 'nexha://track', icon: '📍' },
    ],
  },

  // CorpPerks - Work
  {
    id: 'corpperks',
    name: 'CorpPerks',
    icon: '💼',
    commands: ['work', 'office', 'employee', 'hr', 'payroll', 'attendance', 'leave'],
    deeplinks: {
      app: 'corpperks://',
      web: 'https://corpperks.com',
    },
    actions: [
      { name: 'Attendance', command: 'attendance', deeplink: 'corpperks://attendance', icon: '✅' },
      { name: 'Leave', command: 'leave', deeplink: 'corpperks://leave', icon: '🏖️' },
      { name: 'Payroll', command: 'salary', deeplink: 'corpperks://payroll', icon: '💵' },
      { name: 'Directory', command: 'directory', deeplink: 'corpperks://directory', icon: '👥' },
    ],
  },

  // CoPilot - Business AI
  {
    id: 'copilot',
    name: 'CoPilot',
    icon: '📊',
    commands: ['report', 'sales', 'business', 'analytics', 'dashboard', 'leads', 'crm', 'revenue'],
    deeplinks: {
      app: 'copilot://',
      web: 'https://copilot.rtnm.digital',
    },
    actions: [
      { name: 'Sales Report', command: 'report', deeplink: 'copilot://report/sales', icon: '📈' },
      { name: 'Leads', command: 'leads', deeplink: 'copilot://leads', icon: '🔥' },
      { name: 'Revenue', command: 'revenue', deeplink: 'copilot://revenue', icon: '💰' },
      { name: 'Dashboard', command: 'dashboard', deeplink: 'copilot://dashboard', icon: '📊' },
    ],
  },

  // AssetMind - Investments
  {
    id: 'assetmind',
    name: 'AssetMind',
    icon: '📈',
    commands: ['investment', 'portfolio', 'stock', 'mutual fund', 'crypto', 'asset', 'wealth'],
    deeplinks: {
      app: 'assetmind://',
      web: 'https://assetmind.ai',
    },
    actions: [
      { name: 'Portfolio', command: 'portfolio', deeplink: 'assetmind://portfolio', icon: '💼' },
      { name: 'Stocks', command: 'stocks', deeplink: 'assetmind://stocks', icon: '📈' },
      { name: 'Watchlist', command: 'watchlist', deeplink: 'assetmind://watchlist', icon: '👀' },
      { name: 'Research', command: 'research', deeplink: 'assetmind://research', icon: '🔍' },
    ],
  },

  // Genie - Personal AI
  {
    id: 'genie',
    name: 'Genie',
    icon: '🤖',
    commands: ['genie', 'ai', 'assistant', 'remind', 'note', 'remember', 'task', 'todo'],
    deeplinks: {
      app: 'genie://',
      web: 'https://genie.rtnm.digital',
    },
    actions: [
      { name: 'Ask Genie', command: 'ask', deeplink: 'genie://ask', icon: '🤖' },
      { name: 'Reminders', command: 'remind', deeplink: 'genie://reminders', icon: '🔔' },
      { name: 'Tasks', command: 'task', deeplink: 'genie://tasks', icon: '✅' },
      { name: 'Notes', command: 'note', deeplink: 'genie://notes', icon: '📝' },
    ],
  },

  // Calendar
  {
    id: 'calendar',
    name: 'Calendar',
    icon: '📅',
    commands: ['calendar', 'meeting', 'schedule', 'event', 'appointment'],
    deeplinks: {
      app: 'calendar://',
      web: 'https://calendar.rtnm.digital',
    },
    actions: [
      { name: 'New Event', command: 'meeting', deeplink: 'calendar://new', icon: '➕' },
      { name: 'Today', command: 'today', deeplink: 'calendar://today', icon: '📅' },
      { name: 'Schedule Meeting', command: 'schedule', deeplink: 'calendar://schedule', icon: '📆' },
    ],
  },

  // WhatsApp
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: '💬',
    commands: ['whatsapp', 'message', 'chat', 'text'],
    deeplinks: {
      app: 'whatsapp://',
      web: 'https://web.whatsapp.com',
    },
    actions: [
      { name: 'New Chat', command: 'chat', deeplink: 'whatsapp://new', icon: '💬' },
      { name: 'Status', command: 'status', deeplink: 'whatsapp://status', icon: '📱' },
    ],
  },
];

// ============================================
// COMMAND PARSER
// ============================================

interface ParsedCommand {
  app?: RTNMApp;
  action?: AppAction;
  rawCommand: string;
  query?: string;
}

function parseCommand(input: string): ParsedCommand {
  const lower = input.toLowerCase().trim();
  const parts = lower.split(' ');
  const command = parts[0].replace('/', '');
  const query = parts.slice(1).join(' ');

  // Find matching app
  let matchedApp: RTNMApp | undefined;
  let matchedAction: AppAction | undefined;

  for (const app of RTNM_APPS) {
    // Check if command matches app commands
    if (app.commands.some(c => c === command || command.includes(c))) {
      matchedApp = app;

      // Find matching action
      for (const action of app.actions) {
        if (action.command === command || query.includes(action.command)) {
          matchedAction = action;
          break;
        }
      }

      break;
    }
  }

  return {
    app: matchedApp,
    action: matchedAction,
    rawCommand: input,
    query: query || undefined,
  };
}

// ============================================
// API ENDPOINTS
// ============================================

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'razo-command-bar',
    version: '1.0.0',
    commands: RTNM_APPS.map(a => `/${a.commands[0]}`),
  });
});

// Get all commands
app.get('/api/commands', (req, res) => {
  const commands = RTNM_APPS.map(app => ({
    id: app.id,
    name: app.name,
    icon: app.icon,
    command: `/${app.commands[0]}`,
    actions: app.actions.map(a => ({
      name: a.name,
      command: `/${a.command}`,
      icon: a.icon,
    })),
  }));

  res.json({ commands });
});

// Search commands
app.get('/api/search', (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.json({ results: [] });
  }

  const query = (q as string).toLowerCase();
  const results: any[] = [];

  for (const app of RTNM_APPS) {
    // Check app name
    if (app.name.toLowerCase().includes(query) || app.id.includes(query)) {
      results.push({
        type: 'app',
        app: app,
      });
    }

    // Check commands
    for (const cmd of app.commands) {
      if (cmd.includes(query)) {
        results.push({
          type: 'command',
          app: app,
          command: cmd,
          deeplink: app.deeplinks.app,
        });
      }
    }
  }

  res.json({ results: results.slice(0, 10) });
});

// Execute command
app.post('/api/execute', (req, res) => {
  const { command, userId } = req.body;

  const parsed = parseCommand(command);

  if (!parsed.app) {
    return res.status(404).json({
      error: 'Command not found',
      command,
      suggestion: 'Try /help for available commands',
    });
  }

  // Determine which deeplink to use
  const deeplink = parsed.action?.deeplink || parsed.app.deeplinks.app;

  res.json({
    success: true,
    app: {
      id: parsed.app.id,
      name: parsed.app.name,
      icon: parsed.app.icon,
    },
    action: parsed.action
      ? {
          name: parsed.action.name,
          deeplink: parsed.action.deeplink,
        }
      : null,
    deeplink,
    fallback: parsed.app.deeplinks.web,
    query: parsed.query,
  });
});

// Execute action directly
app.post('/api/action', (req, res) => {
  const { appId, actionCommand, query, userId } = req.body;

  const app = RTNM_APPS.find(a => a.id === appId);

  if (!app) {
    return res.status(404).json({ error: 'App not found' });
  }

  const action = app.actions.find(a => a.command === actionCommand);

  if (!action) {
    // Return all actions for this app
    return res.json({
      app: {
        id: app.id,
        name: app.name,
        icon: app.icon,
      },
      actions: app.actions.map(a => ({
        name: a.name,
        command: a.command,
        icon: a.icon,
        deeplink: a.deeplink,
      })),
    });
  }

  res.json({
    success: true,
    action: {
      name: action.name,
      deeplink: action.deeplink,
      icon: action.icon,
    },
    app: {
      id: app.id,
      name: app.name,
      icon: app.icon,
    },
    query,
  });
});

// Keyboard shortcut suggestions
app.post('/api/suggest', (req, res) => {
  const { text, userId } = req.body;

  if (!text.startsWith('/')) {
    return res.json({ suggestions: [] });
  }

  const query = text.slice(1).toLowerCase();
  const suggestions: any[] = [];

  for (const app of RTNM_APPS) {
    for (const action of app.actions) {
      if (action.command.includes(query) || app.name.toLowerCase().includes(query)) {
        suggestions.push({
          type: 'command',
          text: `/${action.command}`,
          label: action.name,
          icon: action.icon,
          app: {
            id: app.id,
            name: app.name,
            icon: app.icon,
          },
          deeplink: action.deeplink,
        });
      }
    }
  }

  // Also add help
  if ('help'.includes(query)) {
    suggestions.push({
      type: 'help',
      text: '/help',
      label: 'Show all commands',
      icon: '❓',
    });
  }

  res.json({
    suggestions: suggestions.slice(0, 5),
    raw: text,
  });
});

// Help - show all commands
app.get('/api/help', (req, res) => {
  const categories = {
    'Travel': RTNM_APPS.filter(a => ['airzy'].includes(a.id)),
    'Stay': RTNM_APPS.filter(a => ['stayown'].includes(a.id)),
    'Ride': RTNM_APPS.filter(a => ['khaimove'].includes(a.id)),
    'Finance': RTNM_APPS.filter(a => ['wallet', 'assetmind'].includes(a.id)),
    'Health': RTNM_APPS.filter(a => ['risacare'].includes(a.id)),
    'Commerce': RTNM_APPS.filter(a => ['nexha'].includes(a.id)),
    'Work': RTNM_APPS.filter(a => ['corpperks'].includes(a.id)),
    'AI': RTNM_APPS.filter(a => ['genie', 'copilot'].includes(a.id)),
  };

  res.json({ categories });
});

// Universal deep link for keyboard
app.get('/api/deeplink/:appId', (req, res) => {
  const { appId } = req.params;
  const { action, params } = req.query;

  const app = RTNM_APPS.find(a => a.id === appId);

  if (!app) {
    return res.status(404).json({ error: 'App not found' });
  }

  let deeplink = app.deeplinks.app;

  if (action) {
    const appAction = app.actions.find(a => a.command === action);
    if (appAction) {
      deeplink = appAction.deeplink;
    }
  }

  // Add params if provided
  if (params) {
    deeplink += `?${params}`;
  }

  res.json({
    app: app.id,
    deeplink,
    fallback: app.deeplinks.web,
  });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🎯 RAZO Command Bar (4653)                         ║
║                                                       ║
║   Slash Commands:                                    ║
║   /flight  /hotel  /cab  /wallet  /report           ║
║   /doctor  /food   /work  /genie    /calendar        ║
║                                                       ║
║   RTNM Ecosystem:                                    ║
║   Airzy • StayOwn • KHAIRMOVE • REZ Wallet          ║
║   RisaCare • Nexha • CorpPerks • CoPilot            ║
║   AssetMind • Genie                                 ║
║                                                       ║
║   Port: ${PORT}                                           ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;