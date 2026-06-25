/**
 * Business Copilot - 24 Industry Skill Packs
 * Port 4600
 *
 * AI Copilot that understands business across 24 industries
 * with 120+ specialized skills
 */

const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require("uuid");
const rezIntel = require("./rez-intel-client");

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4600;

// Logger
const logger = {
  info: (msg, meta = {}) => console.log(`[${new Date().toISOString()}] INFO: ${msg}`, meta),
  error: (msg, meta = {}) => console.error(`[${new Date().toISOString()}] ERROR: ${msg}`, meta)
};

// ==================== 24 INDUSTRY SKILL PACKS ====================

const INDUSTRY_SKILLS = {
  restaurant: {
    name: 'Restaurant',
    port: 5010,
    skills: [
      'menu_optimization', 'inventory_management', 'staff_scheduling', 'table_reservations',
      'customer_feedback', 'table_turnover', 'food_cost_analysis', 'peak_hour_planning',
      'supplier_management', 'hygiene_compliance', 'special_offer_planning', 'review_management'
    ]
  },
  hotel: {
    name: 'Hotel',
    port: 5025,
    skills: [
      'room_pricing', 'occupancy_optimization', 'guest_checkin', 'housekeeping_scheduling',
      'concierge_services', 'event_management', 'revenue_forecasting', 'amenity_management',
      'cancellation_policy', 'loyalty_program', 'review_response', 'upselling_techniques'
    ]
  },
  healthcare: {
    name: 'Healthcare',
    port: 5020,
    skills: [
      'patient_intake', 'appointment_scheduling', 'billing_coding', 'insurance_claims',
      'medical_records', 'treatment_plans', 'bed_management', 'staff_credentials',
      'inventory_management', 'compliance_tracking', 'patient_followup', 'emergency_protocol'
    ]
  },
  retail: {
    name: 'Retail',
    port: 5030,
    skills: [
      'inventory_control', 'visual_merchandising', 'customer_segmentation', 'loyalty_programs',
      'pricing_strategy', 'supplier_negotiation', 'loss_prevention', 'POS_operations',
      'e_commerce', 'returns_management', 'staff_training', 'seasonal_planning'
    ]
  },
  legal: {
    name: 'Legal',
    port: 5035,
    skills: [
      'case_management', 'document_review', 'contract_analysis', 'client_intake',
      'billing_management', 'deadline_tracking', 'evidence_organization', 'deposition_notes',
      'motion_filing', 'settlement_calculations', 'case_research', 'compliance_checking'
    ]
  },
  education: {
    name: 'Education',
    port: 5060,
    skills: [
      'student_enrollment', 'grade_management', 'curriculum_planning', 'attendance_tracking',
      'parent_communication', 'assessment_design', 'resource_allocation', 'faculty_scheduling',
      'admission_process', 'scholarship_management', 'student_records', 'feedback_collection'
    ]
  },
  agriculture: {
    name: 'Agriculture',
    port: 5070,
    skills: [
      'crop_planning', 'irrigation_scheduling', 'pest_management', 'harvest_planning',
      'soil_analysis', 'weather_planning', 'equipment_maintenance', 'market_pricing',
      'livestock_management', 'feed_optimization', 'certification_tracking', 'grant_applications'
    ]
  },
  automotive: {
    name: 'Automotive',
    port: 5080,
    skills: [
      'vehicle_diagnostics', 'service_scheduling', 'parts_inventory', 'customer_history',
      'warranty_claims', 'pricing_estimates', 'loan_financing', 'trade_in_evaluation',
      'fleet_management', 'technician_scheduling', 'parts_ordering', 'customer_retention'
    ]
  },
  beauty: {
    name: 'Beauty',
    port: 5090,
    skills: [
      'appointment_booking', 'service_pricing', 'product_recommendations', 'inventory_management',
      'staff_certifications', 'treatment_protocols', 'customer_preferences', 'loyalty_programs',
      'marketing_campaigns', 'seasonal_trends', 'supplier_relations', 'review_management'
    ]
  },
  fashion: {
    name: 'Fashion',
    port: 5095,
    skills: [
      'trend_analysis', 'inventory_planning', 'visual_merchandising', 'supplier_management',
      'size_optimization', 'pricing_strategy', 'seasonal_collections', 'markdown_planning',
      'customer_profiling', 'sustainability_tracking', 'returns_analysis', 'social_media'
    ]
  },
  fitness: {
    name: 'Fitness',
    port: 5110,
    skills: [
      'member_checkin', 'class_scheduling', 'trainer_management', 'membership_billing',
      'progress_tracking', 'nutrition_planning', 'equipment_maintenance', 'facility_hours',
      'event_hosting', 'partner_programs', 'personal_training', 'renewal_tracking'
    ]
  },
  gaming: {
    name: 'Gaming',
    port: 5120,
    skills: [
      'player_acquisition', 'retention_campaigns', 'in_game_purchases', 'tournament_management',
      'matchmaking', 'leaderboard_management', 'content_moderation', 'server_monitoring',
      'esports_scheduling', 'sponsorship_management', 'streaming_analytics', 'community_management'
    ]
  },
  government: {
    name: 'Government',
    port: 5130,
    skills: [
      'citizen_intake', 'permit_processing', 'service_delivery', 'feedback_collection',
      'compliance_tracking', 'budget_management', 'public_records', 'appointment_scheduling',
      'notification_systems', 'audit_management', 'vendor_procurement', 'policy_management'
    ]
  },
  home_services: {
    name: 'Home Services',
    port: 5140,
    skills: [
      'job_scheduling', 'route_optimization', 'quote_generation', 'customer_communication',
      'inventory_management', 'technician_tracking', 'warranty_management', 'payment_processing',
      'feedback_collection', 'upselling_services', 'parts_ordering', 'time_tracking'
    ]
  },
  manufacturing: {
    name: 'Manufacturing',
    port: 5150,
    skills: [
      'production_planning', 'quality_control', 'inventory_management', 'equipment_maintenance',
      'safety_compliance', 'supply_chain', 'cost_accounting', 'work_order_management',
      'labor_scheduling', 'waste_management', 'compliance_reporting', 'efficiency_tracking'
    ]
  },
  non_profit: {
    name: 'Non-Profit',
    port: 5160,
    skills: [
      'donor_management', 'fundraising_campaigns', 'grant_tracking', 'volunteer_management',
      'impact_reporting', 'event_coordination', 'member_communication', 'compliance_tracking',
      'budget_management', 'awareness_campaigns', 'partnership_development', 'donation_tracking'
    ]
  },
  professional: {
    name: 'Professional Services',
    port: 5170,
    skills: [
      'client_intake', 'project_management', 'resource_allocation', 'billing_management',
      'contract_review', 'time_tracking', 'capacity_planning', 'client_communication',
      'proposal_generation', 'expense_tracking', 'team_collaboration', 'performance_metrics'
    ]
  },
  sports: {
    name: 'Sports',
    port: 5180,
    skills: [
      'ticket_sales', 'venue_management', 'fan_engagement', 'sponsorship_management',
      'athlete_performance', 'schedule_management', 'merchandise_sales', 'concessions',
      'membership_management', 'media_relations', 'facility_booking', 'event_coordination'
    ]
  },
  travel: {
    name: 'Travel',
    port: 5190,
    skills: [
      'booking_management', 'itinerary_planning', 'visa_processing', 'insurance_sales',
      'package_creation', 'customer_support', 'supplier_negotiation', 'destination_expertise',
      'group_bookings', 'loyalty_programs', 'review_management', 'crisis_management'
    ]
  },
  entertainment: {
    name: 'Entertainment',
    port: 5200,
    skills: [
      'event_scheduling', 'ticket_pricing', 'venue_booking', 'artist_management',
      'content_licensing', 'marketing_campaigns', 'audience_analysis', 'sponsorship_deals',
      'production_planning', 'media_coverage', 'merchandise_planning', 'fan_interactions'
    ]
  },
  construction: {
    name: 'Construction',
    port: 5210,
    skills: [
      'project_planning', 'material_tracking', 'crew_scheduling', 'budget_management',
      'permit_tracking', 'subcontractor_management', 'safety_compliance', 'equipment_rental',
      'change_orders', 'inspection_scheduling', 'payment_applications', 'documentation'
    ]
  },
  financial: {
    name: 'Financial Services',
    port: 5220,
    skills: [
      'account_management', 'transaction_processing', 'risk_assessment', 'compliance_reporting',
      'portfolio_management', 'client_onboarding', 'fee_calculations', 'audit_support',
      'regulatory_filing', 'fraud_detection', 'statement_generation', 'advisory_services'
    ]
  },
  real_estate: {
    name: 'Real Estate',
    port: 5230,
    skills: [
      'property_listing', 'lead_qualification', 'showing_scheduling', 'offer_management',
      'market_analysis', 'comparable_analysis', 'mortgage_tracking', 'inspection_coordination',
      'closing_preparation', 'rental_management', 'maintenance_requests', 'lease_tracking'
    ]
  },
  transport: {
    name: 'Transportation',
    port: 5240,
    skills: [
      'fleet_management', 'route_optimization', 'driver_scheduling', 'maintenance_tracking',
      'fuel_management', 'compliance_tracking', 'dispatch_operations', 'customer_tracking',
      'delivery_scheduling', 'invoice_management', 'safety_records', 'performance_metrics'
    ]
  }
};

