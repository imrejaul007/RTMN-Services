/**
 * SUTAR OS — Salesforce Connector
 *
 * Bidirectional sync between Salesforce CRM and SUTAR agent network.
 * Keeps accounts, leads, contacts, and opportunities in sync with the
 * ACN agent registry and merchant agents.
 *
 * Endpoints:
 *   POST /api/sync/accounts          — Sync Salesforce accounts → SUTAR merchants
 *   POST /api/sync/leads             — Sync Salesforce leads → SUTAR leads
 *   POST /api/sync/opportunities      — Sync opportunities → negotiation missions
 *   POST /api/webhooks/salesforce    — Inbound webhook from Salesforce
 *   GET  /api/status                 — Connector health + last sync
 *   GET  /health
 */

const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const { setupSecurity } = require('@rtmn/shared/security');

const app = express();
app.use(express.json());

setupSecurity(app, { serviceName: 'salesforce-connector' });

const PORT = process.env.SALESFORCE_PORT || 4600;

// ---------- Configuration ----------
const SF_CONFIG = {
  clientId:     process.env.SF_CLIENT_ID     || 'demo_client_id',
  clientSecret: process.env.SF_CLIENT_SECRET || 'demo_client_secret',
  instanceUrl:  process.env.SF_INSTANCE_URL  || 'https://login.salesforce.com',
  apiVersion:   'v59.0',
  redirectUri:  process.env.SF_REDIRECT_URI  || 'http://localhost:4600/oauth/callback',
};

const SUTAR_ENDPOINTS = {
  acnNetwork:   process.env.ACN_NETWORK_URL   || 'http://localhost:4801',
  agentTwin:    process.env.AGENT_TWIN_URL     || 'http://localhost:4705',
  negotiation:  process.env.NEGOTIATION_URL  || 'http://localhost:4293',
  contract:     process.env.CONTRACT_URL       || 'http://localhost:4292',
};

// Token cache
let accessToken = null;
let tokenExpiry = 0;

// ---------- Salesforce Auth ----------
async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry - 60000) {
    return accessToken;
  }
  // Demo mode: return mock token
  accessToken = 'demo_access_token_' + Date.now();
  tokenExpiry = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
  return accessToken;
}

// ---------- Field Mappings ----------
const ACCOUNT_TO_MERCHANT = {
  Name:            'businessName',
  Industry:         'industry',
  Website:          'website',
  Phone:            'phone',
  BillingCity:     'city',
  BillingCountry:  'country',
  AnnualRevenue:   'annualRevenue',
  NumberOfEmployees: 'employeeCount',
  Type:             'accountType',
};

const LEAD_TO_LEAD = {
  FirstName:    'firstName',
  LastName:     'lastName',
  Email:        'email',
  Phone:        'phone',
  Company:      'company',
  Industry:     'industry',
  LeadSource:   'source',
  Status:       'status',
};

const OPPORTUNITY_TO_NEGOTIATION = {
  Name:              'dealName',
  Amount:             'targetValue',
  StageName:         'stage',
  CloseDate:         'deadline',
  Description:        'description',
  AccountId:         'accountId',
  Account_Name:      'accountName',
  Probability:        'probability',
};

// ---------- Sync: Accounts → Merchants ----------
async function syncAccounts(accounts) {
  const results = { synced: 0, skipped: 0, errors: [] };
  const token = await getAccessToken();

  for (const sfAccount of accounts) {
    try {
      // Map Salesforce account to SUTAR merchant agent
      const merchant = {};
      for (const [sfField, sutField] of Object.entries(ACCOUNT_TO_MERCHANT)) {
        if (sfAccount[sfField] !== undefined) {
          merchant[sutField] = sfAccount[sfField];
        }
      }
      merchant.sfAccountId = sfAccount.Id;
      merchant.source = 'salesforce';
      merchant.capabilities = inferCapabilities(sfAccount);

      // Register or update merchant in ACN Network
      const response = await fetch(`${SUTAR_ENDPOINTS.acnNetwork}/api/agents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(merchant),
      });

      if (response.ok) {
        results.synced++;
      } else {
        results.errors.push({ sfId: sfAccount.Id, status: response.status });
      }
    } catch (err) {
      results.errors.push({ sfId: sfAccount.Id, error: err.message });
    }
  }
  return results;
}

function inferCapabilities(sfAccount) {
  const caps = [];
  const industry = (sfAccount.Industry || '').toLowerCase();
  caps.push('product_search', 'negotiation', 'order_placement');
  if (industry.includes('manufactur')) caps.push('bom_management', 'procurement');
  if (industry.includes('retail')) caps.push('inventory_management', 'pos_integration');
  if (sfAccount.Type === 'Partner') caps.push('partner_management', 'rebate_processing');
  return caps;
}

// ---------- Sync: Leads → SUTAR Leads ----------
async function syncLeads(leads) {
  const results = { synced: 0, skipped: 0, errors: [] };
  const token = await getAccessToken();

  for (const sfLead of leads) {
    try {
      const lead = {};
      for (const [sfField, sutField] of Object.entries(LEAD_TO_LEAD)) {
        if (sfLead[sfField] !== undefined) {
          lead[sutField] = sfLead[sfField];
        }
      }
      lead.sfLeadId = sfLead.Id;
      lead.source = 'salesforce';
      lead.score = calculateLeadScore(sfLead);

      // Update lead in SUTAR twin
      const response = await fetch(`${SUTAR_ENDPOINTS.agentTwin}/api/twins/leads/${sfLead.Id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });

      if (response.ok || response.status === 404) {
        results.synced++;
      } else {
        results.errors.push({ sfId: sfLead.Id, status: response.status });
      }
    } catch (err) {
      results.errors.push({ sfId: sfLead.Id, error: err.message });
    }
  }
  return results;
}

