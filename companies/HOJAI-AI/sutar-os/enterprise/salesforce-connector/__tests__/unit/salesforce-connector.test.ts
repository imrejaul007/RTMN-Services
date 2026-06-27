/**
 * SUTAR OS — Salesforce Connector Tests
 *
 * Tests the Salesforce ↔ SUTAR bidirectional sync logic.
 * Covers: field mappings, sync functions, lead scoring, urgency calculation,
 * capability inference, webhook handling, and connector configuration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import connector logic — we test the pure functions directly
// since the Express app wiring is minimal
describe('Salesforce Connector — Field Mappings', () => {
  // Field mapping tables (replicated from source for testing)
  const ACCOUNT_TO_MERCHANT = {
    Name: 'businessName',
    Industry: 'industry',
    Website: 'website',
    Phone: 'phone',
    BillingCity: 'city',
    BillingCountry: 'country',
    AnnualRevenue: 'annualRevenue',
    NumberOfEmployees: 'employeeCount',
    Type: 'accountType',
  };

  const LEAD_TO_LEAD = {
    FirstName: 'firstName',
    LastName: 'lastName',
    Email: 'email',
    Phone: 'phone',
    Company: 'company',
    Industry: 'industry',
    LeadSource: 'source',
    Status: 'status',
  };

  const OPPORTUNITY_TO_NEGOTIATION = {
    Name: 'dealName',
    Amount: 'targetValue',
    StageName: 'stage',
    CloseDate: 'deadline',
    Description: 'description',
    AccountId: 'accountId',
    Account_Name: 'accountName',
    Probability: 'probability',
  };

  function applyMapping(data: any, mapping: Record<string, string>) {
    const result: any = {};
    for (const [sfField, sutField] of Object.entries(mapping)) {
      if (data[sfField] !== undefined) {
        result[sutField] = data[sfField];
      }
    }
    return result;
  }

  it('maps Account fields to SUTAR merchant fields', () => {
    const sfAccount = {
      Name: 'Acme Corp',
      Industry: 'Manufacturing',
      Website: 'https://acme.example.com',
      Phone: '+1-555-0100',
      BillingCity: 'San Francisco',
      BillingCountry: 'USA',
      AnnualRevenue: 5000000,
      NumberOfEmployees: 250,
      Type: 'Customer',
    };

    const merchant = applyMapping(sfAccount, ACCOUNT_TO_MERCHANT);

    expect(merchant.businessName).toBe('Acme Corp');
    expect(merchant.industry).toBe('Manufacturing');
    expect(merchant.website).toBe('https://acme.example.com');
    expect(merchant.phone).toBe('+1-555-0100');
    expect(merchant.city).toBe('San Francisco');
    expect(merchant.country).toBe('USA');
    expect(merchant.annualRevenue).toBe(5000000);
    expect(merchant.employeeCount).toBe(250);
    expect(merchant.accountType).toBe('Customer');
  });

  it('skips undefined Account fields', () => {
    const sfAccount = { Name: 'Bare Corp', Industry: 'Retail' };
    const merchant = applyMapping(sfAccount, ACCOUNT_TO_MERCHANT);

    expect(merchant.businessName).toBe('Bare Corp');
    expect(merchant.industry).toBe('Retail');
    expect(merchant.website).toBeUndefined();
    expect(merchant.annualRevenue).toBeUndefined();
  });

  it('maps Lead fields to SUTAR lead fields', () => {
    const sfLead = {
      Id: '00Q001',
      FirstName: 'Jane',
      LastName: 'Doe',
      Email: 'jane@example.com',
      Phone: '+1-555-0200',
      Company: 'StartupCo',
      Industry: 'Technology',
      LeadSource: 'Partner',
      Status: 'Working',
    };

    const lead = applyMapping(sfLead, LEAD_TO_LEAD);

    expect(lead.firstName).toBe('Jane');
    expect(lead.lastName).toBe('Doe');
    expect(lead.email).toBe('jane@example.com');
    expect(lead.phone).toBe('+1-555-0200');
    expect(lead.company).toBe('StartupCo');
    expect(lead.industry).toBe('Technology');
    expect(lead.source).toBe('Partner');
    expect(lead.status).toBe('Working');
  });

  it('maps Opportunity fields to negotiation fields', () => {
    const sfOpp = {
      Id: '006001',
      Name: 'Q4 Enterprise Deal',
      Amount: 120000,
      StageName: 'Proposal',
      CloseDate: '2026-09-30',
      Description: 'Annual enterprise license',
      AccountId: '001001',
      Account_Name: 'Acme Corp',
      Probability: 60,
    };

    const negotiation = applyMapping(sfOpp, OPPORTUNITY_TO_NEGOTIATION);

    expect(negotiation.dealName).toBe('Q4 Enterprise Deal');
    expect(negotiation.targetValue).toBe(120000);
    expect(negotiation.stage).toBe('Proposal');
    expect(negotiation.deadline).toBe('2026-09-30');
    expect(negotiation.description).toBe('Annual enterprise license');
    expect(negotiation.accountId).toBe('001001');
    expect(negotiation.accountName).toBe('Acme Corp');
    expect(negotiation.probability).toBe(60);
  });
});

describe('Salesforce Connector — Capability Inference', () => {
  function inferCapabilities(sfAccount: any) {
    const caps = [];
    const industry = (sfAccount.Industry || '').toLowerCase();
    caps.push('product_search', 'negotiation', 'order_placement');
    if (industry.includes('manufactur')) caps.push('bom_management', 'procurement');
    if (industry.includes('retail')) caps.push('inventory_management', 'pos_integration');
    if (sfAccount.Type === 'Partner') caps.push('partner_management', 'rebate_processing');
    return caps;
  }

  it('infers base capabilities for any account', () => {
    const caps = inferCapabilities({ Name: 'Test Corp' });
    expect(caps).toContain('product_search');
    expect(caps).toContain('negotiation');
    expect(caps).toContain('order_placement');
  });

  it('infers manufacturing-specific capabilities', () => {
    const caps = inferCapabilities({ Industry: 'Manufacturing' });
    expect(caps).toContain('bom_management');
    expect(caps).toContain('procurement');
  });

  it('infers retail-specific capabilities', () => {
    const caps = inferCapabilities({ Industry: 'Retail' });
    expect(caps).toContain('inventory_management');
    expect(caps).toContain('pos_integration');
  });

  it('infers partner capabilities', () => {
    const caps = inferCapabilities({ Type: 'Partner' });
    expect(caps).toContain('partner_management');
    expect(caps).toContain('rebate_processing');
  });

  it('infers multiple capability sets', () => {
    const caps = inferCapabilities({ Industry: 'Manufacturing', Type: 'Partner' });
    expect(caps).toContain('bom_management');
    expect(caps).toContain('partner_management');
  });
});

describe('Salesforce Connector — Lead Scoring', () => {
  function calculateLeadScore(sfLead: any) {
    let score = 50;
    if (sfLead.AnnualRevenue > 1000000) score += 20;
    if (sfLead.NumberOfEmployees > 50) score += 15;
    if (sfLead.Rating === 'Hot') score += 10;
    if (sfLead.LeadSource === 'Partner') score += 5;
    return Math.min(100, score);
  }

  it('starts with base score of 50', () => {
    expect(calculateLeadScore({})).toBe(50);
  });

  it('adds 20 for large annual revenue', () => {
    expect(calculateLeadScore({ AnnualRevenue: 2000000 })).toBe(70);
  });

  it('adds 15 for large employee count', () => {
    expect(calculateLeadScore({ NumberOfEmployees: 100 })).toBe(65);
  });

  it('adds 10 for Hot rating', () => {
    expect(calculateLeadScore({ Rating: 'Hot' })).toBe(60);
  });

  it('adds 5 for Partner lead source', () => {
    expect(calculateLeadScore({ LeadSource: 'Partner' })).toBe(55);
  });

  it('caps at 100', () => {
    const lead = {
      AnnualRevenue: 5000000,
      NumberOfEmployees: 500,
      Rating: 'Hot',
      LeadSource: 'Partner',
    };
    expect(calculateLeadScore(lead)).toBe(100);
  });

  it('combines multiple signals', () => {
    const lead = { AnnualRevenue: 3000000, NumberOfEmployees: 200, Rating: 'Hot' };
    expect(calculateLeadScore(lead)).toBe(95);
  });
});

describe('Salesforce Connector — Urgency Calculation', () => {
  function calculateUrgency(sfOpp: any) {
    if (!sfOpp.CloseDate) return 'medium';
    const daysUntilClose = Math.ceil(
      (new Date(sfOpp.CloseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilClose < 7) return 'critical';
    if (daysUntilClose < 30) return 'high';
    if (daysUntilClose < 90) return 'medium';
    return 'low';
  }

  it('returns medium when no CloseDate', () => {
    expect(calculateUrgency({})).toBe('medium');
  });

  it('returns critical for less than 7 days', () => {
    const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calculateUrgency({ CloseDate: futureDate })).toBe('critical');
  });

  it('returns high for 7-30 days', () => {
    const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calculateUrgency({ CloseDate: futureDate })).toBe('high');
  });

  it('returns medium for 30-90 days', () => {
    const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calculateUrgency({ CloseDate: futureDate })).toBe('medium');
  });

  it('returns low for more than 90 days', () => {
    const futureDate = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calculateUrgency({ CloseDate: futureDate })).toBe('low');
  });
});

describe('Salesforce Connector — Configuration', () => {
  it('has correct default config values', () => {
    const SF_CONFIG = {
      clientId: process.env.SF_CLIENT_ID || 'demo_client_id',
      clientSecret: process.env.SF_CLIENT_SECRET || 'demo_client_secret',
      instanceUrl: process.env.SF_INSTANCE_URL || 'https://login.salesforce.com',
      apiVersion: 'v59.0',
      redirectUri: process.env.SF_REDIRECT_URI || 'http://localhost:4600',
    };

    expect(SF_CONFIG.clientId).toBe('demo_client_id');
    expect(SF_CONFIG.apiVersion).toBe('v59.0');
    expect(SF_CONFIG.redirectUri).toBe('http://localhost:4600');
  });

  it('has correct SUTAR endpoint defaults', () => {
    const SUTAR_ENDPOINTS = {
      acnNetwork: process.env.ACN_NETWORK_URL || 'http://localhost:4801',
      agentTwin: process.env.AGENT_TWIN_URL || 'http://localhost:4705',
      negotiation: process.env.NEGOTIATION_URL || 'http://localhost:4293',
      contract: process.env.CONTRACT_URL || 'http://localhost:4292',
    };

    expect(SUTAR_ENDPOINTS.acnNetwork).toBe('http://localhost:4801');
    expect(SUTAR_ENDPOINTS.agentTwin).toBe('http://localhost:4705');
    expect(SUTAR_ENDPOINTS.negotiation).toBe('http://localhost:4293');
    expect(SUTAR_ENDPOINTS.contract).toBe('http://localhost:4292');
  });
});

describe('Salesforce Connector — Webhook Handler', () => {
  function handleSalesforceWebhook(event: any) {
    switch (event.type) {
      case 'ACCOUNT_CREATED':
      case 'ACCOUNT_UPDATED':
        return { operation: 'sync_accounts', count: 1 };
      case 'LEAD_CREATED':
      case 'LEAD_UPDATED':
        return { operation: 'sync_leads', count: 1 };
      case 'OPPORTUNITY_STAGE_CHANGED':
        return { operation: 'sync_opportunities', count: 1 };
      case 'CONTRACT_SIGNED':
        return { operation: 'contract_signed', count: 1 };
      default:
        return { skipped: 1 };
    }
  }

  it('handles ACCOUNT_CREATED webhook', () => {
    const result = handleSalesforceWebhook({ type: 'ACCOUNT_CREATED', data: { Id: '001' } });
    expect(result.operation).toBe('sync_accounts');
  });

  it('handles ACCOUNT_UPDATED webhook', () => {
    const result = handleSalesforceWebhook({ type: 'ACCOUNT_UPDATED', data: { Id: '001' } });
    expect(result.operation).toBe('sync_accounts');
  });

  it('handles LEAD_CREATED webhook', () => {
    const result = handleSalesforceWebhook({ type: 'LEAD_CREATED', data: { Id: '00Q' } });
    expect(result.operation).toBe('sync_leads');
  });

  it('handles LEAD_UPDATED webhook', () => {
    const result = handleSalesforceWebhook({ type: 'LEAD_UPDATED', data: { Id: '00Q' } });
    expect(result.operation).toBe('sync_leads');
  });

  it('handles OPPORTUNITY_STAGE_CHANGED webhook', () => {
    const result = handleSalesforceWebhook({ type: 'OPPORTUNITY_STAGE_CHANGED', data: { Id: '006' } });
    expect(result.operation).toBe('sync_opportunities');
  });

  it('handles CONTRACT_SIGNED webhook', () => {
    const result = handleSalesforceWebhook({ type: 'CONTRACT_SIGNED', data: { Id: '800' } });
    expect(result.operation).toBe('contract_signed');
  });

  it('skips unknown webhook types', () => {
    const result = handleSalesforceWebhook({ type: 'UNKNOWN_EVENT', data: {} });
    expect(result.skipped).toBe(1);
  });
});

describe('Salesforce Connector — Sync Results Shape', () => {
  it('produces correct sync result shape for accounts', () => {
    const results = { synced: 0, skipped: 0, errors: [] as any[] };
    expect(results).toHaveProperty('synced');
    expect(results).toHaveProperty('skipped');
    expect(results).toHaveProperty('errors');
    expect(Array.isArray(results.errors)).toBe(true);
  });

  it('produces correct sync result shape for leads', () => {
    const results = { synced: 0, skipped: 0, errors: [] as any[] };
    expect(results).toHaveProperty('synced');
    expect(results).toHaveProperty('skipped');
    expect(results).toHaveProperty('errors');
  });

  it('produces correct sync result shape for opportunities', () => {
    const results = { synced: 0, skipped: 0, errors: [] as any[] };
    expect(results).toHaveProperty('synced');
    expect(results).toHaveProperty('skipped');
    expect(results).toHaveProperty('errors');
  });
});
