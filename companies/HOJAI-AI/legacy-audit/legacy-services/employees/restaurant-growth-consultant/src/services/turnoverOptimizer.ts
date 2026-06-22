import {
  TurnoverRequest,
  TurnoverResponse,
  TableMetrics,
  TurnoverAnalysis,
} from '../types';

interface PeakHourAnalysis {
  hour: number;
  avgCovers: number;
  tableCount: number;
  revenuePotential: number;
  isOvercapacity: boolean;
}

/**
 * Table Turnover Optimizer Service
 * Analyzes table performance and provides recommendations to maximize revenue per seat hour
 */
export class TurnoverOptimizerService {
  private readonly TARGET_TURN_TIME = {
    quickService: 30,    // Quick service (cafe, fast casual)
    casualDining: 45,    // Casual dining
    fineDining: 90,      // Fine dining
  };

  private readonly SEAT_MULTIPLIERS = {
    peak: 1.0,
    shoulder: 0.7,
    offPeak: 0.4,
  };

  /**
   * Analyze table turnover and provide optimization recommendations
   */
  async analyze(request: TurnoverRequest): Promise<TurnoverResponse> {
    // Calculate peak hours analysis
    const peakHours = this.analyzePeakHours(request.peakHourCovers);

    // Calculate table metrics
    const tableMetrics = this.calculateTableMetrics(request.tableConfigs, request.avgOrderValue);

    // Find bottlenecks
    const bottlenecks = this.identifyBottlenecks(request, peakHours);

    // Calculate overall utilization
    const currentUtilization = request.currentUtilization;
    const revenuePerSeatHour = this.calculateRevenuePerSeatHour(request, tableMetrics);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      peakHours,
      tableMetrics,
      currentUtilization,
      request.avgOrderValue
    );

    // Generate schedule optimizations
    const scheduleOptimizations = this.generateScheduleOptimizations(peakHours);

    // Generate automation recommendations
    const automation = this.recommendAutomation(tableMetrics, bottlenecks);

    const analysis: TurnoverAnalysis = {
      peakHours,
      avgTableTurnTime: tableMetrics.reduce((sum, t) => sum + t.avgTurnTime, 0) / tableMetrics.length,
      targetTurnTime: 45,
      currentUtilization,
      revenuePerSeatHour,
      tables: tableMetrics,
      bottlenecks,
    };

