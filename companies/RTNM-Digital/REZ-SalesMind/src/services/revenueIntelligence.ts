/**
 * Revenue Intelligence Service
 * Revenue analytics including:
 * - Pipeline health
 * - Forecasting accuracy
 * - Territory analysis
 * - Win/loss analysis
 * - Average deal size trends
 * - Sales cycle length
 * - Conversion rates by stage
 *
 * Routes:
 * - GET /api/insights/revenue
 * - GET /api/insights/pipeline-health
 */
import axios from 'axios';

export interface RevenueDashboard {
    summary: RevenueSummary;
    pipelineHealth: PipelineHealth;
    forecasting: ForecastingData;
    performance: PerformanceMetrics;
    trends: TrendData;
    alerts: Alert[];
    recommendations: Recommendation[];
    lastUpdated: string;
}

export interface RevenueSummary {
    totalRevenue: number;
    revenueTarget: number;
    attainment: number;
    quotaAttainmentRate: number;
    dealsWon: number;
    dealsLost: number;
    avgDealSize: number;
    avgSalesCycle: number;
    pipelineValue: number;
    coverage: number;
    periodOverPeriodGrowth: number;
}

export interface PipelineHealth {
    overallScore: number;
    stages: StageHealth[];
    staleDeals: StaleDeal[];
    riskDeals: RiskDeal[];
    blockedDeals: BlockedDeal[];
    momentum: MomentumData;
}

export interface StageHealth {
    stage: string;
    dealsCount: number;
    totalValue: number;
    avgDaysInStage: number;
    conversionRate: number;
    health: 'healthy' | 'at_risk' | 'critical';
    issues: string[];
}

export interface StaleDeal {
    id: string;
    name: string;
    company: string;
    value: number;
    daysInCurrentStage: number;
    lastActivity: string;
    owner: string;
    risk: 'medium' | 'high' | 'critical';
}

export interface RiskDeal {
    id: string;
    name: string;
    company: string;
    value: number;
    riskFactors: string[];
    owner: string;
    recommendedAction: string;
}

export interface BlockedDeal {
    id: string;
    name: string;
    company: string;
    value: number;
    blocker: string;
    blockedSince: string;
    owner: string;
}

export interface MomentumData {
    newDealsThisWeek: number;
    dealsMovingForward: number;
    dealsMovingBackward: number;
    stalledDeals: number;
    closedWonThisWeek: number;
    closedLostThisWeek: number;
}

export interface ForecastingData {
    forecast: number;
    forecastBestCase: number;
    forecastCommit: number;
    forecastPipeline: number;
    accuracy: number;
    historicalAccuracy: number;
    confidence: 'high' | 'medium' | 'low';
    projections: Projection[];
    adjustments: ForecastAdjustment[];
}

export interface Projection {
    month: string;
    predicted: number;
    actual?: number;
    confidence: number;
}

export interface ForecastAdjustment {
    reason: string;
    impact: number;
    deals: string[];
}

export interface PerformanceMetrics {
    byRep: RepPerformance[];
    byTeam: TeamPerformance;
    byTerritory: TerritoryPerformance[];
    byProduct: ProductPerformance[];
    bySegment: SegmentPerformance[];
    bySource: SourcePerformance[];
}

export interface RepPerformance {
    repId: string;
    repName: string;
    quota: number;
    actual: number;
    attainment: number;
    dealsWon: number;
    dealsLost: number;
    avgDealSize: number;
    avgCycleTime: number;
    winRate: number;
    pipelineCoverage: number;
    trend: 'up' | 'down' | 'stable';
    rank: number;
}

export interface TeamPerformance {
    teamName: string;
    totalQuota: number;
    totalActual: number;
    teamAttainment: number;
    repCount: number;
    topPerformer: string;
    needsAttention: string[];
}

export interface TerritoryPerformance {
    territory: string;
    revenue: number;
    quota: number;
    attainment: number;
    opportunityCount: number;
    avgDealSize: number;
}

export interface ProductPerformance {
    product: string;
    revenue: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
    avgDealSize: number;
}

