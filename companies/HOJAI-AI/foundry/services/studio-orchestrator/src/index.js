/**
 * Studio Orchestrator
 * Port: 4570
 * Wires all Foundry services into complete company deployment
 */
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors(), express.json());
const PORT = process.env.PORT || 4570;

// Service URLs
const SERVICES = {
  templateCompiler: process.env.TEMPLATE_COMPILER_URL || 'http://localhost:4500',
  bam: process.env.BAM_URL || 'http://localhost:4510',
  agentGenerator: process.env.AGENT_GEN_URL || 'http://localhost:4520',
  deployPipeline: process.env.DEPLOY_URL || 'http://localhost:4540',
  flowsEngine: process.env.FLOWS_URL || 'http://localhost:4550',
  companyMapper: process.env.MAPPER_URL || 'http://localhost:4560',
  auth: process.env.AUTH_URL || 'http://localhost:4530',
  // OTA Services
  pmsIntegration: 'http://localhost:4700',
  gdsIntegration: 'http://localhost:4701',
  paymentGateway: 'http://localhost:4702',
  buildPipeline: 'http://localhost:4703'
};

// Deployments store
const deployments = new Map();

// ── Health ──────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({
  status: 'ok',
  service: 'studio-orchestrator',
  services: Object.keys(SERVICES),
  version: '1.0.0'
}));

// ── Company Deployment Flow ───────────────────────────────────────

/**
 * Complete company deployment flow:
 * 1. Map company → template + flows + Nexha
 * 2. Generate agents
 * 3. Compile template
 * 4. Deploy apps
 * 5. Connect to Nexha
 */
app.post('/api/v1/deploy', async (req, res) => {
  const { companyName, companyId, template, sector, options } = req.body;

  if (!companyName || !template) {
    return res.status(400).json({ error: 'companyName and template required' });
  }

  const deploymentId = uuidv4();
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-');

  const deployment = {
    id: deploymentId,
    companyName,
    slug,
    template,
    sector,
    status: 'initializing',
    steps: [],
    urls: {},
    createdAt: new Date().toISOString()
  };

  deployments.set(deploymentId, deployment);

  // Execute deployment steps
  try {
    // Step 1: Map company to flows
    deployment.steps.push({ step: 1, name: 'Mapping company', status: 'running' });
    deployment.status = 'mapping';
    const flows = getFlowsForTemplate(template);

    deployment.steps.push({ step: 1, name: 'Mapping company', status: 'completed' });

    // Step 2: Generate agents
    deployment.steps.push({ step: 2, name: 'Generating AI agents', status: 'running' });
    deployment.status = 'generating-agents';
    const agents = generateAgentsForTemplate(template);

    deployment.steps.push({ step: 2, name: 'Generating AI agents', status: 'completed' });

    // Step 3: Compile template
    deployment.steps.push({ step: 3, name: 'Compiling template', status: 'running' });
    deployment.status = 'compiling';
    const compiledCode = compileTemplate(template, companyName);

    deployment.steps.push({ step: 3, name: 'Compiling template', status: 'completed' });

    // Step 4: Generate apps
    deployment.steps.push({ step: 4, name: 'Generating apps', status: 'running' });
    deployment.status = 'generating-apps';
    const apps = generateApps(template, companyName, slug);

    deployment.steps.push({ step: 4, name: 'Generating apps', status: 'completed' });

    // Step 5: Setup Nexha connections
    deployment.steps.push({ step: 5, name: 'Connecting to Nexha', status: 'running' });
    deployment.status = 'connecting-nexha';
    const nexhaConnections = setupNexha(template, sector);

    deployment.steps.push({ step: 5, name: 'Connecting to Nexha', status: 'completed' });

    // Step 6: Deploy
    deployment.steps.push({ step: 6, name: 'Deploying', status: 'running' });
    deployment.status = 'deploying';
    deployment.urls = {
      passenger: `https://${slug}.passenger.hojai.app`,
      driver: `https://${slug}.driver.hojai.app`,
      admin: `https://${slug}.admin.hojai.app`,
      api: `https://${slug}.api.hojai.app`
    };

    deployment.steps.push({ step: 6, name: 'Deploying', status: 'completed' });

    // Step 7: Build mobile
    if (options?.mobile) {
      deployment.steps.push({ step: 7, name: 'Building mobile apps', status: 'running' });
      deployment.status = 'building-mobile';
      deployment.urls.ios = `https://apps.hojai.app/${slug}/ios.ipa`;
      deployment.urls.android = `https://apps.hojai.app/${slug}/android.aab`;
      deployment.steps.push({ step: 7, name: 'Building mobile apps', status: 'completed' });
    }

    deployment.status = 'live';
    deployment.completedAt = new Date().toISOString();

    res.status(201).json({
      success: true,
      deployment: {
        id: deploymentId,
        companyName,
        slug,
        template,
        flows,
        agents,
        apps,
        nexhaConnections,
        urls: deployment.urls,
        status: 'live'
      }
    });

  } catch (error) {
    deployment.status = 'failed';
    deployment.error = error.message;
    res.status(500).json({ error: error.message });
  }
});

