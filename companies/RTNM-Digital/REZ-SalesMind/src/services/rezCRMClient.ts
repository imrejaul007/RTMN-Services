/**
 * REZ CRM Hub Integration Client
 *
 * Connected Services:
 * - REZ Identity Hub (4702): Unified identity (CorpID)
 * - REZ CRM Hub (4056): Unified CRM data
 * - REZ Merchant (4100): Business data
 * - REZ Consumer (4200): Consumer profiles
 */
import axios, { AxiosError } from 'axios';

// FIXED: token can be empty string — only set header if non-empty
const getOutboundToken = (): string => {
    const token = process.env.CRM_HUB_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '';
    return token;
};

// Build headers on each request so token rotation at runtime is picked up.
const getAuthHeaders = (): Record<string, string> => {
    const token = getOutboundToken();
    return token ? { 'X-Internal-Token': token } : {};
};

const REZ_CRM_CONFIG = {
    identityHub: process.env.REZ_IDENTITY_HUB || 'http://localhost:4702',
    merchant: process.env.REZ_MERCHANT || 'http://localhost:4100',
    consumer: process.env.REZ_CONSUMER || 'http://localhost:4200',
    crmHub: process.env.REZ_CRM_HUB || 'http://localhost:4056',
};

export interface Lead {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    source: string;
    stage: string;
    score: number;
    owner?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Deal {
    id: string;
    title: string;
    value: number;
    currency: string;
    stage: string;
    probability: number;
    contactId?: string;
    ownerId?: string;
    expectedClose: Date;
    notes?: string;
}

export class REZCRMClient {
    identityClient = axios.create({ baseURL: REZ_CRM_CONFIG.identityHub, timeout: 5000 });
    merchantClient = axios.create({ baseURL: REZ_CRM_CONFIG.merchant, timeout: 5000 });
    consumerClient = axios.create({ baseURL: REZ_CRM_CONFIG.consumer, timeout: 5000 });
    crmClient = axios.create({ baseURL: REZ_CRM_CONFIG.crmHub, timeout: 5000 });

    constructor() {
        const injectAuth = (config: any) => {
            const token = getOutboundToken();
            if (token) {
                const headers = (config.headers as Record<string, string> | undefined) || {};
                config.headers = { ...headers, 'X-Internal-Token': token };
            }
            return config;
        };
        this.identityClient.interceptors.request.use(injectAuth);
        this.merchantClient.interceptors.request.use(injectAuth);
        this.consumerClient.interceptors.request.use(injectAuth);
        this.crmClient.interceptors.request.use(injectAuth);
    }

    async getIdentity(personId: string): Promise<{ data: unknown; error: string | null }> {
        try {
            const response = await this.identityClient.get('/api/identity/' + encodeURIComponent(personId));
            return { data: response.data, error: null };
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'REZ Identity Hub unavailable';
            console.warn('REZ CRM Client - Identity:', message);
            return { data: null, error: message };
        }
    }

    async getMerchantProfile(merchantId: string): Promise<{ data: unknown; error: string | null }> {
        try {
            const response = await this.merchantClient.get('/api/merchants/' + encodeURIComponent(merchantId));
            return { data: response.data, error: null };
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'REZ Merchant unavailable';
            console.warn('REZ CRM Client - Merchant:', message);
            return { data: null, error: message };
        }
    }

    async getConsumerProfile(consumerId: string): Promise<{ data: unknown; error: string | null }> {
        try {
            const response = await this.consumerClient.get('/api/profiles/' + encodeURIComponent(consumerId));
            return { data: response.data, error: null };
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'REZ Consumer unavailable';
            console.warn('REZ CRM Client - Consumer:', message);
            return { data: null, error: message };
        }
    }

    async getLeads(filters: Record<string, string> = {}): Promise<{ data: Lead[]; error: string | null }> {
        try {
            const response = await this.crmClient.get('/api/contacts', { params: filters });
            const contacts = response.data?.data || response.data || [];
            const leads = (Array.isArray(contacts) ? contacts : []).map((c: Record<string, unknown>) => ({
                id: (c.id || c.externalId) as string,
                name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
                email: (c.email || (c.emails as string[] | undefined)?.[0]) as string | undefined,
                phone: (c.phone as Record<string, string> | undefined)?.number || (c.phones as Array<{ number: string }> | undefined)?.[0]?.number,
                company: c.company as string | undefined,
                title: c.jobTitle as string | undefined,
                source: (c.leadSource || 'crm') as string,
                stage: this.mapContactToStage(c),
                score: (c.score || 50) as number,
                owner: (c.owner || c.linkedRezUserId) as string | undefined,
                createdAt: new Date((c.createdAt as string | undefined) || Date.now()),
                updatedAt: new Date((c.updatedAt as string | undefined) || Date.now()),
            }));
            return { data: leads, error: null };
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'REZ CRM Hub unavailable';
            console.warn('REZ CRM Client - Leads:', message);
            return { data: [], error: message };
        }
    }

