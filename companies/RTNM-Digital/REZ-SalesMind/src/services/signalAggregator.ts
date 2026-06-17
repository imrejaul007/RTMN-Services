/**
 * Signal Aggregator - Combines signals from HOJAI AI, AdBazaar, and REZ CRM Hub
 * FIXED: crypto.randomUUID() for IDs, touchpoint serialization
 */
import { randomUUID } from 'crypto';

export interface Signal {
    id: string;
    type: string;
    source: string;
    entity: string;
    content: string;
    sentiment?: string;
    strength: number;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

export class SignalAggregator {
    hojaiClient: {
        getMarketSignals: (query: string) => Promise<{ signals: unknown[]; isMock: boolean }>;
    };
    adbazaarClient: {
        getTouchpoints: (customerId: string) => Promise<unknown[]>;
    };
    rezCRMClient: {
        getActivities: (id: string) => Promise<{ data: unknown[]; error: string | null }>;
        getLead: (id: string) => Promise<{ data: unknown; error: string | null }>;
    };

    constructor(
        hojaiClient: SignalAggregator['hojaiClient'],
        adbazaarClient: SignalAggregator['adbazaarClient'],
        rezCRMClient: SignalAggregator['rezCRMClient']
    ) {
        this.hojaiClient = hojaiClient;
        this.adbazaarClient = adbazaarClient;
        this.rezCRMClient = rezCRMClient;
    }

