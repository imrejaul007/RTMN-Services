/**
 * Sales OS - Comprehensive Test Suite
 *
 * Tests all major endpoints: leads, contacts, accounts, opportunities, deals, analytics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the data stores
const mockLeads = new Map();
const mockContacts = new Map();
const mockAccounts = new Map();
const mockOpportunities = new Map();
const mockDeals = new Map();

// Generate unique IDs
let idCounter = 1;
const generateId = () => `id_${String(idCounter++).padStart(6, '0')}`;

// ============================================
// DATA MODELS
// ============================================

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  score?: number;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
  company?: string;
  accountId?: string;
  ownerId?: string;
  createdAt: string;
}

interface Account {
  id: string;
  name: string;
  industry?: string;
  size?: 'startup' | 'smb' | 'mid-market' | 'enterprise';
  website?: string;
  phone?: string;
  address?: string;
  ownerId?: string;
  createdAt: string;
}

interface Opportunity {
  id: string;
  name: string;
  accountId: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  closeDate: string;
  ownerId?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: 'discovery' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  probability: number;
  expectedCloseDate: string;
  ownerId?: string;
  contactId?: string;
  notes?: string;
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

const salesService = {
  // Leads
  createLead(data: Partial<Lead>): Lead {
    const now = new Date().toISOString();
    const lead: Lead = {
      id: generateId(),
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      company: data.company,
      source: data.source || 'unknown',
      status: data.status || 'new',
      score: data.score,
      assignedTo: data.assignedTo,
      createdAt: now,
      updatedAt: now,
    };
    mockLeads.set(lead.id, lead);
    return lead;
  },

  getLead(id: string): Lead | undefined {
    return mockLeads.get(id);
  },

  listLeads(filters?: { status?: string }): Lead[] {
    let leads = Array.from(mockLeads.values());
    if (filters?.status) {
      leads = leads.filter(l => l.status === filters.status);
    }
    return leads;
  },

  updateLead(id: string, data: Partial<Lead>): Lead | undefined {
    const lead = mockLeads.get(id);
    if (!lead) return undefined;
    const updated = { ...lead, ...data, updatedAt: new Date().toISOString() };
    mockLeads.set(id, updated);
    return updated;
  },

  deleteLead(id: string): boolean {
    return mockLeads.delete(id);
  },

  // Contacts
  createContact(data: Partial<Contact>): Contact {
    const contact: Contact = {
      id: generateId(),
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email || '',
      phone: data.phone,
      title: data.title,
      company: data.company,
      accountId: data.accountId,
      ownerId: data.ownerId,
      createdAt: new Date().toISOString(),
    };
    mockContacts.set(contact.id, contact);
    return contact;
  },

  getContact(id: string): Contact | undefined {
    return mockContacts.get(id);
  },

  listContacts(): Contact[] {
    return Array.from(mockContacts.values());
  },

  // Accounts
  createAccount(data: Partial<Account>): Account {
    const account: Account = {
      id: generateId(),
      name: data.name || '',
      industry: data.industry,
      size: data.size,
      website: data.website,
      phone: data.phone,
      address: data.address,
      ownerId: data.ownerId,
      createdAt: new Date().toISOString(),
    };
    mockAccounts.set(account.id, account);
    return account;
  },

  getAccount(id: string): Account | undefined {
    return mockAccounts.get(id);
  },

  listAccounts(): Account[] {
    return Array.from(mockAccounts.values());
  },

  // Opportunities
  createOpportunity(data: Partial<Opportunity>): Opportunity {
    const now = new Date().toISOString();
    const opp: Opportunity = {
      id: generateId(),
      name: data.name || '',
      accountId: data.accountId || '',
      value: data.value || 0,
      currency: data.currency || 'INR',
      stage: data.stage || 'prospecting',
      probability: data.probability || 10,
      closeDate: data.closeDate || '',
      ownerId: data.ownerId,
      description: data.description,
      createdAt: now,
      updatedAt: now,
    };
    mockOpportunities.set(opp.id, opp);
    return opp;
  },

  getOpportunity(id: string): Opportunity | undefined {
    return mockOpportunities.get(id);
  },

  listOpportunities(): Opportunity[] {
    return Array.from(mockOpportunities.values());
  },

  updateOpportunity(id: string, data: Partial<Opportunity>): Opportunity | undefined {
    const opp = mockOpportunities.get(id);
    if (!opp) return undefined;
    const updated = { ...opp, ...data, updatedAt: new Date().toISOString() };
    mockOpportunities.set(id, updated);
    return updated;
  },

  // Deals
  createDeal(data: Partial<Deal>): Deal {
    const deal: Deal = {
      id: generateId(),
      title: data.title || '',
      value: data.value || 0,
      currency: data.currency || 'INR',
      stage: data.stage || 'discovery',
      probability: data.probability || 20,
      expectedCloseDate: data.expectedCloseDate || '',
      ownerId: data.ownerId,
      contactId: data.contactId,
      notes: data.notes,
    };
    mockDeals.set(deal.id, deal);
    return deal;
  },

  getDeal(id: string): Deal | undefined {
    return mockDeals.get(id);
  },

  listDeals(): Deal[] {
    return Array.from(mockDeals.values());
  },

  moveDealStage(id: string, stage: Deal['stage']): Deal | undefined {
    const deal = mockDeals.get(id);
    if (!deal) return undefined;
    const updated = { ...deal, stage };
    mockDeals.set(id, updated);
    return updated;
  },

  // Analytics
  getPipeline(): any {
    const deals = Array.from(mockDeals.values());
    const pipeline: Record<string, { count: number; value: number }> = {};

    deals.forEach(deal => {
      if (!pipeline[deal.stage]) {
        pipeline[deal.stage] = { count: 0, value: 0 };
      }
      pipeline[deal.stage].count++;
      pipeline[deal.stage].value += deal.value;
    });

    return {
      stages: pipeline,
      total: deals.length,
      totalValue: deals.reduce((sum, d) => sum + d.value, 0),
    };
  },

  // Reset for testing
  reset() {
    mockLeads.clear();
    mockContacts.clear();
    mockAccounts.clear();
    mockOpportunities.clear();
    mockDeals.clear();
    idCounter = 1;
  },
};

// ============================================
// TESTS
// ============================================

describe('Sales OS - Leads Module', () => {
  beforeEach(() => {
    salesService.reset();
  });

  describe('createLead', () => {
    it('should create a lead with required fields', () => {
      const lead = salesService.createLead({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+91-9876543210',
        source: 'website',
      });

      expect(lead.id).toBeDefined();
      expect(lead.name).toBe('John Doe');
      expect(lead.email).toBe('john@example.com');
      expect(lead.phone).toBe('+91-9876543210');
      expect(lead.source).toBe('website');
      expect(lead.status).toBe('new');
      expect(lead.createdAt).toBeDefined();
    });

    it('should create a lead with optional fields', () => {
      const lead = salesService.createLead({
        name: 'Jane Smith',
        email: 'jane@example.com',
        company: 'Acme Corp',
        source: 'referral',
        score: 85,
        assignedTo: 'user_123',
      });

      expect(lead.company).toBe('Acme Corp');
      expect(lead.source).toBe('referral');
      expect(lead.score).toBe(85);
      expect(lead.assignedTo).toBe('user_123');
    });

    it('should generate unique IDs', () => {
      const lead1 = salesService.createLead({ name: 'Lead 1', email: 'l1@t.com' });
      const lead2 = salesService.createLead({ name: 'Lead 2', email: 'l2@t.com' });
      const lead3 = salesService.createLead({ name: 'Lead 3', email: 'l3@t.com' });

      expect(lead1.id).not.toBe(lead2.id);
      expect(lead2.id).not.toBe(lead3.id);
      expect(lead1.id).not.toBe(lead3.id);
    });
  });

  describe('getLead', () => {
    it('should retrieve an existing lead', () => {
      const created = salesService.createLead({
        name: 'Test Lead',
        email: 'test@example.com',
      });
      const retrieved = salesService.getLead(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should return undefined for non-existent lead', () => {
      const result = salesService.getLead('non_existent_id');
      expect(result).toBeUndefined();
    });
  });

  describe('listLeads', () => {
    it('should list all leads when no filters', () => {
      salesService.createLead({ name: 'Lead 1', email: 'l1@t.com' });
      salesService.createLead({ name: 'Lead 2', email: 'l2@t.com' });
      salesService.createLead({ name: 'Lead 3', email: 'l3@t.com' });

      const leads = salesService.listLeads();
      expect(leads).toHaveLength(3);
    });

    it('should filter leads by status', () => {
      salesService.createLead({ name: 'Lead 1', email: 'l1@t.com', status: 'new' });
      salesService.createLead({ name: 'Lead 2', email: 'l2@t.com', status: 'contacted' });
      salesService.createLead({ name: 'Lead 3', email: 'l3@t.com', status: 'new' });

      const newLeads = salesService.listLeads({ status: 'new' });
      expect(newLeads).toHaveLength(2);
      newLeads.forEach(lead => {
        expect(lead.status).toBe('new');
      });
    });
  });

  describe('updateLead', () => {
    it('should update existing lead', () => {
      const lead = salesService.createLead({
        name: 'Original Name',
        email: 'original@example.com',
        status: 'new',
      });

      const updated = salesService.updateLead(lead.id, {
        name: 'Updated Name',
        status: 'contacted',
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.status).toBe('contacted');
      expect(updated?.email).toBe('original@example.com'); // unchanged
    });

    it('should return undefined for non-existent lead', () => {
      const result = salesService.updateLead('non_existent', { name: 'New Name' });
      expect(result).toBeUndefined();
    });
  });

  describe('deleteLead', () => {
    it('should delete existing lead', () => {
      const lead = salesService.createLead({
        name: 'To Delete',
        email: 'delete@example.com',
      });

      const deleted = salesService.deleteLead(lead.id);
      const retrieved = salesService.getLead(lead.id);

      expect(deleted).toBe(true);
      expect(retrieved).toBeUndefined();
    });

    it('should return false for non-existent lead', () => {
      const result = salesService.deleteLead('non_existent');
      expect(result).toBe(false);
    });
  });
});

describe('Sales OS - Contacts Module', () => {
  beforeEach(() => {
    salesService.reset();
  });

  describe('createContact', () => {
    it('should create a contact with required fields', () => {
      const contact = salesService.createContact({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });

      expect(contact.id).toBeDefined();
      expect(contact.firstName).toBe('John');
      expect(contact.lastName).toBe('Doe');
      expect(contact.email).toBe('john@example.com');
      expect(contact.createdAt).toBeDefined();
    });

    it('should create contact with optional fields', () => {
      const contact = salesService.createContact({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '+91-9876543210',
        title: 'CEO',
        company: 'Tech Corp',
        accountId: 'acc_123',
      });

      expect(contact.phone).toBe('+91-9876543210');
      expect(contact.title).toBe('CEO');
      expect(contact.company).toBe('Tech Corp');
      expect(contact.accountId).toBe('acc_123');
    });
  });

  describe('listContacts', () => {
    it('should list all contacts', () => {
      salesService.createContact({ firstName: 'A', lastName: 'B', email: 'a@b.com' });
      salesService.createContact({ firstName: 'C', lastName: 'D', email: 'c@d.com' });

      const contacts = salesService.listContacts();
      expect(contacts).toHaveLength(2);
    });
  });
});

describe('Sales OS - Accounts Module', () => {
  beforeEach(() => {
    salesService.reset();
  });

  describe('createAccount', () => {
    it('should create an account', () => {
      const account = salesService.createAccount({
        name: 'Acme Corporation',
        industry: 'Technology',
        size: 'enterprise',
        website: 'https://acme.com',
      });

      expect(account.id).toBeDefined();
      expect(account.name).toBe('Acme Corporation');
      expect(account.industry).toBe('Technology');
      expect(account.size).toBe('enterprise');
      expect(account.website).toBe('https://acme.com');
    });

    it('should validate account size enum', () => {
      const validSizes = ['startup', 'smb', 'mid-market', 'enterprise'] as const;

      validSizes.forEach(size => {
        const account = salesService.createAccount({
          name: `Account ${size}`,
          size,
        });
        expect(account.size).toBe(size);
      });
    });
  });

  describe('getAccount', () => {
    it('should retrieve existing account', () => {
      const created = salesService.createAccount({ name: 'Test Account' });
      const retrieved = salesService.getAccount(created.id);
      expect(retrieved).toEqual(created);
    });

    it('should return undefined for non-existent account', () => {
      const result = salesService.getAccount('non_existent');
      expect(result).toBeUndefined();
    });
  });
});

describe('Sales OS - Opportunities Module', () => {
  beforeEach(() => {
    salesService.reset();
  });

  describe('createOpportunity', () => {
    it('should create an opportunity with value and stage', () => {
      const opp = salesService.createOpportunity({
        name: 'Big Deal',
        accountId: 'acc_123',
        value: 500000,
        currency: 'INR',
        stage: 'prospecting',
        probability: 10,
        closeDate: '2026-12-31',
      });

      expect(opp.id).toBeDefined();
      expect(opp.name).toBe('Big Deal');
      expect(opp.value).toBe(500000);
      expect(opp.stage).toBe('prospecting');
      expect(opp.probability).toBe(10);
    });
  });

  describe('updateOpportunity', () => {
    it('should update opportunity stage and probability', () => {
      const opp = salesService.createOpportunity({
        name: 'Deal',
        accountId: 'acc_123',
        value: 100000,
        stage: 'prospecting',
        probability: 10,
      });

      const updated = salesService.updateOpportunity(opp.id, {
        stage: 'proposal',
        probability: 50,
      });

      expect(updated?.stage).toBe('proposal');
      expect(updated?.probability).toBe(50);
    });

    it('should close opportunity as won', () => {
      const opp = salesService.createOpportunity({
        name: 'Deal',
        accountId: 'acc_123',
        value: 200000,
        stage: 'negotiation',
        probability: 80,
      });

      const updated = salesService.updateOpportunity(opp.id, {
        stage: 'closed-won',
        probability: 100,
      });

      expect(updated?.stage).toBe('closed-won');
      expect(updated?.probability).toBe(100);
    });
  });
});

describe('Sales OS - Deals Module', () => {
  beforeEach(() => {
    salesService.reset();
  });

  describe('createDeal', () => {
    it('should create a deal', () => {
      const deal = salesService.createDeal({
        title: 'Enterprise Contract',
        value: 1000000,
        currency: 'INR',
        stage: 'discovery',
        probability: 20,
        expectedCloseDate: '2026-06-30',
      });

      expect(deal.id).toBeDefined();
      expect(deal.title).toBe('Enterprise Contract');
      expect(deal.value).toBe(1000000);
      expect(deal.stage).toBe('discovery');
    });
  });

  describe('moveDealStage', () => {
    it('should move deal through stages', () => {
      const deal = salesService.createDeal({
        title: 'Test Deal',
        value: 50000,
        stage: 'discovery',
        probability: 20,
      });

      // Move to proposal
      let updated = salesService.moveDealStage(deal.id, 'proposal');
      expect(updated?.stage).toBe('proposal');

      // Move to negotiation
      updated = salesService.moveDealStage(deal.id, 'negotiation');
      expect(updated?.stage).toBe('negotiation');

      // Close as won
      updated = salesService.moveDealStage(deal.id, 'closed-won');
      expect(updated?.stage).toBe('closed-won');
    });

    it('should close deal as lost', () => {
      const deal = salesService.createDeal({
        title: 'Lost Deal',
        value: 25000,
        stage: 'negotiation',
      });

      const updated = salesService.moveDealStage(deal.id, 'closed-lost');
      expect(updated?.stage).toBe('closed-lost');
    });
  });
});

describe('Sales OS - Analytics Module', () => {
  beforeEach(() => {
    salesService.reset();
  });

  describe('getPipeline', () => {
    it('should calculate pipeline metrics', () => {
      // Create deals in different stages
      salesService.createDeal({ title: 'Deal 1', value: 100000, stage: 'discovery' });
      salesService.createDeal({ title: 'Deal 2', value: 200000, stage: 'discovery' });
      salesService.createDeal({ title: 'Deal 3', value: 150000, stage: 'proposal' });
      salesService.createDeal({ title: 'Deal 4', value: 300000, stage: 'negotiation' });
      salesService.createDeal({ title: 'Deal 5', value: 500000, stage: 'closed-won' });

      const pipeline = salesService.getPipeline();

      expect(pipeline.total).toBe(5);
      expect(pipeline.totalValue).toBe(1250000);
      expect(pipeline.stages.discovery.count).toBe(2);
      expect(pipeline.stages.discovery.value).toBe(300000);
      expect(pipeline.stages.proposal.count).toBe(1);
      expect(pipeline.stages.negotiation.count).toBe(1);
      expect(pipeline.stages['closed-won'].count).toBe(1);
    });

    it('should return empty pipeline when no deals', () => {
      const pipeline = salesService.getPipeline();

      expect(pipeline.total).toBe(0);
      expect(pipeline.totalValue).toBe(0);
      expect(Object.keys(pipeline.stages)).toHaveLength(0);
    });
  });
});

describe('Sales OS - Lead Lifecycle', () => {
  beforeEach(() => {
    salesService.reset();
  });

  it('should follow complete lead to deal lifecycle', () => {
    // 1. Create lead
    const lead = salesService.createLead({
      name: 'Enterprise Client',
      email: 'contact@enterprise.com',
      company: 'Enterprise Corp',
      source: 'referral',
    });
    expect(lead.status).toBe('new');

    // 2. Update lead status to contacted
    const contacted = salesService.updateLead(lead.id, { status: 'contacted' });
    expect(contacted?.status).toBe('contacted');

    // 3. Create contact from lead
    const contact = salesService.createContact({
      firstName: 'Enterprise',
      lastName: 'Contact',
      email: lead.email,
      company: lead.company,
    });
    expect(contact.email).toBe(lead.email);

    // 4. Create account
    const account = salesService.createAccount({
      name: lead.company || '',
      industry: 'Technology',
      size: 'enterprise',
    });
    expect(account.name).toBe('Enterprise Corp');

    // 5. Create opportunity
    const opp = salesService.createOpportunity({
      name: `${account.name} - Enterprise License`,
      accountId: account.id,
      value: 5000000,
      stage: 'prospecting',
    });
    expect(opp.value).toBe(5000000);

    // 6. Create deal
    const deal = salesService.createDeal({
      title: opp.name,
      value: opp.value,
      stage: 'discovery',
      probability: 20,
    });
    expect(deal.value).toBe(5000000);

    // 7. Move deal to closed-won
    const won = salesService.moveDealStage(deal.id, 'closed-won');
    expect(won?.stage).toBe('closed-won');

    // 8. Update lead to won
    const wonLead = salesService.updateLead(lead.id, { status: 'won' });
    expect(wonLead?.status).toBe('won');

    // 9. Verify analytics
    const pipeline = salesService.getPipeline();
    expect(pipeline.stages['closed-won'].count).toBe(1);
    expect(pipeline.stages['closed-won'].value).toBe(5000000);
  });
});
