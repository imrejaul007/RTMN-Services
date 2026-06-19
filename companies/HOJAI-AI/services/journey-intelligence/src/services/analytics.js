// Analytics service for journey intelligence

export const analyticsService = {
  // Calculate conversion rate
  calculateConversionRate: (total, converted) => {
    if (total === 0) return 0;
    return ((converted / total) * 100).toFixed(2);
  },

  // Calculate average time to convert (in days)
  calculateAvgTimeToConvert: (journeys) => {
    if (journeys.length === 0) return 0;
    const totalDays = journeys.reduce((sum, j) => {
      const start = new Date(j.createdAt);
      const end = j.closedAt ? new Date(j.closedAt) : new Date();
      return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }, 0);
    return (totalDays / journeys.length).toFixed(1);
  },

  // Get funnel metrics
  getFunnelMetrics: (funnels) => {
    return Array.from(funnels.entries()).map(([stage, data]) => ({
      stage,
      ...data,
      dropoff: Math.round(data.count * (1 - data.conversionRate))
    }));
  },

  // Get pipeline metrics
  getPipelineMetrics: (stages) => {
    const totalValue = stages.reduce((sum, s) => sum + s.value, 0);
    const weightedProbability = stages.reduce((sum, s) => {
      return sum + (s.value * s.probability / 100);
    }, 0) / (totalValue || 1);

    return {
      stages,
      totalValue,
      weightedProbability: (weightedProbability * 100).toFixed(1),
      totalDeals: stages.reduce((sum, s) => sum + s.count, 0)
    };
  },

  // Generate trend data
  generateTrendData: (months = 6) => {
    const trends = [];
    const baseLeads = 80;
    const baseConversions = 10;
    const baseRevenue = 150000;

    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - (months - 1 - i));
      trends.push({
        month: date.toLocaleString('default', { month: 'short' }),
        leads: baseLeads + Math.floor(Math.random() * 50) + (i * 15),
        conversions: baseConversions + Math.floor(Math.random() * 8) + (i * 2),
        revenue: baseRevenue + (i * 30000) + Math.floor(Math.random() * 50000)
      });
    }
    return trends;
  }
};

export default analyticsService;