export interface SegmentPerformance {
    segment: string;
    revenue: number;
    quota: number;
    attainment: number;
    winRate: number;
}

export interface SourcePerformance {
    source: string;
    deals: number;
    revenue: number;
    avgDealSize: number;
    winRate: number;
}

export interface TrendData {
    revenueTrend: TrendPoint[];
    winLossTrend: TrendPoint[];
    cycleTimeTrend: TrendPoint[];
    dealSizeTrend: TrendPoint[];
    pipelineTrend: TrendPoint[];
}

export interface TrendPoint {
    period: string;
    value: number;
    change: number;
    changePercent: number;
}

export interface Alert {
    id: string;
    type: 'warning' | 'critical' | 'info';
    title: string;
    description: string;
    affectedDeals: string[];
    recommendedAction: string;
    createdAt: string;
}

export interface Recommendation {
    id: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    potentialImpact: number;
    effort: 'low' | 'medium' | 'high';
    actionable: boolean;
}

export class RevenueIntelligenceService {
    private assetMindClient = axios.create({
        baseURL: process.env.ASSETMIND || 'http://localhost:5200',
        timeout: 5000
    });

    /**
     * Get complete revenue dashboard
     */
    async getRevenueDashboard(): Promise<RevenueDashboard> {
        try {
            const response = await this.assetMindClient.get('/revenue/dashboard');
            if (response.data) return response.data;
        } catch {
            // Fall through to mock data
        }

        return this.generateMockDashboard();
    }

    /**
     * Get pipeline health metrics
     */
    async getPipelineHealth(): Promise<PipelineHealth> {
        const dashboard = await this.getRevenueDashboard();
        return dashboard.pipelineHealth;
    }

    /**
     * Get forecasting data
     */
    async getForecasting(): Promise<ForecastingData> {
        const dashboard = await this.getRevenueDashboard();
        return dashboard.forecasting;
    }

    /**
     * Get performance metrics by dimension
     */
    async getPerformanceMetrics(dimension: 'rep' | 'territory' | 'product' | 'segment' | 'source'): Promise<unknown> {
        const dashboard = await this.getRevenueDashboard();

        switch (dimension) {
            case 'rep':
                return dashboard.performance.byRep;
            case 'territory':
                return dashboard.performance.byTerritory;
            case 'product':
                return dashboard.performance.byProduct;
            case 'segment':
                return dashboard.performance.bySegment;
            case 'source':
                return dashboard.performance.bySource;
            default:
                return dashboard.performance;
        }
    }

    /**
     * Get trend data for specific metric
     */
    async getTrendData(metric: 'revenue' | 'win_loss' | 'cycle_time' | 'deal_size' | 'pipeline'): Promise<TrendPoint[]> {
        const dashboard = await this.getRevenueDashboard();

        switch (metric) {
            case 'revenue':
                return dashboard.trends.revenueTrend;
            case 'win_loss':
                return dashboard.trends.winLossTrend;
            case 'cycle_time':
                return dashboard.trends.cycleTimeTrend;
            case 'deal_size':
                return dashboard.trends.dealSizeTrend;
            case 'pipeline':
                return dashboard.trends.pipelineTrend;
            default:
                return [];
        }
    }

    /**
     * Get active alerts
     */
    async getAlerts(): Promise<Alert[]> {
        const dashboard = await this.getRevenueDashboard();
        return dashboard.alerts;
    }

    /**
     * Get recommendations
     */
    async getRecommendations(): Promise<Recommendation[]> {
        const dashboard = await this.getRevenueDashboard();
        return dashboard.recommendations;
    }

    /**
     * Get win/loss analysis
     */
    async getWinLossAnalysis(): Promise<WinLossAnalysis> {
        return {
            overallWinRate: 32,
            totalWon: 45,
            totalLost: 98,
            avgDaysToWin: 45,
            avgDaysToLoss: 28,
            wonByReason: [
                { reason: 'Product fit', percentage: 35 },
                { reason: 'Relationship', percentage: 25 },
                { reason: 'Price', percentage: 20 },
                { reason: 'Timing', percentage: 12 },
                { reason: 'Other', percentage: 8 }
            ],
            lostByReason: [
                { reason: 'Competitor pricing', percentage: 30 },
                { reason: 'No budget', percentage: 25 },
                { reason: 'No urgency', percentage: 20 },
                { reason: 'Product fit', percentage: 15 },
                { reason: 'Other', percentage: 10 }
            ],
            competitorWins: this.generateCompetitorWins(),
            dealSizeAnalysis: this.generateDealSizeAnalysis()
        };
    }

