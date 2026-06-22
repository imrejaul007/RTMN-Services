import {
  Service,
  Appointment,
  Client,
  BookingAnalysis,
  BookingConsultRequest,
  BookingConsultResponse,
} from '../types';

/**
 * Booking Optimizer Service
 * Analyzes booking patterns and provides optimization recommendations
 */
export class BookingOptimizerService {
  private readonly PRIME_HOURS = [10, 11, 12, 14, 15, 16, 17];
  private readonly OFF_PEAK_HOURS = [9, 13, 18, 19];

  /**
   * Analyze booking data and provide optimization recommendations
   */
  async analyze(request: BookingConsultRequest): Promise<BookingConsultResponse> {
    const { services, appointments, clients } = request;

    // Perform analysis
    const analysis = this.performAnalysis(services, appointments, clients);

    // Generate recommendations
    const recommendations = this.generateRecommendations(analysis, services);

    // Find upsell opportunities
    const upsellOpportunities = this.findUpsellOpportunities(services, appointments);

    // Generate retention strategies
    const retentionStrategies = this.generateRetentionStrategies(clients, services);

    return {
      analysis,
      recommendations,
      upsellOpportunities,
      retentionStrategies,
    };
  }

  /**
   * Perform comprehensive booking analysis
   */
  private performAnalysis(
    services: Service[],
    appointments: Appointment[],
    clients: Client[]
  ): BookingAnalysis {
    // Total bookings
    const totalBookings = appointments.length;

    // Calculate booking trends
    const bookingTrends = this.calculateTrends(appointments);

    // Service mix analysis
    const serviceMix = this.analyzeServiceMix(services, appointments);

    // Peak and low slots
    const peakSlots = this.identifyPeakSlots(appointments);
    const lowSlots = this.identifyLowSlots(appointments);

    // Repeat rate
    const repeatRate = this.calculateRepeatRate(clients);

    // No-show rate
    const noShowRate = (appointments.filter(a => a.status === 'no_show').length / totalBookings) * 100;

    // Cancellation rate
    const cancellationRate = (appointments.filter(a => a.status === 'cancelled').length / totalBookings) * 100;

    return {
      totalBookings,
      bookingTrends,
      serviceMix,
      peakSlots,
      lowSlots,
      repeatRate,
      noShowRate,
      cancellationRate,
    };
  }