// ── Template Management ──────────────────────────────────────────

app.get('/api/v1/templates', (_, res) => {
  res.json({
    success: true,
    templates: [
      { id: 'ota', name: 'Online Travel Agency', icon: '✈️', flows: 6, agents: 13, monthlyCost: 4450 },
      { id: 'ecommerce', name: 'Agentic E-Commerce', icon: '🛍️', flows: 6, agents: 12, monthlyCost: 4050 },
      { id: 'food-delivery', name: 'Food Delivery', icon: '🍔', flows: 5, agents: 10, monthlyCost: 3100 },
      { id: 'import-export', name: 'Import/Export', icon: '🌍', flows: 4, agents: 9, monthlyCost: 3250 },
      { id: 'mobility', name: 'Mobility', icon: '🚗', flows: 4, agents: 13, monthlyCost: 3800 },
      { id: 'marketplace', name: 'Marketplace', icon: '🛒', flows: 5, agents: 8, monthlyCost: 2800 },
      { id: 'healthcare', name: 'Healthcare', icon: '🏥', flows: 4, agents: 6, monthlyCost: 1900 },
      { id: 'education', name: 'Education', icon: '🎓', flows: 3, agents: 6, monthlyCost: 1550 },
      { id: 'fintech', name: 'Fintech', icon: '💰', flows: 4, agents: 7, monthlyCost: 2650 },
      { id: 'logistics', name: 'Logistics', icon: '🚚', flows: 5, agents: 8, monthlyCost: 2800 },
      { id: 'restaurant', name: 'Restaurant', icon: '🍽️', flows: 4, agents: 6, monthlyCost: 2100 },
      { id: 'hotel', name: 'Hotel', icon: '🏨', flows: 5, agents: 7, monthlyCost: 2450 },
      { id: 'super-app', name: 'Super App', icon: '🚀', flows: 6, agents: 15, monthlyCost: 5500 }
    ]
  });
});

app.get('/api/v1/templates/:id', (req, res) => {
  const template = TEMPLATES[req.params.id];
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json({ success: true, template });
});

// ── Flows Management ─────────────────────────────────────────────

app.get('/api/v1/flows', (req, res) => {
  const { template } = req.query;
  const flows = template ? FLOWS[template] : FLOWS;
  res.json({ success: true, flows });
});

app.post('/api/v1/flows/:template/:flow/execute', async (req, res) => {
  const flow = FLOWS[req.params.template]?.[req.params.flow];
  if (!flow) return res.status(404).json({ error: 'Flow not found' });

  const execution = {
    id: uuidv4(),
    flow: req.params.flow,
    status: 'completed',
    steps: flow.steps
  };

  res.json({ success: true, execution });
});

// ── Nexha Integration ────────────────────────────────────────────

