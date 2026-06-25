/**
 * genie-widgets — Lock Screen & Home Screen Widgets (C10)
 *
 * Tiny data payloads (1-5KB) designed to be polled by iOS WidgetKit and
 * Android AppWidget providers. Each widget type returns just enough data
 * to render on the lock screen — no full app state.
 *
 * Widget types:
 *   - briefing    → Today's headline + mood + weather-style prompt
 *   - focus       → Current focus areas + next action
 *   - gratitude   → Today's gratitude item + streak
 *   - prayer      → Today's prayer + answered count
 *   - moment      → Latest life moment + days since
 *   - twin        → Twin headline + top 1 trait
 *   - counter     → Days since user started tracking a thing
 *   - countdown   → Days until a future event
 *
 * Plus: configuration store (which widgets are pinned, refresh interval).
 */

const { requireAuth } = require('@rtmn/shared/auth');
const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { installReadinessRoutes, autoSeed, normalizeSeedData } = require('@rtmn/shared/lib/genie-readiness');
const cors = require('cors');
const helmet = require('helmet');

const widgetRoutes = require('./routes/widgets');
const configRoutes = require('./routes/config');

requireEnv(['JWT_SECRET']);
const PORT = parseInt(process.env.PORT || '4734', 10);
const SERVICE_NAME = 'genie-widgets';

const widgetsStore = new PersistentMap('widgets', { serviceName: SERVICE_NAME });
const configStore = new PersistentMap('widget-configs', { serviceName: SERVICE_NAME });

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '256kb' }));  // tiny payloads
app.use(requireAuth);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Genie Lock-Screen Widgets', port: PORT });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Genie Lock-Screen Widgets',
    tagline: 'Tiny data payloads for your phone\'s home screen.',
    endpoints: [
      'GET    /widgets/types                                — List available widget types',
      'GET    /widgets/:type/:userId                        — Get widget payload (tiny)',
      'POST   /widgets/render/:userId                       — Render a widget bundle (all types in one call)',
      'GET    /widgets/manifest/:userId                     — WidgetKit + AppWidget JSON manifest',
      'GET    /config/:userId                               — Get widget configuration (which are pinned)',
      'POST   /config/:userId                               — Update widget configuration',
      'POST   /config/:userId/pin/:widgetType               — Pin a widget',
      'POST   /config/:userId/unpin/:widgetType             — Unpin a widget',
    ],
  });
});

app.use('/widgets', widgetRoutes({ widgetsStore }));
app.use('/config', configRoutes({ configStore }));

installReadinessRoutes(app, {
  serviceName: SERVICE_NAME,
  stores: [widgetsStore, configStore],
});

// Seed: default config (no widgets pinned yet) + widget definitions
autoSeed([
  {
    store: configStore,
    items: normalizeSeedData([
      {
        id: 'cfg-user-001',
        userId: 'user-001',
        pinned: ['briefing', 'gratitude'],
        refreshIntervalMin: 30,
        theme: 'dark',
        updatedAt: new Date().toISOString(),
      }
    ]),
  },
]);

const server = app.listen(PORT, () => {
  console.log(`Genie Lock-Screen Widgets running on port ${PORT}`);
});

installGracefulShutdown(server);
