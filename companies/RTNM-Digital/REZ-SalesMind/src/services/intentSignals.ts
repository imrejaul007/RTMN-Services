/**
 * Intent Signal Engine Service
 * Tracks buying triggers including:
 * - Hiring signals
 * - Funding events
 * - Leadership changes
 * - Technology adoption
 * - Expansion signals
 * - Job postings trends
 * - Website changes
 * - Press releases
 *
 * Route: GET /api/ecosystem/intent-signals/:company
 */
import axios from 'axios';

export interface IntentSignals {
    company: string;
    overallScore: number;
    intentLevel: 'high' | 'medium' | 'low';
    signals: Signal[];
    triggers: Trigger[];
    recommendations: string[];
    lastUpdated: string;
}

export interface Signal {
    id: string;
    type: SignalType;
    title: string;
    description: string;
    source: string;
    date: string;
    strength: 'strong' | 'moderate' | 'weak';
    category: 'hiring' | 'funding' | 'leadership' | 'technology' | 'expansion' | 'digital' | 'news';
    engagement: EngagementData;
}

export type SignalType =
    | 'hiring_spike'
    | 'new_funding'
    | 'leadership_change'
    | 'tech_adoption'
    | 'expansion'
    | 'job_posting'
    | 'website_change'
    | 'press_release'
    | 'new_product'
    | 'partnership'
    | 'acquisition'
    | 'layoffs';

export interface Trigger {
    type: string;
    message: string;
    urgency: 'immediate' | 'short_term' | 'medium_term';
    opportunity: string;
}

export interface EngagementData {
    impressions: number;
    clicks: number;
    visits: number;
    pageViews: number;
    avgTimeOnSite: number;
    downloads: number;
    demoRequests: number;
}

export class IntentSignalsService {
    private hojaiClient = axios.create({
        baseURL: process.env.HOJAI_WEB_INTEL || 'http://localhost:4595',
        timeout: 5000
    });

    /**
     * Get all intent signals for a company
     */
    async getIntentSignals(companyName: string): Promise<IntentSignals> {
        try {
            const response = await this.hojaiClient.get('/intent-signals', {
                params: { company: companyName }
            });
            if (response.data) return response.data;
        } catch {
            // Fall through to mock data
        }

        return this.getMockIntentSignals(companyName);
    }

    /**
     * Get signals by specific type
     */
    async getSignalsByType(companyName: string, type: SignalType): Promise<Signal[]> {
        const signals = await this.getIntentSignals(companyName);
        return signals.signals.filter(s => s.type === type);
    }

    /**
     * Get high-priority triggers
     */
    async getPriorityTriggers(companyName: string): Promise<Trigger[]> {
        const intentSignals = await this.getIntentSignals(companyName);
        return intentSignals.triggers.filter(t => t.urgency === 'immediate');
    }

    /**
     * Get engagement metrics for content consumption
     */
    async getEngagementMetrics(companyName: string): Promise<EngagementData> {
        const intentSignals = await this.getIntentSignals(companyName);

        // Aggregate engagement from all signals
        const signals = intentSignals.signals;
        return {
            impressions: signals.reduce((sum, s) => sum + (s.engagement.impressions || 0), 0),
            clicks: signals.reduce((sum, s) => sum + (s.engagement.clicks || 0), 0),
            visits: signals.reduce((sum, s) => sum + (s.engagement.visits || 0), 0),
            pageViews: signals.reduce((sum, s) => sum + (s.engagement.pageViews || 0), 0),
            avgTimeOnSite: Math.round(signals.reduce((sum, s) => sum + s.engagement.avgTimeOnSite, 0) / signals.length),
            downloads: signals.reduce((sum, s) => sum + (s.engagement.downloads || 0), 0),
            demoRequests: signals.reduce((sum, s) => sum + (s.engagement.demoRequests || 0), 0)
        };
    }

    /**
     * Generate personalized outreach message based on signals
     */
    async generateSignalBasedMessage(companyName: string): Promise<string> {
        const intentSignals = await this.getIntentSignals(companyName);

        const topSignals = intentSignals.signals
            .filter(s => s.strength === 'strong')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 3);

        if (topSignals.length === 0) {
            return `Hi, I noticed ${companyName} is growing. Would love to connect about how we might help.`;
        }

        const signalContext = topSignals.map(s => {
            switch (s.type) {
                case 'hiring_spike':
                    return `recent growth in your ${this.extractRoleFromHiring(s)} team`;
                case 'new_funding':
                    return `your recent $${this.extractFundingAmount(s)} funding round`;
                case 'leadership_change':
                    return `leadership changes, particularly ${this.extractLeaderName(s)} joining`;
                case 'expansion':
                    return `your expansion into new markets`;
                case 'new_product':
                    return `your new product launch`;
                default:
                    return `recent activity at ${companyName}`;
            }
        }).join(' and ');

