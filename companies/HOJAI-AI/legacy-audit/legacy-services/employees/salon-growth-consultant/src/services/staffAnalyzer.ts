import {
  StaffMember,
  Service,
  Appointment,
  StaffUtilization,
  StaffAnalysis,
  StaffConsultRequest,
  StaffConsultResponse,
} from '../types';

/**
 * Staff Analyzer Service
 * Analyzes staff utilization, performance, and provides optimization recommendations
 */
export class StaffAnalyzerService {
  private readonly TARGET_UTILIZATION = 0.85; // 85% target
  private readonly PRIME_HOURS = [10, 11, 12, 14, 15, 16, 17]; // Peak business hours

  /**
   * Analyze staff utilization and provide recommendations
   */
  async analyzeStaff(request: StaffConsultRequest): Promise<StaffConsultResponse> {
    const { staff, services, appointments } = request;

    // Calculate utilization for each staff member
    const utilizationData = this.calculateUtilization(staff, services, appointments);

    // Perform analysis
    const analysis = this.performAnalysis(utilizationData, staff, services);

    // Generate rebooking campaigns
    const rebookingCampaigns = this.generateRebookingCampaigns(staff, appointments);

    // Identify training needs
    const trainingNeeds = this.identifyTrainingNeeds(staff, utilizationData);

    return {
      analysis,
      rebookingCampaigns,
      trainingNeeds,
    };
  }

