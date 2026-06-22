import {
  StaffMember,
  Service,
  Appointment,
  ScheduleOptimization,
  ScheduleConsultRequest,
  ScheduleConsultResponse,
} from '../types';

/**
 * Schedule Optimizer Service
 * Optimizes staff scheduling and appointment slots
 */
export class ScheduleOptimizerService {
  private readonly PRIME_HOURS = [10, 11, 12, 14, 15, 16, 17];
  private readonly OFF_PEAK_HOURS = [9, 13, 18, 19];

  /**
   * Optimize schedule
   */
  async optimize(request: ScheduleConsultRequest): Promise<ScheduleConsultResponse> {
    const { staff, services, appointments, targetUtilization = 85 } = request;

    // Perform optimization analysis
    const optimization = this.analyzeSchedule(staff, services, appointments, targetUtilization);

    // Generate recommendations
    const recommendations = this.generateRecommendations(optimization, staff);

    // Create optimal schedule
    const optimalSchedule = this.createOptimalSchedule(staff, optimization);

    // Buffer recommendations
    const bufferRecommendations = this.generateBufferRecommendations(services);

    // Incentive recommendations
    const incentiveRecommendations = this.generateIncentiveRecommendations();

    return {
      optimization,
      recommendations,
      optimalSchedule,
      bufferRecommendations,
      incentiveRecommendations,
    };
  }

  /**
   * Analyze current schedule
   */
  private analyzeSchedule(
    staff: StaffMember[],
    services: Service[],
    appointments: Appointment[],
    targetUtilization: number
  ): ScheduleOptimization {
    // Calculate current utilization
    const hourlyDemand = this.calculateHourlyDemand(appointments);
    const avgUtilization = this.calculateAverageUtilization(appointments, staff);

    // Identify peak coverage
    const peakCoverage = this.identifyPeakCoverage(hourlyDemand);

    // Identify understaffed slots
    const understaffedSlots = this.identifyUnderstaffedSlots(hourlyDemand, staff);

    // Identify overstaffed slots
    const overstaffedSlots = this.identifyOverstaffedSlots(hourlyDemand, staff, appointments);

    // Revenue opportunities
    const revenueOpportunity = this.identifyRevenueOpportunities(hourlyDemand, services);

    return {
      avgUtilization,
      peakCoverage,
      understaffedSlots,
      overstaffedSlots,
      revenueOpportunity,
    };
  }

  /**
   * Calculate hourly demand
   */
  private calculateHourlyDemand(appointments: Appointment[]): Map<number, number> {
    const demand = new Map<number, number>();

    for (const apt of appointments) {
      const hour = new Date(apt.dateTime).getHours();
      demand.set(hour, (demand.get(hour) || 0) + 1);
    }

    return demand;
  }

  /**
   * Calculate average utilization
   */
  private calculateAverageUtilization(
    appointments: Appointment[],
    staff: StaffMember[]
  ): number {
    // Assuming 8 hours of operation, 26 working days per month
    const totalStaffHours = staff.length * 8 * 26;
    const totalBookedHours =
      appointments.reduce((sum, apt) => sum + apt.duration, 0) / 60;

    return totalStaffHours > 0 ? (totalBookedHours / totalStaffHours) * 100 : 0;
  }

  /**
   * Identify peak coverage
   */
  private identifyPeakCoverage(
    hourlyDemand: Map<number, number>
  ): { slot: string; coverage: number; demand: number }[] {
    return this.PRIME_HOURS.map(hour => {
      const demand = hourlyDemand.get(hour) || 0;
      const coverage = Math.min(100, (demand / 10) * 100); // Assume capacity of 10
      return {
        slot: `${hour}:00`,
        coverage: Math.round(coverage),
        demand,
      };
    });
  }

  /**
   * Identify understaffed slots
   */
  private identifyUnderstaffedSlots(
    hourlyDemand: Map<number, number>,
    staff: StaffMember[]
  ): { day: string; time: string; demand: number; staff: number }[] {
    const slots: { day: string; time: string; demand: number; staff: number }[] = [];

    // Check prime hours
    for (const hour of this.PRIME_HOURS) {
      const demand = hourlyDemand.get(hour) || 0;
      const staffCount = Math.ceil(staff.length * 0.5); // Assume 50% coverage

      if (demand > staffCount * 2) {
        slots.push({
          day: 'Weekday',
          time: `${hour}:00`,
          demand,
          staff: staffCount,
        });
      }
    }

    return slots;
  }

