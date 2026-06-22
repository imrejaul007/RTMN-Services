/**
 * SDR Agent - CRM Tool
 * Version: 1.0.0 | Date: June 2, 2026
 * Purpose: CRM integration for lead management and prospect tracking
 */

import { z } from 'zod';
import type { Tool, ToolResult } from '../../core/src/BaseAgent.js';

// ============================================================================
// CRM Data Store (In-Memory)
// ============================================================================

interface Contact {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  title?: string;
  linkedIn?: string;
  industry?: string;
  companySize?: string;
  location?: string;
  source: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Company {
  id: string;
  tenantId: string;
  name: string;
  domain: string;
  industry?: string;
  size?: string;
  location?: string;
  linkedIn?: string;
  funding?: string;
  description?: string;
  techStack?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Lead {
  id: string;
  tenantId: string;
  contactId: string;
  companyId?: string;
  stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  score: number;
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  source: string;
  notes: string[];
  lastContact?: Date;
  nextFollowup?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface Opportunity {
  id: string;
  tenantId: string;
  leadId: string;
  title: string;
  value: number;
  stage: string;
  probability: number;
  expectedClose?: Date;
  createdAt: Date;
  updatedAt: Date;
}

class CRMStore {
  private contacts: Map<string, Contact> = new Map();
  private companies: Map<string, Company> = new Map();
  private leads: Map<string, Lead> = new Map();
  private opportunities: Map<string, Opportunity> = new Map();

  // Contact methods
  createContact(contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Contact {
    const id = `contact_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const newContact: Contact = { ...contact, id, createdAt: now, updatedAt: now };
    this.contacts.set(id, newContact);
    return newContact;
  }

  getContact(id: string): Contact | undefined {
    return this.contacts.get(id);
  }

  getContactByEmail(tenantId: string, email: string): Contact | undefined {
    return Array.from(this.contacts.values()).find(c => c.tenantId === tenantId && c.email === email);
  }

  getContactsByCompany(companyId: string): Contact[] {
    return Array.from(this.contacts.values()).filter(c => c.company === companyId);
  }

  updateContact(id: string, updates: Partial<Contact>): Contact | undefined {
    const contact = this.contacts.get(id);
    if (!contact) return undefined;
    const updated: Contact = { ...contact, ...updates, id, updatedAt: new Date() };
    this.contacts.set(id, updated);
    return updated;
  }

  // Company methods
  createCompany(company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Company {
    const id = `company_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const newCompany: Company = { ...company, id, createdAt: now, updatedAt: now };
    this.companies.set(id, newCompany);
    return newCompany;
  }

  getCompany(id: string): Company | undefined {
    return this.companies.get(id);
  }

  getCompanyByDomain(tenantId: string, domain: string): Company | undefined {
    return Array.from(this.companies.values()).find(c => c.tenantId === tenantId && c.domain === domain);
  }

  updateCompany(id: string, updates: Partial<Company>): Company | undefined {
    const company = this.companies.get(id);
    if (!company) return undefined;
    const updated: Company = { ...company, ...updates, id, updatedAt: new Date() };
    this.companies.set(id, updated);
    return updated;
  }

  // Lead methods
  createLead(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Lead {
    const id = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const newLead: Lead = { ...lead, id, createdAt: now, updatedAt: now };
    this.leads.set(id, newLead);
    return newLead;
  }

  getLead(id: string): Lead | undefined {
    return this.leads.get(id);
  }

  getLeadsByStage(tenantId: string, stage: Lead['stage']): Lead[] {
    return Array.from(this.leads.values()).filter(l => l.tenantId === tenantId && l.stage === stage);
  }

  getLeadsByAssignee(tenantId: string, assignee: string): Lead[] {
    return Array.from(this.leads.values()).filter(l => l.tenantId === tenantId && l.assignedTo === assignee);
  }

  getHighPriorityLeads(tenantId: string): Lead[] {
    return Array.from(this.leads.values())
      .filter(l => l.tenantId === tenantId && l.priority === 'high')
      .sort((a, b) => b.score - a.score);
  }

  updateLead(id: string, updates: Partial<Lead>): Lead | undefined {
    const lead = this.leads.get(id);
    if (!lead) return undefined;
    const updated: Lead = { ...lead, ...updates, id, updatedAt: new Date() };
    this.leads.set(id, updated);
    return updated;
  }

  addLeadNote(id: string, note: string): Lead | undefined {
    const lead = this.leads.get(id);
    if (!lead) return undefined;
    lead.notes.push(note);
    lead.updatedAt = new Date();
    this.leads.set(id, lead);
    return lead;
  }

  // Opportunity methods
  createOpportunity(opp: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt'>): Opportunity {
    const id = `opp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const newOpp: Opportunity = { ...opp, id, createdAt: now, updatedAt: now };
    this.opportunities.set(id, newOpp);
    return newOpp;
  }

  getOpportunity(id: string): Opportunity | undefined {
    return this.opportunities.get(id);
  }

  getOpportunitiesByLead(leadId: string): Opportunity[] {
    return Array.from(this.opportunities.values()).filter(o => o.leadId === leadId);
  }

  updateOpportunity(id: string, updates: Partial<Opportunity>): Opportunity | undefined {
    const opp = this.opportunities.get(id);
    if (!opp) return undefined;
    const updated: Opportunity = { ...opp, ...updates, id, updatedAt: new Date() };
    this.opportunities.set(id, updated);
    return updated;
  }

  // Analytics
  getLeadStats(tenantId: string): {
    total: number;
    byStage: Record<string, number>;
    byPriority: Record<string, number>;
    avgScore: number;
  } {
    const leads = Array.from(this.leads.values()).filter(l => l.tenantId === tenantId);
    const byStage: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let totalScore = 0;

    for (const lead of leads) {
      byStage[lead.stage] = (byStage[lead.stage] || 0) + 1;
      byPriority[lead.priority] = (byPriority[lead.priority] || 0) + 1;
      totalScore += lead.score;
    }

    return {
      total: leads.length,
      byStage,
      byPriority,
      avgScore: leads.length > 0 ? totalScore / leads.length : 0,
    };
  }
}

const crmStore = new CRMStore();

// ============================================================================
// Parameter Schemas
// ============================================================================

const CreateContactSchema = z.object({
  tenantId: z.string().describe('Tenant ID'),
  email: z.string().email().describe('Contact email'),
  firstName: z.string().describe('First name'),
  lastName: z.string().describe('Last name'),
  phone: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  linkedIn: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  location: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const GetContactSchema = z.object({
  contactId: z.string().describe('Contact ID'),
});

const UpdateContactSchema = z.object({
  contactId: z.string().describe('Contact ID to update'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  linkedIn: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const CreateCompanySchema = z.object({
  tenantId: z.string().describe('Tenant ID'),
  name: z.string().describe('Company name'),
  domain: z.string().describe('Company domain'),
  industry: z.string().optional(),
  size: z.string().optional(),
  location: z.string().optional(),
  linkedIn: z.string().optional(),
  funding: z.string().optional(),
  description: z.string().optional(),
  techStack: z.array(z.string()).optional(),
});

const GetCompanySchema = z.object({
  companyId: z.string().describe('Company ID'),
});

const CreateLeadSchema = z.object({
  tenantId: z.string().describe('Tenant ID'),
  contactId: z.string().describe('Contact ID'),
  companyId: z.string().optional(),
  stage: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']).describe('Lead stage'),
  score: z.number().min(0).max(100).describe('Lead score 0-100'),
  priority: z.enum(['low', 'medium', 'high']).describe('Lead priority'),
  assignedTo: z.string().optional(),
  source: z.string().optional(),
});

const GetLeadSchema = z.object({
  leadId: z.string().describe('Lead ID'),
});

const UpdateLeadSchema = z.object({
  leadId: z.string().describe('Lead ID to update'),
  stage: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']).optional(),
  score: z.number().min(0).max(100).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assignedTo: z.string().optional(),
  lastContact: z.string().optional(),
  nextFollowup: z.string().optional(),
});

const AddLeadNoteSchema = z.object({
  leadId: z.string().describe('Lead ID'),
  note: z.string().describe('Note to add'),
});

const GetLeadsByStageSchema = z.object({
  tenantId: z.string().describe('Tenant ID'),
  stage: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']).describe('Stage to filter'),
});

const GetHighPriorityLeadsSchema = z.object({
  tenantId: z.string().describe('Tenant ID'),
});

const CreateOpportunitySchema = z.object({
  tenantId: z.string().describe('Tenant ID'),
  leadId: z.string().describe('Lead ID'),
  title: z.string().describe('Opportunity title'),
  value: z.number().describe('Opportunity value'),
  stage: z.string().describe('Stage'),
  probability: z.number().min(0).max(100).describe('Win probability'),
  expectedClose: z.string().optional(),
});

const GetOpportunitiesByLeadSchema = z.object({
  leadId: z.string().describe('Lead ID'),
});

const GetLeadStatsSchema = z.object({
  tenantId: z.string().describe('Tenant ID'),
});

// ============================================================================
// Tool Implementations
// ============================================================================

async function createContactHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = CreateContactSchema.parse(params);
    const contact = crmStore.createContact({ ...args, tags: args.tags || [] });
    return { success: true, data: { contactId: contact.id, contact } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create contact' };
  }
}

async function getContactHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetContactSchema.parse(params);
    const contact = crmStore.getContact(args.contactId);
    if (!contact) return { success: false, error: `Contact not found: ${args.contactId}` };
    return { success: true, data: { contact } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get contact' };
  }
}

async function updateContactHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = UpdateContactSchema.parse(params);
    const contact = crmStore.updateContact(args.contactId, args);
    if (!contact) return { success: false, error: `Contact not found: ${args.contactId}` };
    return { success: true, data: { contactId: contact.id, message: 'Contact updated' } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update contact' };
  }
}

async function createCompanyHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = CreateCompanySchema.parse(params);
    const company = crmStore.createCompany(args);
    return { success: true, data: { companyId: company.id, company } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create company' };
  }
}

async function getCompanyHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetCompanySchema.parse(params);
    const company = crmStore.getCompany(args.companyId);
    if (!company) return { success: false, error: `Company not found: ${args.companyId}` };
    return { success: true, data: { company } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get company' };
  }
}

async function createLeadHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = CreateLeadSchema.parse(params);
    const lead = crmStore.createLead({
      contactId: args.contactId,
      companyId: args.companyId,
      tenantId: args.tenantId,
      stage: args.stage,
      score: args.score,
      priority: args.priority,
      assignedTo: args.assignedTo,
      source: args.source || 'ai',
      notes: [],
    });
    return { success: true, data: { leadId: lead.id, lead } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create lead' };
  }
}

async function getLeadHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetLeadSchema.parse(params);
    const lead = crmStore.getLead(args.leadId);
    if (!lead) return { success: false, error: `Lead not found: ${args.leadId}` };
    return { success: true, data: { lead } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get lead' };
  }
}

async function updateLeadHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = UpdateLeadSchema.parse(params);
    const updates: Partial<Lead> = {};
    if (args.stage) updates.stage = args.stage;
    if (args.score !== undefined) updates.score = args.score;
    if (args.priority) updates.priority = args.priority;
    if (args.assignedTo) updates.assignedTo = args.assignedTo;
    if (args.lastContact) updates.lastContact = new Date(args.lastContact);
    if (args.nextFollowup) updates.nextFollowup = new Date(args.nextFollowup);
    const lead = crmStore.updateLead(args.leadId, updates);
    if (!lead) return { success: false, error: `Lead not found: ${args.leadId}` };
    return { success: true, data: { leadId: lead.id, lead, message: 'Lead updated' } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update lead' };
  }
}

async function addLeadNoteHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = AddLeadNoteSchema.parse(params);
    const lead = crmStore.addLeadNote(args.leadId, args.note);
    if (!lead) return { success: false, error: `Lead not found: ${args.leadId}` };
    return { success: true, data: { leadId: lead.id, noteCount: lead.notes.length, message: 'Note added' } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add note' };
  }
}

async function getLeadsByStageHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetLeadsByStageSchema.parse(params);
    const leads = crmStore.getLeadsByStage(args.tenantId, args.stage);
    return { success: true, data: { leads, count: leads.length } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get leads' };
  }
}

async function getHighPriorityLeadsHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetHighPriorityLeadsSchema.parse(params);
    const leads = crmStore.getHighPriorityLeads(args.tenantId);
    return { success: true, data: { leads, count: leads.length } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get high priority leads' };
  }
}

async function createOpportunityHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = CreateOpportunitySchema.parse(params);
    const opp = crmStore.createOpportunity({
      ...args,
      expectedClose: args.expectedClose ? new Date(args.expectedClose) : undefined,
    });
    return { success: true, data: { opportunityId: opp.id, opportunity: opp } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create opportunity' };
  }
}

async function getOpportunitiesByLeadHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetOpportunitiesByLeadSchema.parse(params);
    const opps = crmStore.getOpportunitiesByLead(args.leadId);
    return { success: true, data: { opportunities: opps, count: opps.length } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get opportunities' };
  }
}

async function getLeadStatsHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetLeadStatsSchema.parse(params);
    const stats = crmStore.getLeadStats(args.tenantId);
    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get lead stats' };
  }
}

// ============================================================================
// CRM Tools Export
// ============================================================================

export const crmTools: Tool[] = [
  {
    name: 'create_contact',
    description: 'Create a new contact in the CRM',
    parameters: [
      { name: 'tenantId', description: 'Tenant ID', schema: z.string() },
      { name: 'email', description: 'Contact email', schema: z.string().email() },
      { name: 'firstName', description: 'First name', schema: z.string() },
      { name: 'lastName', description: 'Last name', schema: z.string() },
      { name: 'phone', description: 'Phone number (optional)', schema: z.string().optional() },
      { name: 'company', description: 'Company name (optional)', schema: z.string().optional() },
      { name: 'title', description: 'Job title (optional)', schema: z.string().optional() },
      { name: 'linkedIn', description: 'LinkedIn URL (optional)', schema: z.string().optional() },
      { name: 'industry', description: 'Industry (optional)', schema: z.string().optional() },
      { name: 'companySize', description: 'Company size (optional)', schema: z.string().optional() },
      { name: 'location', description: 'Location (optional)', schema: z.string().optional() },
      { name: 'source', description: 'Lead source (optional)', schema: z.string().optional() },
      { name: 'tags', description: 'Tags (optional)', schema: z.array(z.string()).optional() },
    ],
    execute: createContactHandler,
  },
  {
    name: 'get_contact',
    description: 'Get a contact by ID',
    parameters: [{ name: 'contactId', description: 'Contact ID', schema: z.string() }],
    execute: getContactHandler,
  },
  {
    name: 'update_contact',
    description: 'Update an existing contact',
    parameters: [
      { name: 'contactId', description: 'Contact ID', schema: z.string() },
      { name: 'firstName', description: 'First name (optional)', schema: z.string().optional() },
      { name: 'lastName', description: 'Last name (optional)', schema: z.string().optional() },
      { name: 'phone', description: 'Phone (optional)', schema: z.string().optional() },
      { name: 'company', description: 'Company (optional)', schema: z.string().optional() },
      { name: 'title', description: 'Title (optional)', schema: z.string().optional() },
      { name: 'tags', description: 'Tags (optional)', schema: z.array(z.string()).optional() },
    ],
    execute: updateContactHandler,
  },
  {
    name: 'create_company',
    description: 'Create a new company in the CRM',
    parameters: [
      { name: 'tenantId', description: 'Tenant ID', schema: z.string() },
      { name: 'name', description: 'Company name', schema: z.string() },
      { name: 'domain', description: 'Company domain', schema: z.string() },
      { name: 'industry', description: 'Industry (optional)', schema: z.string().optional() },
      { name: 'size', description: 'Company size (optional)', schema: z.string().optional() },
      { name: 'location', description: 'Location (optional)', schema: z.string().optional() },
      { name: 'linkedIn', description: 'LinkedIn URL (optional)', schema: z.string().optional() },
      { name: 'funding', description: 'Funding info (optional)', schema: z.string().optional() },
      { name: 'description', description: 'Description (optional)', schema: z.string().optional() },
      { name: 'techStack', description: 'Tech stack (optional)', schema: z.array(z.string()).optional() },
    ],
    execute: createCompanyHandler,
  },
  {
    name: 'get_company',
    description: 'Get a company by ID',
    parameters: [{ name: 'companyId', description: 'Company ID', schema: z.string() }],
    execute: getCompanyHandler,
  },
  {
    name: 'create_lead',
    description: 'Create a new lead in the CRM',
    parameters: [
      { name: 'tenantId', description: 'Tenant ID', schema: z.string() },
      { name: 'contactId', description: 'Contact ID', schema: z.string() },
      { name: 'companyId', description: 'Company ID (optional)', schema: z.string().optional() },
      { name: 'stage', description: 'Lead stage', schema: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']) },
      { name: 'score', description: 'Lead score 0-100', schema: z.number().min(0).max(100) },
      { name: 'priority', description: 'Lead priority', schema: z.enum(['low', 'medium', 'high']) },
      { name: 'assignedTo', description: 'Assigned to (optional)', schema: z.string().optional() },
      { name: 'source', description: 'Lead source (optional)', schema: z.string().optional() },
    ],
    execute: createLeadHandler,
  },
  {
    name: 'get_lead',
    description: 'Get a lead by ID',
    parameters: [{ name: 'leadId', description: 'Lead ID', schema: z.string() }],
    execute: getLeadHandler,
  },
  {
    name: 'update_lead',
    description: 'Update a lead',
    parameters: [
      { name: 'leadId', description: 'Lead ID', schema: z.string() },
      { name: 'stage', description: 'New stage (optional)', schema: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']).optional() },
      { name: 'score', description: 'New score 0-100 (optional)', schema: z.number().min(0).max(100).optional() },
      { name: 'priority', description: 'New priority (optional)', schema: z.enum(['low', 'medium', 'high']).optional() },
      { name: 'assignedTo', description: 'Assigned to (optional)', schema: z.string().optional() },
      { name: 'lastContact', description: 'Last contact date ISO (optional)', schema: z.string().optional() },
      { name: 'nextFollowup', description: 'Next follow-up ISO (optional)', schema: z.string().optional() },
    ],
    execute: updateLeadHandler,
  },
  {
    name: 'add_lead_note',
    description: 'Add a note to a lead',
    parameters: [
      { name: 'leadId', description: 'Lead ID', schema: z.string() },
      { name: 'note', description: 'Note to add', schema: z.string() },
    ],
    execute: addLeadNoteHandler,
  },
  {
    name: 'get_leads_by_stage',
    description: 'Get leads by stage',
    parameters: [
      { name: 'tenantId', description: 'Tenant ID', schema: z.string() },
      { name: 'stage', description: 'Stage to filter', schema: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']) },
    ],
    execute: getLeadsByStageHandler,
  },
  {
    name: 'get_high_priority_leads',
    description: 'Get high priority leads',
    parameters: [{ name: 'tenantId', description: 'Tenant ID', schema: z.string() }],
    execute: getHighPriorityLeadsHandler,
  },
  {
    name: 'create_opportunity',
    description: 'Create an opportunity for a lead',
    parameters: [
      { name: 'tenantId', description: 'Tenant ID', schema: z.string() },
      { name: 'leadId', description: 'Lead ID', schema: z.string() },
      { name: 'title', description: 'Opportunity title', schema: z.string() },
      { name: 'value', description: 'Opportunity value', schema: z.number() },
      { name: 'stage', description: 'Stage', schema: z.string() },
      { name: 'probability', description: 'Win probability 0-100', schema: z.number().min(0).max(100) },
      { name: 'expectedClose', description: 'Expected close date ISO (optional)', schema: z.string().optional() },
    ],
    execute: createOpportunityHandler,
  },
  {
    name: 'get_opportunities_by_lead',
    description: 'Get opportunities for a lead',
    parameters: [{ name: 'leadId', description: 'Lead ID', schema: z.string() }],
    execute: getOpportunitiesByLeadHandler,
  },
  {
    name: 'get_lead_stats',
    description: 'Get lead statistics for a tenant',
    parameters: [{ name: 'tenantId', description: 'Tenant ID', schema: z.string() }],
    execute: getLeadStatsHandler,
  },
];

export { CRMStore, crmStore };
