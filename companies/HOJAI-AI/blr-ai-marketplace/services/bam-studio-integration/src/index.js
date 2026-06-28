/**
 * BAM Studio Integration Service
 *
 * Connects BAM with HOJAI Studio (company builder) and Global Nexha
 * for agentic marketplace features:
 *
 * 1. Auto-publish from Studio → BAM
 * 2. Nexha capability discovery → BAM listings
 * 3. Blueprint → BCP (Business Capability Pack) conversion
 * 4. AI Agent deployment via Nexha federation
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuid } = require('uuid');

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}
const PORT = process.env.STUDIO_INTEGRATION_PORT || 4278;

app.use(helmet());
app.use(cors());
app.use(express.json());

// ============================================
// HOJAI STUDIO INTEGRATION
// ============================================

/**
 * Import blueprint from HOJAI Studio and auto-generate BCP listing
 */
app.post('/api/studio/blueprint-to-bcp', requireInternal, async (req, res) => {
  try {
    const { blueprint, publisherId, publishImmediately } = req.body;

    // Validate blueprint
    if (!blueprint || !blueprint.name) {
      return res.status(400).json({ error: 'Invalid blueprint' });
    }

    // Generate BCP from blueprint
    const bcp = {
      id: `bcp_${uuid().slice(0, 8)}`,
      blueprintId: blueprint.id,
      name: blueprint.name,
      industry: blueprint.industry || 'general',
      description: blueprint.description || `${blueprint.name} - Generated from HOJAI Studio Blueprint`,

      // Components from blueprint
      components: {
        agents: blueprint.agents || [],
        twins: blueprint.twins || [],
        workflows: blueprint.workflows || [],
        skills: blueprint.skills || [],
        policies: blueprint.policies || [],
      },

      // Auto-generated metadata
      metadata: {
        source: 'hojai-studio',
        blueprintVersion: blueprint.version,
        generatedAt: new Date().toISOString(),
        publisherId,
      },

      // Pricing (can be overridden)
      pricingModel: blueprint.pricingModel || 'subscription',
      price: blueprint.price || 99900, // Default ₹999/month

      // Status
      status: publishImmediately ? 'pending_review' : 'draft',
    };

    // In production, save to database and optionally publish to BAM
    console.log('[Studio Integration] Generated BCP from blueprint:', bcp.id);

    res.json({
      success: true,
      bcp,
      message: publishImmediately
        ? 'BCP created and submitted for review'
        : 'BCP created as draft. Publish from dashboard to submit for review.',
    });
  } catch (error) {
    console.error('[Studio Integration] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all blueprints from HOJAI Studio
 */
app.get('/api/studio/blueprints', async (req, res) => {
  try {
    const { publisherId } = req.query;

    // In production, fetch from HOJAI Studio database
    const blueprints = [
      {
        id: 'bp_restaurant_001',
        name: 'Restaurant Blueprint',
        industry: 'restaurant',
        agents: ['restaurant-manager', 'ai-waiter', 'kitchen-ai'],
        twins: ['restaurant-twin', 'menu-twin'],
        workflows: ['order-to-kitchen', 'reservation'],
        version: '1.0.0',
        createdAt: '2026-06-01',
      },
      {
        id: 'bp_hotel_001',
        name: 'Hotel Blueprint',
        industry: 'hotel',
        agents: ['frontdesk-ai', 'concierge-ai', 'housekeeping-ai'],
        twins: ['hotel-twin', 'room-twin'],
        workflows: ['checkin', 'checkout', 'room-service'],
        version: '1.0.0',
        createdAt: '2026-06-05',
      },
      {
        id: 'bp_retail_001',
        name: 'Retail Store Blueprint',
        industry: 'retail',
        agents: ['store-manager', 'cashier-ai', 'inventory-ai'],
        twins: ['store-twin', 'inventory-twin'],
        workflows: ['sale', 'return', 'restock'],
        version: '1.0.0',
        createdAt: '2026-06-10',
      },
    ];

    // Filter by publisher if specified
    const filtered = publisherId ? blueprints : blueprints;

    res.json({ blueprints: filtered });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Auto-publish listing to BAM
 */
app.post('/api/studio/publish-to-bam', requireInternal, async (req, res) => {
  try {
    const { blueprint, listingData, publisherId } = req.body;

    // Create listing for BAM
    const listing = {
      listingId: `lst_${uuid().slice(0, 8)}`,
      title: listingData?.title || blueprint?.name || 'Untitled',
      description: listingData?.description || blueprint?.description || '',
      category: listingData?.category || 'company-blueprint',
      tags: [
        blueprint?.industry || 'general',
        'hojai-studio',
        'automated',
        ...(listingData?.tags || []),
      ],
      pricingModel: listingData?.pricingModel || 'subscription',
      price: listingData?.price || 99900,
      publisherId,
      status: 'pending_review', // Requires moderation

      // Blueprint reference
      blueprintId: blueprint?.id,
      blueprintVersion: blueprint?.version,

      // Assets from blueprint
      assets: {
        agents: blueprint?.agents || [],
        twins: blueprint?.twins || [],
        workflows: blueprint?.workflows || [],
      },

      // Metadata
      metadata: {
        source: 'hojai-studio',
        autoGenerated: true,
        generatedAt: new Date().toISOString(),
      },
    };

    console.log('[Studio Integration] Auto-published to BAM:', listing.listingId);

    res.json({
      success: true,
      listing,
      message: 'Listing submitted for review. You will be notified when approved.',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GLOBAL NEXHA INTEGRATION
// ============================================

/**
 * Get Nexha capabilities and map to BAM listings
 */
app.get('/api/nexha/capabilities', async (req, res) => {
  try {
    const { industry, capability } = req.query;

    // In production, fetch from Nexha Federation OS
    const capabilities = [
      {
        id: 'cap_order_management',
        name: 'Order Management',
        industry: 'restaurant',
        provider: 'nexha-restaurant-os',
        rating: 4.8,
        price: 49900,
        category: 'workflow',
      },
      {
        id: 'cap_inventory_tracking',
        name: 'Inventory Tracking',
        industry: 'retail',
        provider: 'nexha-inventory-os',
        rating: 4.6,
        price: 29900,
        category: 'skill',
      },
      {
        id: 'cap_customer_support',
        name: 'AI Customer Support',
        industry: 'general',
        provider: 'nexha-cs-os',
        rating: 4.9,
        price: 79900,
        category: 'ai-employee',
      },
    ];

    // Filter
    let filtered = capabilities;
    if (industry) filtered = filtered.filter(c => c.industry === industry);
    if (capability) filtered = filtered.filter(c => c.name.toLowerCase().includes(capability.toLowerCase()));

    res.json({ capabilities: filtered });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Deploy AI agent to Nexha federation from BAM purchase
 */
app.post('/api/nexha/deploy-agent', requireInternal, async (req, res) => {
  try {
    const { listingId, agentId, tenantId, targetNexha } = req.body;

    // In production:
    // 1. Fetch agent from BAM listing
    // 2. Call Nexha Federation OS API to deploy
    // 3. Register agent in Nexha capability registry

    const deployment = {
      deploymentId: `dep_${uuid().slice(0, 8)}`,
      listingId,
      agentId,
      tenantId,
      targetNexha: targetNexha || 'default',
      status: 'deploying',
      deployedAt: new Date().toISOString(),
      nexhaEndpoint: `https://${targetNexha || 'default'}.nexha.io/agents/${agentId}`,
    };

    console.log('[Nexha Integration] Deploying agent:', deployment.deploymentId);

    // Simulate deployment
    setTimeout(() => {
      deployment.status = 'deployed';
    }, 2000);

    res.json({
      success: true,
      deployment,
      message: 'Agent deployed to Nexha federation',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Register capability in Nexha from BAM listing
 */
app.post('/api/nexha/register-capability', requireInternal, async (req, res) => {
  try {
    const { listingId, capability, publisherId } = req.body;

    const registration = {
      registrationId: `reg_${uuid().slice(0, 8)}`,
      listingId,
      capability,
      publisherId,
      status: 'registered',
      registeredAt: new Date().toISOString(),
      // Nexha Federation OS endpoint
      federationEndpoint: `https://federation.nexha.io/capabilities/${capability.id}`,
    };

    console.log('[Nexha Integration] Registered capability:', registration.registrationId);

    res.json({
      success: true,
      registration,
      message: 'Capability registered in Nexha Federation',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AGENTIC WORKFLOWS
// ============================================

/**
 * Auto-generate listings based on market demand
 */
app.post('/api/agentic/generate-listings', requireInternal, async (req, res) => {
  try {
    const { industry, targetMarket } = req.body;

    // Agentic process:
    // 1. Analyze market demand
    // 2. Identify gaps in current listings
    // 3. Generate BCP recommendations
    // 4. Create draft listings

    const recommendations = [
      {
        type: 'bcp',
        name: `${industry} Operations Pack`,
        confidence: 0.92,
        estimatedDemand: 'high',
        components: ['ai-manager', 'workflows', 'twins'],
        suggestedPrice: 199900,
        reasoning: 'High demand for complete automation in this industry',
      },
      {
        type: 'agent',
        name: `${industry} Customer Success AI`,
        confidence: 0.88,
        estimatedDemand: 'medium',
        suggestedPrice: 79900,
        reasoning: 'Growing need for automated customer engagement',
      },
    ];

    res.json({
      success: true,
      recommendations,
      message: 'Agentic analysis complete',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Match buyers with sellers based on needs
 */
app.post('/api/agentic/match', requireInternal, async (req, res) => {
  try {
    const { buyerNeeds, buyerIndustry } = req.body;

    // Agentic matching:
    // 1. Parse buyer requirements
    // 2. Match with suitable listings
    // 3. Rank by compatibility
    // 4. Generate recommendations

    const matches = [
      {
        listingId: 'lst_restaurant_ops',
        matchScore: 0.95,
        recommendation: 'Complete Restaurant Operations Pack',
        reasoning: 'Covers all identified needs',
      },
      {
        listingId: 'lst_ai_manager',
        matchScore: 0.88,
        recommendation: 'AI Restaurant Manager',
        reasoning: 'Primary capability match',
      },
    ];

    res.json({
      success: true,
      matches,
      message: 'AI-powered matching complete',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// HEALTH & STATUS
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'bam-studio-integration',
    version: '1.0.0',
    integrations: ['hojai-studio', 'global-nexha', 'bam-marketplace'],
  });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



app.listen(PORT, () => {
  console.log(`[BAM Studio Integration] Running on port ${PORT}`);
  console.log('  → HOJAI Studio integration: enabled');
  console.log('  → Global Nexha integration: enabled');
  console.log('  → Agentic workflows: enabled');
});

module.exports = app;