// Flatten skills count
const TOTAL_SKILLS = Object.values(INDUSTRY_SKILLS).reduce((sum, ind) => sum + ind.skills.length, 0);

// ==================== SKILL EXECUTION ENGINE ====================

const SkillEngine = {
  // Restaurant skills
  menu_optimization: (params) => ({
    analysis: 'Menu performance review',
    recommendations: ['Highlight top 20% items', 'Consider bundle deals', 'Review low-margin items']
  }),

  inventory_management: (params) => ({
    alerts: ['Low stock: Tomatoes', 'Expiring soon: Dairy'],
    reorder: { items: ['Chicken breast', 'Lettuce'], quantities: ['5kg', '3kg'] }
  }),

  // Hotel skills
  room_pricing: (params) => ({
    recommended: 150,
    range: { min: 120, max: 200 },
    factors: ['Season', 'Events', 'Occupancy'],
    competitor_avg: 145
  }),

  occupancy_optimization: (params) => ({
    current: '78%',
    target: '85%',
    suggestions: ['Extend checkout', 'Weekend packages', 'OTA promotion']
  }),

  // Healthcare skills
  patient_intake: (params) => ({
    forms_completed: true,
    insurance_verified: true,
    wait_time: '15 min'
  }),

  billing_coding: (params) => ({
    codes_suggested: ['99213', '99214'],
    estimated_amount: params.amount || 150
  }),

  // Retail skills
  inventory_control: (params) => ({
    stock_level: 'Normal',
    alerts: params.lowStock ? ['SKU-123 low'] : [],
    reorder_point: 50
  }),

  pricing_strategy: (params) => ({
    current_margin: '45%',
    target_margin: '50%',
    adjustment: '+5% on high-demand items'
  }),

  // Financial skills
  risk_assessment: (params) => ({
    score: 'Medium',
    factors: ['Credit history', 'Income stability', 'Debt ratio'],
    recommendation: 'Proceed with standard terms'
  }),

  // Generic skill execution
  execute: (industry, skill, params) => {
    const skillFn = SkillEngine[skill];
    if (skillFn) {
      return skillFn(params);
    }
    return { result: `Executed ${skill} for ${industry}`, params };
  }
};

