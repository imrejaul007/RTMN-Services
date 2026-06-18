/**
 * Sales Bridge - Universal Bridge Service
 *
 * This service connects any Industry OS to Sales OS
 * Deploy one instance per industry with industry-specific configuration
 *
 * Usage:
 *   INDUSTRY=restaurant PORT=5011 npm start
 *   INDUSTRY=hotel PORT=5026 npm start
 *   INDUSTRY=healthcare PORT=5021 npm start
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.BRIDGE_PORT || process.env.PORT || 5011;
const INDUSTRY = process.env.INDUSTRY || 'restaurant';
const SALES_OS_URL = process.env.SALES_OS_URL || 'http://localhost:5055';
const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4510';

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan(`${INDUSTRY}-sales-bridge`));
app.use(express.json());

// Industry-specific configurations
const industryConfig = {
  restaurant: {
    name: 'Restaurant OS',
    leadSources: ['walk_in', 'reservation', 'catering', 'event', 'loyalty', 'online'],
    valueEstimate: (data) => Math.max(5000, data.guestCount * 1000),
    mapping: {
      customerName: 'guestName',
      guestCount: 'partySize',
      eventType: 'occasion',
    },
  },
  hotel: {
    name: 'Hotel OS',
    leadSources: ['booking_inquiry', 'corporate_rfp', 'wedding', 'loyalty', 'repeat'],
    valueEstimate: (data) => Math.max(10000, (data.nights || 1) * (data.roomRate || 5000)),
    mapping: {
      customerName: 'guestName',
      checkIn: 'arrivalDate',
      checkOut: 'departureDate',
    },
  },
  healthcare: {
    name: 'Healthcare OS',
    leadSources: ['appointment', 'insurance', 'new_patient', 'referral', 'health_checkup'],
    valueEstimate: (data) => Math.max(5000, data.packageCost || 10000),
    mapping: {
      customerName: 'patientName',
      serviceType: 'department',
    },
  },
  retail: {
    name: 'Retail OS',
    leadSources: ['walk_in', 'online', 'loyalty', 'abandoned_cart', 'return_exchange'],
    valueEstimate: (data) => Math.max(1000, data.cartValue || 5000),
    mapping: {
      customerName: 'customerName',
      cartValue: 'orderValue',
    },
  },
  legal: {
    name: 'Legal OS',
    leadSources: ['consultation', 'case_inquiry', 'corporate', 'will_trust', 'compliance'],
    valueEstimate: (data) => Math.max(25000, data.caseValue || 50000),
    mapping: {
      customerName: 'clientName',
      caseType: 'serviceType',
    },
  },
  beauty: {
    name: 'Beauty OS',
    leadSources: ['appointment', 'package_inquiry', 'first_visit', 'membership', 'gift'],
    valueEstimate: (data) => Math.max(2000, data.serviceCost || 5000),
    mapping: {
      customerName: 'clientName',
      serviceType: 'treatmentType',
    },
  },
  fitness: {
    name: 'Fitness OS',
    leadSources: ['membership_inquiry', 'trial', 'class_interest', 'personal_training', 'referral'],
    valueEstimate: (data) => Math.max(3000, data.membershipFee || 10000),
    mapping: {
      customerName: 'memberName',
      membershipType: 'planType',
    },
  },
  realestate: {
    name: 'RealEstate OS',
    leadSources: ['property_inquiry', 'site_visit', 'home_loan', 'investment', 'rental'],
    valueEstimate: (data) => Math.max(50000, data.propertyValue * 0.02 || 100000),
    mapping: {
      customerName: 'buyerName',
      propertyType: 'listingType',
    },
  },
  default: {
    name: 'Generic OS',
    leadSources: ['direct', 'referral', 'website', 'campaign'],
    valueEstimate: (data) => data.value || 10000,
    mapping: {},
  },
};

const config = industryConfig[INDUSTRY] || industryConfig.default;

// In-memory store for this bridge
const localLeads = new Map();
const syncStatus = new Map();

// ==================== HEALTH ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: `${config.name} - Sales Bridge`,
    industry: INDUSTRY,
    port: PORT,
    salesOsUrl: SALES_OS_URL,
    connected: syncStatus.get('salesOs') || false,
    lastSync: syncStatus.get('lastSync') || null,
  });
});

// ==================== BRIDGE ENDPOINTS ====================

// Capture lead from Industry OS
app.post('/api/leads', async (req, res) => {
  try {
    const {
      customerName,
      email,
      phone,
      source,
      notes,
      metadata
    } = req.body;

    if (!customerName && !email) {
      return res.status(400).json({
        success: false,
        error: 'Customer name or email required'
      });
    }

    // Transform to standard format
    const nameParts = (customerName || '').split(' ');
    const lead = {
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: email || null,
      phone: phone || null,
      company: metadata?.company || `${INDUSTRY} Customer`,
      source: source || 'direct',
      industry: INDUSTRY,
      value: config.valueEstimate(metadata || {}),
      ownerId: metadata?.ownerId || null,
      status: 'new',
      score: 50,
      metadata: {
        ...metadata,
        industry,
        originalData: req.body,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store locally
    const leadId = `${INDUSTRY}-LD${localLeads.size + 1}`;
    lead.id = leadId;
    localLeads.set(leadId, lead);

    // Publish to Event Bus (async)
    try {
      await fetch(`${EVENT_BUS_URL}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lead.created',
          industry: INDUSTRY,
          timestamp: new Date().toISOString(),
          data: lead,
        }),
      });
    } catch (eventError) {
      console.log('[Sales Bridge] Event Bus not available, will sync later');
    }

    // Sync to Sales OS (async)
    syncLeadToSalesOS(lead);

    res.status(201).json({
      success: true,
      lead,
      message: 'Lead captured and synced to Sales OS',
    });
  } catch (error) {
    console.error('[Sales Bridge] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk lead capture
app.post('/api/leads/bulk', async (req, res) => {
  const { leads } = req.body;

  if (!Array.isArray(leads)) {
    return res.status(400).json({
      success: false,
      error: 'Leads array required'
    });
  }

  const results = [];
  for (const leadData of leads) {
    const nameParts = (leadData.customerName || '').split(' ');
    const lead = {
      id: `${INDUSTRY}-LD${localLeads.size + 1}`,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: leadData.email || null,
      phone: leadData.phone || null,
      company: leadData.metadata?.company || `${INDUSTRY} Customer`,
      source: leadData.source || 'bulk_import',
      industry: INDUSTRY,
      value: config.valueEstimate(leadData.metadata || {}),
      metadata: leadData.metadata,
      createdAt: new Date().toISOString(),
    };
    localLeads.set(lead.id, lead);
    syncLeadToSalesOS(lead);
    results.push(lead);
  }

  res.status(201).json({
    success: true,
    count: results.length,
    leads: results,
  });
});

// Get local leads
app.get('/api/leads', (req, res) => {
  const { source, status } = req.query;
  let leads = Array.from(localLeads.values());

  if (source) leads = leads.filter(l => l.source === source);
  if (status) leads = leads.filter(l => l.status === status);

  res.json({ success: true, count: leads.length, leads });
});

// Get lead by ID
app.get('/api/leads/:id', (req, res) => {
  const lead = localLeads.get(req.params.id);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }
  res.json({ success: true, lead });
});

// Update lead
app.patch('/api/leads/:id', async (req, res) => {
  const lead = localLeads.get(req.params.id);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }

  const updated = { ...lead, ...req.body, updatedAt: new Date().toISOString() };
  localLeads.set(req.params.id, updated);

  // Sync update to Sales OS
  try {
    await fetch(`${SALES_OS_URL}/api/leads/${updated.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
  } catch (error) {
    console.log('[Sales Bridge] Could not sync update to Sales OS');
  }

  res.json({ success: true, lead: updated });
});

// Convert lead to opportunity
app.post('/api/leads/:id/convert', async (req, res) => {
  const lead = localLeads.get(req.params.id);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }

  const { title, value, closeDate, accountId } = req.body;

  const opportunity = {
    id: `${INDUSTRY}-OPP${Date.now()}`,
    title: title || `${lead.company} - ${INDUSTRY} Deal`,
    accountId: accountId || null,
    value: value || lead.value,
    stage: 'lead',
    probability: 10,
    closeDate: closeDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ownerId: lead.ownerId,
    leadId: lead.id,
    industry: INDUSTRY,
    products: req.body.products || [],
    metadata: lead.metadata,
    createdAt: new Date().toISOString(),
  };

  // Update lead status
  lead.status = 'converted';
  lead.convertedTo = opportunity.id;
  localLeads.set(lead.id, lead);

  // Publish event
  try {
    await fetch(`${EVENT_BUS_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'lead.converted',
        industry: INDUSTRY,
        timestamp: new Date().toISOString(),
        data: { lead, opportunity },
      }),
    });
  } catch (error) {
    console.log('[Sales Bridge] Could not publish conversion event');
  }

  res.status(201).json({ success: true, lead, opportunity });
});

// ==================== SYNC ENDPOINTS ====================

// Sync all leads to Sales OS
app.post('/api/sync', async (req, res) => {
  const leads = Array.from(localLeads.values());
  let synced = 0;
  let failed = 0;

  for (const lead of leads) {
    try {
      const result = await syncLeadToSalesOS(lead);
      if (result) synced++;
      else failed++;
    } catch (error) {
      failed++;
    }
  }

  syncStatus.set('lastSync', new Date().toISOString());
  syncStatus.set('salesOs', true);

  res.json({
    success: true,
    synced,
    failed,
    lastSync: syncStatus.get('lastSync'),
  });
});

// Get sync status
app.get('/api/sync/status', (req, res) => {
  res.json({
    totalLeads: localLeads.size,
    lastSync: syncStatus.get('lastSync'),
    salesOsConnected: syncStatus.get('salesOs') || false,
    salesOsUrl: SALES_OS_URL,
  });
});

// ==================== ANALYTICS (Proxy to Sales OS) ====================

app.get('/api/analytics', async (req, res) => {
  try {
    const response = await fetch(`${SALES_OS_URL}/api/analytics/overview`);
    const data = await response.json();

    // Filter for this industry
    const industryLeads = Array.from(localLeads.values());
    const industryValue = industryLeads.reduce((sum, l) => sum + (l.value || 0), 0);

    res.json({
      success: true,
      industry: INDUSTRY,
      localLeads: industryLeads.length,
      localValue: industryValue,
      salesOsData: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Could not fetch analytics from Sales OS',
      localStats: {
        totalLeads: localLeads.size,
        totalValue: Array.from(localLeads.values()).reduce((sum, l) => sum + (l.value || 0), 0),
      },
    });
  }
});

// ==================== HELPERS ====================

async function syncLeadToSalesOS(lead) {
  try {
    const response = await fetch(`${SALES_OS_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    });

    if (response.ok) {
      syncStatus.set('salesOs', true);
      syncStatus.set('lastSync', new Date().toISOString());
      return true;
    }
    return false;
  } catch (error) {
    console.log(`[Sales Bridge] Could not sync to Sales OS: ${error.message}`);
    return false;
  }
}

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
  console.error(`[${INDUSTRY}-sales-bridge] Error:`, err);
  res.status(500).json({ success: false, error: err.message });
});

// ==================== START ====================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║          ${config.name} - Sales Bridge                   ║
╠══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                           ║
║  Industry: ${INDUSTRY.padEnd(47)}║
║  Sales OS: ${SALES_OS_URL.padEnd(46)}║
║  Event Bus: ${EVENT_BUS_URL.padEnd(44)}║
║                                                          ║
║  Lead Sources: ${config.leadSources.slice(0, 3).join(', ').padEnd(43)}║
╚══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