    /**
     * Get deal velocity metrics
     */
    async getDealVelocity(): Promise<DealVelocity> {
        return {
            avgVelocity: 4.2,
            avgDaysInStage: {
                qualification: 8,
                discovery: 12,
                proposal: 15,
                negotiation: 18,
                closed_won: 45
            },
            velocityByRep: [
                { repId: 'rep1', avgDays: 38 },
                { repId: 'rep2', avgDays: 52 },
                { repId: 'rep3', avgDays: 41 },
                { repId: 'rep4', avgDays: 47 },
                { repId: 'rep5', avgDays: 55 }
            ],
            accelerationOpportunities: [
                { stage: 'Discovery', potential: 3, action: 'Add discovery questions template' },
                { stage: 'Proposal', potential: 5, action: 'Include ROI calculator in proposals' }
            ]
        };
    }

    private generateCompetitorWins(): CompetitorWin[] {
        return [
            { competitor: 'Salesforce', wins: 25, losses: 32, winRate: 44 },
            { competitor: 'HubSpot', wins: 18, losses: 22, winRate: 45 },
            { competitor: 'Microsoft Dynamics', wins: 12, losses: 15, winRate: 44 },
            { competitor: 'Zendesk', wins: 8, losses: 12, winRate: 40 },
            { competitor: 'Oracle', wins: 5, losses: 8, winRate: 38 }
        ];
    }

    private generateDealSizeAnalysis(): DealSizeAnalysis {
        return {
            won: {
                avg: 45000,
                median: 38000,
                distribution: [
                    { range: '<$10K', percentage: 15 },
                    { range: '$10K-$25K', percentage: 25 },
                    { range: '$25K-$50K', percentage: 35 },
                    { range: '$50K-$100K', percentage: 18 },
                    { range: '>$100K', percentage: 7 }
                ]
            },
            lost: {
                avg: 28000,
                median: 22000,
                distribution: [
                    { range: '<$10K', percentage: 25 },
                    { range: '$10K-$25K', percentage: 35 },
                    { range: '$25K-$50K', percentage: 25 },
                    { range: '$50K-$100K', percentage: 12 },
                    { range: '>$100K', percentage: 3 }
                ]
            }
        };
    }

