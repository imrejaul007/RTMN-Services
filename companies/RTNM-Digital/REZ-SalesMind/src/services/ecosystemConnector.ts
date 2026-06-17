/**
 * RTNM Ecosystem Connector
 * FIXED: proper axios interceptor types, mock data safety
 */
import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const getOutboundToken = (): string => {
    return process.env.CRM_HUB_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '';
};

const ECOSYSTEM_SERVICES = {
    hojai: {
        webIntelligence: process.env.HOJAI_WEB_INTEL || 'http://localhost:4595',
        merchantIntel: process.env.HOJAI_MERCHANT_INTEL || 'http://localhost:4751',
        leadService: process.env.HOJAI_LEAD_SERVICE || 'http://localhost:4752',
        knowledgeGraph: process.env.HOJAI_KG || 'http://localhost:4786',
        twinOS: process.env.HOJAI_TWIN_OS || 'http://localhost:4521',
    },
    genie: { voice: process.env.GENIE_VOICE || 'http://localhost:4760' },
    rez: {
        identityHub: process.env.REZ_IDENTITY_HUB || 'http://localhost:4702',
        crmHub: process.env.REZ_CRM_HUB || 'http://localhost:4056',
        merchant: process.env.REZ_MERCHANT || 'http://localhost:4100',
        consumer: process.env.REZ_CONSUMER || 'http://localhost:4200',
        booking: process.env.REZ_BOOKING || 'http://localhost:4020',
    },
    assetMind: { main: process.env.ASSETMIND || 'http://localhost:5200' },
    adBazaar: {
        crm: process.env.ADBAZAAR_CRM || 'http://localhost:4303',
        campaigns: process.env.ADBAZAAR_CAMPAIGNS || 'http://localhost:4300',
    },
};

export class ProspectingConnector {
    private leadClient = axios.create({ baseURL: ECOSYSTEM_SERVICES.hojai.leadService, timeout: 5000 });
    private kgClient = axios.create({ baseURL: ECOSYSTEM_SERVICES.hojai.knowledgeGraph, timeout: 5000 });

    async searchProspects(query: string): Promise<unknown[]> {
        try {
            const response = await this.kgClient.get('/search', { params: { q: query, type: 'company' } });
            return response.data.results || [];
        } catch { return this.getMockProspects(query); }
    }
    async getCompanyIntel(companyName: string): Promise<unknown | null> {
        try {
            const response = await this.leadClient.get('/company', { params: { name: companyName } });
            return response.data;
        } catch { return null; }
    }
    async getContactData(email: string): Promise<unknown | null> {
        try {
            const response = await this.leadClient.get('/contact', { params: { email } });
            return response.data;
        } catch { return null; }
    }
    private getMockProspects(_query: string): unknown[] {
        return [
            { id: '1', name: 'Acme Corp', industry: 'Technology', size: '50-200', score: 85 },
            { id: '2', name: 'TechStart Solutions', industry: 'Finance', size: '100-500', score: 72 },
            { id: '3', name: 'Global Enterprises', industry: 'Healthcare', size: '20-100', score: 68 },
        ];
    }
}

export class CommunicationConnector {
    private genieClient = axios.create({ baseURL: ECOSYSTEM_SERVICES.genie.voice, timeout: 5000 });

    async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
        try {
            await this.genieClient.post('/api/send', { channel: 'email', to, subject, body });
            return true;
        } catch { return false; }
    }
    async sendSMS(phone: string, message: string): Promise<boolean> {
        try {
            await this.genieClient.post('/api/send', { channel: 'sms', to: phone, body: message });
            return true;
        } catch { return false; }
    }
    async sendWhatsApp(phone: string, message: string): Promise<boolean> {
        try {
            await this.genieClient.post('/api/send', { channel: 'whatsapp', to: phone, body: message });
            return true;
        } catch { return false; }
    }
    async makeCall(phone: string): Promise<boolean> {
        try {
            const response = await this.genieClient.post('/api/communication/call', { to: phone, direction: 'outbound' });
            // Check if Voice OS returned success
            if (response.data?.success === true) {
                return true;
            }
            console.log('Voice OS call failed:', response.data);
            return false;
        } catch (error: any) {
            console.error('Voice OS call error:', error?.message || error);
            return false;
        }
    }
    async scheduleMeeting(email: string, topic: string, time: Date): Promise<string> {
        try {
            const response = await this.genieClient.post('/api/meeting/schedule', {
                title: topic,
                description: `Meeting: ${topic}`,
                start_time: time.toISOString(),
                end_time: new Date(time.getTime() + 60 * 60 * 1000).toISOString(),
                attendees: [{ email, rsvp_status: 'pending' }],
                host_email: 'sales@rtmn.io',
                meeting_type: 'video'
            });
            return response.data?.data?.join_url || response.data?.join_url || '';
        } catch (error: any) {
            console.error('Voice OS meeting error:', error?.message || error);
            return '';
        }
    }
}

