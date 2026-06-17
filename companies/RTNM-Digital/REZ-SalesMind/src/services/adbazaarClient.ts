/**
 * AdBazaar Integration Client
 *
 * Connected Services:
 * - Campaign Manager: Marketing campaign data
 * - Attribution Engine: Conversion tracking
 * - Retail Media: In-store media analytics
 * - CRM: Customer relationship data
 */
import axios from 'axios';

const ADBAZAAR_CONFIG = {
    campaignManager: process.env.ADBAZAAR_CAMPAIGNS || 'http://localhost:4300',
    attribution: process.env.ADBAZAAR_ATTRIBUTION || 'http://localhost:4301',
    retailMedia: process.env.ADBAZAAR_RETAIL || 'http://localhost:4302',
    crm: process.env.ADBAZAAR_CRM || 'http://localhost:4303',
};

export class AdBazaarClient {
    campaignClient = axios.create({ baseURL: ADBAZAAR_CONFIG.campaignManager, timeout: 5000 });
    attributionClient = axios.create({ baseURL: ADBAZAAR_CONFIG.attribution, timeout: 5000 });
    retailClient = axios.create({ baseURL: ADBAZAAR_CONFIG.retailMedia, timeout: 5000 });
    crmClient = axios.create({ baseURL: ADBAZAAR_CONFIG.crm, timeout: 5000 });

    /**
     * Get campaigns for a client
     */
    async getCampaigns(clientId: string): Promise<unknown[]> {
        try {
            const response = await this.campaignClient.get('/campaigns', {
                params: { clientId }
            });
            return response.data.campaigns || [];
        } catch (error) {
            console.log('AdBazaar Campaign Manager unavailable');
            return [];
        }
    }

    /**
     * Get attribution data for a conversion
     */
    async getAttributionData(conversionId: string): Promise<unknown | null> {
        try {
            const response = await this.attributionClient.get('/attribution', {
                params: { conversionId }
            });
            return response.data;
        } catch (error) {
            console.log('AdBazaar Attribution unavailable');
            return null;
        }
    }

    /**
     * Get CRM contacts for a client
     */
    async getContacts(clientId: string): Promise<unknown[]> {
        try {
            const response = await this.crmClient.get('/contacts', {
                params: { clientId }
            });
            return response.data.contacts || [];
        } catch (error) {
            console.log('AdBazaar CRM unavailable');
            return [];
        }
    }

    /**
     * Get contact by ID — FIXED: use template string for URL encoding
     */
    async getContact(contactId: string): Promise<unknown | null> {
        try {
            const response = await this.crmClient.get(`/contacts/${encodeURIComponent(contactId)}`);
            return response.data;
        } catch (error) {
            console.log('AdBazaar CRM unavailable');
            return null;
        }
    }

    /**
     * Update contact stage
     */
    async updateContactStage(contactId: string, stage: string): Promise<boolean> {
        try {
            await this.crmClient.patch(`/contacts/${encodeURIComponent(contactId)}`, { stage });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get retail media analytics
     */
    async getRetailAnalytics(locationId: string): Promise<unknown | null> {
        try {
            const response = await this.retailClient.get('/analytics', {
                params: { locationId }
            });
            return response.data;
        } catch (error) {
            return null;
        }
    }

    /**
     * Track a new lead from marketing
     */
    async trackLead(source: string, metadata: Record<string, unknown>): Promise<string> {
        try {
            const response = await this.attributionClient.post('/track/lead', {
                source,
                metadata,
                timestamp: new Date()
            });
            return response.data.leadId || '';
        } catch (error) {
            return '';
        }
    }

    /**
     * Get marketing touchpoints for a customer
     */
    async getTouchpoints(customerId: string): Promise<unknown[]> {
        try {
            const response = await this.attributionClient.get('/touchpoints', {
                params: { customerId }
            });
            return response.data.touchpoints || [];
        } catch (error) {
            return [];
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            await this.campaignClient.get('/health');
            return true;
        } catch {
            return false;
        }
    }
}