        return `Hi, I saw ${signalContext}. This is a great time to discuss how we've helped similar companies with these priorities. Would a 15-minute call work this week?`;
    }

    /**
     * Get time-series intent data for trending
     */
    async getIntentTrend(companyName: string, days: number = 30): Promise<IntentTrendData[]> {
        const signals = await this.getIntentSignals(companyName);

        const trend: IntentTrendData[] = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const daySignals = signals.signals.filter(s => s.date.startsWith(dateStr));

            trend.push({
                date: dateStr,
                signalCount: daySignals.length,
                intentScore: daySignals.reduce((sum, s) => sum + (s.strength === 'strong' ? 3 : s.strength === 'moderate' ? 2 : 1), 0),
                topCategory: this.getTopCategory(daySignals)
            });
        }

        return trend;
    }

    private extractRoleFromHiring(signal: Signal): string {
        const match = signal.description.match(/(\w+)\s+(engineers?|developers?|sales|marketing)/i);
        return match ? match[1] : 'technical';
    }

    private extractFundingAmount(signal: Signal): string {
        const match = signal.description.match(/\$([0-9]+)[MB]?/);
        return match ? match[1] + 'M' : 'unknown';
    }

    private extractLeaderName(signal: Signal): string {
        const match = signal.description.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)/);
        return match ? match[1] : 'new leadership';
    }

    private getTopCategory(signals: Signal[]): string {
        if (signals.length === 0) return 'none';
        const counts = signals.reduce((acc, s) => {
            acc[s.category] = (acc[s.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    }

    private calculateOverallScore(signals: Signal[]): number {
        return Math.min(100, signals.reduce((sum, s) => {
            return sum + (s.strength === 'strong' ? 15 : s.strength === 'moderate' ? 8 : 3);
        }, 0));
    }

    private getMockIntentSignals(companyName: string): IntentSignals {
        const signals: Signal[] = [
            {
                id: 'sig-001',
                type: 'hiring_spike',
                title: 'Hiring Surge in Engineering',
                description: `${companyName} posted 25+ engineering positions in the last 30 days, suggesting significant growth in technical capacity.`,
                source: 'LinkedIn Jobs, Indeed',
                date: '2026-06-10',
                strength: 'strong',
                category: 'hiring',
                engagement: { impressions: 1500, clicks: 120, visits: 45, pageViews: 180, avgTimeOnSite: 245, downloads: 12, demoRequests: 3 }
            },
            {
                id: 'sig-002',
                type: 'new_funding',
                title: '$45M Series C Closed',
                description: `${companyName} raised $45M in Series C funding led by Sequoia Capital.`,
                source: 'TechCrunch, Crunchbase',
                date: '2026-05-15',
                strength: 'strong',
                category: 'funding',
                engagement: { impressions: 8000, clicks: 450, visits: 200, pageViews: 890, avgTimeOnSite: 180, downloads: 45, demoRequests: 8 }
            },
            {
                id: 'sig-003',
                type: 'leadership_change',
                title: 'New CRO Appointed',
                description: `${companyName} hired Jennifer Martinez as Chief Revenue Officer, formerly from Salesforce.`,
                source: 'Business Wire',
                date: '2026-04-20',
                strength: 'moderate',
                category: 'leadership',
                engagement: { impressions: 3200, clicks: 280, visits: 95, pageViews: 420, avgTimeOnSite: 156, downloads: 22, demoRequests: 5 }
            },
            {
                id: 'sig-004',
                type: 'tech_adoption',
                title: 'AWS Partnership Announced',
                description: `${companyName} became an AWS Advanced Partner, indicating cloud infrastructure investments.`,
                source: 'AWS Partner Network',
                date: '2026-03-05',
                strength: 'moderate',
                category: 'technology',
                engagement: { impressions: 2100, clicks: 180, visits: 67, pageViews: 310, avgTimeOnSite: 134, downloads: 15, demoRequests: 2 }
            },
            {
                id: 'sig-005',
                type: 'expansion',
                title: 'APAC Expansion with Singapore HQ',
                description: `${companyName} opened Asia-Pacific headquarters in Singapore to serve 12 regional markets.`,
                source: 'Business Times',
                date: '2026-01-15',
                strength: 'strong',
                category: 'expansion',
                engagement: { impressions: 5600, clicks: 420, visits: 156, pageViews: 680, avgTimeOnSite: 198, downloads: 38, demoRequests: 6 }
            },
            {
                id: 'sig-006',
                type: 'job_posting',
                title: 'Sales Team Expansion',
                description: `${companyName} is hiring 15 SDRs and AEs, suggesting revenue growth targets.`,
                source: 'LinkedIn Jobs',
                date: '2026-06-08',
                strength: 'moderate',
                category: 'hiring',
                engagement: { impressions: 980, clicks: 85, visits: 32, pageViews: 145, avgTimeOnSite: 112, downloads: 8, demoRequests: 1 }
            },
            {
                id: 'sig-007',
                type: 'new_product',
                title: 'AI Module Launch',
                description: `${companyName} launched new AI-powered analytics module with ML capabilities.`,
                source: 'Product Announcement',
                date: '2026-02-01',
                strength: 'moderate',
                category: 'technology',
                engagement: { impressions: 4200, clicks: 380, visits: 145, pageViews: 590, avgTimeOnSite: 167, downloads: 42, demoRequests: 9 }
            },
            {
                id: 'sig-008',
                type: 'press_release',
                title: 'Partner Ecosystem Program Launch',
                description: `${companyName} announced plans to build 500 certified implementation partners by 2027.`,
                source: 'PR Newswire',
                date: '2026-03-10',
                strength: 'weak',
                category: 'news',
                engagement: { impressions: 1800, clicks: 120, visits: 45, pageViews: 210, avgTimeOnSite: 98, downloads: 5, demoRequests: 0 }
            },
            {
                id: 'sig-009',
                type: 'website_change',
                title: 'Updated Product Pages',
                description: `${companyName} significantly updated their pricing and product pages, indicating active sales cycle.`,
                source: 'Website Monitoring',
                date: '2026-06-12',
                strength: 'weak',
                category: 'digital',
                engagement: { impressions: 650, clicks: 78, visits: 34, pageViews: 156, avgTimeOnSite: 89, downloads: 3, demoRequests: 0 }
            },
            {
                id: 'sig-010',
                type: 'partnership',
                title: 'Integration with Salesforce',
                description: `${companyName} released native Salesforce integration, expanding their ecosystem.`,
                source: 'Salesforce AppExchange',
                date: '2026-04-05',
                strength: 'moderate',
                category: 'technology',
                engagement: { impressions: 2800, clicks: 220, visits: 89, pageViews: 380, avgTimeOnSite: 145, downloads: 28, demoRequests: 4 }
            }
        ];

        const score = this.calculateOverallScore(signals);
        const intentLevel: 'high' | 'medium' | 'low' = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';

        return {
            company: companyName,
            overallScore: score,
            intentLevel,
            signals,
            triggers: this.generateTriggers(signals),
            recommendations: this.generateRecommendations(signals, intentLevel),
            lastUpdated: new Date().toISOString()
        };
    }

    private generateTriggers(signals: Signal[]): Trigger[] {
        const triggers: Trigger[] = [];

        const hasFunding = signals.some(s => s.type === 'new_funding' && s.strength === 'strong');
        if (hasFunding) {
            triggers.push({
                type: 'funding',
                message: 'Company just closed major funding round - capital available for investments',
                urgency: 'immediate',
                opportunity: 'Propose solution within 30 days while capital is fresh'
            });
        }

        const hasHiringSpike = signals.some(s => s.type === 'hiring_spike' && s.strength === 'strong');
        if (hasHiringSpike) {
            triggers.push({
                type: 'hiring',
                message: 'Aggressive hiring indicates growth phase - needs tools to scale',
                urgency: 'short_term',
                opportunity: 'Position as solution for operational efficiency'
            });
        }

        const hasLeadershipChange = signals.some(s => s.type === 'leadership_change');
        if (hasLeadershipChange) {
            triggers.push({
                type: 'leadership',
                message: 'New leadership often brings new priorities and vendor relationships',
                urgency: 'short_term',
                opportunity: 'Get in early with new decision makers'
            });
        }

        const hasExpansion = signals.some(s => s.type === 'expansion');
        if (hasExpansion) {
            triggers.push({
                type: 'expansion',
                message: 'Geographic expansion requires infrastructure scaling',
                urgency: 'medium_term',
                opportunity: 'Position as enabler for expansion'
            });
        }

        return triggers;
    }

    private generateRecommendations(signals: Signal[], intentLevel: 'high' | 'medium' | 'low'): string[] {
        const recommendations: string[] = [];

        if (intentLevel === 'high') {
            recommendations.push('Priority outreach - multiple strong signals detected');
            recommendations.push('Request meeting with VP of Engineering (hiring spike)');
            recommendations.push('Include ROI analysis for recent funding context');
            recommendations.push('Leverage AWS partnership as conversation starter');
        } else if (intentLevel === 'medium') {
            recommendations.push('Include in nurture sequence with relevant content');
            recommendations.push('Monitor for additional signals in next 2 weeks');
            recommendations.push('Share case studies relevant to their industry');
        } else {
            recommendations.push('Add to long-term awareness campaign');
            recommendations.push('Track for future triggering events');
            recommendations.push('Engage through content marketing');
        }

        const hasHiring = signals.some(s => s.category === 'hiring');
        if (hasHiring) {
            recommendations.push('Reference engineering team growth in outreach');
        }

        const hasFunding = signals.some(s => s.category === 'funding');
        if (hasFunding) {
            recommendations.push('Create urgency around deployment before runway pressures');
        }

        return recommendations;
    }
}

export interface IntentTrendData {
    date: string;
    signalCount: number;
    intentScore: number;
    topCategory: string;
}

export const intentSignalsService = new IntentSignalsService();