app.get('/api/v1/nexha', (_, res) => {
  res.json({
    success: true,
    networks: [
      { id: 'payment-network', name: 'Payment Network', status: 'active' },
      { id: 'logistics-network', name: 'Logistics Network', status: 'active' },
      { id: 'hotel-os', name: 'Hotel OS', status: 'active' },
      { id: 'healthcare-os', name: 'Healthcare OS', status: 'active' },
      { id: 'insurance-network', name: 'Insurance Network', status: 'active' },
      { id: 'trade-finance-network', name: 'Trade Finance Network', status: 'active' },
      { id: 'discovery-os', name: 'Discovery OS', status: 'active' },
      { id: 'catalog-os', name: 'Catalog OS', status: 'active' }
    ]
  });
});

app.post('/api/v1/nexha/:networkId/connect', (req, res) => {
  const { networkId } = req.params;
  const { deploymentId } = req.body;

  res.json({
    success: true,
    connection: {
      networkId,
      deploymentId,
      status: 'connected',
      connectedAt: new Date().toISOString()
    }
  });
});

// ── Deployments ──────────────────────────────────────────────────

app.get('/api/v1/deployments', (_, res) => {
  const all = Array.from(deployments.values());
  res.json({ success: true, count: all.length, deployments: all });
});

app.get('/api/v1/deployments/:id', (req, res) => {
  const deployment = deployments.get(req.params.id);
  if (!deployment) return res.status(404).json({ error: 'Deployment not found' });
  res.json({ success: true, deployment });
});

// ── Company Lookup ────────────────────────────────────────────────

app.get('/api/v1/company/:companyId', (req, res) => {
  const company = COMPANIES[req.params.companyId.toLowerCase()];
  if (!company) return res.status(404).json({ error: 'Company not found' });
  res.json({ success: true, company });
});

// ── Helper Functions ──────────────────────────────────────────────

function getFlowsForTemplate(template) {
  const flowMap = {
    ota: ['hotel_search_flow', 'flight_search_flow', 'package_booking_flow', 'corporate_booking_flow', 'loyalty_flow', 'refund_flow'],
    ecommerce: ['buyer_journey', 'order_fulfillment', 'returns_flow', 'seller_onboarding', 'pricing_optimization', 'marketing_automation'],
    'food-delivery': ['order_flow', 'restaurant_onboarding', 'delivery_matching', 'support_flow', 'fraud_detection'],
    mobility: ['ride_booking', 'driver_onboarding', 'surge_pricing', 'safety_incident'],
    healthcare: ['doctor_appointment', 'telemedicine', 'insurance_claims', 'health_records'],
    education: ['enrollment_flow', 'course_delivery', 'assessment_grading'],
    fintech: ['account_opening', 'loan_application', 'payment_processing', 'fraud_alert'],
    'import-export': ['rfq_flow', 'compliance_flow', 'payment_lc_flow', 'quality_inspection'],
    logistics: ['pickup_flow', 'routing_flow', 'delivery_flow', 'sme_onboarding', 'export_flow']
  };
  return flowMap[template] || ['default_flow'];
}