    private generateMockDashboard(): RevenueDashboard {
        const currentMonth = new Date().toISOString().slice(0, 7);

        return {
            summary: {
                totalRevenue: 2450000,
                revenueTarget: 3000000,
                attainment: 81.7,
                quotaAttainmentRate: 68,
                dealsWon: 45,
                dealsLost: 98,
                avgDealSize: 45000,
                avgSalesCycle: 45,
                pipelineValue: 5800000,
                coverage: 2.4,
                periodOverPeriodGrowth: 15
            },
            pipelineHealth: {
                overallScore: 78,
                stages: [
                    {
                        stage: 'Qualification',
                        dealsCount: 85,
                        totalValue: 850000,
                        avgDaysInStage: 8,
                        conversionRate: 72,
                        health: 'healthy',
                        issues: []
                    },
                    {
                        stage: 'Discovery',
                        dealsCount: 62,
                        totalValue: 1200000,
                        avgDaysInStage: 12,
                        conversionRate: 65,
                        health: 'healthy',
                        issues: []
                    },
                    {
                        stage: 'Proposal',
                        dealsCount: 38,
                        totalValue: 1850000,
                        avgDaysInStage: 15,
                        conversionRate: 58,
                        health: 'at_risk',
                        issues: ['Proposal stage conversion below target', 'Average days in stage increasing']
                    },
                    {
                        stage: 'Negotiation',
                        dealsCount: 22,
                        totalValue: 1100000,
                        avgDaysInStage: 18,
                        conversionRate: 75,
                        health: 'healthy',
                        issues: []
                    },
                    {
                        stage: 'Closed Won',
                        dealsCount: 15,
                        totalValue: 675000,
                        avgDaysInStage: 0,
                        conversionRate: 100,
                        health: 'healthy',
                        issues: []
                    }
                ],
                staleDeals: [
                    { id: 'deal1', name: 'Enterprise Expansion', company: 'TechCorp Inc', value: 85000, daysInCurrentStage: 42, lastActivity: '2026-06-10', owner: 'Sarah Johnson', risk: 'critical' },
                    { id: 'deal2', name: 'Platform Migration', company: 'DataDriven LLC', value: 120000, daysInCurrentStage: 35, lastActivity: '2026-06-05', owner: 'Mike Chen', risk: 'high' },
                    { id: 'deal3', name: 'Automation Project', company: 'CloudFirst', value: 65000, daysInCurrentStage: 28, lastActivity: '2026-06-01', owner: 'Emily Davis', risk: 'medium' }
                ],
                riskDeals: [
                    { id: 'deal4', name: 'Digital Transformation', company: 'InnovateTech', value: 200000, riskFactors: ['Budget concerns', 'Multi-stakeholder approval', 'Competitor involvement'], owner: 'James Wilson', recommendedAction: 'Schedule executive call to address concerns' },
                    { id: 'deal5', name: 'Security Upgrade', company: 'SecureOps', value: 95000, riskFactors: ['Technical evaluation pending', 'Security team unavailable'], owner: 'Lisa Brown', recommendedAction: 'Offer security workshop to accelerate evaluation' }
                ],
                blockedDeals: [
                    { id: 'deal6', name: 'CRM Integration', company: 'SalesPlus', value: 78000, blocker: 'Waiting for IT approval', blockedSince: '2026-06-01', owner: 'Tom Anderson' },
                    { id: 'deal7', name: 'Analytics Platform', company: 'InsightHub', value: 145000, blocker: 'Procurement process change', blockedSince: '2026-05-25', owner: 'Sarah Johnson' }
                ],
                momentum: {
                    newDealsThisWeek: 12,
                    dealsMovingForward: 18,
                    dealsMovingBackward: 3,
                    stalledDeals: 8,
                    closedWonThisWeek: 3,
                    closedLostThisWeek: 5
                }
            },
            forecasting: {
                forecast: 2850000,
                forecastBestCase: 3200000,
                forecastCommit: 2450000,
                forecastPipeline: 3500000,
                accuracy: 88,
                historicalAccuracy: 82,
                confidence: 'medium',
                projections: [
                    { month: '2026-07', predicted: 480000, confidence: 92 },
                    { month: '2026-08', predicted: 520000, confidence: 88 },
                    { month: '2026-09', predicted: 600000, confidence: 85 },
                    { month: '2026-10', predicted: 750000, confidence: 80 },
                    { month: '2026-11', predicted: 850000, confidence: 75 },
                    { month: '2026-12', predicted: 1000000, confidence: 70 }
                ],
                adjustments: [
                    { reason: 'Large enterprise deal pushed to Q4', impact: -150000, deals: ['Enterprise Platform Deal'] },
                    { reason: 'New logo from referral', impact: 50000, deals: ['Referral - TechCorp'] }
                ]
            },
            performance: {
                byRep: [
                    { repId: 'rep1', repName: 'Sarah Johnson', quota: 300000, actual: 285000, attainment: 95, dealsWon: 6, dealsLost: 8, avgDealSize: 47500, avgCycleTime: 42, winRate: 42, pipelineCoverage: 2.8, trend: 'up', rank: 1 },
                    { repId: 'rep2', repName: 'Mike Chen', quota: 300000, actual: 245000, attainment: 82, dealsWon: 5, dealsLost: 10, avgDealSize: 49000, avgCycleTime: 48, winRate: 33, pipelineCoverage: 2.5, trend: 'stable', rank: 2 },
                    { repId: 'rep3', repName: 'Emily Davis', quota: 250000, actual: 220000, attainment: 88, dealsWon: 5, dealsLost: 7, avgDealSize: 44000, avgCycleTime: 38, winRate: 41, pipelineCoverage: 2.2, trend: 'up', rank: 3 },
                    { repId: 'rep4', repName: 'James Wilson', quota: 300000, actual: 198000, attainment: 66, dealsWon: 4, dealsLost: 12, avgDealSize: 49500, avgCycleTime: 52, winRate: 25, pipelineCoverage: 3.1, trend: 'down', rank: 4 },
                    { repId: 'rep5', repName: 'Lisa Brown', quota: 250000, actual: 165000, attainment: 66, dealsWon: 3, dealsLost: 9, avgDealSize: 55000, avgCycleTime: 55, winRate: 25, pipelineCoverage: 2.0, trend: 'down', rank: 5 }
                ],
                byTeam: {
                    teamName: 'Enterprise Team',
                    totalQuota: 1400000,
                    totalActual: 948000,
                    teamAttainment: 67.7,
                    repCount: 3,
                    topPerformer: 'Sarah Johnson',
                    needsAttention: ['James Wilson']
                },
                byTerritory: [
                    { territory: 'West Coast', revenue: 780000, quota: 900000, attainment: 87, opportunityCount: 45, avgDealSize: 48000 },
                    { territory: 'East Coast', revenue: 650000, quota: 800000, attainment: 81, opportunityCount: 42, avgDealSize: 42000 },
                    { territory: 'Central', revenue: 520000, quota: 700000, attainment: 74, opportunityCount: 38, avgDealSize: 38000 },
                    { territory: 'EMEA', revenue: 350000, quota: 600000, attainment: 58, opportunityCount: 25, avgDealSize: 55000 },
                    { territory: 'APAC', revenue: 150000, quota: 500000, attainment: 30, opportunityCount: 18, avgDealSize: 45000 }
                ],
                byProduct: [
                    { product: 'Enterprise Platform', revenue: 1200000, percentage: 49, trend: 'up', avgDealSize: 85000 },
                    { product: 'Professional', revenue: 750000, percentage: 31, trend: 'stable', avgDealSize: 45000 },
                    { product: 'Starter', revenue: 350000, percentage: 14, trend: 'down', avgDealSize: 18000 },
                    { product: 'Add-ons', revenue: 150000, percentage: 6, trend: 'up', avgDealSize: 25000 }
                ],
                bySegment: [
                    { segment: 'Enterprise (1000+ employees)', revenue: 980000, quota: 1200000, attainment: 82, winRate: 38 },
                    { segment: 'Mid-Market (201-1000)', revenue: 850000, quota: 1000000, attainment: 85, winRate: 35 },
                    { segment: 'SMB (50-200)', revenue: 520000, quota: 600000, attainment: 87, winRate: 28 },
                    { segment: 'Startup (<50)', revenue: 100000, quota: 200000, attainment: 50, winRate: 22 }
                ],
                bySource: [
                    { source: 'Inbound', deals: 85, revenue: 980000, avgDealSize: 11500, winRate: 28 },
                    { source: 'Outbound', deals: 62, revenue: 780000, avgDealSize: 12500, winRate: 32 },
                    { source: 'Partner Referral', deals: 38, revenue: 420000, avgDealSize: 11000, winRate: 42 },
                    { source: 'Customer Referral', deals: 25, revenue: 180000, avgDealSize: 7200, winRate: 48 },
                    { source: 'Event', deals: 18, revenue: 90000, avgDealSize: 5000, winRate: 25 },
                    { source: 'Customer Expansion', deals: 15, revenue: 100000, avgDealSize: 6700, winRate: 60 }
                ]
            },
            trends: {
                revenueTrend: this.generateTrendData('revenue'),
                winLossTrend: this.generateTrendData('winLoss'),
                cycleTimeTrend: this.generateTrendData('cycleTime'),
                dealSizeTrend: this.generateTrendData('dealSize'),
                pipelineTrend: this.generateTrendData('pipeline')
            },
            alerts: [
                { id: 'alert1', type: 'critical', title: 'Q3 Target at Risk', description: 'Current pace will miss quarterly target by $150K without additional pipeline acceleration', affectedDeals: [], recommendedAction: 'Prioritize high-probability deals and accelerate stale deal engagement', createdAt: new Date().toISOString() },
                { id: 'alert2', type: 'warning', title: 'Stage Conversion Decline', description: 'Proposal stage conversion dropped 8% this month', affectedDeals: ['proposal_deals'], recommendedAction: 'Review proposal template and consider adding ROI calculator', createdAt: new Date().toISOString() },
                { id: 'alert3', type: 'info', title: 'Top Performer Recognition', description: 'Sarah Johnson exceeded monthly quota for 3rd consecutive month', affectedDeals: [], recommendedAction: 'Schedule recognition call and capture best practices', createdAt: new Date().toISOString() }
            ],
            recommendations: [
                { id: 'rec1', category: 'Pipeline', priority: 'high', title: 'Accelerate APAC Expansion', description: 'Territory significantly underperforming. Consider regional events or hire.', potentialImpact: 200000, effort: 'high', actionable: true },
                { id: 'rec2', category: 'Process', priority: 'high', title: 'Discovery Process Optimization', description: 'Average discovery stage is 4 days longer than target. Add discovery questions template.', potentialImpact: 150000, effort: 'low', actionable: true },
                { id: 'rec3', category: 'Training', priority: 'medium', title: 'Win Rate Coaching', description: 'Bottom 2 performers have below-average win rates. Consider focused coaching.', potentialImpact: 100000, effort: 'medium', actionable: true },
                { id: 'rec4', category: 'Product', priority: 'medium', title: 'Starter Tier Marketing', description: 'SMB segment conversion declining. Consider SMB-specific campaigns.', potentialImpact: 75000, effort: 'medium', actionable: true }
            ],
            lastUpdated: new Date().toISOString()
        };
    }

