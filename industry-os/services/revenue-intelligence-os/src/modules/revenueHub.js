/**
 * Revenue Hub Module
 * Unified Revenue Aggregation from all sources
 */

export class RevenueHub {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get unified revenue overview from all streams
   */
  getOverview() {
    const streams = Array.from(this.db.revenueStreams.values());
    const totalRevenue = streams.reduce((sum, r) => sum + r.amount, 0);
    const totalGrowth = streams.reduce((sum, r) => sum + (r.amount * r.growth / 100), 0);

    const bySource = {};
    streams.forEach(s => {
      bySource[s.source] = (bySource[s.source] || 0) + s.amount;
    });

    const snapshots = Array.from(this.db.revenueSnapshots.values()).slice(-12);

    return {
      totalRevenue,
      revenueBySource: bySource,
      weightedGrowthRate: (totalGrowth / totalRevenue * 100).toFixed(1),
      streams: streams.map(s => ({
        ...s,
        percentage: ((s.amount / totalRevenue) * 100).toFixed(1),
      })),
      trend: snapshots,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get revenue snapshots for a period
   */
  getSnapshots(period = 12) {
    return Array.from(this.db.revenueSnapshots.values()).slice(-parseInt(period));
  }

  /**
   * Get latest revenue forecast
   */
  getForecasts() {
    const forecasts = Array.from(this.db.revenueForecasts.values());
    return {
      forecasts,
      summary: {
        nextMonth: forecasts[0] || null,
        confidenceAvg: forecasts.reduce((s, f) => s + f.confidence, 0) / forecasts.length,
        predictedGrowth: forecasts[1] ?
          ((forecasts[1].predictedRevenue - forecasts[0].predictedRevenue) / forecasts[0].predictedRevenue * 100).toFixed(1) : 0,
      },
    };
  }

  /**
   * Add a new revenue stream
   */
  addStream(stream) {
    const id = `REV${Date.now()}`;
    const newStream = {
      id,
      ...stream,
      status: 'active',
      lastUpdated: new Date().toISOString(),
    };
    this.db.revenueStreams.set(id, newStream);
    return newStream;
  }

  /**
   * Update a revenue stream
   */
  updateStream(id, updates) {
    const stream = this.db.revenueStreams.get(id);
    if (!stream) return null;

    const updated = {
      ...stream,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
    this.db.revenueStreams.set(id, updated);
    return updated;
  }

  /**
   * Get revenue by dimension
   */
  getByDimension(dimension) {
    const dimensionData = {
      segment: [
        { name: 'Enterprise', revenue: 6500000, percentage: 54, growth: 12.5 },
        { name: 'Professional', revenue: 4200000, percentage: 35, growth: 8.2 },
        { name: 'Starter', revenue: 1300000, percentage: 11, growth: 15.8 },
      ],
      region: [
        { name: 'North America', revenue: 7200000, percentage: 60, growth: 10.5 },
        { name: 'Europe', revenue: 2400000, percentage: 20, growth: 12.3 },
        { name: 'Asia Pacific', revenue: 1800000, percentage: 15, growth: 22.1 },
        { name: 'Rest of World', revenue: 600000, percentage: 5, growth: 8.9 },
      ],
      product: [
        { name: 'Core Platform', revenue: 8500000, percentage: 71, growth: 9.5 },
        { name: 'Add-ons', revenue: 2200000, percentage: 18, growth: 18.2 },
        { name: 'Services', revenue: 1300000, percentage: 11, growth: 5.4 },
      ],
      source: [
        { name: 'New Business', revenue: 3200000, percentage: 27, growth: 15.2 },
        { name: 'Expansion', revenue: 1800000, percentage: 15, growth: 22.8 },
        { name: 'Renewal', revenue: 7000000, percentage: 58, growth: 7.1 },
      ],
    };

    return {
      dimension,
      breakdown: dimensionData[dimension] || dimensionData.segment,
    };
  }

  /**
   * Calculate growth metrics
   */
  calculateGrowthMetrics() {
    const snapshots = Array.from(this.db.revenueSnapshots.values()).slice(-12);

    if (snapshots.length < 2) {
      return { error: 'Not enough data for growth calculation' };
    }

    const latest = snapshots[snapshots.length - 1];
    const oldest = snapshots[0];

    const periodGrowth = ((latest.totalRevenue - oldest.totalRevenue) / oldest.totalRevenue * 100).toFixed(1);

    const monthlyGrowth = [];
    for (let i = 1; i < snapshots.length; i++) {
      monthlyGrowth.push({
        month: snapshots[i].month,
        growth: ((snapshots[i].totalRevenue - snapshots[i-1].totalRevenue) / snapshots[i-1].totalRevenue * 100).toFixed(1),
      });
    }

    const avgMonthlyGrowth = (monthlyGrowth.reduce((s, m) => s + parseFloat(m.growth), 0) / monthlyGrowth.length).toFixed(1);

    return {
      periodGrowth,
      avgMonthlyGrowth,
      monthlyGrowth,
      projections: this.projectGrowth(),
    };
  }

  /**
   * Project future growth
   */
  projectGrowth() {
    const avgGrowth = 8.5;
    const current = 12000000;

    return [
      { month: 'Q3-2026', projected: current * 1.085, confidence: 92 },
      { month: 'Q4-2026', projected: current * 1.085 * 1.085, confidence: 88 },
      { month: 'Q1-2027', projected: current * 1.085 * 1.085 * 1.085, confidence: 82 },
    ];
  }
}

export default RevenueHub;
