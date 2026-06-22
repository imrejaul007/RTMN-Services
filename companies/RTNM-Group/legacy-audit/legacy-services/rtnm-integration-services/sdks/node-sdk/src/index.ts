/**
 * RTMN SDK - Node.js
 * Unified API for all RTMN products
 *
 * @version 1.0.0
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// Types
interface RTMNConfig {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
}

interface RTMNResponse<T> {
    success: boolean;
    data: T;
    meta?: {
        product: string;
        latency_ms?: number;
    };
}

// RTMN Client
class RTMNClient {
    private client: AxiosInstance;
    private config: RTMNConfig;

    // Product modules
    public hojai: HojaiModule;
    public rabtul: RabtulModule;
    public corpperks: CorpPerksModule;
    public adbazaar: AdBazaarModule;
    public safeqr: SafeQRModule;
    public nexha: NexhaModule;

    constructor(config: RTMNConfig) {
        this.config = config;
        this.client = axios.create({
            baseURL: config.baseUrl || 'http://localhost:3000',
            timeout: config.timeout || 30000,
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        // Initialize modules
        this.hojai = new HojaiModule(this.client);
        this.rabtul = new RabtulModule(this.client);
        this.corpperks = new CorpPerksModule(this.client);
        this.adbazaar = new AdBazaarModule(this.client);
        this.safeqr = new SafeQRModule(this.client);
        this.nexha = new NexhaModule(this.client);
    }

    // Health check
    async health(): Promise<RTMNResponse<any>> {
        const response = await this.client.get('/health');
        return response.data;
    }
}

// Base module class
class BaseModule {
    protected client: AxiosInstance;

    constructor(client: AxiosInstance) {
        this.client = client;
    }

    protected async request<T>(method: string, path: string, data?: any): Promise<T> {
        const response = await this.client.request({
            method,
            url: path,
            data
        });
        return response.data;
    }
}

// HOJAI AI Module
class HojaiModule extends BaseModule {
    /**
     * Chat with AI
     */
    async chat(message: string, context?: object): Promise<RTMNResponse<any>> {
        return this.request('POST', '/api/v1/hojai/chat', { message, context });
    }

    /**
     * Execute AI agent
     */
    async executeAgent(agentId: string, task: string, context?: object): Promise<RTMNResponse<any>> {
        return this.request('POST', `/api/v1/hojai/agent/${agentId}`, { task, context });
    }

    /**
     * Search knowledge base
     */
    async search(query: string, limit: number = 10): Promise<RTMNResponse<any>> {
        return this.request('POST', '/api/v1/hojai/search', { query, limit });
    }

    /**
     * List available agents
     */
    async listAgents(industry?: string): Promise<RTMNResponse<any>> {
        return this.request('GET', '/api/v1/hojai/agents', { params: { industry } });
    }
}

// RABTUL Payments Module
class RabtulModule extends BaseModule {
    /**
     * Create payment
     */
    async createPayment(amount: number, orderId: string, options?: {
        currency?: string;
        customer?: object;
        metadata?: object;
    }): Promise<RTMNResponse<any>> {
        return this.request('POST', '/api/v1/rabtul/payments', {
            amount,
            orderId,
            ...options
        });
    }

    /**
     * Get payment status
     */
    async getPayment(paymentId: string): Promise<RTMNResponse<any>> {
        return this.request('GET', `/api/v1/rabtul/payments/${paymentId}`);
    }

    /**
     * Create wallet
     */
    async createWallet(userId: string, name: string, email: string, phone?: string): Promise<RTMNResponse<any>> {
        return this.request('POST', '/api/v1/rabtul/wallet', { userId, name, email, phone });
    }

    /**
     * Get wallet balance
     */
    async getWalletBalance(walletId: string): Promise<RTMNResponse<any>> {
        return this.request('GET', `/api/v1/rabtul/wallet/${walletId}`);
    }