    async getLead(leadId: string): Promise<{ data: Lead | null; error: string | null }> {
        try {
            const response = await this.crmClient.get('/api/contacts/' + encodeURIComponent(leadId));
            const c = response.data?.data || response.data;
            if (!c) return { data: null, error: 'Contact not found' };
            const lead: Lead = {
                id: (c.id || c.externalId) as string,
                name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
                email: (c.email || (c.emails as string[] | undefined)?.[0]) as string | undefined,
                phone: (c.phone as Record<string, string> | undefined)?.number || (c.phones as Array<{ number: string }> | undefined)?.[0]?.number,
                company: c.company as string | undefined,
                title: c.jobTitle as string | undefined,
                source: (c.leadSource || 'crm') as string,
                stage: this.mapContactToStage(c),
                score: (c.score || 50) as number,
                owner: (c.owner || c.linkedRezUserId) as string | undefined,
                createdAt: new Date((c.createdAt as string | undefined) || Date.now()),
                updatedAt: new Date((c.updatedAt as string | undefined) || Date.now()),
            };
            return { data: lead, error: null };
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'REZ CRM Hub unavailable';
            console.warn('REZ CRM Client - Get Lead:', message);
            return { data: null, error: message };
        }
    }

    async createLead(leadData: Record<string, unknown>): Promise<{ data: unknown; error: string | null }> {
        try {
            const nameStr = (leadData.name as string) || '';
            const nameParts = nameStr.split(' ');
            const payload = {
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                email: leadData.email || undefined,
                phone: leadData.phone ? { number: leadData.phone as string, type: 'work' } : undefined,
                company: leadData.company || undefined,
                jobTitle: leadData.title || undefined,
                leadSource: leadData.source || undefined,
            };
            const response = await this.crmClient.post('/api/contacts', payload);
            return { data: response.data, error: null };
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'Failed to create lead';
            console.error('REZ CRM Client - Create Lead:', message);
            return { data: null, error: message };
        }
    }

    async updateLeadStage(leadId: string, stage: string): Promise<{ success: boolean; error: string | null }> {
        try {
            const lifecycleStage = this.mapStageToLifecycle(stage);
            await this.crmClient.patch('/api/contacts/' + encodeURIComponent(leadId), { lifecycleStage });
            return { success: true, error: null };
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'Failed to update lead stage';
            console.error('REZ CRM Client - Update Stage:', message);
            return { success: false, error: message };
        }
    }

    async getDeals(filters: Record<string, string> = {}): Promise<{ data: Deal[]; error: string | null }> {
        try {
            const response = await this.crmClient.get('/api/deals', { params: filters });
            const dealsData = response.data?.data || response.data?.deals || response.data || [];
            const deals = (Array.isArray(dealsData) ? dealsData : []).map((d: Record<string, unknown>) => ({
                id: (d.id || d.externalId) as string,
                title: (d.title || 'Untitled') as string,
                value: (d.amount || 0) as number,
                currency: (d.currency || 'USD') as string,
                stage: this.mapDealStage((d.stage as string) || ''),
                probability: (d.probability || 50) as number,
                contactId: d.contactId as string | undefined,
                ownerId: (d.ownerId || d.owner) as string | undefined,
                expectedClose: new Date((d.closeDate as string | undefined) || Date.now()),
                notes: d.description as string | undefined,
            }));
            return { data: deals, error: null };
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'REZ CRM Hub unavailable';
            console.warn('REZ CRM Client - Deals:', message);
            return { data: [], error: message };
        }
    }

    async getDeal(dealId: string): Promise<{ data: Deal | null; error: string | null }> {
        try {
            const response = await this.crmClient.get('/api/deals/' + encodeURIComponent(dealId));
            const d = response.data;
            const deal: Deal = {
                id: (d.id || d.externalId) as string,
                title: (d.title || 'Untitled') as string,
                value: (d.amount || 0) as number,
                currency: (d.currency || 'USD') as string,
                stage: this.mapDealStage((d.stage as string) || ''),
                probability: (d.probability || 50) as number,
                contactId: d.contactId as string | undefined,
                ownerId: (d.ownerId || d.owner) as string | undefined,
                expectedClose: new Date((d.closeDate as string | undefined) || Date.now()),
                notes: d.description as string | undefined,
            };
            return { data: deal, error: null };
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'REZ CRM Hub unavailable';
            console.warn('REZ CRM Client - Get Deal:', message);
            return { data: null, error: message };
        }
    }