export class IntelligenceConnector {
    private webClient = axios.create({ baseURL: ECOSYSTEM_SERVICES.hojai.webIntelligence, timeout: 5000 });
    private merchantClient = axios.create({ baseURL: ECOSYSTEM_SERVICES.hojai.merchantIntel, timeout: 5000 });
    private assetMindClient = axios.create({ baseURL: ECOSYSTEM_SERVICES.assetMind.main, timeout: 5000 });

    async getMarketSignals(industry: string): Promise<unknown[]> {
        try {
            const response = await this.webClient.get('/signals', { params: { q: industry } });
            return response.data.signals || [];
        } catch { return []; }
    }
    async getCompanyProfile(companyName: string): Promise<unknown | null> {
        try {
            const response = await this.merchantClient.get('/company-profile', { params: { name: companyName } });
            return response.data;
        } catch { return null; }
    }
    async getRevenueTwin(companyId: string): Promise<unknown | null> {
        try {
            const response = await this.assetMindClient.get('/twin/revenue', { params: { id: companyId } });
            return response.data;
        } catch { return null; }
    }
    async getMarketTrends(industry: string): Promise<{ trends: unknown[]; insights: unknown[] }> {
        try {
            const response = await this.webClient.get('/trends', { params: { industry } });
            return response.data;
        } catch { return { trends: [], insights: [] }; }
    }
}

export class IdentityConnector {
    private identityClient = axios.create({ baseURL: ECOSYSTEM_SERVICES.rez.identityHub, timeout: 5000 });

    private getAuthHeaders(): Record<string, string> {
        const token = getOutboundToken();
        return token ? { 'X-Internal-Token': token } : {};
    }
    async getUnifiedProfile(personId: string): Promise<unknown | null> {
        try {
            const response = await this.identityClient.get('/api/identity/' + encodeURIComponent(personId), { headers: this.getAuthHeaders() });
            return response.data;
        } catch { return null; }
    }
    async getConversationHistory(clientId: string, leadId: string): Promise<unknown[]> {
        try {
            const response = await this.identityClient.get('/api/internal/intelligence/' + encodeURIComponent(clientId) + '/' + encodeURIComponent(leadId), { headers: this.getAuthHeaders() });
            return response.data.history || [];
        } catch { return []; }
    }
    async getPreCallBrief(clientId: string, leadId: string): Promise<unknown | null> {
        try {
            const response = await this.identityClient.get('/api/internal/pre-call/' + encodeURIComponent(clientId) + '/' + encodeURIComponent(leadId), { headers: this.getAuthHeaders() });
            return response.data;
        } catch { return null; }
    }
    async storeInteraction(clientId: string, leadId: string, data: unknown): Promise<boolean> {
        try {
            await this.identityClient.post('/api/internal/conversations', { clientId, leadId, ...data as Record<string, unknown> }, { headers: this.getAuthHeaders() });
            return true;
        } catch { return false; }
    }
}

export class CRMConnector {
    private crmClient = axios.create({ baseURL: ECOSYSTEM_SERVICES.rez.crmHub, timeout: 5000 });

