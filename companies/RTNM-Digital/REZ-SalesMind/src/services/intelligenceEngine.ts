/**
 * Intelligence Engine - Combines HOJAI AI, AdBazaar, and REZ CRM Hub
 *
 * Purpose: Generate unified sales intelligence from multiple data sources
 */
export class IntelligenceEngine {
    hojaiClient: {
        getMarketSignals: (query: string) => Promise<{ signals: unknown[]; isMock: boolean }>;
        scoreLead: (data: unknown) => Promise<{ score: number; factors: string[] }>;
        getBusinessIntelligence: (name: string) => Promise<unknown>;
    };
    adbazaarClient: {
        getCampaigns: (clientId: string) => Promise<unknown[]>;
        getContacts: (clientId: string) => Promise<unknown[]>;
    };
    rezCRMClient: {
        getLead: (id: string) => Promise<{ data: unknown; error: string | null }>;
        getActivities: (id: string) => Promise<{ data: unknown[]; error: string | null }>;
        getLeads: (filters?: Record<string, string>) => Promise<{ data: unknown[]; error: string | null }>;
        getDeals: (filters?: Record<string, string>) => Promise<{ data: unknown[]; error: string | null }>;
        getPipelineSummary: () => Promise<{ data: unknown; error: string | null }>;
        createLead: (leadData: Record<string, unknown>) => Promise<{ data: unknown; error: string | null }>;
        updateLeadStage: (leadId: string, stage: string) => Promise<{ success: boolean; error: string | null }>;
    };

    constructor(
        hojaiClient: IntelligenceEngine['hojaiClient'],
        adbazaarClient: IntelligenceEngine['adbazaarClient'],
        rezCRMClient: IntelligenceEngine['rezCRMClient']
    ) {
        this.hojaiClient = hojaiClient;
        this.adbazaarClient = adbazaarClient;
        this.rezCRMClient = rezCRMClient;
    }

    getCRMClient() {
        return this.rezCRMClient;
    }

    /**
     * Generate comprehensive sales intelligence for a lead
     * FIXED: null safety on all CRM responses
     */
    async getSalesIntelligence(leadId: string) {
        const [leadResult, activitiesResult, campaigns, contacts] = await Promise.all([
            this.rezCRMClient.getLead(leadId),
            this.rezCRMClient.getActivities(leadId),
            this.adbazaarClient.getCampaigns('default'),
            this.adbazaarClient.getContacts('default'),
        ]);

        const lead = leadResult.data as Record<string, unknown> | null;
        const activities = (activitiesResult.data || []) as unknown[];
        if (!lead) return null;

        const companyIntel = await this.fetchCompanyIntel(lead);
        const { signals: marketSignals, isMock } = await this.hojaiClient.getMarketSignals((lead.company as string) || '');
        const { score: aiScore, factors } = await this.hojaiClient.scoreLead(lead);
        const engagementScore = this.calculateEngagementScore(activities);
        const conversionProbability = this.calculateConversionProbability(lead, aiScore, engagementScore);

        const recommendations = this.generateRecommendations(lead, aiScore, engagementScore, factors);
        const riskFactors = this.identifyRiskFactors(lead, activities);
        const opportunities = this.identifyOpportunities(lead, (marketSignals as unknown[]) as Record<string, unknown>[]);

        return {
            leadId,
            overallScore: aiScore,
            leadData: lead,
            companyIntel: companyIntel || undefined,
            marketSignals,
            isMockMarketData: isMock,
            campaigns,
            crmContacts: contacts,
            recentActivities: (activities as Array<Record<string, unknown>>).slice(0, 5),
            recommendations,
            nextBestAction: recommendations[0] || 'Schedule follow-up call',
            engagementScore,
            conversionProbability,
            riskFactors,
            opportunities,
            timestamp: new Date()
        };
    }