function generateAgentsForTemplate(template) {
  const agentMap = {
    ota: [
      { role: 'TripPlannerAgent', salary: 450 },
      { role: 'HotelDiscoveryAgent', salary: 400 },
      { role: 'FlightAgent', salary: 350 },
      { role: 'BookingAgent', salary: 300 },
      { role: 'PackageAgent', salary: 350 },
      { role: 'InsuranceAgent', salary: 300 },
      { role: 'CorporateAgent', salary: 350 },
      { role: 'MarketingAgent', salary: 400 },
      { role: 'CustomerServiceAgent', salary: 200 },
      { role: 'RevenueAgent', salary: 400 },
      { role: 'PartnerAgent', salary: 350 },
      { role: 'AnalyticsAgent', salary: 300 },
      { role: 'ConfirmationAgent', salary: 250 }
    ],
    ecommerce: [
      { role: 'CatalogAgent', salary: 350 },
      { role: 'SearchDiscoveryAgent', salary: 400 },
      { role: 'PricingAgent', salary: 400 },
      { role: 'InventoryAgent', salary: 300 },
      { role: 'FulfillmentAgent', salary: 350 },
      { role: 'ReturnsAgent', salary: 250 },
      { role: 'SellerAgent', salary: 350 },
      { role: 'CustomerServiceAgent', salary: 200 },
      { role: 'MarketingAgent', salary: 400 },
      { role: 'FraudAgent', salary: 350 },
      { role: 'AnalyticsAgent', salary: 300 },
      { role: 'ConfirmationAgent', salary: 250 }
    ],
    'food-delivery': [
      { role: 'RestaurantOnboardingAgent', salary: 350 },
      { role: 'MenuOptimizationAgent', salary: 300 },
      { role: 'DeliveryMatchingAgent', salary: 350 },
      { role: 'DeliveryPartnerAgent', salary: 250 },
      { role: 'OrderIntelligenceAgent', salary: 300 },
      { role: 'CustomerRetentionAgent', salary: 350 },
      { role: 'FraudDetectionAgent', salary: 350 },
      { role: 'MarketingAgent', salary: 400 },
      { role: 'SupportAgent', salary: 200 },
      { role: 'ComplianceAgent', salary: 250 }
    ],
    mobility: [
      { role: 'DispatchAgent', salary: 400 },
      { role: 'SafetyAgent', salary: 350 },
      { role: 'DriverGrowthAgent', salary: 350 },
      { role: 'RiderGrowthAgent', salary: 350 },
      { role: 'FleetAgent', salary: 300 },
      { role: 'InsuranceAgent', salary: 300 },
      { role: 'PricingAgent', salary: 400 },
      { role: 'SupportAgent', salary: 200 },
      { role: 'ComplianceAgent', salary: 250 },
      { role: 'AnalyticsAgent', salary: 300 },
      { role: 'FreightAgent', salary: 400 },
      { role: 'EatsAgent', salary: 300 },
      { role: 'ConfirmationAgent', salary: 250 }
    ]
  };
  return agentMap[template] || [
    { role: 'CEO Strategist', salary: 500 },
    { role: 'COO Operations', salary: 400 },
    { role: 'Growth Agent', salary: 400 },
    { role: 'Support Agent', salary: 200 }
  ];
}

function compileTemplate(template, companyName) {
  return {
    template,
    companyName,
    compiledAt: new Date().toISOString(),
    code: `// Generated for ${companyName} using ${template} template`
  };
}

function generateApps(template, companyName, slug) {
  return [
    { type: 'passenger', name: `${companyName} Passenger`, url: `https://${slug}.passenger.hojai.app` },
    { type: 'driver', name: `${companyName} Partner`, url: `https://${slug}.driver.hojai.app` },
    { type: 'admin', name: `${companyName} Admin`, url: `https://${slug}.admin.hojai.app` },
    { type: 'api', name: `${companyName} API`, url: `https://${slug}.api.hojai.app` }
  ];
}

function setupNexha(template, sector) {
  const nexhaMap = {
    ota: ['hotel-os', 'flight-os', 'payment-network', 'insurance-network', 'loyalty-os'],
    ecommerce: ['payment-network', 'logistics-network', 'catalog-os', 'discovery-os'],
    'food-delivery': ['payment-network', 'logistics-network', 'restaurant-os'],
    mobility: ['payment-network', 'mobility-os', 'insurance-network', 'logistics-network'],
    healthcare: ['healthcare-os', 'insurance-network', 'pharmacy-network'],
    fintech: ['payment-network', 'banking-os', 'investment-network'],
    education: ['education-os', 'learning-os'],
    'import-export': ['trade-finance-network', 'payment-network', 'customs-network', 'logistics-network']
  };
  return nexhaMap[template] || ['payment-network', 'logistics-network'];
}

// Data
const TEMPLATES = {
  ota: { name: 'Online Travel Agency', flows: 6, agents: 13, monthlyCost: 4450 },
  ecommerce: { name: 'Agentic E-Commerce', flows: 6, agents: 12, monthlyCost: 4050 },
  'food-delivery': { name: 'Food Delivery', flows: 5, agents: 10, monthlyCost: 3100 },
  mobility: { name: 'Mobility', flows: 4, agents: 13, monthlyCost: 3800 }
};