  /**
   * Identify overstaffed slots
   */
  private identifyOverstaffedSlots(
    hourlyDemand: Map<number, number>,
    staff: StaffMember[],
    appointments: Appointment[]
  ): { day: string; time: string; staff: number; utilization: number }[] {
    const slots: { day: string; time: string; staff: number; utilization: number }[] = [];

    // Check off-peak hours
    for (const hour of this.OFF_PEAK_HOURS) {
      const demand = hourlyDemand.get(hour) || 0;
      const staffCount = Math.ceil(staff.length * 0.7); // Assume 70% coverage

      if (demand < staffCount * 0.5) {
        const utilization = staffCount > 0 ? (demand / staffCount) * 100 : 0;
        slots.push({
          day: 'Weekday',
          time: `${hour}:00`,
          staff: staffCount,
          utilization: Math.round(utilization),
        });
      }
    }

    return slots;
  }

  /**
   * Identify revenue opportunities
   */
  private identifyRevenueOpportunities(
    hourlyDemand: Map<number, number>,
    services: Service[]
  ): { category: string; opportunity: string; potential: number }[] {
    const opportunities: { category: string; opportunity: string; potential: number }[] = [];

    // Calculate off-peak opportunity
    let offPeakDemand = 0;
    for (const hour of this.OFF_PEAK_HOURS) {
      offPeakDemand += hourlyDemand.get(hour) || 0;
    }

    if (offPeakDemand < 20) {
      const avgServiceValue =
        services.reduce((sum, s) => sum + s.price, 0) / services.length || 500;
      opportunities.push({
        category: 'Off-Peak Booking',
        opportunity: 'Incentivize off-peak appointments with 10-15% discounts',
        potential: avgServiceValue * 50, // Potential for 50 additional bookings
      });
    }

    // Weekend opportunity
    opportunities.push({
      category: 'Weekend Premium',
      opportunity: 'Add weekend-only staff for high-demand Saturday/Sunday',
      potential: services.reduce((sum, s) => sum + s.price, 0) * 20,
    });

    // Morning slot opportunity
    const morningDemand = hourlyDemand.get(9) || 0;
    if (morningDemand < 5) {
      opportunities.push({
        category: 'Morning Rush',
        opportunity: 'Promote early morning slots (9 AM - 11 AM) with early bird pricing',
        potential: services.reduce((sum, s) => sum + s.price, 0) * 30,
      });
    }

    return opportunities;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    optimization: ScheduleOptimization,
    staff: StaffMember[]
  ): ScheduleConsultResponse['recommendations'] {
    const recommendations: ScheduleConsultResponse['recommendations'] = [];

    // Understaffing recommendations
    if (optimization.understaffedSlots.length > 0) {
      recommendations.push({
        category: 'staffing',
        action: 'Add additional staff coverage during peak hours',
        implementation: 'Cross-train part-time staff or add flex staff for weekends',
        expectedImpact: 25,
        priority: 'high',
      });
    }

    // Overstaffing recommendations
    if (optimization.overstaffedSlots.length > 0) {
      recommendations.push({
        category: 'staffing',
        action: 'Optimize staffing levels during off-peak hours',
        implementation: 'Implement staggered shifts to match demand patterns',
        expectedImpact: 15,
        priority: 'medium',
      });
    }

    // Low utilization recommendations
    if (optimization.avgUtilization < 75) {
      recommendations.push({
        category: 'marketing',
        action: 'Launch off-peak promotions to improve utilization',
        implementation: 'Offer 10-15% discount for appointments before 11 AM or after 6 PM',
        expectedImpact: 20,
        priority: 'high',
      });
    }

    // Booking system recommendations
    recommendations.push({
      category: 'booking',
      action: 'Implement online booking with real-time availability',
      implementation: 'Show live slots and allow clients to self-book during peak hours',
      expectedImpact: 15,
      priority: 'medium',
    });

    // Buffer time recommendations
    recommendations.push({
      category: 'booking',
      action: 'Add buffer time between appointments',
      implementation: 'Include 10-15 minute buffer for cleanup and client transition',
      expectedImpact: 10,
      priority: 'low',
    });

    // Walk-in strategy
    recommendations.push({
      category: 'marketing',
      action: 'Promote walk-in availability during slow hours',
      implementation: 'Display real-time availability on social media and Google Business',
      expectedImpact: 12,
      priority: 'medium',
    });

    // Incentive recommendations
    recommendations.push({
      category: 'incentive',
      action: 'Offer staff incentives for peak-hour coverage',
      implementation: 'Higher commission or bonus for weekend and evening shifts',
      expectedImpact: 18,
      priority: 'high',
    });

    return recommendations;
  }