    async getPreCallBrief(leadId: string) {
        const leadResult = await this.rezCRMClient.getLead(leadId);
        const lead = leadResult.data as Record<string, unknown> | null;
        if (!lead) return null;

        const companyIntel = await this.hojaiClient.getBusinessIntelligence((lead.company as string) || '');
        const { signals: marketSignals, isMock } = await this.hojaiClient.getMarketSignals((lead.company as string) || '');
        const activitiesResult = await this.rezCRMClient.getActivities(leadId);
        const activities = (activitiesResult.data || []) as Array<Record<string, unknown>>;

        const recentActivities = activities.slice(0, 3).map(a => ({
            type: a.type,
            date: a.timestamp,
            description: a.description || a.subject
        }));

        const campaigns = await this.adbazaarClient.getCampaigns('default');
        const activeCampaigns = ((campaigns as Array<Record<string, unknown>>) || [])
            .filter(c => c.status === 'active')
            .slice(0, 3)
            .map(c => ({
                name: c.name,
                status: c.status,
                conversions: c.conversions
            }));

        const talkingPoints = this.generateTalkingPoints(lead, companyIntel, (marketSignals as unknown[]) as Record<string, unknown>[]);
        const recommendedApproach = this.recommendApproach(lead);
        const questions = this.generateQuestions(lead, companyIntel);

        return {
            leadId,
            leadName: lead.name,
            company: (lead.company as string) || '',
            title: (lead.title as string) || '',
            score: lead.score,
            stage: lead.stage,
            companyIntel: {
                industry: (companyIntel as Record<string, unknown>)?.industry || 'Unknown',
                size: (companyIntel as Record<string, unknown>)?.size || 'Unknown',
                techStack: ((companyIntel as Record<string, unknown>)?.techStack as string[]) || [],
                funding: (companyIntel as Record<string, unknown>)?.funding
            },
            recentActivities,
            activeCampaigns,
            marketContext: {
                signals: (marketSignals as Array<Record<string, unknown>>).slice(0, 5),
                trends: (marketSignals as Array<Record<string, unknown>>).filter(s => s.type === 'trend').map(s => s.content)
            },
            talkingPoints,
            recommendedApproach,
            questions,
            isMockMarketData: isMock
        };
    }

    async getPipelineIntelligence() {
        const [leadsResult, dealsResult, pipelineResult] = await Promise.all([
            this.rezCRMClient.getLeads(),
            this.rezCRMClient.getDeals(),
            this.rezCRMClient.getPipelineSummary()
        ]);

        const leads = (leadsResult.data || []) as Array<Record<string, unknown>>;
        const deals = (dealsResult.data || []) as Array<Record<string, unknown>>;
        const pipeline = pipelineResult.data as Record<string, unknown> | null;
        const stageAnalysis = this.analyzeStages(leads, deals);
        const marketInsights = (await this.hojaiClient.getMarketSignals('sales trends')).signals;

        return {
            totalLeads: leads.length,
            totalDeals: deals.length,
            stageAnalysis,
            pipelineValue: pipeline?.totalValue || 0,
            conversionRate: this.calculateConversionRate(leads),
            marketInsights,
            recommendations: this.generatePipelineRecommendations(stageAnalysis)
        };
    }

    private async fetchCompanyIntel(lead: Record<string, unknown>) {
        if (!lead?.company) return null;
        return this.hojaiClient.getBusinessIntelligence(lead.company as string);
    }

    private calculateEngagementScore(activities: unknown[]) {
        if (!activities.length) return 0;
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        let score = 0;
        (activities as Array<Record<string, unknown>>).forEach(a => {
            const timestamp = a.timestamp as number | string | Date;
            const age = now - new Date(timestamp as string).getTime();
            const recency = Math.max(0, 1 - age / thirtyDaysAgo);
            const type = (a.type as string)?.toLowerCase() || '';
            const typeWeight = type === 'call' ? 3 : type === 'meeting' ? 4 : type === 'email' ? 2 : 1;
            score += recency * typeWeight;
        });
        return Math.min(100, Math.round(score));
    }

    private calculateConversionProbability(lead: Record<string, unknown>, aiScore: number, engagementScore: number) {
        const stageWeights: Record<string, number> = {
            new: 0.1, contacted: 0.2, qualified: 0.4, proposal: 0.6, negotiation: 0.8, closed: 1.0
        };
        const stageWeight = stageWeights[(lead.stage as string) || 'new'] || 0.2;
        const scoreFactor = aiScore / 100;
        const engagementFactor = engagementScore / 100;
        return Math.round((stageWeight * 0.4 + scoreFactor * 0.3 + engagementFactor * 0.3) * 100);
    }

    private generateRecommendations(lead: Record<string, unknown>, aiScore: number, engagementScore: number, factors: string[]) {
        const recommendations: string[] = [];
        if (engagementScore < 30) recommendations.push('Increase engagement - send personalized email');
        if (aiScore > 70) recommendations.push('High-value lead - prioritize with direct call');
        if (lead.stage === 'new') recommendations.push('Move to contacted stage - initial outreach required');
        if (factors.length > 0) recommendations.push('Leverage: ' + factors.slice(0, 2).join(', '));
        if (!lead.phone && lead.email) recommendations.push('Obtain phone number for better conversion');
        return recommendations;
    }

