/**
 * RTNM Ecosystem Connector
 *
 * Connects REZ SalesMind to all existing RTNM services
 * Ports aligned with RTNM Port Registry
 */

import axios from 'axios';

const ECOSYSTEM_SERVICES = {
  // HOJAI AI Services
  hojai: {
    webIntelligence: process.env.HOJAI_WEB_INTEL || 'http://localhost:4595',
    merchantIntel: process.env.HOJAI_MERCHANT_INTEL || 'http://localhost:4751',
    leadService: process.env.HOJAI_LEAD_SERVICE || 'http://localhost:4752',
    knowledgeGraph: process.env.HOJAI_KG || 'http://localhost:4786',
    twinOS: process.env.HOJAI_TWIN_OS || 'http://localhost:4521',
  },
  // Genie Voice
  genie: {
    voice: process.env.GENIE_VOICE || 'http://localhost:4760',
  },
  // REZ Services
  rez: {
    identityHub: process.env.REZ_IDENTITY_HUB || 'http://localhost:4702', // CorpID in RTNM Registry
    crmHub: process.env.REZ_CRM_HUB || 'http://localhost:4056', // REZ-crm-hub port
    merchant: process.env.REZ_MERCHANT || 'http://localhost:4100',
    consumer: process.env.REZ_CONSUMER || 'http://localhost:4200',
    booking: process.env.REZ_BOOKING || 'http://localhost:4020',
  },
  // AssetMind
  assetMind: {
    main: process.env.ASSETMIND || 'http://localhost:5200',
  },
  // AdBazaar
  adBazaar: {
    crm: process.env.ADBAZAAR_CRM || 'http://localhost:4303',
    campaigns: process.env.ADBAZAAR_CAMPAIGNS || 'http://localhost:4300',
  },
};

// ============================================
// PROSPECTING DATABASE - HOJAI Lead Service
// ============================================
export class ProspectingConnector {
  private leadClient = axios.create({ baseURL: ECOSYSTEM_SERVICES.hojai.leadService, timeout: 5000 });
  private kgClient = axios.create({ baseURL: ECOSYSTEM_SERVICES.hojai.knowledgeGraph, timeout: 5000 });

  async searchProspects(query: string): Promise<any[]> {
    try {
      const response = await this.kgClient.get('/search', { params: { q: query, type: 'company' } });
      return response.data.results || [];
    } catch (error) {
      return this.getMockProspects(query);
    }
  }

