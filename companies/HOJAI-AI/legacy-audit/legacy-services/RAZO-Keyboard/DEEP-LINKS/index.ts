/**
 * RAZO KEYBOARD - UNIVERSAL DEEP LINKS
 *
 * rez:// URL scheme for entire RTNM ecosystem
 * Smart fallback to web if app not installed
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

const PORT = parseInt(process.env.PORT || '4654', 10);

// ============================================
// RTNM APP REGISTRY
// ============================================

interface AppInfo {
  id: string;
  name: string;
  icon: string;
  package?: string; // Android
  bundle?: string; // iOS
  deeplinks: {
    app: string;
    web: string;
  };
  installed?: boolean;
}

const RTNM_APPS: AppInfo[] = [
  {
    id: 'airzy',
    name: 'Airzy',
    icon: '✈️',
    package: 'com.rtnm.airzy',
    bundle: 'com.rtnm.airzy',
    deeplinks: {
      app: 'airzy://',
      web: 'https://airzy.com',
    },
  },
  {
    id: 'stayown',
    name: 'StayOwn',
    icon: '🏨',
    package: 'com.rtnm.stayown',
    bundle: 'com.rtnm.stayown',
    deeplinks: {
      app: 'stayown://',
      web: 'https://stayown.com',
    },
  },
  {
    id: 'khaimove',
    name: 'KHAIRMOVE',
    icon: '🚗',
    package: 'com.rtnm.khaimove',
    bundle: 'com.rtnm.khaimove',
    deeplinks: {
      app: 'khaimove://',
      web: 'https://khaimove.com',
    },
  },
  {
    id: 'wallet',
    name: 'REZ Wallet',
    icon: '💰',
    package: 'com.rtnm.wallet',
    bundle: 'com.rtnm.wallet',
    deeplinks: {
      app: 'rezwallet://',
      web: 'https://wallet.rtnm.digital',
    },
  },
  {
    id: 'risacare',
    name: 'RisaCare',
    icon: '🏥',
    package: 'com.rtnm.risacare',
    bundle: 'com.rtnm.risacare',
    deeplinks: {
      app: 'risacare://',
      web: 'https://risacare.com',
    },
  },
  {
    id: 'nexha',
    name: 'Nexha',
    icon: '🛒',
    package: 'com.rtnm.nexha',
    bundle: 'com.rtnm.nexha',
    deeplinks: {
      app: 'nexha://',
      web: 'https://nexha.com',
    },
  },
  {
    id: 'corpperks',
    name: 'CorpPerks',
    icon: '💼',
    package: 'com.rtnm.corpperks',
    bundle: 'com.rtnm.corpperks',
    deeplinks: {
      app: 'corpperks://',
      web: 'https://corpperks.com',
    },
  },
  {
    id: 'genie',
    name: 'Genie',
    icon: '🤖',
    package: 'com.rtnm.genie',
    bundle: 'com.rtnm.genie',
    deeplinks: {
      app: 'genie://',
      web: 'https://genie.rtnm.digital',
    },
  },
  {
    id: 'copilot',
    name: 'CoPilot',
    icon: '📊',
    package: 'com.rtnm.copilot',
    bundle: 'com.rtnm.copilot',
    deeplinks: {
      app: 'copilot://',
      web: 'https://copilot.rtnm.digital',
    },
  },
  {
    id: 'assetmind',
    name: 'AssetMind',
    icon: '📈',
    package: 'com.rtnm.assetmind',
    bundle: 'com.rtnm.assetmind',
    deeplinks: {
      app: 'assetmind://',
      web: 'https://assetmind.ai',
    },
  },
  {
    id: 'lawgens',
    name: 'LawGens',
    icon: '⚖️',
    package: 'com.rtnm.lawgens',
    bundle: 'com.rtnm.lawgens',
    deeplinks: {
      app: 'lawgens://',
      web: 'https://lawgens.com',
    },
  },
  {
    id: 'buzzlocal',
    name: 'BuzzLocal',
    icon: '📍',
    package: 'com.rtnm.buzzlocal',
    bundle: 'com.rtnm.buzzlocal',
    deeplinks: {
      app: 'buzzlocal://',
      web: 'https://buzzlocal.com',
    },
  },
];

// ============================================
// UNIVERSAL URL PARSER
// ============================================

interface ParsedURL {
  scheme: 'rez';
  app?: string;
  action?: string;
  params?: Record<string, string>;
  raw: string;
}

function parseRezURL(url: string): ParsedURL {
  // Format: rez://app/action?key=value
  const match = url.match(/^rez:\/\/([^/]+)(?:\/([^?]+))?(?:\?(.*))?$/);

  if (!match) {
    return { scheme: 'rez', raw: url };
  }

  const [, app, action, queryString] = match;
  const params: Record<string, string> = {};

  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
  }

  return {
    scheme: 'rez',
    app,
    action,
    params,
    raw: url,
  };
}

// ============================================
// SMART DEEPLINK RESOLVER
// ============================================

interface ResolveResult {
  success: boolean;
  app?: AppInfo;
  deeplink: string;
  fallback: string;
  isInstalled: boolean;
  action?: string;
  params?: Record<string, string>;
}

async function resolveDeeplink(
  appId: string,
  action?: string,
  params?: Record<string, string>
): Promise<ResolveResult> {
  const app = RTNM_APPS.find(a => a.id === appId);

  if (!app) {
    return {
      success: false,
      deeplink: '',
      fallback: '',
      isInstalled: false,
    };
  }

  // Build deeplink with action
  let deeplink = app.deeplinks.app;

  if (action) {
    deeplink += action;
  }

  // Add params
  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params).toString();
    deeplink += `?${queryString}`;
  }

  return {
    success: true,
    app,
    deeplink,
    fallback: app.deeplinks.web,
    isInstalled: app.installed || false,
    action,
    params,
  };
}

// ============================================
// CHECK APP INSTALLATION
// ============================================

async function checkInstallation(
  platform: 'android' | 'ios',
  packageName: string
): Promise<boolean> {
  // In production, use platform-specific APIs
  // For now, return mock data
  try {
    // Android: Use PackageManager
    if (platform === 'android') {
      // Mock check - in production call native code
      return true;
    }

    // iOS: Use canOpenURL
    if (platform === 'ios') {
      // Mock check - in production call native code
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

// ============================================
// API ENDPOINTS
// ============================================

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'razo-deep-links',
    version: '1.0.0',
    apps: RTNM_APPS.length,
  });
});

// Get all apps
app.get('/api/apps', (req, res) => {
  const apps = RTNM_APPS.map(app => ({
    id: app.id,
    name: app.name,
    icon: app.icon,
    deeplink: app.deeplinks.app,
    web: app.deeplinks.web,
  }));

  res.json({ apps });
});

// Resolve rez:// URL
app.post('/api/resolve', async (req, res) => {
  try {
    const { url, platform, userId } = req.body;

    const parsed = parseRezURL(url);

    if (!parsed.app) {
      return res.status(400).json({ error: 'Invalid rez:// URL' });
    }

    const result = await resolveDeeplink(parsed.app, parsed.action, parsed.params);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get deeplink for app
app.get('/api/deeplink/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const { action, params } = req.query;

    const result = await resolveDeeplink(
      appId,
      action as string,
      params ? JSON.parse(params as string) : undefined
    );

    if (!result.success) {
      return res.status(404).json({ error: 'App not found' });
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check installation status
app.post('/api/check-installed', async (req, res) => {
  try {
    const { platform, apps } = req.body;

    const results: Record<string, boolean> = {};

    for (const appId of apps) {
      const app = RTNM_APPS.find(a => a.id === appId);
      if (app) {
        const packageName = platform === 'android' ? app.package : app.bundle;
        results[appId] = await checkInstallation(platform, packageName || '');
      }
    }

    res.json({ installed: results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Search apps
app.get('/api/search', (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.json({ results: [] });
  }

  const query = (q as string).toLowerCase();
  const results = RTNM_APPS.filter(
    app =>
      app.name.toLowerCase().includes(query) ||
      app.id.includes(query)
  ).map(app => ({
    id: app.id,
    name: app.name,
    icon: app.icon,
    deeplink: app.deeplinks.app,
    web: app.deeplinks.web,
  }));

  res.json({ results });
});

// Generate deeplink with params
app.post('/api/generate', (req, res) => {
  try {
    const { appId, action, params } = req.body;

    const app = RTNM_APPS.find(a => a.id === appId);

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    // Build rez:// URL
    let url = `rez://${appId}`;

    if (action) {
      url += `/${action}`;
    }

    if (params && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    }

    res.json({
      url,
      app: {
        id: app.id,
        name: app.name,
        icon: app.icon,
      },
      deeplink: app.deeplinks.app + (action || ''),
      fallback: app.deeplinks.web,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Common deeplink patterns
app.get('/api/common', (req, res) => {
  const commonLinks = [
    // Travel
    { id: 'airzy-flight', app: 'airzy', action: 'flight-search', label: 'Search Flights', icon: '✈️' },
    { id: 'airzy-checkin', app: 'airzy', action: 'checkin', label: 'Flight Check-in', icon: '✅' },

    // Stay
    { id: 'stayown-search', app: 'stayown', action: 'search', label: 'Search Hotels', icon: '🏨' },
    { id: 'stayown-room', app: 'stayown', action: 'room-service', label: 'Room Service', icon: '🍽️' },

    // Ride
    { id: 'khaimove-book', app: 'khaimove', action: 'book', label: 'Book Cab', icon: '🚗' },
    { id: 'khaimove-auto', app: 'khaimove', action: 'book?type=auto', label: 'Book Auto', icon: '🛺' },

    // Wallet
    { id: 'wallet-pay', app: 'wallet', action: 'pay', label: 'Pay', icon: '💳' },
    { id: 'wallet-send', app: 'wallet', action: 'send', label: 'Send Money', icon: '💸' },
    { id: 'wallet-scan', app: 'wallet', action: 'scan', label: 'Scan QR', icon: '📷' },

    // Health
    { id: 'risacare-doctor', app: 'risacare', action: 'doctor', label: 'Book Doctor', icon: '👨‍⚕️' },
    { id: 'risacare-medicine', app: 'risacare', action: 'pharmacy', label: 'Order Medicine', icon: '💊' },

    // Commerce
    { id: 'nexha-food', app: 'nexha', action: 'food', label: 'Order Food', icon: '🍔' },
    { id: 'nexha-track', app: 'nexha', action: 'track', label: 'Track Order', icon: '📍' },

    // Work
    { id: 'corpperks-attendance', app: 'corpperks', action: 'attendance', label: 'Attendance', icon: '✅' },
    { id: 'corpperks-leave', app: 'corpperks', action: 'leave', label: 'Apply Leave', icon: '🏖️' },

    // AI
    { id: 'genie-ask', app: 'genie', action: 'ask', label: 'Ask Genie', icon: '🤖' },
    { id: 'copilot-report', app: 'copilot', action: 'report', label: 'Generate Report', icon: '📊' },

    // Finance
    { id: 'assetmind-portfolio', app: 'assetmind', action: 'portfolio', label: 'Portfolio', icon: '💼' },
  ];

  res.json({ commonLinks });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🎯 RAZO Deep Links (4654)                          ║
║                                                       ║
║   Universal URL Scheme:                              ║
║   rez://app/action?key=value                         ║
║                                                       ║
║   Examples:                                          ║
║   rez://airzy/flight-search?from=BLR&to=DEL          ║
║   rez://wallet/pay?amount=500                        ║
║   rez://genie/ask?query=book+flight                   ║
║                                                       ║
║   Apps: ${RTNM_APPS.length}                                                ║
║   Port: ${PORT}                                           ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;