    private identifyRiskFactors(lead: Record<string, unknown>, activities: unknown[]) {
        const risks: string[] = [];
        if (!activities.length) {
            risks.push('No recent activity - lead may be cold');
        }
        const lastActivity = (activities as Array<Record<string, unknown>>)[0];
        if (lastActivity?.timestamp) {
            const daysSince = (Date.now() - new Date(lastActivity.timestamp as string).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince > 14) risks.push('No contact in ' + Math.round(daysSince) + ' days');
        }
        if ((lead.score as number) < 30) risks.push('Low lead score - may not convert');
        return risks;
    }

    private identifyOpportunities(lead: Record<string, unknown>, signals: Array<Record<string, unknown>>) {
        const opportunities: string[] = [];
        const positiveSignals = signals.filter(s => s.sentiment === 'positive');
        if (positiveSignals.length > 0) opportunities.push('Positive market signals - good timing for outreach');
        if (lead.company) {
            const expansionSignals = signals.filter(s => {
                const content = ((s.content as string) || '').toLowerCase();
                return content.includes('expansion') || content.includes('growth') || content.includes('funding');
            });
            if (expansionSignals.length > 0) opportunities.push('Company in growth phase - potential for upsell');
        }
        return opportunities;
    }

    private generateTalkingPoints(lead: Record<string, unknown>, intel: unknown, signals: Array<Record<string, unknown>>) {
        const points: string[] = [];
        if (lead.company) points.push(lead.company + ' - recent developments and news');
        if ((intel as Record<string, unknown>)?.industry) points.push('Industry trends in ' + (intel as Record<string, unknown>).industry);
        const relevantSignals = signals.filter(s => (s.relevance as number) > 0.7);
        relevantSignals.forEach(s => points.push(s.content as string));
        if ((intel as Record<string, unknown>)?.techStack && Array.isArray((intel as Record<string, unknown>).techStack)) {
            points.push('Technical setup: ' + ((intel as Record<string, unknown>).techStack as string[]).slice(0, 3).join(', '));
        }
        return points.slice(0, 5);
    }

    private recommendApproach(lead: Record<string, unknown>) {
        if ((lead.score as number) > 80) return 'High-priority - direct call with executive sponsor';
        if ((lead.score as number) > 60) return 'Medium-priority - personalized email followed by call';
        return 'Low-priority - automated nurture sequence';
    }

    private generateQuestions(lead: Record<string, unknown>, intel: unknown) {
        const questions: string[] = [];
        const industry = (intel as Record<string, unknown>)?.industry || 'your business';
        questions.push('What are your current priorities for ' + industry + '?');
        if ((intel as Record<string, unknown>)?.size === 'enterprise') {
            questions.push('What is your decision-making process for new solutions?');
        } else {
            questions.push('What challenges are you facing right now?');
        }
        questions.push('What would success look like for you?');
        return questions;
    }

    private analyzeStages(leads: Array<Record<string, unknown>>, deals: Array<Record<string, unknown>>) {
        const stageMap = new Map<string, { count: number; value: number }>();
        leads.forEach(l => {
            const stage = (l.stage as string) || 'unknown';
            const current = stageMap.get(stage) || { count: 0, value: 0 };
            stageMap.set(stage, { count: current.count + 1, value: current.value });
        });
        deals.forEach(d => {
            const stage = (d.stage as string) || 'unknown';
            const current = stageMap.get(stage) || { count: 0, value: 0 };
            stageMap.set(stage, { count: current.count + 1, value: current.value + ((d.value as number) || 0) });
        });
        return Object.fromEntries(stageMap);
    }

    private calculateConversionRate(leads: Array<Record<string, unknown>>) {
        const converted = leads.filter(l => l.stage === 'closed').length;
        return leads.length > 0 ? Math.round((converted / leads.length) * 100) : 0;
    }

    private generatePipelineRecommendations(analysis: Record<string, { count: number }>) {
        const recommendations: string[] = [];
        if (analysis.new?.count > 50) recommendations.push('High volume of new leads - consider qualification campaign');
        if (analysis.qualified?.count < 5) recommendations.push('Low qualification rate - review lead scoring criteria');
        return recommendations;
    }
}