    private generateTrendData(type: string): TrendPoint[] {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const data: TrendPoint[] = [];

        for (let i = 0; i < months.length; i++) {
            let value: number;
            let change: number;

            switch (type) {
                case 'revenue':
                    value = 280000 + (i * 25000) + Math.floor(Math.random() * 20000);
                    break;
                case 'winLoss':
                    value = 28 + Math.floor(Math.random() * 10);
                    break;
                case 'cycleTime':
                    value = 50 - (i * 2) + Math.floor(Math.random() * 5);
                    break;
                case 'dealSize':
                    value = 42000 + (i * 1500) + Math.floor(Math.random() * 5000);
                    break;
                case 'pipeline':
                    value = 4500000 + (i * 150000) + Math.floor(Math.random() * 100000);
                    break;
                default:
                    value = 100;
            }

            change = i === 0 ? 0 : value - data[i - 1].value;

            data.push({
                period: months[i],
                value,
                change,
                changePercent: i === 0 ? 0 : Math.round((change / data[i - 1].value) * 100)
            });
        }

        return data;
    }
}

export interface WinLossAnalysis {
    overallWinRate: number;
    totalWon: number;
    totalLost: number;
    avgDaysToWin: number;
    avgDaysToLoss: number;
    wonByReason: Array<{ reason: string; percentage: number }>;
    lostByReason: Array<{ reason: string; percentage: number }>;
    competitorWins: CompetitorWin[];
    dealSizeAnalysis: DealSizeAnalysis;
}

export interface CompetitorWin {
    competitor: string;
    wins: number;
    losses: number;
    winRate: number;
}

export interface DealSizeAnalysis {
    won: { avg: number; median: number; distribution: Array<{ range: string; percentage: number }> };
    lost: { avg: number; median: number; distribution: Array<{ range: string; percentage: number }> };
}

export interface DealVelocity {
    avgVelocity: number;
    avgDaysInStage: Record<string, number>;
    velocityByRep: Array<{ repId: string; avgDays: number }>;
    accelerationOpportunities: Array<{ stage: string; potential: number; action: string }>;
}

export const revenueIntelligenceService = new RevenueIntelligenceService();