// ==================== MIDDLEWARE ====================

app.use(helmet());
app.use(cors());
app.use(express.json());

// Request ID
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, error: { code: 'RATE_LIMITED' } }
});
app.use('/api/', limiter);

// ==================== HEALTH ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'business-copilot',
    port: PORT,
    version: '1.0.0',
    industries: Object.keys(INDUSTRY_SKILLS).length,
    totalSkills: TOTAL_SKILLS,
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  res.json({
    ready: true,
    service: 'business-copilot',
    industries: Object.keys(INDUSTRY_SKILLS).length,
    skills: TOTAL_SKILLS
  });
});

// ==================== INDUSTRY ENDPOINTS ====================

/**
 * List all industries
 */
app.get('/api/industries', (req, res) => {
  const industries = Object.entries(INDUSTRY_SKILLS).map(([key, ind]) => ({
    id: key,
    name: ind.name,
    port: ind.port,
    skills: ind.skills.length
  }));
  res.json({ success: true, industries, totalIndustries: industries.length, totalSkills: TOTAL_SKILLS });
});

/**
 * Get industry details
 */
app.get('/api/industries/:industry', (req, res) => {
  const { industry } = req.params;
  const ind = INDUSTRY_SKILLS[industry.toLowerCase()];

  if (!ind) {
    return res.status(404).json({ success: false, error: 'Industry not found' });
  }

  res.json({
    success: true,
    industry: {
      id: industry.toLowerCase(),
      name: ind.name,
      port: ind.port,
      skills: ind.skills
    }
  });
});

/**
 * Get skills for industry
 */
app.get('/api/industries/:industry/skills', (req, res) => {
  const { industry } = req.params;
  const ind = INDUSTRY_SKILLS[industry.toLowerCase()];

  if (!ind) {
    return res.status(404).json({ success: false, error: 'Industry not found' });
  }

  res.json({
    success: true,
    industry: ind.name,
    skills: ind.skills.map((skill, i) => ({ id: i + 1, name: skill }))
  });
});

