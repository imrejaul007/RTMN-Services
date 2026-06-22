// ============================================
// HOJAI AI - SDR Agent Qualifier Service
// ============================================

import mongoose, { Document } from 'mongoose';
import { Lead, Qualification, Activity, Contact, Company } from '../models';
import {
  ILead,
  IQualification,
  LeadStage,
  LeadScore,
  LeadSource,
  QualificationStatus
} from '../types';
import { logger } from '../utils/logger';

export interface QualifierConfig {
  scoringWeights: {
    budget: number;
    authority: number;
    need: number;
    timeline: number;
  };
  minQualifiedScore: number;
  disqualifyConditions: {
    noBudget: boolean;
    noAuthority: boolean;
    noNeed: boolean;
    noTimeline: boolean;
  };
}

export class QualifierService {
  private config: QualifierConfig;

  constructor(config?: Partial<QualifierConfig>) {
    this.config = {
      scoringWeights: config?.scoringWeights || {
        budget: 25,
        authority: 25,
        need: 30,
        timeline: 20
      },
      minQualifiedScore: config?.minQualifiedScore || 60,
      disqualifyConditions: config?.disqualifyConditions || {
        noBudget: true,
        noAuthority: true,
        noNeed: true,
        noTimeline: true
      }
    };
  }

  /**
   * Qualify a lead using BANT framework
   */
  async qualifyLead(
    tenantId: string,
    leadId: string,
    qualification: {
      budget: {
        hasBudget: boolean;
        amount?: number;
        currency?: string;
        comments?: string;
      };
      authority: {
        level: 'individual' | 'manager' | 'director' | 'vp' | 'cxo' | 'unknown';
        isDecisionMaker: boolean;
        involvesOthers?: boolean;
        comments?: string;
      };
      need: {
        painPoints: string[];
        priority: 'low' | 'medium' | 'high' | 'critical';
        businessImpact?: string;
      };
      timeline: {
        targetClose?: string;
        buyingStage: 'awareness' | 'consideration' | 'decision' | 'none';
        urgency: 'low' | 'medium' | 'high';
      };
    },
    ownerId: string,
    notes?: string
  ): Promise<{
    success: boolean;
    qualification: IQualification;
    lead: ILead;
    disqualified: boolean;
    disqualifyReason?: string;
  }> {
    logger.info('Qualifying lead', { tenantId, leadId });

    // Get lead
    const lead = await Lead.findOne({ _id: leadId, tenantId });
    if (!lead) {
      throw new Error('Lead not found');
    }

    // Calculate score
    const { score, disqualifyReason, breakdown } = this.calculateScore(qualification);
    const isQualified = score >= this.config.minQualifiedScore;
    const isDisqualified = this.shouldDisqualify(qualification);

    // Update or create qualification record
    const qualificationRecord = await Qualification.findOneAndUpdate(
      { leadId: lead._id, tenantId },
      {
        tenantId,
        leadId: lead._id,
        status: isDisqualified
          ? QualificationStatus.DISQUALIFIED
          : isQualified
          ? QualificationStatus.QUALIFIED
          : QualificationStatus.IN_PROGRESS,
        bant: qualification,
        notes: notes || '',
        disqualifyReason: isDisqualified ? disqualifyReason : undefined
      },
      { upsert: true, new: true }
    );

    // Update lead
    const newStage = isDisqualified
      ? LeadStage.CLOSED_LOST
      : isQualified
      ? LeadStage.QUALIFIED
      : lead.stage;

    const newScore = isDisqualified
      ? LeadScore.UNQUALIFIED
      : score >= 80
      ? LeadScore.HOT
      : score >= 50
      ? LeadScore.WARM
      : LeadScore.COLD;

    await Lead.findByIdAndUpdate(lead._id, {
      stage: newStage,
      score: newScore,
      scoreValue: score,
      assignedTo: isQualified ? lead.assignedTo : null
    });

    // Log activity
    await Activity.create({
      tenantId,
      leadId: lead._id,
      type: 'stage_change',
      description: isDisqualified
        ? `Disqualified: ${disqualifyReason}`
        : isQualified
        ? 'Qualified successfully'
        : 'Qualification in progress',
      metadata: { score, breakdown, qualification },
      createdBy: ownerId
    });

    const updatedLead = await Lead.findById(lead._id);

    logger.info('Lead qualified', {
      tenantId,
      leadId,
      score,
      qualified: isQualified,
      disqualified: isDisqualified
    });

    return {
      success: true,
      qualification: this.mapToIQualification(qualificationRecord),
      lead: this.mapToILead(updatedLead!),
      disqualified: isDisqualified,
      disqualifyReason
    };
  }

