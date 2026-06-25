const { requireAuth } = require('@rtmn/shared/auth');
const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { installReadinessRoutes, autoSeed, normalizeSeedData } = require('@rtmn/shared/lib/genie-readiness');
const { llmComplete, isLLMAvailable } = require('@rtmn/shared/lib/llm');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const scenariosRoutes = require('./routes/scenarios');
const templatesRoutes = require('./routes/templates');

const app = express();

// Phase A: persistent stores for scenarios
const scenariosStore = new PersistentMap('simulations', { serviceName: 'genie-simulation' });
const templatesStore = new PersistentMap('sim-templates', { serviceName: 'genie-simulation' });

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4732;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use(requireAuth);

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/scenarios', scenariosRoutes({ scenariosStore }));
app.use('/templates', templatesRoutes({ templatesStore }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Genie Personal Simulation', port: PORT });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Genie Personal Simulation',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    endpoints: [
      '/health - Service health',
      '/scenarios/run/:userId - Run a new simulation (POST {scenario, variables})',
      '/scenarios/list/:userId - List all simulations',
      '/scenarios/get/:scenarioId - Get a specific simulation',
      '/scenarios/compare/:userId - Compare 2-3 simulations side-by-side',
      '/templates/list - List available scenario templates',
      '/templates/get/:templateId - Get a specific template'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Readiness probe
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// Phase A: production-readiness routes
installReadinessRoutes(app, { serviceName: 'genie-simulation' });

// Phase A: idempotent demo data seeding
const seedPlans = [
  {
    store: scenariosStore,
    items: normalizeSeedData([
      {
        id: 'sim-1',
        userId: 'user-001',
        title: 'Moving to Dubai',
        scenario: 'move',
        variables: { location: 'Dubai', job: 'Senior PM', salary: 'AED 420k' },
        outcomes: {
          financial: { short_term: 'Lower savings for 6 months due to setup costs', long_term: 'Higher disposable income, tax-free salary' },
          lifestyle: { climate: 'Hot, sunny 9 months/year', cost_of_living: 'Higher than current city', social: 'Expat community, weekend trips to Europe/Asia' },
          career: { growth: 'Faster promotion cycles in tech hubs', network: 'Strong MENA + South Asia exposure' },
          risks: ['Cultural adjustment', 'Distance from family', 'Geopolitical uncertainty'],
          opportunities: ['Tax-free income', 'Travel hub', 'Growing tech scene'],
          recommendation: 'A strong move if you can secure the role before going. Keep an exit plan in year 2.'
        },
        pros: ['Tax-free salary', 'Travel hub', 'Career acceleration'],
        cons: ['Distance from family', 'Cultural adjustment'],
        aiUsed: false,
        createdAt: '2026-06-15T10:00:00Z'
      }
    ]),
  },
  {
    store: templatesStore,
    items: normalizeSeedData([
      {
        id: 'tpl-move',
        category: 'life',
        title: 'Move to a new city',
        prompt: 'What if I move to {location}?',
        variables: ['location', 'job', 'salary'],
        outcomes: ['financial', 'lifestyle', 'social'],
        description: 'Test how a geographic move would affect your life'
      },
      {
        id: 'tpl-job',
        category: 'career',
        title: 'Take a new job',
        prompt: 'What if I take the job at {company}?',
        variables: ['company', 'role', 'salary', 'commute'],
        outcomes: ['financial', 'career', 'lifestyle'],
        description: 'Weigh the trade-offs of a new role'
      },
      {
        id: 'tpl-quit',
        category: 'career',
        title: 'Quit your job',
        prompt: 'What if I quit my job to {next_step}?',
        variables: ['next_step', 'savings', 'timeline'],
        outcomes: ['financial', 'career', 'risk'],
        description: 'See if you have the runway to make the leap'
      },
      {
        id: 'tpl-buy',
        category: 'finance',
        title: 'Buy a home',
        prompt: 'What if I buy a {property_type}?',
        variables: ['property_type', 'price', 'down_payment', 'location'],
        outcomes: ['financial', 'lifestyle', 'risk'],
        description: 'Model the financial and lifestyle impact of a purchase'
      },
      {
        id: 'tpl-marriage',
        category: 'life',
        title: 'Get married',
        prompt: 'What if {partner} and I get married?',
        variables: ['partner', 'timeline', 'lifestyle'],
        outcomes: ['relationship', 'financial', 'lifestyle'],
        description: 'Explore the implications of marriage'
      },
      {
        id: 'tpl-child',
        category: 'family',
        title: 'Have a child',
        prompt: 'What if we have a child in {timeline}?',
        variables: ['timeline', 'support', 'location'],
        outcomes: ['family', 'financial', 'lifestyle', 'career'],
        description: 'Plan around a new addition to the family'
      },
      {
        id: 'tpl-relocate',
        category: 'career',
        title: 'Remote work + travel',
        prompt: 'What if I go fully remote and travel?',
        variables: ['duration', 'budget', 'base'],
        outcomes: ['lifestyle', 'career', 'financial'],
        description: 'Test the digital-nomad lifestyle'
      }
    ]),
  },
];
const seeded = autoSeed(seedPlans, { serviceName: 'genie-simulation' });
if (seeded) console.log('[genie-simulation] demo data seeded');

const server = app.listen(PORT, () => {
  console.log(`🧪 Genie Personal Simulation running on port ${PORT}`);
});
installGracefulShutdown(server);

module.exports = app;