  async getCompanyIntel(companyName: string): Promise<any> {
    try {
      const response = await this.leadClient.get('/company', { params: { name: companyName } });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getContactData(email: string): Promise<any> {
    try {
      const response = await this.leadClient.get('/contact', { params: { email } });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  private getMockProspects(query: string): any[] {
    return [
      { id: '1', name: query + ' Inc', industry: 'Technology', size: '50-200', score: 85 },
      { id: '2', name: query + ' Corp', industry: 'Finance', size: '100-500', score: 72 },
      { id: '3', name: query + ' Solutions', industry: 'Healthcare', size: '20-100', score: 68 },
    ];
  }
}

// ============================================
// COMMUNICATION - Genie Voice
// ============================================
export class CommunicationConnector {
  private genieClient = axios.create({ baseURL: ECOSYSTEM_SERVICES.genie.voice, timeout: 5000 });

  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    try {
      await this.genieClient.post('/api/message/send', {
        channel: 'email',
        to,
        subject,
        body,
      });
      return true;
    } catch (error) {
      console.error('Email send failed:', error);
      return false;
    }
  }

  async sendSMS(phone: string, message: string): Promise<boolean> {
    try {
      await this.genieClient.post('/api/message/send', {
        channel: 'sms',
        to: phone,
        body: message,
      });
      return true;
    } catch (error) {
      console.error('SMS send failed:', error);
      return false;
    }
  }

  async sendWhatsApp(phone: string, message: string): Promise<boolean> {
    try {
      await this.genieClient.post('/api/message/send', {
        channel: 'whatsapp',
        to: phone,
        body: message,
      });
      return true;
    } catch (error) {
      console.error('WhatsApp send failed:', error);
      return false;
    }
  }

  async makeCall(phone: string): Promise<boolean> {
    try {
      await this.genieClient.post('/api/communication/call', {
        to: phone,
      });
      return true;
    } catch (error) {
      console.error('Call failed:', error);
      return false;
    }
  }

  async scheduleMeeting(email: string, topic: string, time: Date): Promise<string> {
    try {
      const response = await this.genieClient.post('/api/meeting/schedule', {
        to: email,
        topic,
        time: time.toISOString(),
      });
      return response.data.meetingUrl || '';
    } catch (error) {
      return '';
    }
  }
}

// ============================================
// BUSINESS INTELLIGENCE - HOJAI + AssetMind
// ============================================
export class IntelligenceConnector {
  private webClient = axios.create({ baseURL: ECOSYSTEM_SERVICES.hojai.webIntelligence, timeout: 5000 });
  private merchantClient = axios.create({ baseURL: ECOSYSTEM_SERVICES.hojai.merchantIntel, timeout: 5000 });
  private assetMindClient = axios.create({ baseURL: ECOSYSTEM_SERVICES.assetMind.main, timeout: 5000 });

  async getMarketSignals(industry: string): Promise<any[]> {
    try {
      const response = await this.webClient.get('/signals', { params: { q: industry } });
      return response.data.signals || [];
    } catch (error) {
      return [];
    }
  }

  async getCompanyProfile(companyName: string): Promise<any> {
    try {
      const response = await this.merchantClient.get('/company-profile', { params: { name: companyName } });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getRevenueTwin(companyId: string): Promise<any> {
    try {
      const response = await this.assetMindClient.get('/twin/revenue', { params: { id: companyId } });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getMarketTrends(industry: string): Promise<any> {
    try {
      const response = await this.webClient.get('/trends', { params: { industry } });
      return response.data;
    } catch (error) {
      return { trends: [], insights: [] };
    }
  }
}

// ============================================
// IDENTITY & MEMORY - REZ Identity Hub
// ============================================
export class IdentityConnector {
  private identityClient = axios.create({ baseURL: ECOSYSTEM_SERVICES.rez.identityHub, timeout: 5000 });

  async getUnifiedProfile(personId: string): Promise<any> {
    try {
      const response = await this.identityClient.get('/api/identity/' + personId);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getConversationHistory(clientId: string, leadId: string): Promise<any[]> {
    try {
      const response = await this.identityClient.get('/api/internal/intelligence/' + clientId + '/' + leadId);
      return response.data.history || [];
    } catch (error) {
      return [];
    }
  }

  async getPreCallBrief(clientId: string, leadId: string): Promise<any> {
    try {
      const response = await this.identityClient.get('/api/internal/pre-call/' + clientId + '/' + leadId);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async storeInteraction(clientId: string, leadId: string, data: any): Promise<boolean> {
    try {
      await this.identityClient.post('/api/internal/conversations', {
        clientId,
        leadId,
        ...data,
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

// ============================================
// CRM & PIPELINE - REZ CRM Hub (Port 4056)
// ============================================
export class CRMConnector {
  private crmClient = axios.create({
    baseURL: ECOSYSTEM_SERVICES.rez.crmHub,
    timeout: 5000,
    headers: {
      ...(INTERNAL_TOKEN ? { 'X-Internal-Token': INTERNAL_TOKEN } : {}),
    }
  });

  async getLeads(filters?: any): Promise<{ data: any[]; error: string | null }> {
    try {
      const response = await this.crmClient.get('/api/contacts', { params: filters });
      return { data: response.data.contacts || response.data || [], error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get leads';
      console.warn('CRM Connector - getLeads:', message);
      return { data: [], error: message };
    }
  }

  async getDeals(filters?: any): Promise<{ data: any[]; error: string | null }> {
    try {
      const response = await this.crmClient.get('/api/deals', { params: filters });
      return { data: response.data.deals || response.data || [], error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get deals';
      console.warn('CRM Connector - getDeals:', message);
      return { data: [], error: message };
    }
  }

  async updateLeadStage(leadId: string, stage: string): Promise<{ success: boolean; error: string | null }> {
    try {
      await this.crmClient.patch('/api/contacts/' + leadId, { lifecycleStage: stage });
      return { success: true, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update lead stage';
      console.error('CRM Connector - updateLeadStage:', message);
      return { success: false, error: message };
    }
  }

  async getActivities(contactId: string): Promise<{ data: any[]; error: string | null }> {
    try {
      const response = await this.crmClient.get('/api/activities', { params: { contactId } });
      return { data: response.data.activities || [], error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get activities';
      console.warn('CRM Connector - getActivities:', message);
      return { data: [], error: message };
    }
  }

  async logActivity(activity: any): Promise<{ success: boolean; error: string | null }> {
    try {
      await this.crmClient.post('/api/activities', activity);
      return { success: true, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to log activity';
      console.error('CRM Connector - logActivity:', message);
      return { success: false, error: message };
    }
  }

  async createLead(leadData: any): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await this.crmClient.post('/api/contacts', leadData);
      return { data: response.data, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create lead';
      console.error('CRM Connector - createLead:', message);
      return { data: null, error: message };
    }
  }
}

// Add INTERNAL_TOKEN to ecosystemConnector
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

// ============================================
// BOOKING & SCHEDULING - REZ Booking + Zoom
// ============================================
export class BookingConnector {
  private bookingClient = axios.create({ baseURL: ECOSYSTEM_SERVICES.rez.booking, timeout: 5000 });

  async createBooking(type: string, data: any): Promise<any> {
    try {
      const response = await this.bookingClient.post('/api/bookings', {
        type,
        ...data,
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getAvailability(serviceType: string, date: Date): Promise<any[]> {
    try {
      const response = await this.bookingClient.get('/api/availability', {
        params: { type: serviceType, date: date.toISOString() },
      });
      return response.data.slots || [];
    } catch (error) {
      return [];
    }
  }
}

// ============================================
// CONVERSATION INTELLIGENCE - HOJAI TwinOS
// ============================================
export class ConversationIntelligenceConnector {
  private twinClient = axios.create({ baseURL: ECOSYSTEM_SERVICES.hojai.twinOS, timeout: 5000 });

  async analyzeCall(recordingUrl: string): Promise<any> {
    try {
      const response = await this.twinClient.post('/analyze/call', { recordingUrl });
      return response.data;
    } catch (error) {
      return this.getMockCallAnalysis();
    }
  }

  async getSentiment(text: string): Promise<string> {
    try {
      const response = await this.twinClient.post('/analyze/sentiment', { text });
      return response.data.sentiment || 'neutral';
    } catch (error) {
      return 'neutral';
    }
  }

  async extractKeyTopics(conversation: string): Promise<string[]> {
    try {
      const response = await this.twinClient.post('/analyze/topics', { text: conversation });
      return response.data.topics || [];
    } catch (error) {
      return [];
    }
  }

  async detectObjections(text: string): Promise<string[]> {
    try {
      const response = await this.twinClient.post('/analyze/objections', { text });
      return response.data.objections || [];
    } catch (error) {
      return [];
    }
  }

  private getMockCallAnalysis() {
    return {
      duration: 1800,
      sentiment: 'positive',
      keyTopics: ['pricing', 'timeline', 'implementation'],
      objections: ['budget concerns'],
      competitorMentions: ['Salesforce'],
      actionItems: ['Send proposal', 'Schedule demo'],
    };
  }
}

// ============================================
// EXPORT ALL CONNECTORS
// ============================================
export const prospectingConnector = new ProspectingConnector();
export const communicationConnector = new CommunicationConnector();
export const intelligenceConnector = new IntelligenceConnector();
export const identityConnector = new IdentityConnector();
export const crmConnector = new CRMConnector();
export const bookingConnector = new BookingConnector();
export const conversationIntelConnector = new ConversationIntelligenceConnector();