/**
 * Search skills across industries
 */
app.get('/api/skills/search', (req, res) => {
  const { q, industry } = req.query;

  if (!q) {
    return res.status(400).json({ success: false, error: 'Query (q) required' });
  }

  const results = [];
  const searchIn = industry ? { [industry]: INDUSTRY_SKILLS[industry] } : INDUSTRY_SKILLS;
  const qLower = q.toLowerCase();

  for (const [indKey, ind] of Object.entries(searchIn)) {
    const matches = ind.skills.filter(skill =>
      skill.toLowerCase().includes(qLower) ||
      ind.name.toLowerCase().includes(qLower)
    );
    if (matches.length > 0) {
      results.push({
        industry: ind.name,
        industryId: indKey,
        skills: matches
      });
    }
  }

  res.json({ success: true, query: q, results, totalMatches: results.reduce((sum, r) => sum + r.skills.length, 0) });
});

// ==================== CHAT ENDPOINT ====================

/**
 * Main chat/query endpoint
 */
app.post('/api/chat',requireAuth,  (req, res) => {
  const { query, industry, userId, context = {} } = req.body;

  if (!query) {
    return res.status(400).json({ success: false, error: 'Query required' });
  }

  logger.info('Processing chat', { query: query.substring(0, 50), industry, userId });

  // Detect industry if not specified
  let detectedIndustry = industry;
  if (!detectedIndustry) {
    detectedIndustry = detectIndustry(query);
  }

  // Detect intent
  const intent = detectIntent(query);

  // Execute relevant skills
  const skills = INDUSTRY_SKILLS[detectedIndustry]?.skills || [];
  const relevantSkills = skills.filter(s =>
    intent.keywords.some(k => s.toLowerCase().includes(k))
  );

  // Generate response
  const response = generateResponse(query, detectedIndustry, intent, relevantSkills, context);

  res.json({
    success: true,
    requestId: uuidv4(),
    query,
    industry: detectedIndustry || 'general',
    intent: intent.type,
    skillsUsed: relevantSkills,
    response,
    timestamp: new Date().toISOString()
  });
});

/**
 * Execute specific skill
 */
app.post('/api/skills/execute',requireAuth,  (req, res) => {
  const { industry, skill, params = {} } = req.body;

  if (!industry || !skill) {
    return res.status(400).json({ success: false, error: 'Industry and skill required' });
  }

  const ind = INDUSTRY_SKILLS[industry.toLowerCase()];
  if (!ind) {
    return res.status(404).json({ success: false, error: 'Industry not found' });
  }

  const skillExists = ind.skills.includes(skill);
  if (!skillExists) {
    return res.status(404).json({ success: false, error: 'Skill not found in this industry' });
  }

  const result = SkillEngine.execute(industry, skill, params);

  res.json({
    success: true,
    industry: ind.name,
    skill,
    result,
    timestamp: new Date().toISOString()
  });
});

// ==================== HELPERS ====================

function detectIndustry(query) {
  const q = query.toLowerCase();
  const mappings = {
    restaurant: ['restaurant', 'food', 'menu', 'chef', 'dining', 'kitchen', 'table'],
    hotel: ['hotel', 'room', 'guest', 'booking', 'checkin', 'checkout', 'stay'],
    healthcare: ['patient', 'doctor', 'medical', 'clinic', 'hospital', 'health'],
    retail: ['store', 'shop', 'retail', 'customer', 'sale', 'product', 'inventory'],
    legal: ['legal', 'lawyer', 'court', 'case', 'contract', 'legal'],
    education: ['student', 'school', 'teacher', 'class', 'education', 'university'],
    automotive: ['car', 'vehicle', 'auto', 'repair', 'mechanic', 'driving'],
    beauty: ['salon', 'spa', 'beauty', 'hair', 'makeup', 'aesthetic'],
    fitness: ['gym', 'fitness', 'workout', 'trainer', 'exercise', 'health club'],
    financial: ['bank', 'finance', 'investment', 'loan', 'credit', 'financial']
  };

  for (const [industry, keywords] of Object.entries(mappings)) {
    if (keywords.some(k => q.includes(k))) {
      return industry;
    }
  }
  return 'general';
}

