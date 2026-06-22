// ============================================
// HOJAI AI - SDR Agent CRM Connector Service
// ============================================

import axios, { AxiosInstance } from 'axios';
import mongoose from 'mongoose';
import { Contact, Company, Lead, Activity } from '../models';
import {
  CRMConfig,
  CRMSyncResult,
  LeadStage
} from '../types';
import { logger } from '../utils/logger';

export type CRMProvider = 'hubspot' | 'salesforce' | 'pipedrive' | 'zoho' | 'custom';

export interface CRMContact {
  id: string;
  email?: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  title?: string;
  company?: string;
  companySize?: string;
  industry?: string;
  city?: string;
  state?: string;
  country?: string;
  linkedinUrl?: string;
  customFields?: Record<string, unknown>;
}

export interface CRMActivity {
  id: string;
  type: string;
  subject?: string;
  body?: string;
  createdAt: Date;
  userId?: string;
  leadId?: string;
  contactId?: string;
}

export interface CRMDeal {
  id: string;
  name: string;
  stage: string;
  amount?: number;
  currency?: string;
  contactId?: string;
  companyId?: string;
  ownerId?: string;
  closeDate?: Date;
  customFields?: Record<string, unknown>;
}

export class CRMConnector {
  private provider: CRMProvider;
  private client: AxiosInstance | null = null;
  private config: CRMConfig | null = null;
  private syncEnabled: boolean = false;
  private webhookSecret?: string;

  constructor() {
    this.provider = 'custom';
  }

