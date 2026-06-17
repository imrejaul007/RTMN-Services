/**
 * Sales Forecasting - Predict deal closure probability
 * FIXED: configurable magic numbers via env vars
 */

// Configurable via environment — defaults shown here
const STAGE_PROBABILITIES: Record<string, number> = {
    new: 0.1,
    contacted: 0.2,
    qualified: 0.4,
    proposal: 0.6,
    negotiation: 0.8,
    closed_won: 1.0,
    closed_lost: 0,
};

const OPTIMAL_DAYS: Record<string, number> = {
    new: 7,
    contacted: 10,
    qualified: 14,
    proposal: 21,
    negotiation: 14,
};

const BASE_CLOSE_DAYS: Record<string, number> = {
    new: 45,
    contacted: 35,
    qualified: 28,
    proposal: 21,
    negotiation: 14,
};

export class SalesForecasting {
    private stageProbabilities: Record<string, number>;
    private optimalDays: Record<string, number>;
    private baseCloseDays: Record<string, number>;
    private weeklyWeeksLeft: number;

    constructor() {
        // Load from env vars with defaults
        this.stageProbabilities = {
            ...STAGE_PROBABILITIES,
            new: Number(process.env.FORECAST_NEW_PROB) || STAGE_PROBABILITIES.new,
            contacted: Number(process.env.FORECAST_CONTACTED_PROB) || STAGE_PROBABILITIES.contacted,
            qualified: Number(process.env.FORECAST_QUALIFIED_PROB) || STAGE_PROBABILITIES.qualified,
            proposal: Number(process.env.FORECAST_PROPOSAL_PROB) || STAGE_PROBABILITIES.proposal,
            negotiation: Number(process.env.FORECAST_NEGOTIATION_PROB) || STAGE_PROBABILITIES.negotiation,
        };
        this.optimalDays = {
            ...OPTIMAL_DAYS,
            new: Number(process.env.FORECAST_NEW_DAYS) || OPTIMAL_DAYS.new,
            contacted: Number(process.env.FORECAST_CONTACTED_DAYS) || OPTIMAL_DAYS.contacted,
            qualified: Number(process.env.FORECAST_QUALIFIED_DAYS) || OPTIMAL_DAYS.qualified,
            proposal: Number(process.env.FORECAST_PROPOSAL_DAYS) || OPTIMAL_DAYS.proposal,
            negotiation: Number(process.env.FORECAST_NEGOTIATION_DAYS) || OPTIMAL_DAYS.negotiation,
        };
        this.baseCloseDays = {
            ...BASE_CLOSE_DAYS,
            new: Number(process.env.FORECAST_NEW_CLOSE_DAYS) || BASE_CLOSE_DAYS.new,
            contacted: Number(process.env.FORECAST_CONTACTED_CLOSE_DAYS) || BASE_CLOSE_DAYS.contacted,
            qualified: Number(process.env.FORECAST_QUALIFIED_CLOSE_DAYS) || BASE_CLOSE_DAYS.qualified,
            proposal: Number(process.env.FORECAST_PROPOSAL_CLOSE_DAYS) || BASE_CLOSE_DAYS.proposal,
            negotiation: Number(process.env.FORECAST_NEGOTIATION_CLOSE_DAYS) || BASE_CLOSE_DAYS.negotiation,
        };
        this.weeklyWeeksLeft = Number(process.env.FORECAST_WEEKS_LEFT) || 12;
    }

    /**
     * Normalize deal data — fill in defaults for missing fields so
     * the model always produces a result instead of crashing on NaN.
     */
    normalizeDeal(deal: Record<string, unknown> = {}): Record<string, unknown> {
        return {
            ...deal,
            stage: deal?.stage || 'new',
            value: Math.max(0, Number(deal?.value ?? deal?.dealValue ?? 0)), // FIXED: no negative
            dealId: deal?.dealId || deal?.id || 'unknown',
            engagementScore: Number(deal?.engagementScore ?? 50),
            daysInStage: Math.max(0, Number(deal?.daysInStage ?? 0)),
            lastActivity: deal?.lastActivity
                ? (deal.lastActivity instanceof Date
                    ? deal.lastActivity
                    : new Date(String(deal.lastActivity)))
                : new Date(),
            competingDeals: Math.max(0, Number(deal?.competingDeals ?? 0)),
        };
    }

    predictDeal(deal: Record<string, unknown> = {}): Record<string, unknown> {
        const d = this.normalizeDeal(deal);
        const baseProbability = this.stageProbabilities[d.stage as string] || 0.2;
        const engagementMultiplier = (d.engagementScore as number) / 50;
        const timeMultiplier = this.calculateTimeMultiplier(d.daysInStage as number, d.stage as string);
        const recencyMultiplier = this.calculateRecencyMultiplier(d.lastActivity as Date);
        let probability = baseProbability * engagementMultiplier * timeMultiplier * recencyMultiplier;
        probability = Math.min(Math.max(probability, 0.05), 0.95);
        const expectedValue = (d.value as number) * probability;
        const predictedCloseDate = this.predictCloseDate(d as { stage: string }, probability);
        const riskFactors = this.identifyRisks(d as Record<string, unknown>, probability);
        const recommendations = this.generateRecommendations(d as Record<string, unknown>, probability);
        const trend = this.calculateTrend(d as Record<string, unknown>);
        const confidence = this.calculateConfidence(d as Record<string, unknown>);

        return {
            dealId: d.dealId,
            probability: Math.round(probability * 100),
            expectedValue: Math.round(expectedValue),
            predictedCloseDate: predictedCloseDate instanceof Date ? predictedCloseDate.toISOString() : String(predictedCloseDate),
            confidence,
            riskFactors,
            recommendations,
            trend,
        };
    }

    forecastPipeline(deals: Record<string, unknown>[] = [], period = 'Q2 2026'): Record<string, unknown> {
        const normalized = deals.map(d => this.normalizeDeal(d));
        const totalValue = normalized.reduce((sum, d) => sum + (d.value as number), 0);
        const results = normalized.map(d => this.predictDeal(d as Record<string, unknown>));
        const weightedValue = results.reduce((sum, r) => sum + ((r.expectedValue as number) || 0), 0);

        const stageMap = new Map<string, { count: number; value: number; probability: number }>();
        results.forEach((r, i) => {
            const stage = normalized[i].stage as string;
            const current = stageMap.get(stage) || { count: 0, value: 0, probability: 0 };
            stageMap.set(stage, {
                count: current.count + 1,
                value: current.value + (normalized[i].value as number),
                probability: current.probability + ((r.probability as number) || 0),
            });
        });

        const stageBreakdown = Array.from(stageMap.entries()).map(([stage, data]) => ({
            stage,
            count: data.count,
            value: data.value,
            probability: Math.round(data.probability / data.count),
        }));

        const atRisk = results.filter(r => (r.probability as number) < 30 && r.trend === 'down').length;
        const healthy = results.filter(r => (r.probability as number) > 60).length;
        const stalled = normalized.filter(d => (d.daysInStage as number) > 14).length;

        return {
            period,
            totalValue,
            weightedValue,
            dealCount: deals.length,
            stageBreakdown,
            momentum: this.generateMomentum(),
            riskAssessment: { atRisk, healthy, stalled },
        };
    }

    generateWeeklyTargets(currentPipeline: Record<string, unknown>[] = [], target = 0): Record<string, unknown> {
        const results = currentPipeline.map(d => this.predictDeal(d));
        const weightedValue = results.reduce((sum, r) => sum + ((r.expectedValue as number) || 0), 0);
        const weeklyTarget = (target - weightedValue) / this.weeklyWeeksLeft;
        const dealsToClose = Math.ceil(weeklyTarget / 5000);
        return {
            weeklyTarget: Math.max(weeklyTarget, 0),
            dealsToClose,
            requiredVelocity: weeklyTarget / 1000,
        };
    }

    private calculateTimeMultiplier(daysInStage: number, stage: string): number {
        const optimal = this.optimalDays[stage] || 14;
        if (daysInStage <= optimal) return 1.0;
        if (daysInStage <= optimal * 2) return 0.9;
        if (daysInStage <= optimal * 3) return 0.7;
        return 0.5;
    }

    private calculateRecencyMultiplier(lastActivity: Date): number {
        if (!lastActivity || isNaN(lastActivity.getTime())) return 1.0;
        const daysSince = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince <= 3) return 1.2;
        if (daysSince <= 7) return 1.0;
        if (daysSince <= 14) return 0.8;
        if (daysSince <= 30) return 0.6;
        return 0.4;
    }

    private predictCloseDate(deal: { stage: string }, probability: number): Date {
        const baseDaysLeft = this.baseCloseDays[deal.stage] || 30;
        const adjustedDays = baseDaysLeft * (1 - probability * 0.5);
        return new Date(Date.now() + adjustedDays * 24 * 60 * 60 * 1000);
    }

    private identifyRisks(deal: Record<string, unknown>, probability: number): string[] {
        const risks: string[] = [];
        if ((deal.daysInStage as number) > 21) risks.push('Stalled in current stage');
        if ((deal.engagementScore as number) < 30) risks.push('Low engagement - at risk of going cold');
        if (deal.lastActivity instanceof Date && !isNaN(deal.lastActivity.getTime())) {
            const daysSinceActivity = (Date.now() - deal.lastActivity.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceActivity > 14) risks.push('No recent activity');
        }
        if ((deal.competingDeals as number) > 3) risks.push('Multiple competing deals');
        if (probability < 30) risks.push('Low conversion probability');
        return risks;
    }

    private generateRecommendations(deal: Record<string, unknown>, probability: number): string[] {
        const recs: string[] = [];
        if (probability < 40) recs.push('Schedule discovery call to re-engage');
        if ((deal.daysInStage as number) > 14) recs.push('Send proposal or schedule demo');
        if ((deal.engagementScore as number) < 50) recs.push('Add to nurture sequence');
        if (probability > 60) recs.push('Prepare contract for close');
        recs.push('Request meeting with decision maker');
        return recs;
    }

    private calculateTrend(deal: Record<string, unknown>): string {
        if ((deal.engagementScore as number) > 70) return 'up';
        if ((deal.engagementScore as number) > 40) return 'stable';
        return 'down';
    }

    private calculateConfidence(deal: Record<string, unknown>): string {
        const score = (deal.engagementScore as number || 50) + (100 - (deal.daysInStage as number || 0)) - ((deal.competingDeals as number || 0) * 10);
        if (score > 120) return 'high';
        if (score > 60) return 'medium';
        return 'low';
    }

    private generateMomentum(): Array<{ week: string; value: number }> {
        return ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'].map((week, i) => ({
            week,
            value: 100000 + (50000 * (i + 1)),
        }));
    }
}
