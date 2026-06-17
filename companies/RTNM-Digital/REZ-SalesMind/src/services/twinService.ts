/**
 * Twin Service - AI-powered prospect twins for sales intelligence
 */
export class TwinService {
    hojaiClient: {
        getProspectTwin: (id: string) => Promise<unknown | null>;
    };
    rezCRMClient: {
        getLead: (id: string) => Promise<{ data: unknown; error: string | null }>;
    };

    constructor(
        hojaiClient: TwinService['hojaiClient'],
        rezCRMClient: TwinService['rezCRMClient']
    ) {
        this.hojaiClient = hojaiClient;
        this.rezCRMClient = rezCRMClient;
    }

    async createTwin(leadId: string) {
        const leadResult = await this.rezCRMClient.getLead(leadId);
        const lead = leadResult.data as Record<string, unknown> | null;
        if (!lead) return null;

        const twinData = await this.hojaiClient.getProspectTwin(leadId) as Record<string, unknown> | null;

        return {
            id: leadId,
            name: (lead.name || 'Unknown') as string,
            company: (lead.company as string) || 'Unknown',
            title: (lead.title as string) || '',
            personality: this.inferPersonality(lead),
            preferences: (twinData?.preferences) || this.defaultPreferences(),
            history: (twinData?.history) || this.emptyHistory(),
            insights: (twinData?.insights) || this.defaultInsights(),
            score: (lead.score || 50) as number,
            lastUpdated: new Date()
        };
    }

    async getTwin(leadId: string) {
        return this.createTwin(leadId);
    }

    async updateTwin(leadId: string, interaction: Record<string, unknown>) {
        const twin = await this.getTwin(leadId) as Record<string, unknown> | null;
        if (!twin) return null;

        const history = twin.history as { totalCalls: number; totalEmails: number; meetings: number; conversionRate: number };
        const pers = twin.personality as { responseTime: string };

        history.totalCalls += interaction.type === 'call' ? 1 : 0;
        history.totalEmails += interaction.type === 'email' ? 1 : 0;
        history.meetings += interaction.type === 'meeting' ? 1 : 0;
        twin.lastUpdated = new Date();
        this.updatePersonality(twin, interaction);
        return twin;
    }

    async getTalkingPoints(leadId: string): Promise<string[]> {
        const twin = await this.getTwin(leadId) as Record<string, unknown> | null;
        if (!twin) return [];
        const points: string[] = [];

        const prefs = twin.preferences as { topics: string[] };
        const insights = twin.insights as { buyingSignals: string[] };
        const history = twin.history as { conversionRate: number };

        (prefs.topics || []).forEach((topic: unknown) => {
            points.push('Ask about ' + topic);
        });

        if ((insights.buyingSignals?.length || 0) > 0) {
            points.push('Mention: ' + insights.buyingSignals[0]);
        }

        if ((history.conversionRate || 0) > 0.5) {
            points.push('Emphasize value proposition - previous positive experience');
        } else {
            points.push('Focus on education and trust building');
        }
        return points;
    }

    async predictNextAction(leadId: string) {
        const twin = await this.getTwin(leadId) as Record<string, unknown> | null;
        if (!twin) {
            return { action: 'Initial outreach', reason: 'No data available', confidence: 0.3 };
        }

        const history = twin.history as { totalCalls: number; totalEmails: number; conversionRate: number };
        const pers = twin.personality as { responseTime: string };
        const score = twin.score as number;

        if ((history.totalCalls || 0) === 0 && (history.totalEmails || 0) === 0) {
            return { action: 'Send introduction email', reason: 'No previous contact - start with low-friction channel', confidence: 0.8 };
        }
        if ((history.totalCalls || 0) < 3 && (pers.responseTime || 'medium') === 'slow') {
            return { action: 'Schedule a call', reason: 'Prefers thoughtful communication - give time to respond', confidence: 0.7 };
        }
        if ((score || 0) > 70 && (history.conversionRate || 0) > 0.3) {
            return { action: 'Request meeting', reason: 'High-quality prospect with positive history', confidence: 0.9 };
        }
        return { action: 'Follow-up email', reason: 'Maintain engagement while gathering more data', confidence: 0.6 };
    }

    private inferPersonality(lead: Record<string, unknown>) {
        const title = ((lead.title as string) || '').toLowerCase();
        if (title.includes('ceo') || title.includes('founder')) {
            return { communicationStyle: 'direct', preferredChannel: 'phone', responseTime: 'fast', decisionStyle: 'intuitive' };
        }
        if (title.includes('manager') || title.includes('director')) {
            return { communicationStyle: 'formal', preferredChannel: 'email', responseTime: 'medium', decisionStyle: 'analytical' };
        }
        return { communicationStyle: 'collaborative', preferredChannel: 'email', responseTime: 'medium', decisionStyle: 'analytical' };
    }

    private defaultPreferences() {
        return { topics: ['industry trends', 'efficiency', 'cost savings'], avoid: ['aggressive selling', 'technical jargon'], triggers: ['ROI', 'results', 'proven track record'] };
    }

    private emptyHistory() {
        return { totalCalls: 0, totalEmails: 0, meetings: 0, avgDealSize: 0, conversionRate: 0 };
    }

    private defaultInsights() {
        return { bestTimeToContact: '9 AM - 11 AM', buyingSignals: [], objections: ['budget', 'timing', 'priority'], competitivePosition: 'Unknown' };
    }

    private updatePersonality(twin: Record<string, unknown>, interaction: Record<string, unknown>) {
        const pers = twin.personality as { responseTime: string };
        if (interaction.outcome === 'positive' && (pers.responseTime || '') === 'slow') {
            pers.responseTime = 'medium';
        }
        if ((interaction.responseTime as number) && (interaction.responseTime as number) < 2) {
            pers.responseTime = 'fast';
        }
    }
}