  /**
   * Create optimal schedule
   */
  private createOptimalSchedule(
    staff: StaffMember[],
    optimization: ScheduleOptimization
  ): ScheduleConsultResponse['optimalSchedule'] {
    const schedule: ScheduleConsultResponse['optimalSchedule'] = [];

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    for (const day of days) {
      const isWeekend = day === 'Saturday' || day === 'Sunday';
      const slots: { time: string; staffCount: number; targetUtilization: number }[] = [];

      // Morning slots (9-12)
      for (let hour = 9; hour < 12; hour++) {
        const primeIndex = this.PRIME_HOURS.indexOf(hour);
        const baseStaff = isWeekend ? Math.ceil(staff.length * 0.8) : Math.ceil(staff.length * 0.6);
        const staffCount = primeIndex >= 0 ? baseStaff + 1 : baseStaff;

        slots.push({
          time: `${hour}:00`,
          staffCount,
          targetUtilization: primeIndex >= 0 ? 85 : 60,
        });
      }

      // Afternoon slots (12-15)
      for (let hour = 12; hour < 15; hour++) {
        const baseStaff = isWeekend ? Math.ceil(staff.length * 0.7) : Math.ceil(staff.length * 0.5);
        slots.push({
          time: `${hour}:00`,
          staffCount: baseStaff,
          targetUtilization: 70,
        });
      }

      // Evening slots (15-19)
      for (let hour = 15; hour < 19; hour++) {
        const primeIndex = this.PRIME_HOURS.indexOf(hour);
        const baseStaff = isWeekend ? Math.ceil(staff.length * 0.9) : Math.ceil(staff.length * 0.7);
        const staffCount = primeIndex >= 0 ? baseStaff + 1 : baseStaff;

        slots.push({
          time: `${hour}:00`,
          staffCount,
          targetUtilization: primeIndex >= 0 ? 90 : 75,
        });
      }

      schedule.push({
        day,
        slots,
      });
    }

    return schedule;
  }

  /**
   * Generate buffer time recommendations
   */
  private generateBufferRecommendations(
    services: Service[]
  ): ScheduleConsultResponse['bufferRecommendations'] {
    const recommendations: ScheduleConsultResponse['bufferRecommendations'] = [];

    // Hair services typically need 10-15 min buffer
    const hairServices = services.filter(s => s.category === 'hair');
    if (hairServices.length > 0) {
      recommendations.push({
        service: 'Hair Services',
        currentBuffer: 5,
        recommendedBuffer: 10,
        reason: 'Color treatments and styling require cleanup time between clients',
      });
    }

    // Skin services need 5-10 min buffer
    const skinServices = services.filter(s => s.category === 'skin');
    if (skinServices.length > 0) {
      recommendations.push({
        service: 'Skin Services',
        currentBuffer: 5,
        recommendedBuffer: 10,
        reason: 'Equipment sanitization and room preparation needed',
      });
    }

    // Spa services need 15-20 min buffer
    const spaServices = services.filter(s => s.category === 'spa');
    if (spaServices.length > 0) {
      recommendations.push({
        service: 'Spa Services',
        currentBuffer: 10,
        recommendedBuffer: 15,
        reason: 'Extended treatment rooms need thorough preparation between clients',
      });
    }

    return recommendations;
  }

  /**
   * Generate incentive recommendations
   */
  private generateIncentiveRecommendations(): ScheduleConsultResponse['incentiveRecommendations'] {
    return [
      {
        period: 'Weekends (Sat-Sun)',
        target: '100% coverage',
        incentive: '₹500 bonus per day for full shift attendance',
        expectedLift: 20,
      },
      {
        period: 'Evening shifts (5 PM - 8 PM)',
        target: 'Maintain evening staff',
        incentive: '20% commission increase for evening appointments',
        expectedLift: 15,
      },
      {
        period: 'Peak hours (11 AM - 3 PM)',
        target: 'Full utilization',
        incentive: '₹200 per appointment above target',
        expectedLift: 18,
      },
      {
        period: 'Slow days (Monday-Tuesday)',
        target: 'Reduce no-shows',
        incentive: 'Confirm booking with 10% advance payment',
        expectedLift: 25,
      },
    ];
  }
}

export const scheduleOptimizerService = new ScheduleOptimizerService();
