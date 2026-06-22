/**
 * Case Manager Agent
 * AI-powered case tracking and deadline management
 */

import { CaseService } from '../services/case-service.js';

export interface CaseAnalysis {
  caseId: string;
  summary: string;
  keyDates: string[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  nextActions: string[];
}

export interface DeadlineAlert {
  deadlineId: string;
  caseId: string;
  caseTitle: string;
  deadlineTitle: string;
  dueDate: string;
  daysRemaining: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  urgency: string;
}

export class CaseManagerAgent {
  private caseService: CaseService;
  private name = 'Case Manager';
  private capabilities = [
    'Case tracking and management',
    'Deadline monitoring',
    'Court date scheduling',
    'Status updates',
    'Client notifications'
  ];

  constructor(caseService: CaseService) {
    this.caseService = caseService;
  }

  /**
   * Process case action
   */
  async processAction(caseId: string, action: string): Promise<any> {
    const caseData = await this.caseService.getCase(caseId);

    if (!caseData) {
      throw new Error(`Case ${caseId} not found`);
    }

    switch (action) {
      case 'analyze':
        return this.analyzeCase(caseData);

      case 'get-upcoming':
        return this.getUpcomingItems(caseId);

      case 'assess-risk':
        return this.assessRisk(caseData);

      case 'suggest-next':
        return this.suggestNextActions(caseData);

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Analyze case and provide insights
   */
  private analyzeCase(caseData: any): CaseAnalysis {
    const now = new Date();
    const upcomingDeadlines = caseData.deadlines
      .filter((d: any) => new Date(d.dueDate) > now && d.status === 'pending')
      .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const upcomingHearings = caseData.hearings
      .filter((h: any) => new Date(h.date) > now && h.status === 'scheduled')
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate risk level
    let riskLevel: CaseAnalysis['riskLevel'] = 'low';
    if (upcomingDeadlines.some((d: any) => this.daysUntil(new Date(d.dueDate)) <= 3)) {
      riskLevel = 'critical';
    } else if (upcomingDeadlines.some((d: any) => this.daysUntil(new Date(d.dueDate)) <= 7)) {
      riskLevel = 'high';
    } else if (caseData.priority === 'high' || caseData.priority === 'urgent') {
      riskLevel = 'medium';
    }

    const recommendations: string[] = [];
    if (upcomingDeadlines.length > 0) {
      recommendations.push(`Focus on upcoming deadline: ${upcomingDeadlines[0].title}`);
    }
    if (caseData.stage === 'intake') {
      recommendations.push('Complete case intake and initial documentation');
    }
    if (caseData.hearings.length === 0 && caseData.status === 'active') {
      recommendations.push('Schedule initial court hearing');
    }

    const nextActions: string[] = [];
    if (upcomingDeadlines.length > 0) {
      nextActions.push('Prepare documents for upcoming deadline');
    }
    if (upcomingHearings.length > 0) {
      nextActions.push('Review case file before hearing');
    }
    nextActions.push('Update case status');

    return {
      caseId: caseData.caseId,
      summary: `${caseData.caseType} case: ${caseData.title}`,
      keyDates: [
        ...upcomingDeadlines.slice(0, 3).map((d: any) => `Deadline: ${d.title} on ${this.formatDate(d.dueDate)}`),
        ...upcomingHearings.slice(0, 2).map((h: any) => `Hearing: ${h.court} on ${this.formatDate(h.date)}`)
      ],
      recommendations,
      riskLevel,
      nextActions
    };
  }

  /**
   * Check deadlines for a case
   */
  async checkDeadlines(caseId?: string): Promise<DeadlineAlert[]> {
    const upcoming = await this.caseService.getUpcomingDeadlines(caseId);

    return upcoming.map(deadline => {
      const dueDate = new Date(deadline.dueDate);
      const daysRemaining = this.daysUntil(dueDate);

      let urgency: string;
      let priority: DeadlineAlert['priority'];

      if (daysRemaining <= 1) {
        urgency = 'URGENT - Due today or tomorrow!';
        priority = 'urgent';
      } else if (daysRemaining <= 3) {
        urgency = 'HIGH - Due within 3 days';
        priority = 'high';
      } else if (daysRemaining <= 7) {
        urgency = 'MEDIUM - Due within a week';
        priority = 'medium';
      } else {
        urgency = 'LOW - Due later';
        priority = 'low';
      }

      // Parse the compound ID
      const parts = deadline.id.split(':');
      const actualCaseId = parts[1];

      return {
        deadlineId: deadline.id,
        caseId: actualCaseId,
        caseTitle: '', // Would need to fetch from case service
        deadlineTitle: deadline.title,
        dueDate: this.formatDate(deadline.dueDate),
        daysRemaining,
        priority,
        urgency
      };
    });
  }

  /**
   * Get upcoming items for a case
   */
  private async getUpcomingItems(caseId: string): Promise<any> {
    const [deadlines, hearings] = await Promise.all([
      this.caseService.getUpcomingDeadlines(caseId),
      this.caseService.getUpcomingHearings(caseId)
    ]);

    return {
      deadlines: deadlines.map(d => ({
        title: d.title,
        dueDate: this.formatDate(d.dueDate),
        daysRemaining: this.daysUntil(new Date(d.dueDate)),
        priority: d.priority
      })),
      hearings: hearings.map(h => ({
        date: this.formatDate(h.date),
        time: h.time || 'TBD',
        court: h.court,
        judge: h.judge || 'TBD'
      }))
    };
  }

  /**
   * Assess risk for a case
   */
  private assessRisk(caseData: any): any {
    const now = new Date();
    const overdueDeadlines = caseData.deadlines
      .filter((d: any) => new Date(d.dueDate) < now && d.status === 'pending');

    let riskScore = 0;
    const riskFactors: string[] = [];

    // Check overdue items
    if (overdueDeadlines.length > 0) {
      riskScore += 30;
      riskFactors.push(`${overdueDeadlines.length} overdue deadlines`);
    }

    // Check priority
    if (caseData.priority === 'urgent') {
      riskScore += 25;
      riskFactors.push('Urgent priority case');
    } else if (caseData.priority === 'high') {
      riskScore += 15;
      riskFactors.push('High priority case');
    }

    // Check age
    const caseAge = (now.getTime() - new Date(caseData.filingDate).getTime()) / (1000 * 60 * 60 * 24);
    if (caseAge > 365) {
      riskScore += 20;
      riskFactors.push('Case over 1 year old');
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore >= 50) riskLevel = 'critical';
    else if (riskScore >= 30) riskLevel = 'high';
    else if (riskScore >= 15) riskLevel = 'medium';
    else riskLevel = 'low';

    return {
      riskScore,
      riskLevel,
      riskFactors,
      recommendation: this.getRiskRecommendation(riskLevel)
    };
  }

  /**
   * Suggest next actions for a case
   */
  private suggestNextActions(caseData: any): string[] {
    const actions: string[] = [];

    // Check for upcoming deadlines
    const now = new Date();
    const urgentDeadlines = caseData.deadlines
      .filter((d: any) => new Date(d.dueDate) <= now && d.status === 'pending');

    if (urgentDeadlines.length > 0) {
      actions.push('URGENT: Complete overdue deadlines immediately');
    }

    // Check for pending hearings
    const nextHearing = caseData.hearings
      .filter((h: any) => new Date(h.date) > now && h.status === 'scheduled')
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    if (nextHearing) {
      const daysToHearing = this.daysUntil(new Date(nextHearing.date));
      if (daysToHearing <= 7) {
        actions.push(`Prepare for hearing on ${this.formatDate(nextHearing.date)}`);
      }
    }

    // Check stage-based actions
    switch (caseData.stage) {
      case 'intake':
        actions.push('Complete client intake and documentation');
        break;
      case 'discovery':
        actions.push('Continue evidence gathering and witness preparation');
        break;
      case 'hearing':
        actions.push('Focus on hearing preparation');
        break;
      case 'judgment':
        actions.push('Await court judgment');
        break;
    }

    return actions;
  }

  // Helper methods
  private daysUntil(date: Date): number {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  private formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  private getRiskRecommendation(riskLevel: string): string {
    switch (riskLevel) {
      case 'critical':
        return 'Immediate attention required. Escalate to senior counsel.';
      case 'high':
        return 'Priority handling needed. Review and address risk factors.';
      case 'medium':
        return 'Monitor closely. Ensure deadlines are met.';
      default:
        return 'Case proceeding normally. Maintain regular updates.';
    }
  }

  // Agent info
  getInfo() {
    return {
      name: this.name,
      capabilities: this.capabilities,
      status: 'active'
    };
  }
}

export default CaseManagerAgent;