    /**
     * Top up wallet
     */
    async topUpWallet(walletId: string, amount: number, source: string = 'upi'): Promise<RTMNResponse<any>> {
        return this.request('POST', `/api/v1/rabtul/wallet/${walletId}/topup`, { amount, source });
    }

    /**
     * Create BNPL order
     */
    async createBNPLOrder(amount: number, customerId: string, tenure: number = 3): Promise<RTMNResponse<any>> {
        return this.request('POST', '/api/v1/rabtul/bnpl/order', { amount, customerId, tenure });
    }
}

// CorpPerks HRMS Module
class CorpPerksModule extends BaseModule {
    /**
     * Create employee (auto-creates wallet, SafeQR badge, Nexha identity)
     */
    async createEmployee(data: {
        name: string;
        email: string;
        phone?: string;
        department?: string;
        role?: string;
        joinDate?: string;
        salary?: number;
    }): Promise<RTMNResponse<any>> {
        return this.request('POST', '/api/v1/corpperks/employees', data);
    }

    /**
     * Get employee
     */
    async getEmployee(employeeId: string): Promise<RTMNResponse<any>> {
        return this.request('GET', `/api/v1/corpperks/employees/${employeeId}`);
    }

    /**
     * List employees
     */
    async listEmployees(options?: {
        department?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<RTMNResponse<any>> {
        return this.request('GET', '/api/v1/corpperks/employees', { params: options });
    }

    /**
     * Run payroll
     */
    async runPayroll(month: number, year: number, employees?: string[]): Promise<RTMNResponse<any>> {
        return this.request('POST', '/api/v1/corpperks/payroll/run', { month, year, employees });
    }

    /**
     * Record attendance
     */
    async recordAttendance(employeeId: string, date: string, checkIn?: string, checkOut?: string): Promise<RTMNResponse<any>> {
        return this.request('POST', '/api/v1/corpperks/attendance', {
            employeeId, date, checkIn, checkOut
        });
    }
}

// AdBazaar Marketing Module
class AdBazaarModule extends BaseModule {
    /**
     * Create campaign
     */
    async createCampaign(data: {
        name: string;
        type: string;
        budget: number;
        target?: string;
        startDate?: string;
        endDate?: string;
        platforms?: string[];
    }): Promise<RTMNResponse<any>> {
        return this.request('POST', '/api/v1/adbazaar/campaigns', data);
    }

    /**
     * Get campaign
     */
    async getCampaign(campaignId: string): Promise<RTMNResponse<any>> {
        return this.request('GET', `/api/v1/adbazaar/campaigns/${campaignId}`);
    }

    /**
     * List campaigns
     */
    async listCampaigns(options?: { status?: string; page?: number; limit?: number }): Promise<RTMNResponse<any>> {
        return this.request('GET', '/api/v1/adbazaar/campaigns', { params: options });
    }

    /**
     * Get campaign analytics
     */
    async getCampaignAnalytics(campaignId: string, startDate?: string, endDate?: string): Promise<RTMNResponse<any>> {
        return this.request('GET', `/api/v1/adbazaar/campaigns/${campaignId}/analytics`, {
            params: { startDate, endDate }
        });
    }

    /**
     * Find influencers
     */
    async findInfluencers(options?: {
        category?: string;
        followers?: string;
        location?: string;
        budget?: number;
    }): Promise<RTMNResponse<any>> {
        return this.request('GET', '/api/v1/adbazaar/influencers', { params: options });
    }

    /**
     * Book DOOH screen
     */
    async bookScreen(screenId: string, startTime: string, duration: number, content: string): Promise<RTMNResponse<any>> {
        return this.request('POST', `/api/v1/adbazaar/screens/${screenId}/book`, {
            startTime, duration, content
        });
    }
}

// SafeQR Module
class SafeQRModule extends BaseModule {
    /**
     * Generate QR code
     */
    async generateQR(type: string, entityId: string, metadata?: object): Promise<RTMNResponse<any>> {
        return this.request('POST', '/api/v1/safeqr/qr/generate', { type, entityId, metadata });
    }

    /**
     * Verify QR code (awards loyalty points via RABTUL)
     */
    async verifyQR(qrCode: string): Promise<RTMNResponse<any>> {
        return this.request('POST', '/api/v1/safeqr/qr/verify', { qrCode });
    }

    /**
     * Register warranty
     */
    async registerWarranty(qrCode: string, productId: string, purchaseDate: string, warrantyMonths?: number): Promise<RTMNResponse<any>> {
        return this.request('POST', '/api/v1/safeqr/warranty/register', {
            qrCode, productId, purchaseDate, warrantyMonths
        });
    }

    /**
     * Get warranty status
     */
    async getWarranty(qrCode: string): Promise<RTMNResponse<any>> {
        return this.request('GET', `/api/v1/safeqr/warranty/${qrCode}`);
    }

    /**
     * Trigger safety alert
     */
    async triggerAlert(type: 'emergency' | 'medical' | 'safety' | 'sos', location?: object): Promise<RTMNResponse<any>> {
        return this.request('POST', '/api/v1/safeqr/safety/alert', { type, location });
    }
}

// Nexha Identity Module
class NexhaModule extends BaseModule {
    /**
     * Create entity
     */
    async createEntity(data: {
        type: string;
        name: string;
        email?: string;
        phone?: string;
        metadata?: object;
    }): Promise<RTMNResponse<any>> {
        return this.request('POST', '/api/v1/nexha/entities', data);
    }

    /**
     * Get entity
     */
    async getEntity(entityId: string): Promise<RTMNResponse<any>> {
        return this.request('GET', `/api/v1/nexha/entities/${entityId}`);
    }

    /**
     * Link entities
     */
    async linkEntities(entityId: string, targetId: string, relationship: string, metadata?: object): Promise<RTMNResponse<any>> {
        return this.request('POST', `/api/v1/nexha/entities/${entityId}/link`, {
            targetId, relationship, metadata
        });
    }

    /**
     * Get trust score
     */
    async getTrustScore(entityId: string): Promise<RTMNResponse<any>> {
        return this.request('GET', `/api/v1/nexha/trust/${entityId}`);
    }

    /**
     * Search entities
     */
    async searchEntities(query: string, type?: string, limit: number = 20): Promise<RTMNResponse<any>> {
        return this.request('POST', '/api/v1/nexha/search', { query, type, limit });
    }
}

// Export
export = RTMNClient;
export default RTMNClient;

// Also export individual modules for tree-shaking
export { HojaiModule, RabtulModule, CorpPerksModule, AdBazaarModule, SafeQRModule, NexhaModule };

// Quick usage examples
export const examples = {
    // Basic usage
    basic: `
// Initialize client
const RTMN = require('@rtmn/sdk');
const client = new RTMN({ apiKey: 'your-api-key' });

// Chat with AI
const response = await client.hojai.chat('What is Q3 revenue?');
console.log(response.data.reply);

// Create employee (auto-creates wallet, SafeQR, Nexha)
const employee = await client.corpperks.createEmployee({
    name: 'Priya Sharma',
    email: 'priya@acme.com',
    department: 'Engineering'
});
console.log(employee.data.integrations);
`,

    // Payment flow
    payment: `
// Create payment
const payment = await client.rabtul.createPayment(50000, 'ORD-12345');
console.log(payment.data.paymentId);

// Create wallet for user
const wallet = await client.rabtul.createWallet('user-123', 'John Doe', 'john@acme.com');
console.log(wallet.data.walletId);

// Top up wallet
await client.rabtul.topUpWallet('wal-123', 10000, 'upi');
`,

    // Marketing campaign
    campaign: `
// Create campaign
const campaign = await client.adbazaar.createCampaign({
    name: 'Summer Sale',
    type: 'social',
    budget: 100000,
    platforms: ['instagram', 'facebook']
});
console.log(campaign.data.campaignId);

// Get analytics
const analytics = await client.adbazaar.getCampaignAnalytics(campaign.data.campaignId);
console.log(analytics.data.impressions);
`
};