  /**
   * Calculate utilization metrics for each staff member
   */
  private calculateUtilization(
    staff: StaffMember[],
    services: Service[],
    appointments: Appointment[]
  ): StaffUtilization[] {
    return staff.map(member => {
      // Calculate total capacity (assuming 8 hours/day, 26 working days)
      const workingHoursPerDay = 8;
      const workingDaysPerMonth = 26;
      const totalCapacityMinutes = workingHoursPerDay * 60 * workingDaysPerMonth;

      // Calculate booked minutes from appointments
      const memberAppointments = appointments.filter(
        apt => apt.staffId === member.id && apt.status === 'completed'
      );
      const bookedMinutes = memberAppointments.reduce(
        (sum, apt) => sum + apt.duration,
        0
      );

      // Calculate utilization
      const utilizationPercent = (bookedMinutes / totalCapacityMinutes) * 100;

      // Calculate revenue
      const revenue = memberAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0);

      // Revenue per hour
      const workingMinutes = totalCapacityMinutes;
      const revenuePerHour = (revenue / workingMinutes) * 60;

      // Calculate peak hours utilization
      const peakHours = this.calculatePeakHours(memberAppointments);

      // Determine trend
      const utilizationTrend = this.calculateTrend(member.monthlyClients, member.rating);

      return {
        staffId: member.id,
        staffName: member.name,
        role: member.role,
        totalCapacity: totalCapacityMinutes,
        bookedMinutes,
        utilizationPercent: Math.round(utilizationPercent * 10) / 10,
        revenue,
        revenuePerHour: Math.round(revenuePerHour * 100) / 100,
        avgClientRating: member.rating,
        peakHours,
        utilizationTrend,
      };
    });
  }

  /**
   * Calculate peak hours utilization
   */
  private calculatePeakHours(
    appointments: Appointment[]
  ): { hour: number; utilization: number }[] {
    const hourCounts = new Map<number, number>();

    for (const apt of appointments) {
      const hour = new Date(apt.dateTime).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }

    return this.PRIME_HOURS.map(hour => ({
      hour,
      utilization: hourCounts.get(hour) || 0,
    }));
  }

  /**
   * Calculate utilization trend based on performance
   */
  private calculateTrend(
    monthlyClients: number,
    rating: number
  ): 'up' | 'down' | 'stable' {
    if (monthlyClients > 50 && rating >= 4.5) return 'up';
    if (monthlyClients < 20 && rating < 4) return 'down';
    return 'stable';
  }

  /**
   * Perform comprehensive analysis
   */
  private performAnalysis(
    utilizationData: StaffUtilization[],
    staff: StaffMember[],
    services: Service[]
  ): StaffAnalysis {
    const totalCapacity = utilizationData.reduce((sum, u) => sum + u.totalCapacity, 0);
    const totalBooked = utilizationData.reduce((sum, u) => sum + u.bookedMinutes, 0);
    const overallUtilization = (totalBooked / totalCapacity) * 100;

    // Sort and identify top performers (above target)
    const sorted = [...utilizationData].sort(
      (a, b) => b.utilizationPercent - a.utilizationPercent
    );
    const topPerformers = sorted.filter(u => u.utilizationPercent >= 85);
    const underperformers = sorted.filter(u => u.utilizationPercent < 70);

    // Utilization by role
    const roleMap = new Map<string, { total: number; count: number }>();
    for (const u of utilizationData) {
      const current = roleMap.get(u.role) || { total: 0, count: 0 };
      current.total += u.utilizationPercent;
      current.count += 1;
      roleMap.set(u.role, current);
    }
    const utilizationByRole = Array.from(roleMap.entries()).map(([role, data]) => ({
      role,
      utilization: Math.round((data.total / data.count) * 10) / 10,
      staffCount: data.count,
    }));

    // Revenue by staff
    const revenueByStaff = utilizationData
      .map(u => ({ staffId: u.staffId, name: u.staffName, revenue: u.revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    // Identify capacity gaps
    const capacityGaps = this.identifyCapacityGaps(utilizationData);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      utilizationData,
      topPerformers,
      underperformers,
      overallUtilization
    );

    return {
      overallUtilization: Math.round(overallUtilization * 10) / 10,
      targetUtilization: this.TARGET_UTILIZATION * 100,
      topPerformers,
      underperformers,
      utilizationByRole,
      revenueByStaff,
      capacityGaps,
      recommendations,
    };
  }

  /**
   * Identify capacity gaps
   */
  private identifyCapacityGaps(
    utilizationData: StaffUtilization[]
  ): { timeSlot: string; shortfall: number; recommendation: string }[] {
    const gaps: { timeSlot: string; shortfall: number; recommendation: string }[] = [];

    // Check for low utilization periods
    const lowUtilStaff = utilizationData.filter(u => u.utilizationPercent < 70);
    if (lowUtilStaff.length > 0) {
      gaps.push({
        timeSlot: 'Morning (9AM-12PM)',
        shortfall: lowUtilStaff.length,
        recommendation: 'Consider promotional morning slots or walk-in discounts',
      });
    }

    // Check for underperforming staff
    const underperformers = utilizationData.filter(u => u.utilizationPercent < 60);
    if (underperformers.length > 0) {
      gaps.push({
        timeSlot: 'Off-peak hours',
        shortfall: underperformers.length,
        recommendation: 'Cross-train underperformers or adjust schedules to match demand',
      });
    }

    return gaps;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    utilizationData: StaffUtilization[],
    topPerformers: StaffUtilization[],
    underperformers: StaffUtilization[],
    overallUtilization: number
  ): StaffAnalysis['recommendations'] {
    const recommendations: StaffAnalysis['recommendations'] = [];

    // Overall utilization recommendation
    if (overallUtilization < 75) {
      recommendations.push({
        category: 'scheduling',
        action: 'Review and optimize staff scheduling to match demand patterns',
        expectedImpact: 15,
        priority: 'high',
      });
    }

    // Rebooking recommendations for top performers
    for (const performer of topPerformers.slice(0, 3)) {
      recommendations.push({
        category: 'rebooking',
        action: `Increase rebooking rate for ${performer.staffName} by reminding clients to book follow-up appointments`,
        targetStaff: performer.staffId,
        expectedImpact: 10,
        priority: 'medium',
      });
    }

    // Training recommendations for underperformers
    for (const underperformer of underperformers) {
      recommendations.push({
        category: 'training',
        action: `Provide advanced training for ${underperformer.staffName} to improve skills and client satisfaction`,
        targetStaff: underperformer.staffId,
        expectedImpact: 8,
        priority: 'high',
      });
    }

    // Pricing recommendations
    const highPerformers = utilizationData.filter(u => u.revenuePerHour > 500);
    if (highPerformers.length > 0) {
      recommendations.push({
        category: 'pricing',
        action: 'Consider premium pricing for top performers with high demand',
        expectedImpact: 12,
        priority: 'medium',
      });
    }

    // Incentive recommendations
    recommendations.push({
      category: 'incentive',
      action: 'Implement commission-based incentives for staff exceeding 90% utilization',
      expectedImpact: 20,
      priority: 'high',
    });

    return recommendations;
  }

  /**
   * Generate rebooking campaigns
   */
  private generateRebookingCampaigns(
    staff: StaffMember[],
    appointments: Appointment[]
  ): StaffConsultResponse['rebookingCampaigns'] {
    const campaigns: StaffConsultResponse['rebookingCampaigns'] = [];

    for (const member of staff) {
      // Find last visit dates for clients
      const memberClients = new Set(
        appointments
          .filter(apt => apt.staffId === member.id && apt.status === 'completed')
          .map(apt => apt.clientId)
      );

      // Find at-risk clients (clients who haven't rebooked within 45 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 45);

      const atRiskClients = Array.from(memberClients).filter(clientId => {
        const lastApt = appointments
          .filter(apt => apt.clientId === clientId && apt.staffId === member.id)
          .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())[0];
        return lastApt && new Date(lastApt.dateTime) < thirtyDaysAgo;
      });

      if (atRiskClients.length > 0) {
        campaigns.push({
          targetStaff: member.name,
          clientCount: atRiskClients.length,
          action: `Send personalized rebooking offer to ${atRiskClients.length} clients who haven\'t visited in 45+ days`,
          expectedRetentionLift: 15,
        });
      }
    }

    return campaigns;
  }

  /**
   * Identify training needs
   */
  private identifyTrainingNeeds(
    staff: StaffMember[],
    utilizationData: StaffUtilization[]
  ): StaffConsultResponse['trainingNeeds'] {
    const trainingNeeds: StaffConsultResponse['trainingNeeds'] = [];

    // Group by experience and rating
    const lowRatedStaff = utilizationData.filter(u => u.avgClientRating < 4);
    if (lowRatedStaff.length > 0) {
      trainingNeeds.push({
        skill: 'Customer Service & Communication',
        staffIds: lowRatedStaff.map(u => u.staffId),
        priority: 'urgent',
      });
    }

    // Styling skills
    const stylists = staff.filter(s =>
      s.role.includes('stylist') || s.role.includes('colorist')
    );
    const lowRatingStylists = stylists.filter(s => s.rating < 4.2);
    if (lowRatingStylists.length > 0) {
      trainingNeeds.push({
        skill: 'Advanced Hair Styling Techniques',
        staffIds: lowRatingStylists.map(s => s.id),
        priority: 'high',
      });
    }

    // New staff (less than 1 year experience)
    const newStaff = staff.filter(s => s.experience < 1);
    if (newStaff.length > 0) {
      trainingNeeds.push({
        skill: 'Product Knowledge & Upselling',
        staffIds: newStaff.map(s => s.id),
        priority: 'medium',
      });
    }

    return trainingNeeds;
  }
}

export const staffAnalyzerService = new StaffAnalyzerService();