  /**
   * Initialize CRM connection
   */
  async initialize(config: CRMConfig): Promise<boolean> {
    logger.info('Initializing CRM connector', { provider: config.provider });

    this.provider = config.provider;
    this.config = config;
    this.webhookSecret = config.webhookSecret;

    try {
      switch (config.provider) {
        case 'hubspot':
          this.client = axios.create({
            baseURL: 'https://api.hubapi.com',
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          break;

        case 'salesforce':
          this.client = axios.create({
            baseURL: config.instanceUrl || 'https://login.salesforce.com',
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          break;

        case 'pipedrive':
          this.client = axios.create({
            baseURL: `https://${config.instanceUrl || 'api'}.pipedrive.com/api/v1`,
            headers: {
              'Authorization': `Bearer ${config.apiKey}`
            }
          });
          break;

        case 'zoho':
          this.client = axios.create({
            baseURL: `https://www.zohoapis.com/crm/v2`,
            headers: {
              'Authorization': `Zoho-oauthtoken ${config.apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          break;

        case 'custom':
        default:
          this.client = config.instanceUrl ? axios.create({
            baseURL: config.instanceUrl,
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json'
            }
          }) : null;
          break;
      }

      this.syncEnabled = true;
      logger.info('CRM connector initialized', { provider: config.provider });
      return true;
    } catch (error) {
      logger.error('Failed to initialize CRM connector', { error });
      return false;
    }
  }

  /**
   * Sync a lead to CRM
   */
  async syncLeadToCRM(
    tenantId: string,
    leadId: string
  ): Promise<CRMSyncResult> {
    if (!this.syncEnabled || !this.client) {
      return { success: false, error: 'CRM not configured' };
    }

    try {
      const lead = await Lead.findOne({ _id: leadId, tenantId });
      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      const contact = await Contact.findById(lead.contactId);
      const company = await Company.findById(lead.companyId);

      // Create contact in CRM
      const crmContact = await this.syncContact(tenantId, contact, company);

      // Create/update deal/opportunity in CRM
      const crmDeal = await this.syncDeal(tenantId, lead, crmContact?.id);

      logger.info('Lead synced to CRM', { tenantId, leadId, crmContactId: crmContact?.id, crmDealId: crmDeal?.id });

      return {
        success: true,
        crmContactId: crmContact?.id,
        crmLeadId: crmDeal?.id,
        syncedAt: new Date()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to sync lead to CRM', { tenantId, leadId, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Sync contact to CRM
   */
  private async syncContact(
    tenantId: string,
    contact: any,
    company: any
  ): Promise<CRMContact | null> {
    if (!contact || !this.client) return null;

    const crmContact: CRMContact = {
      id: '',
      firstName: contact.firstName as string,
      lastName: contact.lastName as string | undefined,
      email: contact.email as string | undefined,
      phone: contact.phone as string | undefined,
      title: contact.title as string | undefined,
      company: contact.company as string | undefined,
      companySize: contact.companySize as string | undefined,
      industry: contact.industry as string | undefined,
      city: (contact.location as { city?: string })?.city,
      state: (contact.location as { state?: string })?.state,
      country: (contact.location as { country?: string })?.country,
      linkedinUrl: contact.linkedinUrl as string | undefined
    };

    switch (this.provider) {
      case 'hubspot':
        const hubspotContact = await this.client.post('/crm/v3/objects/contacts', {
          properties: {
            firstname: crmContact.firstName,
            lastname: crmContact.lastName || '',
            email: crmContact.email,
            phone: crmContact.phone,
            jobtitle: crmContact.title,
            company: crmContact.company,
            linkedin_url: crmContact.linkedinUrl
          }
        });
        crmContact.id = hubspotContact.data.id;
        break;

      case 'salesforce':
        const salesforceContact = await this.client.post('/services/data/v58.0/sobjects/Contact', {
          FirstName: crmContact.firstName,
          LastName: crmContact.lastName || 'Unknown',
          Email: crmContact.email,
          Phone: crmContact.phone,
          Title: crmContact.title,
          AccountId: crmContact.company // Would need to sync account first
        });
        crmContact.id = salesforceContact.data.id;
        break;

      case 'pipedrive':
        const pipedrivePerson = await this.client.post('/persons', {
          name: `${crmContact.firstName} ${crmContact.lastName || ''}`.trim(),
          email_id: crmContact.email,
          phone: crmContact.phone
        });
        crmContact.id = pipedrivePerson.data.data.id.toString();
        break;

      case 'zoho':
        const zohoContact = await this.client.post('/contacts', {
          data: [{
            First_Name: crmContact.firstName,
            Last_Name: crmContact.lastName,
            Email: crmContact.email,
            Phone: crmContact.phone,
            Title: crmContact.title,
            Account_Name: crmContact.company
          }]
        });
        crmContact.id = zohoContact.data.details.inserted_ids?.[0] || '';
        break;

      default:
        // Custom API - store reference
        crmContact.id = `custom-${contact._id}`;
        break;
    }

    return crmContact;
  }

  /**
   * Sync deal/opportunity to CRM
   */
  private async syncDeal(
    tenantId: string,
    lead: any,
    crmContactId?: string
  ): Promise<CRMDeal | null> {
    if (!this.client) return null;

    const stage = lead.stage as LeadStage;
    const deal: CRMDeal = {
      id: '',
      name: `Lead - ${new Date().toISOString().split('T')[0]}`,
      stage: this.mapLeadStageToCRM(stage),
      amount: (lead.metadata as { dealValue?: number })?.dealValue,
      currency: 'USD',
      contactId: crmContactId,
      ownerId: lead.ownerId as string,
      customFields: {
        sdrLeadId: lead._id.toString(),
        sdrScore: lead.scoreValue,
        sdrScoreCategory: lead.score
      }
    };

    switch (this.provider) {
      case 'hubspot':
        const hubspotDeal = await this.client.post('/crm/v3/objects/deals', {
          properties: {
            dealname: deal.name,
            dealstage: deal.stage,
            amount: deal.amount,
            closedate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          },
          associations: crmContactId ? [{
            to: { id: crmContactId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]
          }] : []
        });
        deal.id = hubspotDeal.data.id;
        break;

      case 'salesforce':
        const sfDeal = await this.client.post('/services/data/v58.0/sobjects/Opportunity', {
          Name: deal.name,
          StageName: deal.stage,
          Amount: deal.amount,
          CloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        deal.id = sfDeal.data.id;
        break;

      case 'pipedrive':
        const pdDeal = await this.client.post('/deals', {
          title: deal.name,
          status: deal.stage === 'won' ? 'won' : 'open',
          value: deal.amount
        });
        deal.id = pdDeal.data.data.id.toString();
        break;

      case 'zoho':
        const zohoDeal = await this.client.post('/deals', {
          data: [{
            Deal_Name: deal.name,
            Stage: deal.stage,
            Amount: deal.amount,
            Closing_Date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }]
        });
        deal.id = zohoDeal.data.details.inserted_ids?.[0] || '';
        break;

      default:
        deal.id = `custom-deal-${lead._id}`;
        break;
    }

    return deal;
  }

  /**
   * Update lead stage in CRM
   */
  async updateDealStage(
    crmDealId: string,
    stage: LeadStage
  ): Promise<boolean> {
    if (!this.client) return false;

    const crmStage = this.mapLeadStageToCRM(stage);

    try {
      switch (this.provider) {
        case 'hubspot':
          await this.client.patch(`/crm/v3/objects/deals/${crmDealId}`, {
            properties: { dealstage: crmStage }
          });
          break;

        case 'salesforce':
          await this.client.patch(`/services/data/v58.0/sobjects/Opportunity/${crmDealId}`, {
            StageName: crmStage
          });
          break;

        case 'pipedrive':
          await this.client.put(`/deals/${crmDealId}`, {
            status: crmStage === 'won' ? 'won' : crmStage === 'lost' ? 'lost' : 'open'
          });
          break;

        case 'zoho':
          await this.client.put(`/deals/${crmDealId}`, {
            data: [{ Stage: crmStage }]
          });
          break;
      }

      return true;
    } catch (error) {
      logger.error('Failed to update deal stage in CRM', { crmDealId, stage, error });
      return false;
    }
  }

  /**
   * Sync activity to CRM
   */
  async syncActivity(
    tenantId: string,
    activityId: string
  ): Promise<boolean> {
    if (!this.syncEnabled || !this.client) return false;

    const activity = await Activity.findOne({ _id: activityId, tenantId });
    if (!activity) return false;

    try {
      switch (this.provider) {
        case 'hubspot':
          await this.client.post('/crm/v3/objects/notes', {
            properties: {
              hs_note_body: activity.description,
              hs_timestamp: activity.createdAt.toISOString()
            },
            associations: [{
              to: { id: activity.leadId.toString() },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }]
            }]
          });
          break;

        case 'salesforce':
          await this.client.post('/services/data/v58.0/sobjects/Task', {
            Subject: activity.description,
            Status: 'Completed',
            ActivityDate: activity.createdAt.toISOString().split('T')[0],
            WhatId: activity.leadId
          });
          break;

        case 'pipedrive':
          await this.client.post('/activities', {
            subject: activity.description,
            done: 1,
            lead_id: activity.leadId,
            due_date: activity.createdAt.toISOString().split('T')[0]
          });
          break;

        case 'zoho':
          await this.client.post('/activities', {
            data: [{
              Subject: activity.description,
              Status: 'completed',
              Due_Date: activity.createdAt.toISOString().split('T')[0]
            }]
          });
          break;
      }

      return true;
    } catch (error) {
      logger.error('Failed to sync activity to CRM', { activityId, error });
      return false;
    }
  }

  /**
   * Import contacts from CRM
   */
  async importContacts(
    tenantId: string,
    options?: {
      since?: Date;
      limit?: number;
    }
  ): Promise<{
    success: boolean;
    imported: number;
    errors: string[];
  }> {
    if (!this.syncEnabled || !this.client) {
      return { success: false, imported: 0, errors: ['CRM not configured'] };
    }

    const errors: string[] = [];
    let imported = 0;

    try {
      let crmContacts: CRMContact[] = [];

      switch (this.provider) {
        case 'hubspot':
          const hubspotResponse = await this.client.get('/crm/v3/objects/contacts', {
            params: {
              limit: options?.limit || 100,
              properties: 'firstname,lastname,email,phone,jobtitle,company,linkedin_url'
            }
          });
          crmContacts = hubspotResponse.data.results.map((c: Record<string, unknown>) => ({
            id: c.id as string,
            firstName: (c.properties as Record<string, unknown>).firstname as string,
            lastName: (c.properties as Record<string, unknown>).lastname as string,
            email: (c.properties as Record<string, unknown>).email as string,
            phone: (c.properties as Record<string, unknown>).phone as string,
            title: (c.properties as Record<string, unknown>).jobtitle as string,
            company: (c.properties as Record<string, unknown>).company as string,
            linkedinUrl: (c.properties as Record<string, unknown>).linkedin_url as string
          }));
          break;

        case 'salesforce':
          const sfResponse = await this.client.get('/services/data/v58.0/query', {
            params: {
              q: `SELECT Id, FirstName, LastName, Email, Phone, Title, Account.Name FROM Contact LIMIT ${options?.limit || 100}`
            }
          });
          crmContacts = sfResponse.data.records.map((c: Record<string, unknown>) => ({
            id: c.Id as string,
            firstName: c.FirstName as string,
            lastName: c.LastName as string,
            email: c.Email as string,
            phone: c.Phone as string,
            title: c.Title as string,
            company: (c.Account as Record<string, unknown>)?.Name as string
          }));
          break;

        case 'pipedrive':
          const pdResponse = await this.client.get('/persons', {
            params: { limit: options?.limit || 100 }
          });
          crmContacts = pdResponse.data.data.map((p: Record<string, unknown>) => ({
            id: p.id.toString(),
            firstName: (p.name as string).split(' ')[0],
            lastName: (p.name as string).split(' ').slice(1).join(' '),
            email: (p.email as Array<Record<string, unknown>>)?.[0]?.value as string,
            phone: (p.phone as Array<Record<string, unknown>>)?.[0]?.value as string
          }));
          break;

        case 'zoho':
          const zohoResponse = await this.client.get('/contacts', {
            params: { per_page: options?.limit || 100 }
          });
          crmContacts = zohoResponse.data.data.map((c: Record<string, unknown>) => ({
            id: c.id as string,
            firstName: c.First_Name as string,
            lastName: c.Last_Name as string,
            email: c.Email as string,
            phone: c.Phone as string,
            title: c.Title as string,
            company: (c.Account_Name as Record<string, unknown>)?.name as string
          }));
          break;
      }

      // Import each contact
      for (const crmContact of crmContacts) {
        try {
          await Contact.findOneAndUpdate(
            { tenantId, email: crmContact.email },
            {
              tenantId,
              firstName: crmContact.firstName,
              lastName: crmContact.lastName,
              email: crmContact.email,
              phone: crmContact.phone,
              title: crmContact.title,
              company: crmContact.company,
              companySize: crmContact.companySize as '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+',
              industry: crmContact.industry,
              location: {
                city: crmContact.city,
                state: crmContact.state,
                country: crmContact.country
              },
              linkedinUrl: crmContact.linkedinUrl,
              metadata: {
                crmId: crmContact.id,
                crmProvider: this.provider,
                importedAt: new Date()
              }
            },
            { upsert: true, new: true }
          );
          imported++;
        } catch (err) {
          errors.push(`Failed to import ${crmContact.email}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      logger.info('Imported contacts from CRM', { tenantId, imported, errors: errors.length });

      return { success: true, imported, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to import from CRM', { error: errorMessage });
      return { success: false, imported, errors: [errorMessage] };
    }
  }

  /**
   * Handle incoming webhooks from CRM
   */
  async handleWebhook(payload: Record<string, unknown>): Promise<{
    type: string;
    data: Record<string, unknown>;
  } | null> {
    // Verify webhook signature if secret is configured
    if (this.webhookSecret) {
      // In production, verify signature
      // const signature = req.headers['x-crm-signature'];
    }

    switch (this.provider) {
      case 'hubspot':
        return {
          type: payload.objectType as string || 'contact',
          data: payload as Record<string, unknown>
        };

      case 'salesforce':
        return {
          type: (payload.sObject as string) || 'unknown',
          data: payload as Record<string, unknown>
        };

      default:
        return payload as { type: string; data: Record<string, unknown> } || null;
    }
  }

  /**
   * Map lead stage to CRM stage name
   */
  private mapLeadStageToCRM(stage: LeadStage): string {
    const mapping: Record<LeadStage, string> = {
      [LeadStage.NEW]: 'appointmentscheduled',
      [LeadStage.CONTACTED]: 'qualifiedtobuy',
      [LeadStage.QUALIFIED]: 'presentationscheduled',
      [LeadStage.PROPOSAL]: 'decisionmakerboughtin',
      [LeadStage.NEGOTIATION]: 'contractsent',
      [LeadStage.CLOSED_WON]: 'closedwon',
      [LeadStage.CLOSED_LOST]: 'closedlost'
    };
    return mapping[stage] || 'appointmentscheduled';
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.syncEnabled && this.client !== null;
  }

  /**
   * Get current provider
   */
  getProvider(): CRMProvider {
    return this.provider;
  }
}

export const crmConnector = new CRMConnector();
