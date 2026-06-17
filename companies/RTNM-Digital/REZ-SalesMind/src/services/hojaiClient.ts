/**
 * HOJAI AI Integration Client
 *
 * Connected Services:
 * - Web Intelligence (4595): Market signals, competitor analysis
 * - Merchant Intelligence (4751): Business intelligence, sales insights
 * - Lead Service: Lead scoring and enrichment
 * - Knowledge Graph (4786): Entity relationships
 */
import axios from 'axios';

const HOJAI_CONFIG = {
    webIntelligence: process.env.HOJAI_WEB_INTEL || 'http://localhost:4595',
    merchantIntelligence: process.env.HOJAI_MERCHANT_INTEL || 'http://localhost:4751',
    leadService: process.env.HOJAI_LEAD_SERVICE || 'http://localhost:4752',
    knowledgeGraph: process.env.HOJAI_KG || 'http://localhost:4786',
};

export class HojaiAIClient {
    webIntelClient = axios.create({ baseURL: HOJAI_CONFIG.webIntelligence, timeout: 5000 });
    merchantIntelClient = axios.create({ baseURL: HOJAI_CONFIG.merchantIntelligence, timeout: 5000 });
    leadClient = axios.create({ baseURL: HOJAI_CONFIG.leadService, timeout: 5000 });
    kgClient = axios.create({ baseURL: HOJAI_CONFIG.knowledgeGraph, timeout: 5000 });

    /**
     * Fetch market signals from web intelligence
     * FIXED: returns flag indicating if data is from fallback
     */
    async getMarketSignals(query: string): Promise<{ signals: unknown[]; isMock: boolean }> {
        try {
            const response = await this.webIntelClient.get('/signals/search', {
                params: { q: query, limit: 10 }
            });
            return { signals: response.data.signals || [], isMock: false };
        } catch (error) {
            console.log('HOJAI Web Intelligence unavailable, using fallback');
            return { signals: this.getFallbackSignals(query), isMock: true };
        }
    }

    /**
     * Get business intelligence for a company
     */
    async getBusinessIntelligence(companyName: string) {
        try {
            const response = await this.merchantIntelClient.get('/company-intel', {
                params: { name: companyName }
            });
            return response.data;
        } catch (error) {
            console.log('HOJAI Merchant Intelligence unavailable');
            return null;
        }
    }

    /**
     * Score a lead using AI — FIXED: null safety
     */
    async scoreLead(leadData: unknown): Promise<{ score: number; factors: string[]; recommendations: string[] }> {
        try {
            const response = await this.leadClient.post('/score', leadData);
            return response.data;
        } catch (error) {
            return this.calculateFallbackScore(leadData as Record<string, unknown>);
        }
    }

    /**
     * Query knowledge graph for entity relationships
     */
    async queryKnowledgeGraph(entity: string, relationship: string): Promise<unknown[]> {
        try {
            const response = await this.kgClient.get('/query', {
                params: { entity, relationship }
            });
            return response.data.results || [];
        } catch (error) {
            console.log('HOJAI Knowledge Graph unavailable');
            return [];
        }
    }

    /**
     * Enrich lead with AI insights
     */
    async enrichLead(leadId: string): Promise<unknown | null> {
        try {
            const response = await this.leadClient.post('/enrich', { leadId });
            return response.data;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get twin data for a prospect
     */
    async getProspectTwin(prospectId: string): Promise<unknown | null> {
        try {
            const response = await this.merchantIntelClient.get('/twin', {
                params: { id: prospectId }
            });
            return response.data;
        } catch (error) {
            return null;
        }
    }

    private getFallbackSignals(query: string): unknown[] {
        return [
            {
                type: 'trend',
                source: 'HOJAI Web Intelligence',
                content: `Market trend detected for: ${query}`,
                sentiment: 'neutral',
                timestamp: new Date(),
                relevance: 0.7
            }
        ];
    }

    private calculateFallbackScore(leadData: Record<string, unknown>): { score: number; factors: string[]; recommendations: string[] } {
        let score = 50;
        const factors: string[] = [];
        const recommendations: string[] = [];
        if (leadData?.company) { score += 10; factors.push('Has company info'); }
        if (leadData?.email) { score += 15; factors.push('Has email'); }
        if (leadData?.phone) { score += 10; factors.push('Has phone'); }
        if (leadData?.website) { score += 5; }
        if (score > 70) recommendations.push('High-priority lead - consider direct outreach');
        return { score: Math.min(score, 100), factors, recommendations };
    }

    async healthCheck(): Promise<boolean> {
        try {
            await this.webIntelClient.get('/health');
            return true;
        } catch {
            return false;
        }
    }
}