function detectIntent(query) {
  const q = query.toLowerCase();

  if (q.includes('analyze') || q.includes('insight') || q.includes('report')) {
    return { type: 'analysis', keywords: ['analysis', 'analytics', 'report'] };
  }
  if (q.includes('optimize') || q.includes('improve') || q.includes('increase')) {
    return { type: 'optimization', keywords: ['optimization', 'improve', 'performance'] };
  }
  if (q.includes('schedule') || q.includes('plan') || q.includes('book')) {
    return { type: 'scheduling', keywords: ['schedule', 'planning', 'booking'] };
  }
  if (q.includes('manage') || q.includes('track') || q.includes('monitor')) {
    return { type: 'management', keywords: ['management', 'tracking', 'monitoring'] };
  }
  if (q.includes('cost') || q.includes('revenue') || q.includes('profit') || q.includes('margin')) {
    return { type: 'financial', keywords: ['financial', 'cost', 'revenue', 'profit'] };
  }
  return { type: 'general', keywords: ['general'] };
}

function generateResponse(query, industry, intent, skills, context) {
  const ind = INDUSTRY_SKILLS[industry];
  const indName = ind?.name || 'Business';

  return {
    message: `Based on your query about ${query.substring(0, 50)}..., here are insights for ${indName}:`,
    intent: intent.type,
    insights: skills.length > 0
      ? skills.map(s => `Consider ${s.replace(/_/g, ' ')} for better results.`)
      : [`This is a common ${industry || 'business'} challenge. Here are general recommendations:`],
    recommendations: [
      'Review current metrics',
      'Compare with industry benchmarks',
      'Implement incremental changes'
    ],
    industry,
    context
  };
}

// ==================== STATS ====================

app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      industries: Object.keys(INDUSTRY_SKILLS).length,
      totalSkills: TOTAL_SKILLS,
      skillsPerIndustry: Object.values(INDUSTRY_SKILLS).map(i => ({
        industry: i.name,
        count: i.skills.length
      }))
    }
  });
});

// ==================== ERROR HANDLER ====================

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message });
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
});

// ==================== START ====================

const server = 
// REZ Intelligence endpoints
app.get('/rez-intel-status', async (req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({ rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED, rezIntelUrl: rezIntel.REZ_INTEL_URL, rezIntelHealthy: isHealthy });
});

app.post('/api/enrich', async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body;
  const enriched = await rezIntel.enrichAgentContext({ agentRole, userId, companyId, query, context }).catch(() => null);
  res.json({ enriched, source: enriched ? 'rez-intel' : 'unavailable' });
});

// ============================================================
// REZ INTELLIGENCE — DEEP INTEGRATION (3 endpoints)
// ============================================================
//
// 1) GET  /api/business/insights          — merchant + customer combined
// 2) GET  /api/business/forecast          — revenue predictions (horizon-aware)
// 3) GET  /api/business/next-best-action  — AI-recommended next strategic action
//
// Each endpoint gracefully degrades to null on failure.

// 1) Combined merchant + customer insights for a business context
app.get('/api/business/insights', requireAuth, async (req, res) => {
  const { merchantId, customerId, industry } = req.query;
  const [merchant, customer] = await Promise.all([
    rezIntel.getMerchantInsights({ merchantId, industry }),
    rezIntel.getCustomerInsights({ customerId, merchantId })
  ]);
  res.json({
    success: true,
    insights: { merchant, customer },
    source: (merchant || customer) ? 'rez-intel' : 'unavailable',
    fallback: !(merchant || customer)
  });
});

// 2) Revenue forecast — horizon-aware prediction
app.get('/api/business/forecast', requireAuth, async (req, res) => {
  const { merchantId, horizon = '90d', historicalRevenue } = req.query;
  const prediction = await rezIntel.predictRevenue({
    merchantId,
    horizon,
    historicalRevenue: historicalRevenue ? Number(historicalRevenue) : undefined
  });
  res.json({
    success: true,
    forecast: prediction,
    horizon,
    source: prediction ? 'rez-intel' : 'unavailable',
    fallback: !prediction
  });
});

// 3) Next-best-action for the business
app.get('/api/business/next-best-action', requireAuth, async (req, res) => {
  const { merchantId, customerId, stage, context } = req.query;
  const action = await rezIntel.getNextBestAction({
    merchantId,
    customerId,
    stage,
    context,
    copilot: 'business'
  });
  res.json({
    success: true,
    action,
    source: action ? 'rez-intel' : 'unavailable',
    fallback: !action
  });
});

app.listen(PORT, () => {
  logger.info(`Business Copilot started on port ${PORT}`);
  logger.info(`Industries: ${Object.keys(INDUSTRY_SKILLS).length}, Skills: ${TOTAL_SKILLS}`);
});
installGracefulShutdown(server);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down');
  process.exit(0);
});

module.exports = app;