    async createDeal(dealData: Record<string, unknown>): Promise<{ data: unknown; error: string | null }> {
        try {
            const payload = {
                title: dealData.title || 'Untitled Deal',
                amount: dealData.value || 0,
                stage: dealData.stage || 'new',
                probability: dealData.probability || 50,
                closeDate: dealData.expectedClose || undefined,
                contactId: dealData.contactId || undefined,
            };
            const response = await this.crmClient.post('/api/deals', payload);
            return { data: response.data, error: null };
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'Failed to create deal';
            console.error('REZ CRM Client - Create Deal:', message);
            return { data: null, error: message };
        }
    }

    async updateDealStage(dealId: string, stage: string): Promise<{ success: boolean; error: string | null }> {
        try {
            await this.crmClient.patch('/api/deals/' + encodeURIComponent(dealId), { stage });
            return { success: true, error: null };
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'Failed to update deal stage';
            console.error('REZ CRM Client - Update Deal Stage:', message);
            return { success: false, error: message };
        }
    }

    async getActivities(contactId: string): Promise<{ data: unknown[]; error: string | null }> {
        try {
            let response;
            try {
                response = await this.crmClient.get('/api/activities', { params: { contactId } });
                return { data: response.data.activities || [], error: null };
            } catch {
                response = await this.crmClient.get('/api/contacts/' + encodeURIComponent(contactId));
                return { data: [], error: null };
            }
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'REZ CRM Hub unavailable';
            console.warn('REZ CRM Client - Activities:', message);
            return { data: [], error: message };
        }
    }

    async logActivity(activityData: Record<string, unknown>): Promise<{ data: unknown; error: string | null }> {
        try {
            const payload = {
                type: activityData.type || 'note',
                subject: activityData.subject || '',
                description: activityData.description || '',
                contactId: activityData.contactId || '',
                timestamp: activityData.timestamp || new Date(),
                duration: activityData.duration || undefined,
            };
            const response = await this.crmClient.post('/api/activities', payload);
            return { data: response.data, error: null };
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'Failed to log activity';
            console.error('REZ CRM Client - Log Activity:', message);
            return { data: null, error: message };
        }
    }

    async getPipelineSummary(): Promise<{ data: unknown; error: string | null }> {
        try {
            const response = await this.crmClient.get('/api/deals/stats');
            return { data: response.data, error: null };
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'REZ CRM Hub unavailable';
            console.warn('REZ CRM Client - Pipeline Summary:', message);
            return { data: null, error: message };
        }
    }

    async healthCheck(): Promise<{ healthy: boolean; error: string | null }> {
        try {
            const response = await this.crmClient.get('/api/health');
            return { healthy: response.status === 200, error: null };
        } catch (error) {
            const message = error instanceof AxiosError ? error.message : 'REZ CRM Hub health check failed';
            return { healthy: false, error: message };
        }
    }

    // Helper: Map CRM Hub lifecycle stage to our stage
    private mapContactToStage(contact: Record<string, unknown>): string {
        const lifecycle = (contact.lifecycleStage as string)?.toLowerCase() || (contact.stage as string)?.toLowerCase() || '';
        if (lifecycle.includes('customer') || lifecycle.includes('closed')) return 'closed';
        if (lifecycle.includes('negotiation') || lifecycle.includes('opportunity')) return 'negotiation';
        if (lifecycle.includes('proposal') || lifecycle.includes('presentation')) return 'proposal';
        if (lifecycle.includes('qualified') || lifecycle.includes('evaluation')) return 'qualified';
        if (lifecycle.includes('meeting') || lifecycle.includes('contacted')) return 'contacted';
        return 'new';
    }

    // Helper: Map our stage to CRM Hub lifecycle stage
    private mapStageToLifecycle(stage: string): string {
        const mapping: Record<string, string> = {
            new: 'subscriber',
            contacted: 'lead',
            qualified: 'marketingqualifiedlead',
            proposal: 'opportunity',
            negotiation: 'opportunity',
            closed: 'customer',
        };
        return mapping[stage] || 'subscriber';
    }

    // Helper: Map CRM Hub deal stage to our deal stage
    private mapDealStage(stage: string): string {
        const normalized = (stage || '').toLowerCase().replace(/[\s_-]/g, '');
        if (normalized.includes('lost')) return 'closed_lost';
        if (normalized.includes('won') || normalized.includes('closed')) return 'closed_won';
        if (normalized.includes('negotiat')) return 'negotiation';
        if (normalized.includes('proposal')) return 'proposal';
        if (normalized.includes('discovery')) return 'discovery';
        return 'discovery';
    }
}