  /**
   * Calculate booking trends over time
   */
  private calculateTrends(
    appointments: Appointment[]
  ): { week: string; bookings: number; revenue: number }[] {
    const weekMap = new Map<string, { bookings: number; revenue: number }>();

    for (const apt of appointments) {
      const date = new Date(apt.dateTime);
      const weekStart = this.getWeekStart(date);
      const weekKey = weekStart.toISOString().split('T')[0];

      const current = weekMap.get(weekKey) || { bookings: 0, revenue: 0 };
      current.bookings += 1;
      current.revenue += apt.price || 0;
      weekMap.set(weekKey, current);
    }

    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, data]) => ({
        week,
        bookings: data.bookings,
        revenue: data.revenue,
      }));
  }

  /**
   * Get the Monday of the week for a given date
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  /**
   * Analyze service mix
   */
  private analyzeServiceMix(
    services: Service[],
    appointments: Appointment[]
  ): {
    serviceId: string;
    name: string;
    category: string;
    bookings: number;
    revenue: number;
    avgDuration: number;
    upsellRate: number;
    repeatRate: number;
    margin: number;
  }[] {
    const serviceMap = new Map<string, {
      name: string;
      category: string;
      bookings: number;
      revenue: number;
      totalDuration: number;
      upsells: number;
      clients: Set<string>;
    }>();

    for (const apt of appointments) {
      if (apt.status !== 'completed') continue;

      const service = services.find(s => s.id === apt.serviceId);
      if (!service) continue;

      const current = serviceMap.get(apt.serviceId) || {
        name: service.name,
        category: service.category,
        bookings: 0,
        revenue: 0,
        totalDuration: 0,
        upsells: 0,
        clients: new Set(),
      };

      current.bookings += 1;
      current.revenue += apt.price || 0;
      current.totalDuration += apt.duration;
      current.upsells += (apt.upsells?.length || 0);
      if (apt.clientId) current.clients.add(apt.clientId);

      serviceMap.set(apt.serviceId, current);
    }

    return Array.from(serviceMap.entries()).map(([serviceId, data]) => {
      const service = services.find(s => s.id === serviceId)!;
      return {
        serviceId,
        name: data.name,
        category: data.category,
        bookings: data.bookings,
        revenue: data.revenue,
        avgDuration: Math.round(data.totalDuration / data.bookings),
        upsellRate: (data.upsells / data.bookings) * 100,
        repeatRate: (data.clients.size > 0 ? (data.bookings - data.clients.size) / data.bookings : 0) * 100,
        margin: ((service.price - service.cost) / service.price) * 100,
      };
    });
  }

  /**
   * Identify peak booking slots
   */
  private identifyPeakSlots(
    appointments: Appointment[]
  ): { time: string; demand: number; capacity: number }[] {
    const hourCounts = new Map<number, number>();

    for (const apt of appointments) {
      const hour = new Date(apt.dateTime).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }

    return this.PRIME_HOURS.map(hour => {
      const demand = hourCounts.get(hour) || 0;
      return {
        time: `${hour}:00`,
        demand,
        capacity: 10, // Assuming capacity of 10 bookings per hour
      };
    });
  }

  /**
   * Identify low-utilization slots
   */
  private identifyLowSlots(
    appointments: Appointment[]
  ): { time: string; demand: number; utilization: number }[] {
    const hourCounts = new Map<number, number>();

    for (const apt of appointments) {
      const hour = new Date(apt.dateTime).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }

    return this.OFF_PEAK_HOURS.map(hour => {
      const demand = hourCounts.get(hour) || 0;
      const utilization = (demand / 10) * 100;
      return {
        time: `${hour}:00`,
        demand,
        utilization: Math.round(utilization),
      };
    });
  }

  /**
   * Calculate repeat customer rate
   */
  private calculateRepeatRate(clients: Client[]): number {
    const repeatClients = clients.filter(c => c.visitCount > 1).length;
    return clients.length > 0 ? (repeatClients / clients.length) * 100 : 0;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    analysis: BookingAnalysis,
    services: Service[]
  ): BookingConsultResponse['recommendations'] {
    const recommendations: BookingConsultResponse['recommendations'] = [];

    // Timing recommendations
    if (analysis.lowSlots.length > 0) {
      recommendations.push({
        category: 'timing',
        action: 'Implement off-peak pricing to balance demand throughout the day',
        expectedImpact: 15,
        implementation: 'Offer 10-15% discount for appointments between 9AM-11AM and 6PM-8PM',
        priority: 'high',
      });
    }

    // Repeat rate recommendations
    if (analysis.repeatRate < 40) {
      recommendations.push({
        category: 'retention',
        action: 'Launch rebooking incentive program to improve repeat visits',
        expectedImpact: 20,
        implementation: 'Offer loyalty points for every 3rd visit within 60 days',
        priority: 'high',
      });
    }

    // No-show rate recommendations
    if (analysis.noShowRate > 10) {
      recommendations.push({
        category: 'retention',
        action: 'Implement SMS/WhatsApp reminders and confirmation system',
        expectedImpact: 8,
        implementation: 'Send reminder 24 hours and 2 hours before appointment',
        priority: 'high',
      });
    }

    // Cancellation rate recommendations
    if (analysis.cancellationRate > 15) {
      recommendations.push({
        category: 'retention',
        action: 'Introduce cancellation policy with 4-hour notice requirement',
        expectedImpact: 10,
        implementation: 'Implement no-charge cancellation with 4+ hours notice',
        priority: 'medium',
      });
    }

    // Upsell recommendations for low upsell services
    const lowUpsellServices = analysis.serviceMix.filter(s => s.upsellRate < 10);
    if (lowUpsellServices.length > 0) {
      recommendations.push({
        category: 'upsell',
        action: 'Train staff on upselling complementary services',
        expectedImpact: 12,
        implementation: 'Create service pairing scripts for top 5 combinations',
        priority: 'medium',
      });
    }

    // Service mix recommendations
    const topServices = analysis.serviceMix.slice(0, 5);
    if (topServices.length > 0) {
      recommendations.push({
        category: 'service',
        action: 'Create promotional campaigns for high-margin services',
        expectedImpact: 18,
        implementation: 'Feature top 3 performing services in marketing campaigns',
        priority: 'medium',
      });
    }

    return recommendations;
  }

  /**
   * Find upsell opportunities
   */
  private findUpsellOpportunities(
    services: Service[],
    appointments: Appointment[]
  ): BookingConsultResponse['upsellOpportunities'] {
    const opportunities: BookingConsultResponse['upsellOpportunities'] = [];

    // Define common service pairings
    const pairings = [
      { service: 'Haircut', toService: 'Hair Treatment', combination: 'Cut + Treatment', discount: 15 },
      { service: 'Hair Coloring', toService: 'Hair Spa', combination: 'Color + Spa', discount: 10 },
      { service: 'Facial', toService: 'Clean-up', combination: 'Facial + Clean-up', discount: 20 },
      { service: 'Haircut', toService: 'Beard Trim', combination: 'Cut + Beard', discount: 25 },
      { service: 'Hair Treatment', toService: 'Hair Spa', combination: 'Treatment + Spa', discount: 15 },
    ];

    for (const pairing of pairings) {
      const baseService = services.find(
        s => s.name.toLowerCase().includes(pairing.service.toLowerCase())
      );
      const targetService = services.find(
        s => s.name.toLowerCase().includes(pairing.toService.toLowerCase())
      );

      if (baseService && targetService) {
        const pricePoint = Math.round(
          baseService.price * (1 + pairing.discount / 100) + targetService.price * 0.85
        );

        opportunities.push({
          service: baseService.name,
          toService: targetService.name,
          combination: pairing.combination,
          pricePoint,
          marginBoost: pairing.discount,
        });
      }
    }

    return opportunities;
  }

  /**
   * Generate retention strategies
   */
  private generateRetentionStrategies(
    clients: Client[],
    services: Service[]
  ): BookingConsultResponse['retentionStrategies'] {
    const strategies: BookingConsultResponse['retentionStrategies'] = [];

    // New client strategies
    const newClients = clients.filter(c => c.lifecycleStage === 'new');
    if (newClients.length > 0) {
      strategies.push({
        trigger: 'After first visit',
        action: 'Send welcome offer for second visit at 20% discount',
        targetSegment: 'New clients',
        expectedLift: 25,
      });
    }

    // At-risk client strategies
    const atRiskClients = clients.filter(c => c.lifecycleStage === 'at_risk');
    if (atRiskClients.length > 0) {
      strategies.push({
        trigger: 'No visit in 30+ days',
        action: 'Send personalized re-engagement offer with favorite services',
        targetSegment: 'At-risk clients',
        expectedLift: 15,
      });
    }

    // Dormant client strategies
    const dormantClients = clients.filter(c => c.lifecycleStage === 'dormant');
    if (dormantClients.length > 0) {
      strategies.push({
        trigger: 'No visit in 60+ days',
        action: 'Send "We miss you" offer with exclusive discount',
        targetSegment: 'Dormant clients',
        expectedLift: 10,
      });
    }

    // VIP client strategies
    const vipClients = clients.filter(c => c.lifecycleStage === 'VIP');
    if (vipClients.length > 0) {
      strategies.push({
        trigger: 'Birthday month',
        action: 'Offer complimentary premium service upgrade',
        targetSegment: 'VIP clients',
        expectedLift: 30,
      });
    }

    // Regular client strategies
    const regularClients = clients.filter(c => c.lifecycleStage === 'active');
    if (regularClients.length > 0) {
      strategies.push({
        trigger: 'Every 4th visit',
        action: 'Offer loyalty reward or free add-on service',
        targetSegment: 'Regular clients',
        expectedLift: 18,
      });
    }

    return strategies;
  }
}

export const bookingOptimizerService = new BookingOptimizerService();