  /**
   * Get qualification status for a lead
   */
  async getQualification(
    tenantId: string,
    leadId: string
  ): Promise<IQualification | null> {
    const qualification = await Qualification.findOne({
      leadId,
      tenantId
    }).populate('leadId');

    return qualification ? this.mapToIQualification(qualification) : null;
  }

  /**
   * Calculate qualification score using BANT
   */
  private calculateScore(
    qualification: {
      budget: { hasBudget: boolean; amount?: number };
      authority: {
        level: 'individual' | 'manager' | 'director' | 'vp' | 'cxo' | 'unknown';
        isDecisionMaker: boolean;
      };
      need: { painPoints: string[]; priority: 'low' | 'medium' | 'high' | 'critical' };
      timeline: { buyingStage: 'awareness' | 'consideration' | 'decision' | 'none'; urgency: 'low' | 'medium' | 'high' };
    }
  ): { score: number; breakdown: Record<string, number>; disqualifyReason?: string } {
    const breakdown: Record<string, number> = {};

    // Budget Score (0-100)
    let budgetScore = 0;
    if (qualification.budget.hasBudget) {
      if (qualification.budget.amount && qualification.budget.amount > 10000) {
        budgetScore = 100;
      } else if (qualification.budget.amount && qualification.budget.amount > 5000) {
        budgetScore = 75;
      } else if (qualification.budget.amount && qualification.budget.amount > 1000) {
        budgetScore = 50;
      } else {
        budgetScore = 25;
      }
    }
    breakdown.budget = Math.round(budgetScore * (this.config.scoringWeights.budget / 100));

    // Authority Score (0-100)
    let authorityScore = 0;
    if (qualification.authority.isDecisionMaker) {
      switch (qualification.authority.level) {
        case 'cxo':
          authorityScore = 100;
          break;
        case 'vp':
          authorityScore = 85;
          break;
        case 'director':
          authorityScore = 70;
          break;
        case 'manager':
          authorityScore = 50;
          break;
        default:
          authorityScore = 25;
      }
    }
    breakdown.authority = Math.round(authorityScore * (this.config.scoringWeights.authority / 100));

    // Need Score (0-100)
    let needScore = 0;
    const painPointsCount = qualification.need.painPoints.length;
    needScore = Math.min(painPointsCount * 20, 100);

    // Priority multiplier
    switch (qualification.need.priority) {
      case 'critical':
        needScore = Math.max(needScore, 90);
        break;
      case 'high':
        needScore = Math.max(needScore, 70);
        break;
      case 'medium':
        needScore = Math.max(needScore, 50);
        break;
      default:
        needScore = Math.max(needScore, 20);
    }
    breakdown.need = Math.round(needScore * (this.config.scoringWeights.need / 100));

    // Timeline Score (0-100)
    let timelineScore = 0;
    if (qualification.timeline.buyingStage === 'decision') {
      timelineScore = 100;
    } else if (qualification.timeline.buyingStage === 'consideration') {
      timelineScore = 60;
    } else if (qualification.timeline.buyingStage === 'awareness') {
      timelineScore = 30;
    }

    // Urgency multiplier
    switch (qualification.timeline.urgency) {
      case 'high':
        timelineScore = Math.min(timelineScore * 1.3, 100);
        break;
      case 'medium':
        timelineScore = timelineScore * 1;
        break;
      default:
        timelineScore = timelineScore * 0.7;
    }
    breakdown.timeline = Math.round(timelineScore * (this.config.scoringWeights.timeline / 100));

    const totalScore = breakdown.budget + breakdown.authority + breakdown.need + breakdown.timeline;

    return {
      score: Math.min(Math.round(totalScore), 100),
      breakdown
    };
  }

  /**
   * Check if lead should be disqualified
   */
  private shouldDisqualify(
    qualification: {
      budget: { hasBudget: boolean };
      authority: { level: string; isDecisionMaker: boolean };
      need: { painPoints: string[] };
      timeline: { buyingStage: string };
    }
  ): boolean {
    const reasons: string[] = [];

    if (this.config.disqualifyConditions.noBudget && !qualification.budget.hasBudget) {
      reasons.push('No budget');
    }

    if (this.config.disqualifyConditions.noAuthority) {
      if (qualification.authority.level === 'unknown' && !qualification.authority.isDecisionMaker) {
        reasons.push('No authority contact');
      }
    }

    if (this.config.disqualifyConditions.noNeed && qualification.need.painPoints.length === 0) {
      reasons.push('No identified needs');
    }

    if (this.config.disqualifyConditions.noTimeline && qualification.timeline.buyingStage === 'none') {
      reasons.push('No timeline for purchase');
    }

    return reasons.length > 0;
  }