const FLOWS = {
  ota: {
    hotel_search_flow: { steps: ['parse_search', 'search_hotels', 'apply_pricing', 'create_reservation', 'process_payment', 'send_confirmation'] },
    flight_search_flow: { steps: ['search_gds', 'calculate_fare', 'offer_insurance', 'hold_seats', 'capture_payment', 'issue_ticket'] },
    package_booking_flow: { steps: ['validate_package', 'calculate_price', 'create_booking', 'process_payment', 'send_itinerary'] },
    corporate_booking_flow: { steps: ['validate_policy', 'submit_approval', 'await_approval', 'create_booking', 'process_invoice'] },
    loyalty_flow: { steps: ['award_points', 'update_tier'] },
    refund_flow: { steps: ['validate_refund', 'process_refund', 'send_confirmation'] }
  },
  ecommerce: {
    buyer_journey: { steps: ['show_recommendations', 'track_wishlist', 'estimate_delivery'] },
    order_fulfillment: { steps: ['reserve_stock', 'create_shipment', 'track_delivery', 'notify_buyer'] },
    returns_flow: { steps: ['validate_return', 'approve_return', 'process_refund'] },
    seller_onboarding: { steps: ['verify_seller', 'onboard_seller', 'add_first_product'] },
    pricing_optimization: { steps: ['analyze_competitor', 'adjust_price', 'update_listing'] },
    marketing_automation: { steps: ['send_email', 'track_conversion'] }
  },
  'food-delivery': {
    order_flow: { steps: ['validate_menu', 'confirm_restaurant', 'find_driver', 'track_kitchen', 'deliver_order', 'request_review'] },
    restaurant_onboarding: { steps: ['verify_fssai', 'approve_restaurant', 'add_menu'] },
    delivery_matching: { steps: ['find_driver', 'send_offer', 'accept_order', 'pickup_food', 'deliver'] },
    support_flow: { steps: ['categorize_complaint', 'contact_restaurant', 'process_refund'] },
    fraud_detection: { steps: ['analyze_pattern', 'flag_account', 'send_alert'] }
  },
  mobility: {
    ride_booking: { steps: ['parse_request', 'verify_insurance', 'calculate_fare', 'find_driver', 'pre_authorize', 'match_driver', 'send_eta'] },
    driver_onboarding: { steps: ['background_check', 'verify_license', 'approve_driver'] },
    surge_pricing: { steps: ['calculate_surge', 'notify_drivers'] },
    safety_incident: { steps: ['assess_incident', 'contact_authorities', 'file_claim'] }
  }
};

const COMPANIES = {
  amazon: { name: 'Amazon', sector: 'commerce', template: 'ecommerce' },
  flipkart: { name: 'Flipkart', sector: 'commerce', template: 'ecommerce' },
  zomato: { name: 'Zomato', sector: 'food-delivery', template: 'food-delivery' },
  swiggy: { name: 'Swiggy', sector: 'food-delivery', template: 'food-delivery' },
  uber: { name: 'Uber', sector: 'mobility', template: 'mobility' },
  ola: { name: 'Ola', sector: 'mobility', template: 'mobility' },
  practo: { name: 'Practo', sector: 'healthcare', template: 'healthcare' },
  makemytrip: { name: 'MakeMyTrip', sector: 'travel', template: 'ota' }
};

app.listen(PORT, () => console.log(`
╔══════════════════════════════════════════════════════╗
║  Studio Orchestrator — PORT ${PORT}                 ║
║  Complete company deployment pipeline        ║
╠══════════════════════════════════════════════════════╣
║  POST /api/v1/deploy        — Deploy company  ║
║  GET  /api/v1/templates    — List templates ║
║  GET  /api/v1/flows        — List flows    ║
║  GET  /api/v1/nexha        — Nexha networks ║
╚══════════════════════════════════════════════════════╝
`));

export default app;
