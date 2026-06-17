import axios, { AxiosInstance } from 'axios';
import { generateId, randomDelay } from '../utils/helpers.js';
import type { CRMContact, CRMDeal, CRMActivity, SyncStatus, Call, Lead } from '../types/index.js';
import logger from '../utils/logger.js';

interface HubSpotConfig {
  apiKey: string;
  portalId?: string;
  baseUrl?: string;
}

interface WebhookCallback {
  id: string;
  type: 'contact_created' | 'contact_updated' | 'deal_created' | 'deal_updated';
  payload: any;
  receivedAt: Date;
  processed: boolean;
}

class CRMWritebackService {
  private hubspotClient: AxiosInstance | null = null;
  private webhookCallbacks: WebhookCallback[] = [];
  private syncStatus: SyncStatus = {
    status: 'idle',
    recordsSynced: 0,
    errors: 0
  };

  constructor() {
    this.initHubSpot();
  }

  private initHubSpot(): void {
    const apiKey = process.env.HUBSPOT_API_KEY;
    if (apiKey) {
      this.hubspotClient = axios.create({
        baseURL: 'https://api.hubapi.com',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      logger.info('HubSpot client initialized with API key');
    } else {
      logger.warn('HubSpot API key not configured - using mock mode');
    }
  }

  async syncLeadToHubSpot(lead: Lead): Promise<{ success: boolean; hubspotId?: string; error?: string }> {
    try {
      this.updateSyncStatus('syncing');
      await randomDelay(200, 800);

      const contact: CRMContact = {
        email: lead.email,
        firstName: lead.name.split(' ')[0] || lead.name,
        lastName: lead.name.split(' ').slice(1).join(' ') || '',
        phone: lead.phone,
        company: lead.company,
        jobTitle: lead.title
      };

      if (!this.hubspotClient) {
        const mockId = `hs-contact-${generateId().slice(0, 8)}`;
        this.syncStatus.recordsSynced++;
        this.updateSyncStatus('success');
        logger.info(`Mock: Created HubSpot contact ${mockId} for ${lead.email}`);
        return { success: true, hubspotId: mockId };
      }

      const response = await this.hubspotClient.post('/crm/v3/objects/contacts', {
        properties: {
          email: contact.email,
          firstname: contact.firstName,
          lastname: contact.lastName,
          phone: contact.phone,
          company: contact.company,
          jobtitle: contact.jobTitle,
          hs_lead_status: this.mapLeadStatus(lead.status)
        }
      });

      this.syncStatus.recordsSynced++;
      this.updateSyncStatus('success');
      return { success: true, hubspotId: response.data.id };
    } catch (error: any) {
      this.syncStatus.errors++;
      this.syncStatus.lastError = error.message;
      this.updateSyncStatus('error');
      logger.error('HubSpot sync error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async updateHubSpotContact(hubspotId: string, properties: Record<string, any>): Promise<boolean> {
    try {
      await randomDelay(100, 400);
      if (!this.hubspotClient) {
        logger.info(`Mock: Updated HubSpot contact ${hubspotId}`);
        this.syncStatus.recordsSynced++;
        return true;
      }
      await this.hubspotClient.patch(`/crm/v3/objects/contacts/${hubspotId}`, { properties });
      this.syncStatus.recordsSynced++;
      return true;
    } catch (error: any) {
      this.syncStatus.errors++;
      logger.error('HubSpot update error:', error.message);
      return false;
    }
  }

  async syncDealToHubSpot(deal: CRMDeal): Promise<{ success: boolean; hubspotId?: string; error?: string }> {
    try {
      await randomDelay(200, 800);
      if (!this.hubspotClient) {
        const mockId = `hs-deal-${generateId().slice(0, 8)}`;
        this.syncStatus.recordsSynced++;
        logger.info(`Mock: Created HubSpot deal ${mockId} - ${deal.dealName}`);
        return { success: true, hubspotId: mockId };
      }

      const response = await this.hubspotClient.post('/crm/v3/objects/deals', {
        properties: {
          dealname: deal.dealName,
          amount: deal.amount?.toString() || '0',
          dealstage: deal.stage,
          closedate: deal.closeDate?.toISOString().split('T')[0],
          hubspot_owner_id: process.env.HUBSPOT_OWNER_ID
        },
        associations: deal.contactId ? [{
          to: { id: deal.contactId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]
        }] : []
      });

      this.syncStatus.recordsSynced++;
      return { success: true, hubspotId: response.data.id };
    } catch (error: any) {
      this.syncStatus.errors++;
      logger.error('HubSpot deal sync error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async updateDealStage(hubspotId: string, stage: string): Promise<boolean> {
    try {
      await randomDelay(100, 300);
      if (!this.hubspotClient) {
        logger.info(`Mock: Updated deal ${hubspotId} stage to ${stage}`);
        return true;
      }
      await this.hubspotClient.patch(`/crm/v3/objects/deals/${hubspotId}`, { properties: { dealstage: stage } });
      return true;
    } catch (error: any) {
      logger.error('Update deal stage error:', error.message);
      return false;
    }
  }

  async logActivity(activity: CRMActivity): Promise<{ success: boolean; hubspotId?: string }> {
    try {
      await randomDelay(100, 400);
      if (!this.hubspotClient) {
        const mockId = `hs-activity-${generateId().slice(0, 8)}`;
        logger.info(`Mock: Logged ${activity.type} activity for contact ${activity.contactId}`);
        return { success: true, hubspotId: mockId };
      }

      const engagement = await this.hubspotClient.post('/crm/v3/objects/engagements', {
        properties: {
          hs_timestamp: activity.timestamp.toISOString(),
          hs_engagement_type: this.mapActivityType(activity.type)
        },
        associations: [{
          to: { id: activity.contactId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }]
        }]
      });

      await this.hubspotClient.post('/crm/v3/objects/notes', {
        properties: {
          hs_note_body: activity.description,
          hs_timestamp: activity.timestamp.toISOString()
        },
        associations: [{
          to: { id: activity.contactId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }]
        }]
      });

      return { success: true, hubspotId: engagement.data.id };
    } catch (error: any) {
      logger.error('Log activity error:', error.message);
      return { success: false };
    }
  }

  async syncCallWithTranscription(call: Call, transcription?: string): Promise<boolean> {
    try {
      await randomDelay(300, 1000);

      const engagementData: CRMActivity = {
        type: 'call',
        contactId: call.leadId,
        description: `Call ${call.direction} - Duration: ${Math.floor(call.duration / 60)}m ${call.duration % 60}s. Status: ${call.status}`,
        timestamp: call.createdAt,
        metadata: {
          callId: call.id,
          duration: call.duration,
          direction: call.direction,
          status: call.status,
          recordingUrl: call.recordingUrl
        }
      };

      await this.logActivity(engagementData);

      if (transcription) {
        if (this.hubspotClient) {
          await this.hubspotClient.post('/crm/v3/objects/notes', {
            properties: {
              hs_note_body: `Call Transcription:\n\n${transcription}`,
              hs_timestamp: call.createdAt.toISOString()
            }
          });
        } else {
          logger.info(`Mock: Added transcription note for call ${call.id}`);
        }
      }

      if (call.status === 'completed' && call.duration > 60) {
        logger.info(`Call with ${call.leadId} completed - high engagement signal`);
      }

      return true;
    } catch (error: any) {
      logger.error('Sync call error:', error.message);
      return false;
    }
  }

  async createTask(task: {
    subject: string;
    description?: string;
    dueDate?: Date;
    contactId?: string;
    ownerId?: string;
  }): Promise<{ success: boolean; taskId?: string }> {
    try {
      await randomDelay(100, 400);
      if (!this.hubspotClient) {
        const mockId = `hs-task-${generateId().slice(0, 8)}`;
        logger.info(`Mock: Created task "${task.subject}"`);
        return { success: true, taskId: mockId };
      }

      const response = await this.hubspotClient.post('/crm/v3/objects/tasks', {
        properties: {
          hs_task_subject: task.subject,
          hs_task_body: task.description,
          hs_task_status: 'NOT_STARTED',
          hs_timestamp: task.dueDate?.toISOString(),
          hubspot_owner_id: task.ownerId || process.env.HUBSPOT_OWNER_ID
        }
      });

      return { success: true, taskId: response.data.id };
    } catch (error: any) {
      logger.error('Create task error:', error.message);
      return { success: false };
    }
  }

  handleWebhookCallback(type: WebhookCallback['type'], payload: any): void {
    const callback: WebhookCallback = {
      id: generateId('wh'),
      type,
      payload,
      receivedAt: new Date(),
      processed: false
    };
    this.webhookCallbacks.push(callback);
    this.processWebhook(callback);
  }

  private async processWebhook(callback: WebhookCallback): Promise<void> {
    try {
      logger.info(`Processing webhook: ${callback.type}`, callback.payload);
      switch (callback.type) {
        case 'contact_created': logger.info('New contact created:', callback.payload.email); break;
        case 'contact_updated': logger.info('Contact updated:', callback.payload); break;
        case 'deal_created': logger.info('New deal created:', callback.payload); break;
        case 'deal_updated': logger.info('Deal updated:', callback.payload); break;
      }
      callback.processed = true;
    } catch (error: any) {
      logger.error('Webhook processing error:', error.message);
    }
  }

  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  getWebhookCallbacks(): WebhookCallback[] {
    return [...this.webhookCallbacks];
  }

  private updateSyncStatus(status: SyncStatus['status']): void {
    this.syncStatus.status = status;
    if (status === 'success' || status === 'error') {
      this.syncStatus.lastSyncAt = new Date();
    }
  }

  private mapLeadStatus(status: Lead['status']): string {
    const statusMap: Record<string, string> = {
      'new': 'NEW', 'contacted': 'IN_PROGRESS', 'qualified': 'QUALIFIED',
      'proposal': 'PRESENTATION', 'negotiation': 'DECISION_MAKER',
      'closed_won': 'CLOSED', 'closed_lost': 'CLOSED'
    };
    return statusMap[status] || 'NEW';
  }

  private mapActivityType(type: CRMActivity['type']): string {
    const typeMap: Record<string, string> = {
      'call': 'CALL', 'email': 'EMAIL', 'meeting': 'MEETING', 'note': 'NOTE'
    };
    return typeMap[type] || 'NOTE';
  }

  async searchContacts(query: string): Promise<CRMContact[]> {
    try {
      if (!this.hubspotClient) return [];
      const response = await this.hubspotClient.post('/crm/v3/objects/contacts/search', { query, limit: 10 });
      return response.data.results.map((c: any) => ({
        id: c.id, email: c.properties.email, firstName: c.properties.firstname,
        lastName: c.properties.lastname, phone: c.properties.phone,
        company: c.properties.company, jobTitle: c.properties.jobtitle, hubspotId: c.id
      }));
    } catch (error: any) {
      logger.error('Search contacts error:', error.message);
      return [];
    }
  }
}

export const crmWriteback = new CRMWritebackService();
export default crmWriteback;