    constructor() {
        this.crmClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
            const token = getOutboundToken();
            if (token && config.headers) {
                config.headers['X-Internal-Token'] = token;
            }
            return config;
        });
    }
    async getLeads(filters: Record<string, string> = {}): Promise<{ data: unknown[]; error: string | null }> {
        try {
            const response = await this.crmClient.get('/api/contacts', { params: filters });
            return { data: response.data.contacts || response.data || [], error: null };
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'Failed to get leads';
            return { data: [], error: message };
        }
    }
    async getDeals(filters: Record<string, string> = {}): Promise<{ data: unknown[]; error: string | null }> {
        try {
            const response = await this.crmClient.get('/api/deals', { params: filters });
            return { data: response.data.deals || response.data || [], error: null };
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'Failed to get deals';
            return { data: [], error: message };
        }
    }
    async updateLeadStage(leadId: string, stage: string): Promise<{ success: boolean; error: string | null }> {
        try {
            await this.crmClient.patch('/api/contacts/' + encodeURIComponent(leadId), { lifecycleStage: stage });
            return { success: true, error: null };
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'Failed to update lead stage';
            return { success: false, error: message };
        }
    }
    async getActivities(contactId: string): Promise<{ data: unknown[]; error: string | null }> {
        try {
            const response = await this.crmClient.get('/api/activities', { params: { contactId } });
            return { data: response.data.activities || [], error: null };
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'Failed to get activities';
            return { data: [], error: message };
        }
    }
    async logActivity(activity: Record<string, unknown>): Promise<{ success: boolean; error: string | null }> {
        try {
            await this.crmClient.post('/api/activities', activity);
            return { success: true, error: null };
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'Failed to log activity';
            return { success: false, error: message };
        }
    }
    async createLead(leadData: Record<string, unknown>): Promise<{ data: unknown; error: string | null }> {
        try {
            const response = await this.crmClient.post('/api/contacts', leadData);
            return { data: response.data, error: null };
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'Failed to create lead';
            return { data: null, error: message };
        }
    }
}

export class BookingConnector {
    private bookingClient = axios.create({ baseURL: ECOSYSTEM_SERVICES.rez.booking, timeout: 5000 });
    async createBooking(type: string, data: Record<string, unknown>): Promise<unknown | null> {
        try {
            const response = await this.bookingClient.post('/api/bookings', { type, ...data });
            return response.data;
        } catch { return null; }
    }
    async getAvailability(serviceType: string, date: Date): Promise<unknown[]> {
        try {
            const response = await this.bookingClient.get('/api/availability', { params: { type: serviceType, date: date.toISOString() } });
            return response.data.slots || [];
        } catch { return []; }
    }
}

export class ConversationIntelligenceConnector {
    private twinClient = axios.create({ baseURL: ECOSYSTEM_SERVICES.hojai.twinOS, timeout: 5000 });

    async analyzeCall(recordingUrl: string): Promise<{ data: unknown; isMock: boolean }> {
        try {
            const response = await this.twinClient.post('/analyze/call', { recordingUrl });
            return { data: response.data, isMock: false };
        } catch { return { data: this.getMockCallAnalysis(), isMock: true }; }
    }
    async getSentiment(text: string): Promise<string> {
        try {
            const response = await this.twinClient.post('/analyze/sentiment', { text });
            return (response.data.sentiment as string) || 'neutral';
        } catch { return 'neutral'; }
    }
    async extractKeyTopics(conversation: string): Promise<string[]> {
        try {
            const response = await this.twinClient.post('/analyze/topics', { text: conversation });
            return (response.data.topics as string[]) || [];
        } catch { return []; }
    }
    async detectObjections(text: string): Promise<string[]> {
        try {
            const response = await this.twinClient.post('/analyze/objections', { text });
            return (response.data.objections as string[]) || [];
        } catch { return []; }
    }
    private getMockCallAnalysis(): Record<string, unknown> {
        return {
            duration: 1800, sentiment: 'positive', keyTopics: ['pricing', 'timeline', 'implementation'],
            objections: [], competitorMentions: [], actionItems: ['Send proposal', 'Schedule demo'],
            _note: 'Mock data - TwinOS unavailable'
        };
    }
}

export const prospectingConnector = new ProspectingConnector();
export const communicationConnector = new CommunicationConnector();
export const intelligenceConnector = new IntelligenceConnector();
export const identityConnector = new IdentityConnector();
export const crmConnector = new CRMConnector();
export const bookingConnector = new BookingConnector();
export const conversationIntelConnector = new ConversationIntelligenceConnector();
