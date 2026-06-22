import OpenAI from 'openai';
import { config } from '../config';
import { Appointment, Patient } from '../models';
import { AgentType } from '../types';

export interface ClinicMetrics {
  totalPatients: number;
  newPatientsThisMonth: number;
  appointmentsThisMonth: number;
  averageDailyAppointments: number;
  cancellationRate: number;
  noShowRate: number;
  returningPatientRate: number;
  averageRevenuePerPatient: number;
}

export interface GrowthRecommendation {
  category: 'acquisition' | 'retention' | 'operations' | 'revenue';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: string;
  actionSteps: string[];
}

export class GrowthConsultantAgent {
  private openai: OpenAI;
  private agentType: AgentType = 'growth_consultant';

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async calculateMetrics(clinicId: string): Promise<ClinicMetrics> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalPatients,
      newPatientsThisMonth,
      appointmentsThisMonth,
      appointmentsLastMonth,
      cancelledLastMonth,
      noShowLastMonth,
    ] = await Promise.all([
      Patient.countDocuments({ clinicId, isActive: true }),
      Patient.countDocuments({ clinicId, isActive: true, createdAt: { $gte: monthStart } }),
      Appointment.countDocuments({ clinicId, date: { $gte: monthStart } }),
      Appointment.countDocuments({ clinicId, date: { $gte: lastMonth, $lte: lastMonthEnd } }),
      Appointment.countDocuments({ clinicId, date: { $gte: lastMonth, $lte: lastMonthEnd }, status: 'cancelled' }),
      Appointment.countDocuments({ clinicId, date: { $gte: lastMonth, $lte: lastMonthEnd }, status: 'no_show' }),
    ]);

    const daysInMonth = now.getDate();
    const totalAppointmentsLastMonth = appointmentsLastMonth + cancelledLastMonth + noShowLastMonth;

    return {
      totalPatients,
      newPatientsThisMonth,
      appointmentsThisMonth,
      averageDailyAppointments: Math.round(appointmentsThisMonth / daysInMonth * 10) / 10,
      cancellationRate: totalAppointmentsLastMonth > 0
        ? Math.round((cancelledLastMonth / totalAppointmentsLastMonth) * 100)
        : 0,
      noShowRate: totalAppointmentsLastMonth > 0
        ? Math.round((noShowLastMonth / totalAppointmentsLastMonth) * 100)
        : 0,
      returningPatientRate: 0, // Would require more complex query
      averageRevenuePerPatient: 0, // Would require payment integration
    };
  }

  async generateRecommendations(metrics: ClinicMetrics): Promise<GrowthRecommendation[]> {
    const recommendations: GrowthRecommendation[] = [];

    // High cancellation rate
    if (metrics.cancellationRate > 15) {
      recommendations.push({
        category: 'operations',
        priority: 'high',
        title: 'Reduce Cancellation Rate',
        description: `Your cancellation rate of ${metrics.cancellationRate}% is above the recommended 10%.`,
        expectedImpact: '10-15% increase in effective appointments',
        actionSteps: [
          'Implement 24-hour reminder calls/SMS',
          'Add cancellation policy with advance notice',
          'Offer waitlist for popular slots',
          'Send day-before confirmation',
        ],
      });
    }

    // High no-show rate
    if (metrics.noShowRate > 10) {
      recommendations.push({
        category: 'retention',
        priority: 'high',
        title: 'Reduce No-Show Rate',
        description: `No-show rate of ${metrics.noShowRate}% indicates patient engagement issues.`,
        expectedImpact: 'Increased patient compliance',
        actionSteps: [
          'Implement WhatsApp reminders',
          'Create no-show policy with consequences',
          'Offer teleconsult alternatives',
          'Track reasons for no-shows',
        ],
      });
    }

    // Low patient acquisition
    if (metrics.newPatientsThisMonth < 10) {
      recommendations.push({
        category: 'acquisition',
        priority: 'medium',
        title: 'Boost Patient Acquisition',
        description: 'Consider increasing marketing efforts to attract new patients.',
        expectedImpact: '20-30% increase in new patients',
        actionSteps: [
          'List on Google Maps and local directories',
          'Encourage patient referrals',
          'Offer first-visit discount',
          'Partner with local businesses',
        ],
      });
    }

    // Return recommendations sorted by priority
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  async generateMonthlyReport(
    clinicId: string,
    metrics: ClinicMetrics,
    recommendations: GrowthRecommendation[]
  ): Promise<string> {
    const prompt = `Generate a monthly clinic performance report.

Key Metrics:
- Total Patients: ${metrics.totalPatients}
- New Patients: ${metrics.newPatientsThisMonth}
- Appointments: ${metrics.appointmentsThisMonth}
- Avg Daily Appointments: ${metrics.averageDailyAppointments}
- Cancellation Rate: ${metrics.cancellationRate}%
- No-Show Rate: ${metrics.noShowRate}%

Priority Recommendations:
${recommendations.map((r) => `- ${r.title} (${r.priority})`).join('\n')}

Write a professional monthly report with insights and action items.`;

    const completion = await this.openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: 'You are a clinic growth consultant preparing monthly reports.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 600,
    });

    return completion.choices[0]?.message?.content || 'Report generation failed.';
  }

  async predictDemand(
    clinicId: string,
    daysAhead: number = 7
  ): Promise<{
    predictedAppointments: number;
    peakHours: string[];
    recommendedActions: string[];
  }> {
    // Analyze historical patterns
    const appointments = await Appointment.find({
      clinicId,
      date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }).select('date startTime status');

    const hourlyDistribution: Record<number, number> = {};
    const dailyDistribution: Record<number, number> = {};

    for (const apt of appointments) {
      if (apt.status === 'cancelled' || apt.status === 'no_show') continue;

      const hour = parseInt(apt.startTime.split(':')[0], 10);
      const day = new Date(apt.date).getDay();

      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
      dailyDistribution[day] = (dailyDistribution[day] || 0) + 1;
    }

    const peakHours = Object.entries(hourlyDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`);

    const avgDaily = Object.values(dailyDistribution).reduce((a, b) => a + b, 0) / 30 || 0;
    const predicted = Math.round(avgDaily * daysAhead);

    return {
      predictedAppointments: predicted,
      peakHours,
      recommendedActions: this.generateDemandActions(hourlyDistribution, dailyDistribution),
    };
  }

  private generateDemandActions(
    hourly: Record<number, number>,
    daily: Record<number, number>
  ): string[] {
    const actions: string[] = [];

    // Find slow periods
    const avgPerHour = Object.values(hourly).reduce((a, b) => a + b, 0) / Object.keys(hourly).length || 0;

    for (const [hour, count] of Object.entries(hourly)) {
      if (count < avgPerHour * 0.5) {
        actions.push(`Consider promotional rates for ${hour}:00 slot`);
      }
    }

    // Find slow days
    const avgPerDay = Object.values(daily).reduce((a, b) => a + b, 0) / 7 || 0;

    for (const [day, count] of Object.entries(daily)) {
      if (count < avgPerDay * 0.5) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        actions.push(`Promote appointments on ${dayNames[parseInt(day)]}`);
      }
    }

    return actions.slice(0, 3);
  }
}

export const growthConsultantAgent = new GrowthConsultantAgent();