    return {
      analysis,
      recommendations,
      scheduleOptimizations,
      automation,
    };
  }

  /**
   * Analyze peak hours distribution
   */
  private analyzePeakHours(peakHourCovers: { hour: number; covers: number }[]): PeakHourAnalysis[] {
    const sortedHours = [...peakHourCovers].sort((a, b) => b.covers - a.covers);
    const maxCovers = sortedHours[0]?.covers || 1;

    return peakHourCovers.map(h => ({
      hour: h.hour,
      avgCovers: h.covers,
      tableCount: Math.ceil(h.covers / 4), // Assume avg 4 covers per table
      revenuePotential: h.covers * 400, // Estimate ₹400 avg order
      isOvercapacity: h.covers > maxCovers * 0.8,
    })).sort((a, b) => a.hour - b.hour);
  }

  /**
   * Calculate metrics for each table
   */
  private calculateTableMetrics(
    tableConfigs: { tableId: string; seats: number; avgTurnMinutes: number }[],
    avgOrderValue: number
  ): TableMetrics[] {
    return tableConfigs.map(table => {
      const potentialTurnsPerDay = (12 * 60) / table.avgTurnMinutes; // 12 hours operation
      const potentialRevenuePerDay = potentialTurnsPerDay * table.seats * avgOrderValue;
      const actualRevenuePerDay = potentialRevenuePerDay * 0.65; // Assume 65% utilization

      return {
        tableId: table.tableId,
        seats: table.seats,
        avgTurnTime: table.avgTurnMinutes,
        coversPerTurn: table.seats,
        revenuePerTurn: table.seats * avgOrderValue,
        potentialRevenue: potentialRevenuePerDay,
        utilizationPercent: (actualRevenuePerDay / potentialRevenuePerDay) * 100,
      };
    });
  }

  /**
   * Identify operational bottlenecks
   */
  private identifyBottlenecks(
    request: TurnoverRequest,
    peakHours: PeakHourAnalysis[]
  ): { location: string; cause: string; impact: string }[] {
    const bottlenecks: { location: string; cause: string; impact: string }[] = [];

    // Check for capacity issues during peak hours
    const overloadedHours = peakHours.filter(p => p.isOvercapacity);
    if (overloadedHours.length > 0) {
      bottlenecks.push({
        location: 'Peak Hours',
        cause: `${overloadedHours.map(h => `${h.hour}:00`).join(', ')} - Capacity exceeded`,
        impact: `Lost revenue: ₹${overloadedHours.reduce((sum, h) => sum + h.revenuePotential * 0.3, 0).toFixed(0)}/day`,
      });
    }

    // Check for underutilization
    if (request.currentUtilization < 50) {
      bottlenecks.push({
        location: 'Off-Peak Hours',
        cause: 'Low utilization during non-peak periods',
        impact: `${(100 - request.currentUtilization).toFixed(0)}% capacity unused`,
      });
    }

    // Check for slow table turns
    const slowTables = request.tableConfigs.filter(t => t.avgTurnMinutes > 60);
    if (slowTables.length > 0) {
      bottlenecks.push({
        location: 'Table Management',
        cause: `${slowTables.length} tables exceeding 60min turn time`,
        impact: 'Revenue loss due to extended seating',
      });
    }

    return bottlenecks;
  }

  /**
   * Calculate revenue per seat hour
   */
  private calculateRevenuePerSeatHour(
    request: TurnoverRequest,
    tableMetrics: TableMetrics[]
  ): number {
    const totalSeats = tableMetrics.reduce((sum, t) => sum + t.seats, 0);
    const totalPotentialRevenue = tableMetrics.reduce((sum, t) => sum + t.potentialRevenue, 0);
    const operatingHours = 12; // Assume 12 hours

    return totalPotentialRevenue / (totalSeats * operatingHours);
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    peakHours: PeakHourAnalysis[],
    tableMetrics: TableMetrics[],
    currentUtilization: number,
    avgOrderValue: number
  ): TurnoverResponse['recommendations'] {
    const recommendations: TurnoverResponse['recommendations'] = [];

    // High utilization recommendation
    if (currentUtilization > 75) {
      recommendations.push({
        action: 'Consider table expansion or reservation system',
        target: 'Peak hour capacity',
        reason: `Utilization at ${currentUtilization.toFixed(0)}% - near capacity during peak times`,
        expectedImpact: {
          revenueIncrease: avgOrderValue * peakHours.filter(p => p.isOvercapacity).length * 10,
          turnsIncrease: 5,
        },
      });
    }

    // Low utilization recommendation
    if (currentUtilization < 50) {
      recommendations.push({
        action: 'Launch off-peak promotions',
        target: 'Slow hours (2PM-5PM, 9PM onwards)',
        reason: `Low utilization at ${currentUtilization.toFixed(0)}% - need to drive traffic during off-peak`,
        expectedImpact: {
          revenueIncrease: avgOrderValue * 50,
          turnsIncrease: 15,
        },
      });
    }

    // Table size optimization
    const smallTables = tableMetrics.filter(t => t.seats <= 2);
    const largeTables = tableMetrics.filter(t => t.seats >= 6);
    const avgTurnTime = tableMetrics.reduce((sum, t) => sum + t.avgTurnTime, 0) / tableMetrics.length;

    if (avgTurnTime > 60) {
      recommendations.push({
        action: 'Implement turn time targets',
        target: 'Table staff',
        reason: `Average turn time of ${avgTurnTime.toFixed(0)} mins exceeds optimal`,
        expectedImpact: {
          revenueIncrease: avgOrderValue * 20,
          turnsIncrease: 3,
        },
      });
    }

    // Mixed table size recommendation
    if (largeTables.length > tableMetrics.length * 0.5) {
      recommendations.push({
        action: 'Add smaller 2-top tables',
        target: 'Floor plan',
        reason: 'Too many large tables limits flexibility during low traffic',
        expectedImpact: {
          revenueIncrease: avgOrderValue * 30,
          turnsIncrease: 8,
        },
      });
    }

    return recommendations;
  }

  /**
   * Generate schedule optimizations
   */
  private generateScheduleOptimizations(
    peakHours: PeakHourAnalysis[]
  ): TurnoverResponse['scheduleOptimizations'] {
    return peakHours.map(hour => {
      let action: 'add_tables' | 'reduce_tables' | 'no_change';
      let tableCount: number;

      if (hour.isOvercapacity) {
        action = 'add_tables';
        tableCount = Math.ceil(hour.avgCovers / 4) + 2; // Add 2 tables
      } else if (hour.avgCovers < 10) {
        action = 'reduce_tables';
        tableCount = Math.max(1, Math.floor(hour.avgCovers / 4) - 1);
      } else {
        action = 'no_change';
        tableCount = Math.ceil(hour.avgCovers / 4);
      }

      return {
        timeSlot: `${hour.hour.toString().padStart(2, '0')}:00`,
        action,
        tableCount,
      };
    });
  }

  /**
   * Recommend automation features
   */
  private recommendAutomation(
    tableMetrics: TableMetrics[],
    bottlenecks: { location: string; cause: string; impact: string }[]
  ): TurnoverResponse['automation'] {
    const automation: TurnoverResponse['automation'] = [];

    // QR ordering
    automation.push({
      feature: 'QR Code Menu & Ordering',
      description: 'Customers order via QR code, reducing order-to-kitchen time by 40%',
      priority: tableMetrics.some(t => t.avgTurnTime > 45) ? 'high' : 'medium',
    });

    // Table management system
    automation.push({
      feature: 'Real-time Table Management',
      description: 'Visual floor plan with turn time alerts and table status',
      priority: 'high',
    });

    // POS integration
    automation.push({
      feature: 'POS-Kitchen Integration',
      description: 'Auto-print orders to kitchen, track prep time',
      priority: 'medium',
    });

    // Reservation system
    if (bottlenecks.some(b => b.location === 'Peak Hours')) {
      automation.push({
        feature: 'Smart Reservation System',
        description: 'Predictive booking to smooth peak hour demand',
        priority: 'high',
      });
    }

    // Payment at table
    automation.push({
      feature: 'Payment at Table',
      description: 'Contactless payment without waiting for bill',
      priority: 'medium',
    });

    return automation;
  }

  /**
   * Calculate optimal table layout
   */
  async calculateOptimalLayout(
    totalSeats: number,
    avgPartySize: number,
    peakCovers: number
  ): Promise<{ tableConfig: { seats: number; count: number }[]; totalTables: number }> {
    const optimalMix: { seats: number; count: number }[] = [];

    // Ideal mix based on industry standards
    // 40% two-tops, 30% four-tops, 20% larger, 10% bar seating
    const configs = [
      { seats: 2, percent: 0.4 },
      { seats: 4, percent: 0.3 },
      { seats: 6, percent: 0.15 },
      { seats: 8, percent: 0.1 },
      { seats: 10, percent: 0.05 },
    ];

    let remainingSeats = totalSeats;

    for (const config of configs) {
      const count = Math.floor((totalSeats * config.percent) / config.seats);
      if (count > 0) {
        optimalMix.push({ seats: config.seats, count });
        remainingSeats -= count * config.seats;
      }
    }

    // Adjust last row to fit exact seats
    if (remainingSeats > 0 && optimalMix.length > 0) {
      const lastConfig = optimalMix[optimalMix.length - 1];
      lastConfig.count += Math.floor(remainingSeats / lastConfig.seats);
    }

    const totalTables = optimalMix.reduce((sum, c) => sum + c.count, 0);

    return { tableConfig: optimalMix, totalTables };
  }
}

export const turnoverOptimizerService = new TurnoverOptimizerService();
