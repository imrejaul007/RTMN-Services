import { logger } from '../../shared/logger';
/**
 * LawGens Legal AI Hub Client
 * Contract analysis, Compliance, Court research
 * Port: 5100
 */

import axios, { AxiosInstance } from 'axios';

const INTERNAL_KEY = process.env.INTERNAL_SERVICE_TOKEN || 'your-internal-token';
const UNIFIED_HUB = process.env.UNIFIED_HUB_URL || 'http://localhost:4600';

const SERVICES = {
  AUTH: process.env.AUTH_SERVICE_URL || 'https://rez-auth-service.onrender.com',
  WALLET: process.env.WALLET_SERVICE_URL || 'https://rez-wallet-service.onrender.com',
  HOJAI_MEMORY: process.env.HOJAI_MEMORY || 'http://localhost:4520',
  HOJAI_INTELLIGENCE: process.env.HOJAI_INTELLIGENCE || 'http://localhost:4530',
  HOJAI_AGENTS: process.env.HOJAI_AGENTS || 'http://localhost:4550',
  FINANCIAL_AI: process.env.FINANCIAL_AI || 'http://localhost:4754',
  RESEARCH: process.env.RESEARCH_URL || 'http://localhost:5101',
  COMPLIANCE: process.env.COMPLIANCE_URL || 'http://localhost:5102',
};

class LawGensHubClient {
  private clients: Map<string, AxiosInstance> = new Map();
  private hubClient: AxiosInstance;

  constructor() {
    this.hubClient = axios.create({
      baseURL: UNIFIED_HUB,
      headers: { 'X-Internal-Token': INTERNAL_KEY, 'X-Service-Name': 'LawGens' },
    });

    Object.keys(SERVICES).forEach((service) => {
      this.clients.set(service, axios.create({
        baseURL: SERVICES[service as keyof typeof SERVICES],
        headers: { 'X-Internal-Token': INTERNAL_KEY, 'X-Service-Name': 'LawGens' },
      }));
    });
  }

  async callViaHub(service: string, endpoint: string, method = 'POST', data?: unknown) {
    try {
      return (await this.hubClient.request({ method, url: `/api/${service}${endpoint}`, data })).data;
    } catch (error) {
      logger.error(`[LawGens] ${service}${endpoint} failed:`, error);
      return null;
    }
  }

  async callDirect(service: string, endpoint: string, method = 'POST', data?: unknown) {
    const client = this.clients.get(service);
    if (!client) return null;
    try {
      return (await client.request({ method, url: endpoint, data })).data;
    } catch (error) {
      logger.error(`[LawGens] Direct ${service}${endpoint} failed:`, error);
      return null;
    }
  }

  // RABTUL
  async getWalletBalance(userId: string) {
    return this.callViaHub('wallet', '/balance', 'POST', { user_id: userId });
  }

  async processPayment(userId: string, amount: number, method: string) {
    return this.callViaHub('payment', '/initiate', 'POST', { user_id: userId, amount, method });
  }

  // HOJAI AI
  async analyzeContract(documentText: string) {
    return this.callDirect('HOJAI_INTELLIGENCE', '/api/v1/legal/contract/analyze', 'POST', { document: documentText });
  }

  async extractClauses(documentText: string) {
    return this.callDirect('HOJAI_INTELLIGENCE', '/api/v1/legal/clauses/extract', 'POST', { document: documentText });
  }

  async checkCompliance(documentText: string, regulation: string) {
    return this.callDirect('HOJAI_INTELLIGENCE', '/api/v1/legal/compliance/check', 'POST', { document: documentText, regulation });
  }

  async chatWithLegalAssistant(userId: string, query: string) {
    return this.callDirect('HOJAI_AGENTS', '/api/v1/agents/legal/query', 'POST', { user_id: userId, query, context: 'legal' });
  }

  async storeLegalMemory(userId: string, memory: string) {
    return this.callDirect('HOJAI_MEMORY', '/api/v1/memory/store', 'POST', { user_id: userId, type: 'legal_research', data: memory });
  }

  async getLegalHistory(userId: string) {
    return this.callDirect('HOJAI_MEMORY', '/api/v1/memory/retrieve', 'POST', { user_id: userId, type: 'legal_research' });
  }

  // Services
  async searchCaseLaw(query: string) {
    return this.callDirect('RESEARCH', '/api/v1/cases/search', 'POST', { query });
  }

  async getCourtDirections(court: string, caseNumber: string) {
    return this.callDirect('RESEARCH', '/api/v1/court/directions', 'POST', { court, case_number: caseNumber });
  }

  async checkComplianceStatus(entityId: string, regulationType: string) {
    return this.callDirect('COMPLIANCE', '/api/v1/status', 'POST', { entity_id: entityId, regulation_type: regulationType });
  }

  async generateComplianceReport(entityId: string) {
    return this.callDirect('COMPLIANCE', '/api/v1/reports/generate', 'POST', { entity_id: entityId });
  }

  // Loyalty
  async awardPoints(userId: string, points: number, action: string) {
    return this.callViaHub('karma', '/award', 'POST', { user_id: userId, points, action, source: 'LawGens' });
  }

  async trackEvent(userId: string, event: string, data?: unknown) {
    return this.callViaHub('signal', '/collect', 'POST', { service: 'LawGens', event, user_id: userId, data });
  }
}

export const lawGensHub = new LawGensHubClient();
export default lawGensHub;