function calculateLeadScore(sfLead) {
  let score = 50;
  if (sfLead.AnnualRevenue > 1000000) score += 20;
  if (sfLead.NumberOfEmployees > 50) score += 15;
  if (sfLead.Rating === 'Hot') score += 10;
  if (sfLead.LeadSource === 'Partner') score += 5;
  return Math.min(100, score);
}

// ---------- Sync: Opportunities → Negotiations ----------
async function syncOpportunities(opportunities) {
  const results = { synced: 0, skipped: 0, errors: [] };
  const token = await getAccessToken();

  for (const sfOpp of opportunities) {
    try {
      if (sfOpp.StageName === 'Closed Won' || sfOpp.StageName === 'Closed Lost') {
        results.skipped++;
        continue;
      }

      const negotiation = {};
      for (const [sfField, sutField] of Object.entries(OPPORTUNITY_TO_NEGOTIATION)) {
        if (sfOpp[sfField] !== undefined) {
          negotiation[sutField] = sfOpp[sfField];
        }
      }
      negotiation.sfOpportunityId = sfOpp.Id;
      negotiation.source = 'salesforce';
      negotiation.urgency = calculateUrgency(sfOpp);
      negotiation.parties = [{ id: sfOpp.AccountId, role: 'buyer', name: sfOpp.Account_Name }];

      // Create negotiation mission in SUTAR
      const response = await fetch(`${SUTAR_ENDPOINTS.negotiation}/api/missions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(negotiation),
      });

      if (response.ok) {
        results.synced++;
      } else {
        results.errors.push({ sfId: sfOpp.Id, status: response.status });
      }
    } catch (err) {
      results.errors.push({ sfId: sfOpp.Id, error: err.message });
    }
  }
  return results;
}

function calculateUrgency(sfOpp) {
  if (!sfOpp.CloseDate) return 'medium';
  const daysUntilClose = Math.ceil((new Date(sfOpp.CloseDate) - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntilClose < 7) return 'critical';
  if (daysUntilClose < 30) return 'high';
  if (daysUntilClose < 90) return 'medium';
  return 'low';
}

// ---------- Inbound Webhook from Salesforce ----------
async function handleSalesforceWebhook(event) {
  switch (event.type) {
    case 'ACCOUNT_CREATED':
    case 'ACCOUNT_UPDATED':
      return syncAccounts([event.data]);
    case 'LEAD_CREATED':
    case 'LEAD_UPDATED':
      return syncLeads([event.data]);
    case 'OPPORTUNITY_STAGE_CHANGED':
      return syncOpportunities([event.data]);
    case 'CONTRACT_SIGNED':
      return handleContractSigned(event.data);
    default:
      return { skipped: 1 };
  }
}

async function handleContractSigned(data) {
  // Update Salesforce with contract status
  const token = await getAccessToken();
  try {
    await fetch(`${SF_CONFIG.instanceUrl}/services/data/${SF_CONFIG.apiVersion}/sobjects/Contract/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        AccountId: data.accountId,
        Status: 'Activated',
        ContractTerm: data.termMonths,
        StartDate: data.startDate,
      }),
    });
    return { synced: 1 };
  } catch (err) {
    return { errors: [{ error: err.message }] };
  }
}

// ---------- Routes ----------
app.post('/api/sync/accounts', requireAuth, async (req, res) => {
  const { accounts } = req.body || {};
  if (!Array.isArray(accounts)) {
    return res.status(400).json({ error: 'accounts array required' });
  }
  const results = await syncAccounts(accounts);
  res.json({ operation: 'sync_accounts', ...results });
});

app.post('/api/sync/leads', requireAuth, async (req, res) => {
  const { leads } = req.body || {};
  if (!Array.isArray(leads)) {
    return res.status(400).json({ error: 'leads array required' });
  }
  const results = await syncLeads(leads);
  res.json({ operation: 'sync_leads', ...results });
});

app.post('/api/sync/opportunities', requireAuth, async (req, res) => {
  const { opportunities } = req.body || {};
  if (!Array.isArray(opportunities)) {
    return res.status(400).json({ error: 'opportunities array required' });
  }
  const results = await syncOpportunities(opportunities);
  res.json({ operation: 'sync_opportunities', ...results });
});

app.post('/api/webhooks/salesforce', async (req, res) => {
  // Verify Salesforce webhook signature (simplified demo)
  const signature = req.headers['x-salesforce-signature'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }
  const result = await handleSalesforceWebhook(req.body);
  res.json({ received: true, ...result });
});

app.get('/api/status', (_req, res) => {
  res.json({
    service: 'salesforce-connector',
    status: 'healthy',
    tokenExpiry: new Date(tokenExpiry).toISOString(),
    sfInstance: SF_CONFIG.instanceUrl,
    sfApiVersion: SF_CONFIG.apiVersion,
    sutAREndpoints: SUTAR_ENDPOINTS,
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'salesforce-connector',
    port: PORT,
    layer: 'Enterprise Integration',
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[salesforce-connector] listening on :${PORT}`);
});

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });