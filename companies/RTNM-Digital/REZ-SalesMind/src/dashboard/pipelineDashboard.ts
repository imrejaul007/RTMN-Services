/**
 * Pipeline Dashboard - Sales pipeline visualization
 */
export interface Deal {
    id: string;
    title: string;
    company: string;
    value: number;
    stage: string;
    owner: string;
    daysInStage: number;
    probability: number;
    risk?: string;
}

export class PipelineDashboard {
    /**
     * Get dashboard stats
     */
    getStats(deals: unknown[], activities: unknown[]): Record<string, unknown> {
        const typedDeals = deals as Deal[];
        const totalDeals = typedDeals.length;
        const totalValue = typedDeals.reduce((sum, d) => sum + d.value, 0);
        const weightedValue = typedDeals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0);
        const conversionRate = this.calculateConversionRate(typedDeals);
        const avgDealSize = totalDeals > 0 ? totalValue / totalDeals : 0;
        const avgCycleTime = this.calculateAvgCycleTime(typedDeals);
        const stageDistribution = this.getStageDistribution(typedDeals);
        const recentActivity = (activities as unknown[]).slice(0, 10);
        const topPerformers = this.getTopPerformers(typedDeals);
        const atRiskDeals = typedDeals.filter(d => d.risk === 'high').slice(0, 5);

        return {
            totalDeals,
            totalValue,
            weightedValue,
            conversionRate,
            avgDealSize,
            avgCycleTime,
            stageDistribution,
            recentActivity,
            topPerformers,
            atRiskDeals,
        };
    }

    /**
     * Generate chart data for pipeline
     */
    getPipelineChartData(deals: unknown[]): Record<string, unknown> {
        const typedDeals = deals as Deal[];
        return {
            funnelData: this.getFunnelData(typedDeals),
            trendData: this.getTrendData(),
            revenueByDay: this.getRevenueByDay(),
        };
    }

    /**
     * Get leaderboard data
     */
    getLeaderboard(deals: unknown[]): { userId: string; userName: string; dealsWon: number; revenue: number; conversionRate: number }[] {
        return this.getTopPerformers(deals as Deal[]);
    }

    private calculateConversionRate(deals: Deal[]): number {
        const closed = deals.filter(d => d.stage === 'closed_won' || d.stage === 'closed_lost').length;
        const won = deals.filter(d => d.stage === 'closed_won').length;
        return closed > 0 ? Math.round((won / closed) * 100) : 0;
    }

    private calculateAvgCycleTime(deals: Deal[]): number {
        const activeDeals = deals.filter(d => !d.stage.startsWith('closed'));
        if (activeDeals.length === 0) return 0;
        const totalDays = activeDeals.reduce((sum, d) => sum + d.daysInStage, 0);
        return Math.round(totalDays / activeDeals.length);
    }

    private getStageDistribution(deals: Deal[]): Array<{ stage: string; count: number; value: number; probability: number; color: string }> {
        const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won'];
        const colors = ['#6b7280', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'];
        const probabilities = [10, 20, 40, 60, 80, 100];
        return stages.map((stage, i) => {
            const stageDeals = deals.filter(d => d.stage === stage);
            return {
                stage,
                count: stageDeals.length,
                value: stageDeals.reduce((sum, d) => sum + d.value, 0),
                probability: probabilities[i],
                color: colors[i],
            };
        });
    }

    private getFunnelData(deals: Deal[]): Array<{ stage: string; count: number; value: number }> {
        const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won'];
        return stages.map(stage => {
            const stageDeals = deals.filter(d => d.stage === stage);
            return {
                stage,
                count: stageDeals.length,
                value: stageDeals.reduce((sum, d) => sum + d.value, 0),
            };
        });
    }

    private getTrendData(): Array<{ date: string; value: number }> {
        const dates: Array<{ date: string; value: number }> = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push({
                date: date.toISOString().split('T')[0] as string,
                value: 0,
            });
        }
        return dates;
    }

    private getRevenueByDay(): Array<{ day: string; actual: number; target: number }> {
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => ({
            day,
            actual: 0,
            target: 0,
        }));
    }

    private getTopPerformers(deals: Deal[]): Array<{ userId: string; userName: string; dealsWon: number; revenue: number; conversionRate: number }> {
        // Aggregate by owner from deals
        const ownerMap = new Map<string, { won: number; revenue: number }>();
        deals.forEach(d => {
            const existing = ownerMap.get(d.owner) || { won: 0, revenue: 0 };
            if (d.stage === 'closed_won') {
                existing.won++;
                existing.revenue += d.value;
            }
            ownerMap.set(d.owner, existing);
        });

        const performers = Array.from(ownerMap.entries()).map(([owner, stats]) => ({
            userId: owner,
            userName: owner,
            dealsWon: stats.won,
            revenue: stats.revenue,
            conversionRate: stats.won > 0 ? Math.round(stats.won / (stats.won + 1) * 100) : 0,
        }));

        if (performers.length > 0) {
            return performers.sort((a, b) => b.revenue - a.revenue);
        }

        // Default mock data when no deals exist
        return [
            { userId: '1', userName: 'Alice Johnson', dealsWon: 0, revenue: 0, conversionRate: 0 },
            { userId: '2', userName: 'Bob Smith', dealsWon: 0, revenue: 0, conversionRate: 0 },
            { userId: '3', userName: 'Carol Davis', dealsWon: 0, revenue: 0, conversionRate: 0 },
        ];
    }
}