  /**
   * Auto-score a lead based on contact/company data
   */
  async autoScore(
    tenantId: string,
    contactId: string
  ): Promise<{
    score: number;
    scoreBreakdown: {
      companyFit: number;
      roleFit: number;
      engagementFit: number;
      intentFit: number;
    };
    recommendations: string[];
  }> {
    const contact = await Contact.findOne({ _id: contactId, tenantId });
    if (!contact) {
      throw new Error('Contact not found');
    }

    const company = contact.companyId
      ? await Company.findById(contact.companyId)
      : null;

    const breakdown = {
      companyFit: 0,
      roleFit: 0,
      engagementFit: 0,
      intentFit: 0
    };
    const recommendations: string[] = [];

    // Company Fit Scoring
    const targetIndustries = ['SaaS', 'Technology', 'Fintech', 'E-commerce', 'Healthcare'];
    if (contact.industry && targetIndustries.includes(contact.industry)) {
      breakdown.companyFit += 30;
    }

    const targetSizes = ['51-200', '201-500', '501-1000'];
    if (contact.companySize && targetSizes.includes(contact.companySize)) {
      breakdown.companyFit += 20;
    }

    // Role Fit Scoring
    const targetTitles = ['CEO', 'CTO', 'VP', 'Director', 'Head', 'Chief'];
    if (contact.title && targetTitles.some(t => contact.title!.includes(t))) {
      breakdown.roleFit += 40;
    }

    // LinkedIn presence indicates higher engagement likelihood
    if (contact.linkedinUrl) {
      breakdown.roleFit += 10;
    }

    // Engagement Fit (placeholder for actual engagement data)
    const metadata = contact.metadata as Record<string, unknown> | undefined;
    if (metadata?.emailOpens) {
      breakdown.engagementFit = Math.min((metadata.emailOpens as number) * 5, 25);
    }
    if (metadata?.websiteVisits) {
      breakdown.engagementFit += Math.min((metadata.websiteVisits as number) * 3, 25);
    }

    // Intent Fit (placeholder for intent data)
    if (metadata?.searches) {
      breakdown.intentFit = Math.min((metadata.searches as number) * 2, 20);
    }
    if (metadata?.pricingPageViews) {
      breakdown.intentFit += 10;
    }
    if (metadata?.demoRequested) {
      breakdown.intentFit += 20;
    }

    const totalScore =
      breakdown.companyFit +
      breakdown.roleFit +
      breakdown.engagementFit +
      breakdown.intentFit;

    // Generate recommendations
    if (breakdown.companyFit < 40) {
      recommendations.push('Consider if this company matches your ICP');
    }
    if (breakdown.roleFit < 30) {
      recommendations.push('Target may not have decision-making authority');
    }
    if (breakdown.engagementFit < 20) {
      recommendations.push('Increase engagement before outreach');
    }
    if (breakdown.intentFit < 30) {
      recommendations.push('Lead may need more nurturing');
    }

    return {
      score: Math.min(totalScore, 100),
      scoreBreakdown: breakdown,
      recommendations
    };
  }

  /**
   * Map MongoDB document to IQualification
   */
  private mapToIQualification(doc: Document): IQualification {
    const obj = doc.toObject();
    return {
      id: (obj._id as mongoose.Types.ObjectId).toString(),
      tenantId: obj.tenantId,
      leadId: obj.leadId.toString(),
      status: obj.status,
      bant: obj.bant,
      notes: obj.notes,
      disqualifyReason: obj.disqualifyReason,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt
    };
  }

  /**
   * Map MongoDB document to ILead
   */
  private mapToILead(doc: any): ILead {
    return {
      id: (doc._id as mongoose.Types.ObjectId).toString(),
      tenantId: doc.tenantId as string,
      contactId: doc.contactId.toString(),
      companyId: doc.companyId.toString(),
      stage: doc.stage as LeadStage,
      source: doc.source as LeadSource,
      score: doc.score as LeadScore,
      scoreValue: doc.scoreValue as number,
      ownerId: doc.ownerId as string,
      assignedTo: doc.assignedTo as string | null,
      createdAt: doc.createdAt as Date,
      updatedAt: doc.updatedAt as Date,
      lastContactedAt: doc.lastContactedAt as Date | null,
      nextFollowupAt: doc.nextFollowupAt as Date | null
    };
  }
}

export const qualifierService = new QualifierService();
