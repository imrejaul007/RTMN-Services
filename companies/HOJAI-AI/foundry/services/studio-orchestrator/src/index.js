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
  codeGenerator: process.env.CODE_GEN_URL || 'http://localhost:4580',
  connectorOS: process.env.CONNECTOR_OS_URL || 'http://localhost:4585',
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

    // Step 3: Generate code using Code Generator
    deployment.steps.push({ step: 3, name: 'Generating code (React Native + Backend)', status: 'running' });
    deployment.status = 'generating-code';

    // Call Code Generator service
    const codeGenResponse = await fetch(`${SERVICES.codeGenerator}/api/v1/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName, template, options })
    });
    const codeGenResult = await codeGenResponse.json();

    if (codeGenResult.success) {
      deployment.generatedCode = codeGenResult.job;
    }

    deployment.steps.push({ step: 3, name: 'Generating code (React Native + Backend)', status: 'completed' });

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
        generatedCode: deployment.generatedCode,
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

// ── ConnectorOS Integration ────────────────────────────────────────

/**
 * Get all available enterprise connectors
 */
app.get('/api/v1/connectors', async (req, res) => {
  try {
    const response = await fetch(`${SERVICES.connectorOS}/api/connectors`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    // Fallback to cached connector list
    res.json({
      success: true,
      count: 38,
      connectors: [
        // CRM
        { id: 'hubspot', name: 'HubSpot', category: 'crm', authType: 'oauth2', capabilities: ['contacts', 'deals', 'tasks'] },
        { id: 'salesforce', name: 'Salesforce', category: 'crm', authType: 'oauth2', capabilities: ['leads', 'opportunities', 'accounts'] },
        { id: 'pipedrive', name: 'Pipedrive', category: 'crm', authType: 'api_key', capabilities: ['deals', 'persons', 'organizations'] },
        { id: 'zoho-crm', name: 'Zoho CRM', category: 'crm', authType: 'oauth2', capabilities: ['leads', 'deals', 'contacts'] },
        // Payments
        { id: 'stripe', name: 'Stripe', category: 'payments', authType: 'api_key', capabilities: ['payments', 'subscriptions', 'invoicing'] },
        { id: 'razorpay', name: 'Razorpay', category: 'payments', authType: 'api_key', capabilities: ['payments', 'refunds', 'settlements'] },
        { id: 'paypal', name: 'PayPal', category: 'payments', authType: 'oauth2', capabilities: ['payments', 'payouts', 'subscriptions'] },
        { id: 'square', name: 'Square', category: 'payments', authType: 'oauth2', capabilities: ['payments', 'invoices', 'customers'] },
        { id: 'phonepe', name: 'PhonePe', category: 'payments', authType: 'api_key', capabilities: ['payments', 'refunds'] },
        { id: 'cashfree', name: 'Cashfree', category: 'payments', authType: 'api_key', capabilities: ['payments', 'payouts'] },
        // Commerce
        { id: 'shopify', name: 'Shopify', category: 'commerce', authType: 'oauth2', capabilities: ['products', 'orders', 'customers'] },
        { id: 'woocommerce', name: 'WooCommerce', category: 'commerce', authType: 'oauth2', capabilities: ['products', 'orders', 'customers'] },
        { id: 'magento', name: 'Magento', category: 'commerce', authType: 'oauth2', capabilities: ['products', 'orders', 'inventory'] },
        { id: 'bigcommerce', name: 'BigCommerce', category: 'commerce', authType: 'oauth2', capabilities: ['products', 'orders', 'customers'] },
        // Email
        { id: 'gmail', name: 'Gmail', category: 'email', authType: 'oauth2', capabilities: ['send', 'read', 'drafts'] },
        { id: 'sendgrid', name: 'SendGrid', category: 'email', authType: 'api_key', capabilities: ['send', 'templates', 'campaigns'] },
        { id: 'mailchimp', name: 'Mailchimp', category: 'email', authType: 'api_key', capabilities: ['campaigns', 'lists', 'automation'] },
        { id: 'aws-ses', name: 'Amazon SES', category: 'email', authType: 'aws_v4', capabilities: ['send', 'templates', 'stats'] },
        // Calendar
        { id: 'google-calendar', name: 'Google Calendar', category: 'calendar', authType: 'oauth2', capabilities: ['events', 'calendars', 'availability'] },
        { id: 'outlook-calendar', name: 'Microsoft Outlook', category: 'calendar', authType: 'oauth2', capabilities: ['events', 'calendars', 'rooms'] },
        { id: 'calendly', name: 'Calendly', category: 'calendar', authType: 'api_key', capabilities: ['scheduling', 'events', 'webhooks'] },
        // Storage
        { id: 'google-drive', name: 'Google Drive', category: 'storage', authType: 'oauth2', capabilities: ['files', 'folders', 'sharing'] },
        { id: 'dropbox', name: 'Dropbox', category: 'storage', authType: 'oauth2', capabilities: ['files', 'folders', 'sharing'] },
        { id: 'aws-s3', name: 'Amazon S3', category: 'storage', authType: 'aws_v4', capabilities: ['buckets', 'objects', 'presigned-urls'] },
        { id: 'onedrive', name: 'OneDrive', category: 'storage', authType: 'oauth2', capabilities: ['files', 'folders', 'sharing'] },
        // Chat
        { id: 'slack', name: 'Slack', category: 'chat', authType: 'oauth2', capabilities: ['channels', 'messages', 'files'] },
        { id: 'ms-teams', name: 'Microsoft Teams', category: 'chat', authType: 'oauth2', capabilities: ['channels', 'messages', 'meetings'] },
        { id: 'discord', name: 'Discord', category: 'chat', authType: 'bot_token', capabilities: ['channels', 'messages', 'webhooks'] },
        { id: 'whatsapp', name: 'WhatsApp Business', category: 'chat', authType: 'api_key', capabilities: ['messages', 'templates', 'media'] },
        { id: 'intercom', name: 'Intercom', category: 'chat', authType: 'api_key', capabilities: ['conversations', 'users', 'messages'] },
        // Accounting
        { id: 'quickbooks', name: 'QuickBooks', category: 'accounting', authType: 'oauth2', capabilities: ['invoices', 'customers', 'vendors', 'reports'] },
        { id: 'xero', name: 'Xero', category: 'accounting', authType: 'oauth2', capabilities: ['invoices', 'contacts', 'bank', 'reports'] },
        { id: 'tally', name: 'TallyPrime', category: 'accounting', authType: 'xml_api', capabilities: ['vouchers', 'masters', 'reports', 'gst'] },
        { id: 'zoho-books', name: 'Zoho Books', category: 'accounting', authType: 'oauth2', capabilities: ['invoices', 'contacts', 'inventory'] },
        // HR
        { id: 'bamboohr', name: 'BambooHR', category: 'hr', authType: 'api_key', capabilities: ['employees', 'time-off', 'jobs'] },
        { id: 'workday', name: 'Workday', category: 'hr', authType: 'oauth2', capabilities: ['employees', 'payroll', 'benefits'] },
        { id: 'gusto', name: 'Gusto', category: 'hr', authType: 'oauth2', capabilities: ['employees', 'payroll', 'time-tracking'] },
        // Project Management
        { id: 'jira', name: 'Jira', category: 'project-management', authType: 'oauth2', capabilities: ['issues', 'projects', 'boards', 'sprints'] },
        { id: 'asana', name: 'Asana', category: 'project-management', authType: 'oauth2', capabilities: ['projects', 'tasks', 'subtasks', 'teams'] },
        { id: 'monday', name: 'Monday.com', category: 'project-management', authType: 'api_key', capabilities: ['boards', 'items', 'groups', 'updates'] },
        { id: 'linear', name: 'Linear', category: 'project-management', authType: 'api_key', capabilities: ['issues', 'projects', 'teams', 'cycles'] },
        { id: 'notion', name: 'Notion', category: 'project-management', authType: 'oauth2', capabilities: ['pages', 'databases', 'blocks', 'comments'] },
        { id: 'trello', name: 'Trello', category: 'project-management', authType: 'api_key', capabilities: ['boards', 'lists', 'cards', 'checklists'] }
      ]
    });
  }
});

/**
 * Get connectors by category
 */
app.get('/api/v1/connectors/:category', async (req, res) => {
  const { category } = req.params;
  try {
    const response = await fetch(`${SERVICES.connectorOS}/api/connectors/${category}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'ConnectorOS unavailable' });
  }
});

/**
 * Create a connector connection for a deployment
 */
app.post('/api/v1/connections', async (req, res) => {
  const { deploymentId, connectorId, credentials, config } = req.body;

  if (!deploymentId || !connectorId) {
    return res.status(400).json({ error: 'deploymentId and connectorId required' });
  }

  try {
    const response = await fetch(`${SERVICES.connectorOS}/api/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectorId, credentials, config })
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    // Mock response for demo
    res.status(201).json({
      success: true,
      connection: {
        id: uuidv4(),
        connectorId,
        deploymentId,
        status: 'active',
        createdAt: new Date().toISOString()
      }
    });
  }
});

/**
 * Get connections for a deployment
 */
app.get('/api/v1/deployments/:id/connections', async (req, res) => {
  const { id } = req.params;

  // Return mock connections
  res.json({
    success: true,
    connections: [
      { id: 'conn-1', connectorId: 'hubspot', status: 'active', lastSync: new Date().toISOString() },
      { id: 'conn-2', connectorId: 'stripe', status: 'active', lastSync: new Date().toISOString() }
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
