/**
 * Customer Success OS v1.0.0
 * Port: 4050
 * Purpose: Onboarding, NPS, Health Scores, Churn Prevention
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');

const app = express();

// Config
const PORT = process.env.PORT || 4050;
const JWT_SECRET = process.env.JWT_SECRET || 'cs-os-secret-key';

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Shared auth middleware
const { authMiddleware } = require('./shared/auth-middleware');
app.use('/api', authMiddleware);

// ============================================
// IN-MEMORY STORES (Replace with MongoDB in production)
// ============================================

const stores = {
  customers: new Map(),
  journeys: new Map(),
  npsSurveys: new Map(),
  healthScores: new Map(),
  churnRisks: new Map(),
  onboardingTasks: new Map(),
  checkins: new Map(),
  campaigns: new Map(),
  touchpoints: new Map(),
};

// Counters
let counters = {
  customers: 0,
  journeys: 0,
  surveys: 0,
  healthScores: 0,
  churnRisks: 0,
  tasks: 0,
  checkins: 0,
  campaigns: 0,
};

// ============================================
// CUSTOMER SUCCESS MODELS
// ============================================

const CustomerSuccess = {
  // Customer Profile
  createCustomer(data) {
    const id = `CS-${Date.now().toString(36).toUpperCase()}`;
    const customer = {
      id,
      name: data.name,
      email: data.email,
      company: data.company,
      plan: data.plan || 'starter',
      status: 'active',
      lifecycleStage: 'onboarding',
      csOwner: data.csOwner,
      createdAt: new Date(),
    };
    stores.customers.set(id, customer);
    counters.customers++;
    return customer;
  },

  getCustomer(id) {
    return stores.customers.get(id);
  },

  updateLifecycleStage(id, stage) {
    const customer = stores.customers.get(id);
    if (customer) {
      customer.lifecycleStage = stage;
      customer.lastActivity = new Date();
      stores.customers.set(id, customer);
    }
    return customer;
  },

  getAll() {
    return Array.from(stores.customers.values());
  },
};

// ============================================
// ONBOARDING JOURNEY
// ============================================

const OnboardingJourney = {
  create(data) {
    const id = `OJ-${Date.now().toString(36).toUpperCase()}`;
    const journey = {
      id,
      customerId: data.customerId,
      status: 'active',
      progress: 0,
      tasks: data.tasks || [],
      completedTasks: [],
      milestones: data.milestones || [],
      completedMilestones: [],
      startDate: new Date(),
      timeline: [],
    };
    stores.journeys.set(id, journey);
    counters.journeys++;
    return journey;
  },

  addTask(journeyId, task) {
    const journey = stores.journeys.get(journeyId);
    if (journey) {
      journey.tasks.push(task);
      journey.tasks[journey.tasks.length - 1].id = `TASK-${Date.now()}`;
      journey.tasks[journey.tasks.length - 1].status = 'pending';
      stores.journeys.set(journeyId, journey);
    }
    return journey;
  },

  completeTask(journeyId, taskId) {
    const journey = stores.journeys.get(journeyId);
    if (journey) {
      const task = journey.tasks.find(t => t.id === taskId);
      if (task) {
        task.status = 'completed';
        task.completedAt = new Date();
        journey.progress = Math.round(
          (journey.tasks.filter(t => t.status === 'completed').length / journey.tasks.length * 100)
        );
        stores.journeys.set(journeyId, journey);
      }
    }
    return journey;
  },
};

// ============================================
// NPS SURVEYS
// ============================================

const NPS = {
  send(customerId, data) {
    const id = `NPS-${Date.now().toString(36).toUpperCase()}`;
    const survey = {
      id,
      customerId,
      type: data.type || 'nps',
      score: null,
      responses: {},
      sentAt: new Date(),
      completedAt: null,
    };
    stores.npsSurveys.set(id, survey);
    counters.surveys++;
    return survey;
  },

  submitResponse(surveyId, score, feedback) {
    const survey = stores.npsSurveys.get(surveyId);
    if (survey) {
      survey.score = score;
      survey.responses = feedback;
      survey.completedAt = new Date();

      // Update customer health score
      const customer = stores.customers.get(survey.customerId);
      if (customer) {
        customer.npsScore = score;
        customer.npsHistory = customer.npsHistory || [];
        customer.npsHistory.push({ score, date: new Date() });
        stores.customers.set(survey.customerId, customer);
      }
    }
    return survey;
  },

  getTrends(customerId) {
    const surveys = Array.from(stores.npsSurveys.values())
      .filter(s => s.customerId === customerId)
      .sort((a, b) => a.completedAt - b.completedAt);

    const scores = surveys.map(s => s.score).filter(Boolean);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    return { surveys: surveys.length, avgScore: Math.round(avg * 10) / 10 };
  },
};

// ============================================
// HEALTH SCORES
// ============================================

const HealthScores = {
  calculate(customerId) {
    const customer = stores.customers.get(customerId);
    if (!customer) return null;

    // Factors
    const factors = {
      nps: customer.npsScore || 50,
      engagement: customer.engagement || 50,
      adoption: customer.productAdoption || 50,
      supportTickets: customer.supportResponseRate || 90,
    };

    // Weights
    const weights = {
      nps: 0.3,
      engagement: 0.25,
      adoption: 0.25,
      support: 0.2,
    };

    const score = Object.keys(factors).reduce((total, key) =>
      total + (factors[key] * weights[key]), 0
    );

    const health = {
      id: `HS-${Date.now()}`,
      customerId,
      score: Math.round(score),
      factors,
      status: score > 80 ? 'healthy' : score > 50 ? 'at_risk' : 'critical',
      calculatedAt: new Date(),
    };

    stores.healthScores.set(customerId, health);
    counters.healthScores++;
    return health;
  },

  get(customerId) {
    return stores.healthScores.get(customerId) || { score: 0 };
  },

  getAll() {
    return Array.from(stores.healthScores.values());
  },
};

// ============================================
// CHURN PREDICTION
// ============================================

const ChurnPredictor = {
  predict(customerId) {
    const customer = stores.customers.get(customerId);
    const health = stores.healthScores.get(customerId);
    const nps = NPS.getTrends(customerId);
    const journey = Array.from(stores.journeys.values()).find(j => j.customerId === customerId);

    // Risk factors
    const riskFactors = {
      lowNps: nps.avgScore < 7,
      poorHealth: health?.score < 50,
      stalledJourney: journey?.progress < 50,
      lowEngagement: customer?.lastActivity &&
        (Date.now() - new Date(customer.lastActivity)) > 7 * 24 * 60 * 60 * 1000,
    };

    const riskScore = Object.values(riskFactors).filter(Boolean).length * 25;
    const churnRisk = Math.min(100, riskScore);

    const prediction = {
      customerId,
      risk: churnRisk > 75 ? 'high' : churnRisk > 50 ? 'medium' : 'low',
      churnProbability: churnRisk,
      factors: riskFactors,
      recommendedActions: [
        churnRisk > 50 && 'Schedule executive check-in',
        riskFactors.lowNps && 'Send NPS survey',
        riskFactors.poorHealth && 'Review health score',
      ].filter(Boolean),
      predictedAt: new Date(),
    };

    stores.churnRisks.set(customerId, prediction);
    counters.churnRisks++;
    return prediction;
  },

  getRisks() {
    return Array.from(stores.churnRisks.values())
      .sort((a, b) => b.churnProbability - a.churnProbability);
  },
};

// ============================================
// CHECK-INS
// ============================================

const CheckIns = {
  schedule(customerId, data) {
    const id = `CI-${Date.now()}`;
    const checkin = {
      id,
      customerId,
      type: data.type,
      scheduledFor: new Date(data.date),
      status: 'scheduled',
      notes: data.notes,
      attendees: data.attendees || [],
    };
    stores.checkins.set(id, checkin);
    counters.checkins++;
    return checkin;
  },

  complete(id, outcomes) {
    const checkin = stores.checkins.get(id);
    if (checkin) {
      checkin.status = 'completed';
      checkin.outcomes = outcomes;
      checkin.completedAt = new Date();
      stores.checkins.set(id, checkin);

      // Update customer
      const customer = stores.customers.get(checkin.customerId);
      if (customer) {
        customer.lastCheckin = new Date();
        stores.customers.set(checkin.customerId, customer);
      }
    }
    return checkin;
  },

  getUpcoming(days = 7) {
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return Array.from(stores.checkins.values())
      .filter(c => c.scheduledFor < cutoff && c.status === 'scheduled')
      .sort((a, b) => a.scheduledFor - b.scheduledFor);
  },
};

// ============================================
// CS CAMPAIGNS
// ============================================

const CSCampaigns = {
  create(data) {
    const id = `CSC-${Date.now().toString(36).toUpperCase()}`;
    const campaign = {
      id,
      name: data.name,
      type: data.type,
      target: data.target || 'all',
      segments: data.segments || [],
      content: data.content,
      schedule: data.schedule,
      status: 'draft',
      metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 },
      createdAt: new Date(),
    };
    stores.campaigns.set(id, campaign);
    counters.campaigns++;
    return campaign;
  },

  launch(id) {
    const campaign = stores.campaigns.get(id);
    if (campaign) {
      campaign.status = 'active';
      campaign.launchedAt = new Date();
      campaign.metrics.sent = 100; // Mock
      stores.campaigns.set(id, campaign);
    }
    return campaign;
  },

  getMetrics(id) {
    return stores.campaigns.get(id)?.metrics || {};
  },

  getAll() {
    return Array.from(stores.campaigns.values());
  },
};

// ============================================
// ENGAGEMENT TRACKING
// ============================================

const Touchpoints = {
  track(customerId, type, data) {
    const touchpoint = {
      id: `TP-${Date.now()}`,
      customerId,
      type,
      data,
      timestamp: new Date(),
    };

    // Update customer engagement
    const customer = stores.customers.get(customerId);
    if (customer) {
      customer.engagement = (customer.engagement || 50) + 5;
      customer.lastActivity = new Date();
      stores.customers.set(customerId, customer);
    }

    return touchpoint;
  },

  history(customerId) {
    return Array.from(stores.touchpoints.values())
      .filter(t => t.customerId === customerId)
      .sort((a, b) => b.timestamp - a.timestamp);
  },
};

// ============================================
// REST API ROUTES
// ============================================

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'customer-success-os',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: counters,
  });
});

// Customer Success Management
app.get('/api/customers', (req, res) => {
  res.json({
    success: true,
    customers: CustomerSuccess.getAll(),
  });
});

app.get('/api/customers/:id', (req, res) => {
  const customer = CustomerSuccess.get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const health = HealthScores.get(req.params.id);
  const nps = NPS.getTrends(req.params.id);
  const churn = ChurnPredictor.predict(req.params.id);

  res.json({ success: true, customer: { ...customer, health, nps, churnRisk: churn } });
});

app.post('/api/customers', (req, res) => {
  const customer = CustomerSuccess.create(req.body);
  res.json({ success: true, customer });
});

app.patch('/api/customers/:id/lifecycle', (req, res) => {
  const customer = CustomerSuccess.updateLifecycleStage(req.params.id, req.body.stage);
  res.json({ success: true, customer });
});

// Onboarding Journeys
app.get('/api/journeys/:customerId', (req, res) => {
  const journey = Array.from(stores.journeys.values())
    .find(j => j.customerId === req.params.customerId);
  res.json({ success: true, journey: journey || null });
});

app.post('/api/journeys', (req, res) => {
  const journey = OnboardingJourney.create(req.body);
  res.json({ success: true, journey });
});

app.post('/api/journeys/:id/tasks', (req, res) => {
  const journey = OnboardingJourney.addTask(req.params.id, req.body);
  res.json({ success: true, journey });
});

app.post('/api/journeys/:id/complete-task/:taskId', (req, res) => {
  const journey = OnboardingJourney.completeTask(req.params.id, req.params.taskId);
  res.json({ success: true, journey });
});

// NPS Surveys
app.post('/api/nps/send', (req, res) => {
  const survey = NPS.send(req.body.customerId, req.body);
  res.json({ success: true, survey });
});

app.post('/api/nps/:id/respond', (req, res) => {
  const survey = NPS.submitResponse(req.params.id, req.body.score, req.body.feedback);
  res.json({ success: true, survey });
});

app.get('/api/nps/:customerId/trends', (req, res) => {
  const trends = NPS.getTrends(req.params.customerId);
  res.json({ success: true, trends });
});

// Health Scores
app.get('/api/health/:customerId', (req, res) => {
  const health = HealthScores.calculate(req.params.customerId);
  res.json({ success: true, health });
});

// Churn Prediction
app.get('/api/churn/predictions', (req, res) => {
  const risks = ChurnPredictor.getRisks();
  res.json({ success: true, risks });
});

app.post('/api/churn/:customerId/predict', (req, res) => {
  const prediction = ChurnPredictor.predict(req.params.customerId);
  res.json({ success: true, prediction });
});

// Check-ins
app.post('/api/checkins', (req, res) => {
  const checkin = CheckIns.schedule(req.body.customerId, req.body);
  res.json({ success: true, checkin });
});

app.get('/api/checkins/upcoming', (req, res) => {
  const checkins = CheckIns.getUpcoming();
  res.json({ success: true, checkins });
});

// CS Campaigns
app.get('/api/campaigns', (req, res) => {
  res.json({ success: true, campaigns: CSCampaigns.getAll() });
});

app.post('/api/campaigns', (req, res) => {
  const campaign = CSCampaigns.create(req.body);
  res.json({ success: true, campaign });
});

app.post('/api/campaigns/:id/launch', (req, res) => {
  const campaign = CSCampaigns.launch(req.params.id);
  res.json({ success: true, campaign });
});

// Touchpoints
app.post('/api/touchpoints', (req, res) => {
  const touchpoint = Touchpoints.track(req.body.customerId, req.body.type, req.body.data);
  res.json({ success: true, touchpoint });
});

app.get('/api/touchpoints/:customerId', (req, res) => {
  const history = Touchpoints.history(req.params.customerId);
  res.json({ success: true, history });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║    Customer Success OS v1.0.0                 ║
║    Port: ${PORT}                            ║
║                                        ║
║    Features:                             ║
║    ✅ Customer Success Tracking           ║
║    ✅ Onboarding Journeys                ║
║    ✅ NPS Surveys                      ║
║    ✅ Health Scores                     ║
║    ✅ Churn Prediction                  ║
║    ✅ Check-ins                         ║
║    ✅ CS Campaigns                     ║
║    ✅ Touchpoint Tracking               ║
╚═══════════════════════════════════════════════╝
  `);
});