    async aggregateSignals(leadId: string): Promise<Signal[]> {
        const signals: Signal[] = [];

        const activitiesResult = await this.rezCRMClient.getActivities(leadId);
        const activities = (activitiesResult.data || []) as Array<Record<string, unknown>>;
        signals.push(...this.extractCRMSignals(leadId, activities));

        const touchpoints = await this.adbazaarClient.getTouchpoints(leadId);
        signals.push(...this.extractAdBazaarSignals(leadId, touchpoints));

        const leadResult = await this.rezCRMClient.getLead(leadId);
        const lead = leadResult.data as Record<string, unknown> | null;
        if (lead?.company) {
            const { signals: marketSignals } = await this.hojaiClient.getMarketSignals(lead.company as string);
            signals.push(...this.convertMarketSignals(leadId, marketSignals as Array<Record<string, unknown>>));
        }

        return signals.sort((a, b) => {
            const strengthDiff = b.strength - a.strength;
            if (strengthDiff !== 0) return strengthDiff;
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
    }

    async getIntentSignals(prospectId: string): Promise<Signal[]> {
        const signals = await this.aggregateSignals(prospectId);
        return signals.filter(s => s.type === 'intent' || s.type === 'behavior');
    }

    async getMarketSignals(industry: string): Promise<Signal[]> {
        const { signals } = await this.hojaiClient.getMarketSignals(industry);
        return (signals as Array<Record<string, unknown>>).map(s => ({
            id: this.generateId(),
            type: 'market',
            source: 'hojai',
            entity: industry,
            content: s.content as string,
            sentiment: s.sentiment as string,
            strength: s.relevance as number,
            timestamp: new Date(s.timestamp as string)
        }));
    }

    async detectBuyingSignals(prospectId: string): Promise<Signal[]> {
        const signals = await this.aggregateSignals(prospectId);
        return signals.filter(s => {
            if (s.type === 'behavior' && s.sentiment === 'positive' && s.strength > 0.7) return true;
            if (s.type === 'engagement' && s.strength > 0.8) return true;
            return false;
        });
    }

    async detectChurnRisk(prospectId: string): Promise<Signal[]> {
        const signals = await this.aggregateSignals(prospectId);
        return signals.filter(s => {
            if (s.type === 'engagement' && s.sentiment === 'negative') return true;
            if (s.type === 'behavior' && s.strength < 0.3) return true;
            return false;
        });
    }

    async getSignalScore(prospectId: string) {
        const signals = await this.aggregateSignals(prospectId);
        const intentSignals = signals.filter(s => s.type === 'intent');
        const engagementSignals = signals.filter(s => s.type === 'engagement');
        const marketSignals = signals.filter(s => s.type === 'market');
        const intent = this.averageStrength(intentSignals);
        const engagement = this.averageStrength(engagementSignals);
        const market = this.averageStrength(marketSignals);
        const overall = Math.round((intent * 0.4 + engagement * 0.3 + market * 0.3) * 100);

        const recentSignals = signals.filter(s => {
            const age = Date.now() - new Date(s.timestamp).getTime();
            return age < 7 * 24 * 60 * 60 * 1000;
        });
        const trend = this.calculateTrend(recentSignals);
        return { overall, breakdown: { intent, engagement, market }, trend };
    }

    private extractCRMSignals(leadId: string, activities: Array<Record<string, unknown>>): Signal[] {
        return activities.slice(0, 10).map(activity => ({
            id: this.generateId(),
            type: 'behavior',
            source: 'crm',
            entity: leadId,
            content: (activity.subject || activity.description || `Interaction: ${activity.type}`) as string,
            sentiment: this.inferSentiment((activity.type as string) || ''),
            strength: this.activityToStrength(activity),
            timestamp: new Date((activity.timestamp as string | number | Date) || Date.now())
        }));
    }

    // FIXED: serialize touchpoint values explicitly
    private extractAdBazaarSignals(leadId: string, touchpoints: unknown[]): Signal[] {
        return touchpoints.slice(0, 20).map((tp, i) => {
            // FIXED: serialize touchpoint to string explicitly
            let content: string;
            if (typeof tp === 'string') {
                content = `Marketing touchpoint: ${tp}`;
            } else if (typeof tp === 'object' && tp !== null) {
                content = `Marketing touchpoint: ${JSON.stringify(tp)}`;
            } else {
                content = `Marketing touchpoint: ${String(tp)}`;
            }
            return {
                id: this.generateId(),
                type: 'engagement',
                source: 'adbazaar',
                entity: leadId,
                content,
                sentiment: 'neutral',
                strength: Math.max(0.3, 1 - (i * 0.1)),
                timestamp: new Date()
            };
        });
    }

    private convertMarketSignals(leadId: string, marketSignals: Array<Record<string, unknown>>): Signal[] {
        return marketSignals.map(s => ({
            id: this.generateId(),
            type: 'market',
            source: 'hojai',
            entity: leadId,
            content: s.content as string,
            sentiment: s.sentiment as string,
            strength: s.relevance as number,
            timestamp: new Date((s.timestamp as string | number | Date) || Date.now()),
            metadata: { sourceType: s.type }
        }));
    }

    private inferSentiment(activityType: string): string {
        const positive = ['call', 'meeting', 'demo'];
        const negative = ['lost', 'churn', 'unsubscribed'];
        const normalized = activityType.toLowerCase();
        if (positive.includes(normalized)) return 'positive';
        if (negative.includes(normalized)) return 'negative';
        return 'neutral';
    }

    private activityToStrength(activity: Record<string, unknown>): number {
        const weights: Record<string, number> = { meeting: 0.9, call: 0.8, demo: 0.9, email: 0.5, note: 0.3, task: 0.2 };
        return weights[(activity.type as string)?.toLowerCase() || ''] || 0.5;
    }

    private averageStrength(signals: Signal[]): number {
        if (signals.length === 0) return 0;
        return signals.reduce((sum, s) => sum + s.strength, 0) / signals.length;
    }

    private calculateTrend(signals: Signal[]): string {
        if (signals.length < 2) return 'stable';
        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
        const thisWeek = signals.filter(s => new Date(s.timestamp).getTime() > weekAgo);
        const lastWeek = signals.filter(s => {
            const t = new Date(s.timestamp).getTime();
            return t > twoWeeksAgo && t <= weekAgo;
        });
        const thisWeekAvg = this.averageStrength(thisWeek);
        const lastWeekAvg = this.averageStrength(lastWeek);
        const diff = thisWeekAvg - lastWeekAvg;
        if (diff > 0.1) return 'up';
        if (diff < -0.1) return 'down';
        return 'stable';
    }

    // FIXED: use crypto.randomUUID()
    private generateId(): string {
        return 'sig_' + randomUUID().replace(/-/g, '').substring(0, 12);
    }
}
