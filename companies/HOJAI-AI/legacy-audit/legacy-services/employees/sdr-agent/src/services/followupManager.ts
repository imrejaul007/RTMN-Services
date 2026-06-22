// ============================================
// HOJAI AI - SDR Agent Follow-up Manager Service
// ============================================

import { v4 as uuidv4 } from 'uuid';
import { Followup, Lead, Outreach, Activity, Contact } from '../models';
import {
  IFollowup,
  OutreachChannel,
  FollowupStatus,
  LeadStage
} from '../types';
import { logger } from '../utils/logger';

export interface FollowupSequence {
  id: string;
  name: string;
  steps: FollowupStep[];
  isActive: boolean;
}

export interface FollowupStep {
  order: number;
  channel: OutreachChannel;
  delayDays: number;
  delayHours?: number;
  message: string;
  subject?: string;
  skipIf?: {
    replied?: boolean;
    opened?: boolean;
    clicked?: boolean;
  };
}

export interface FollowupConfig {
  sequences: FollowupSequence[];
  defaultSequence: string;
  maxFollowups: number;
  timezone: string;
  businessHours: {
    start: number; // Hour (0-23)
    end: number;
  };
}

export class FollowupManager {
  private config: FollowupConfig;

  constructor(config?: Partial<FollowupConfig>) {
    this.config = {
      sequences: config?.sequences || this.getDefaultSequences(),
      defaultSequence: config?.defaultSequence || 'default-nurture',
      maxFollowups: config?.maxFollowups || 5,
      timezone: config?.timezone || 'America/New_York',
      businessHours: config?.businessHours || { start: 9, end: 17 }
    };
  }

  /**
   * Schedule follow-ups for a lead
   */
  async scheduleFollowups(
    tenantId: string,
    leadId: string,
    followups: {
      channel: OutreachChannel;
      scheduledAt: string;
      message?: string;
      reminder?: boolean;
    }[],
    ownerId?: string
  ): Promise<{
    success: boolean;
    followups: IFollowup[];
    error?: string;
  }> {
    logger.info('Scheduling follow-ups', { tenantId, leadId, count: followups.length });

    // Validate lead exists
    const lead = await Lead.findOne({ _id: leadId, tenantId });
    if (!lead) {
      return {
        success: false,
        followups: [],
        error: 'Lead not found'
      };
    }

    // Check max followups
    const existingCount = await Followup.countDocuments({
      tenantId,
      leadId: lead._id,
      status: { $ne: FollowupStatus.SKIPPED }
    });

    if (existingCount + followups.length > this.config.maxFollowups) {
      return {
        success: false,
        followups: [],
        error: `Maximum followups (${this.config.maxFollowups}) would be exceeded`
      };
    }

    // Create followup records
    const createdFollowups: IFollowup[] = [];
    const now = new Date();

    for (const followup of followups) {
      const scheduledDate = new Date(followup.scheduledAt);

      // Only schedule future followups
      if (scheduledDate <= now) {
        continue;
      }

      const followupDoc = await Followup.create({
        tenantId,
        leadId: lead._id,
        channel: followup.channel,
        status: FollowupStatus.SCHEDULED,
        scheduledFor: scheduledDate,
        message: followup.message,
        metadata: {
          reminder: followup.reminder !== false,
          createdBy: ownerId
        }
      });

      createdFollowups.push(this.mapToIFollowup(followupDoc));
    }

    // Update lead's next followup
    if (createdFollowups.length > 0) {
      const nextFollowup = createdFollowups.reduce((earliest, f) => {
        const fDate = new Date(f.scheduledFor);
        const eDate = new Date(earliest.scheduledFor);
        return fDate < eDate ? f : earliest;
      });

      await Lead.findByIdAndUpdate(lead._id, {
        nextFollowupAt: new Date(nextFollowup.scheduledFor)
      });

      // Log activity
      await Activity.create({
        tenantId,
        leadId: lead._id,
        type: 'followup',
        description: `Scheduled ${createdFollowups.length} follow-up(s)`,
        metadata: {
          followupIds: createdFollowups.map(f => f.id),
          channels: createdFollowups.map(f => f.channel)
        },
        createdBy: ownerId || 'system'
      });
    }

    logger.info(`Scheduled ${createdFollowups.length} follow-ups`, { tenantId, leadId });

    return {
      success: true,
      followups: createdFollowups
    };
  }

  /**
   * Schedule follow-ups using a predefined sequence
   */
  async scheduleSequence(
    tenantId: string,
    leadId: string,
    sequenceId?: string,
    startDate?: string,
    ownerId?: string
  ): Promise<{
    success: boolean;
    followups: IFollowup[];
    sequence: string;
  }> {
    const sequence = this.config.sequences.find(s => s.id === (sequenceId || this.config.defaultSequence));
    if (!sequence) {
      throw new Error(`Sequence ${sequenceId || this.config.defaultSequence} not found`);
    }

    const start = startDate ? new Date(startDate) : new Date();
    const followups: {
      channel: OutreachChannel;
      scheduledAt: string;
      message?: string;
      reminder?: boolean;
    }[] = [];

    let currentDate = new Date(start);

    for (const step of sequence.steps) {
      // Calculate delay
      currentDate.setDate(currentDate.getDate() + step.delayDays);
      if (step.delayHours) {
        currentDate.setHours(currentDate.getHours() + step.delayHours);
      }

      // Skip if conditions met
      if (step.skipIf) {
        const lead = await Lead.findOne({ _id: leadId, tenantId });
        const latestOutreach = await Outreach.findOne({ tenantId, leadId: lead?._id })
          .sort({ createdAt: -1 });

        if (step.skipIf.replied && latestOutreach?.repliedAt) {
          continue;
        }
        if (step.skipIf.opened && latestOutreach?.openedAt) {
          continue;
        }
        if (step.skipIf.clicked && latestOutreach?.clickedAt) {
          continue;
        }
      }

      followups.push({
        channel: step.channel,
        scheduledAt: currentDate.toISOString(),
        message: step.message,
        reminder: true
      });
    }

    const result = await this.scheduleFollowups(tenantId, leadId, followups, ownerId);

    return {
      success: result.success,
      followups: result.followups,
      sequence: sequence.id
    };
  }

  /**
   * Get pending followups for a tenant
   */
  async getPendingFollowups(
    tenantId: string,
    options?: {
      channel?: OutreachChannel;
      before?: Date;
      after?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    followups: (IFollowup & { contact: { firstName: string; lastName?: string; email?: string; phone?: string } })[];
    total: number;
  }> {
    const query: Record<string, unknown> = {
      tenantId,
      status: FollowupStatus.SCHEDULED,
      scheduledFor: {}
    };

    if (options?.channel) {
      query.channel = options.channel;
    }

    if (options?.before) {
      (query.scheduledFor as Record<string, Date>).$lte = options.before;
    }

    if (options?.after) {
      (query.scheduledFor as Record<string, Date>).$gte = options.after;
    } else {
      (query.scheduledFor as Record<string, Date>).$lte = new Date();
    }

    const total = await Followup.countDocuments(query);

    const followups = await Followup.find(query)
      .sort({ scheduledFor: 1 })
      .skip(options?.offset || 0)
      .limit(options?.limit || 50)
      .populate('leadId');

    // Enrich with contact info
    const enrichedFollowups = await Promise.all(
      followups.map(async (f) => {
        const lead = f.leadId as unknown as { contactId: mongoose.Types.ObjectId };
        const contact = await Contact.findById(lead.contactId);

        return {
          ...this.mapToIFollowup(f),
          contact: contact ? {
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone
          } : { firstName: 'Unknown' }
        };
      })
    );

    return { followups: enrichedFollowups, total };
  }

  /**
   * Mark followup as completed
   */
  async completeFollowup(
    tenantId: string,
    followupId: string,
    options?: {
      outreachId?: string;
      skipped?: boolean;
      skipReason?: string;
    },
    completedBy?: string
  ): Promise<IFollowup | null> {
    const followup = await Followup.findOne({ _id: followupId, tenantId });
    if (!followup) {
      return null;
    }

    if (options?.skipped) {
      followup.status = FollowupStatus.SKIPPED;
      followup.skippedReason = options.skipReason;
      followup.completedAt = new Date();
    } else {
      followup.status = FollowupStatus.COMPLETED;
      followup.sentAt = new Date();
      followup.completedAt = new Date();
      if (options?.outreachId) {
        followup.outreachId = new (require('mongoose').Types.ObjectId)(options.outreachId);
      }
    }

    await followup.save();

    // Log activity
    await Activity.create({
      tenantId,
      leadId: followup.leadId,
      type: options?.skipped ? 'followup' : 'followup',
      description: options?.skipped
        ? `Follow-up skipped: ${options.skipReason}`
        : 'Follow-up completed',
      metadata: { followupId: followup._id },
      createdBy: completedBy || 'system'
    });

    // Update lead's next followup
    const nextFollowup = await Followup.findOne({
      tenantId,
      leadId: followup.leadId,
      status: FollowupStatus.SCHEDULED,
      _id: { $ne: followup._id }
    }).sort({ scheduledFor: 1 });

    await Lead.findByIdAndUpdate(followup.leadId, {
      nextFollowupAt: nextFollowup ? nextFollowup.scheduledFor : null
    });

    return this.mapToIFollowup(followup);
  }

  /**
   * Reschedule a followup
   */
  async rescheduleFollowup(
    tenantId: string,
    followupId: string,
    newScheduledAt: string,
    rescheduledBy?: string
  ): Promise<IFollowup | null> {
    const followup = await Followup.findOne({ _id: followupId, tenantId });
    if (!followup) {
      return null;
    }

    const oldDate = followup.scheduledFor;
    followup.scheduledFor = new Date(newScheduledAt);
    followup.status = FollowupStatus.SCHEDULED;
    await followup.save();

    // Log activity
    await Activity.create({
      tenantId,
      leadId: followup.leadId,
      type: 'followup',
      description: `Follow-up rescheduled from ${oldDate} to ${newScheduledAt}`,
      metadata: { followupId: followup._id, oldDate, newDate: newScheduledAt },
      createdBy: rescheduledBy || 'system'
    });

    // Update lead's next followup
    const nextFollowup = await Followup.findOne({
      tenantId,
      leadId: followup.leadId,
      status: FollowupStatus.SCHEDULED,
      _id: { $ne: followup._id }
    }).sort({ scheduledFor: 1 });

    await Lead.findByIdAndUpdate(followup.leadId, {
      nextFollowupAt: nextFollowup ? nextFollowup.scheduledFor : null
    });

    return this.mapToIFollowup(followup);
  }

  /**
   * Cancel all pending followups for a lead
   */
  async cancelFollowups(
    tenantId: string,
    leadId: string,
    reason?: string,
    cancelledBy?: string
  ): Promise<number> {
    const result = await Followup.updateMany(
      { tenantId, leadId, status: FollowupStatus.SCHEDULED },
      {
        $set: {
          status: FollowupStatus.SKIPPED,
          skippedReason: reason || 'Cancelled manually',
          completedAt: new Date()
        }
      }
    );

    // Clear lead's next followup
    await Lead.findByIdAndUpdate(leadId, { nextFollowupAt: null });

    // Log activity
    await Activity.create({
      tenantId,
      leadId,
      type: 'followup',
      description: `Cancelled ${result.modifiedCount} follow-up(s): ${reason || 'No reason provided'}`,
      metadata: { cancelledCount: result.modifiedCount },
      createdBy: cancelledBy || 'system'
    });

    return result.modifiedCount;
  }

  /**
   * Get followup statistics
   */
  async getFollowupStats(
    tenantId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalScheduled: number;
    totalCompleted: number;
    totalSkipped: number;
    completionRate: number;
    avgTimeToComplete: number;
    byChannel: Record<OutreachChannel, { completed: number; skipped: number; pending: number }>;
  }> {
    const matchStage: Record<string, unknown> = { tenantId };

    if (dateRange) {
      matchStage.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalScheduled: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', FollowupStatus.COMPLETED] }, 1, 0] }
          },
          skipped: {
            $sum: { $cond: [{ $eq: ['$status', FollowupStatus.SKIPPED] }, 1, 0] }
          },
          byChannel: { $push: '$channel' }
        }
      }
    ];

    const result = await Followup.aggregate(pipeline);

    if (result.length === 0) {
      return {
        totalScheduled: 0,
        totalCompleted: 0,
        totalSkipped: 0,
        completionRate: 0,
        avgTimeToComplete: 0,
        byChannel: this.getEmptyChannelStats()
      };
    }

    const stats = result[0];
    const byChannel: Record<string, { completed: number; skipped: number; pending: number }> = {};

    // Count by channel
    for (const channel of Object.values(OutreachChannel)) {
      byChannel[channel] = { completed: 0, skipped: 0, pending: 0 };
    }

    const followups = await Followup.find(matchStage);
    for (const f of followups) {
      const ch = f.channel;
      if (!byChannel[ch]) byChannel[ch] = { completed: 0, skipped: 0, pending: 0 };
      if (f.status === FollowupStatus.COMPLETED) byChannel[ch].completed++;
      else if (f.status === FollowupStatus.SKIPPED) byChannel[ch].skipped++;
      else byChannel[ch].pending++;
    }

    // Calculate avg time to complete
    const completedFollowups = await Followup.find({
      ...matchStage,
      status: FollowupStatus.COMPLETED,
      completedAt: { $exists: true }
    });

    let avgTime = 0;
    if (completedFollowups.length > 0) {
      const totalMs = completedFollowups.reduce((sum, f) => {
        const ms = (f.completedAt!.getTime() - f.scheduledFor.getTime());
        return sum + ms;
      }, 0);
      avgTime = totalMs / completedFollowups.length / (1000 * 60 * 60); // Hours
    }

    return {
      totalScheduled: stats.totalScheduled,
      totalCompleted: stats.completed,
      totalSkipped: stats.skipped,
      completionRate: stats.totalScheduled > 0
        ? Math.round((stats.completed / stats.totalScheduled) * 100)
        : 0,
      avgTimeToComplete: Math.round(avgTime * 10) / 10,
      byChannel: byChannel as Record<OutreachChannel, { completed: number; skipped: number; pending: number }>
    };
  }

  /**
   * Get default followup sequences
   */
  private getDefaultSequences(): FollowupSequence[] {
    return [
      {
        id: 'default-nurture',
        name: 'Default Nurture Sequence',
        isActive: true,
        steps: [
          {
            order: 1,
            channel: OutreachChannel.EMAIL,
            delayDays: 1,
            message: 'Hi {{firstName}}, just wanted to follow up on my previous message. Would love to connect!',
            skipIf: { replied: true }
          },
          {
            order: 2,
            channel: OutreachChannel.LINKEDIN,
            delayDays: 2,
            message: 'Hi {{firstName}}, connected with you on LinkedIn. Would appreciate connecting!',
            skipIf: { replied: true }
          },
          {
            order: 3,
            channel: OutreachChannel.EMAIL,
            delayDays: 3,
            message: 'Hi {{firstName}}, following up again. Happy to share a case study if helpful.',
            skipIf: { replied: true }
          },
          {
            order: 4,
            channel: OutreachChannel.EMAIL,
            delayDays: 5,
            message: 'Hi {{firstName}}, I\'ll pause here but feel free to reach out if things change!',
            skipIf: { replied: true }
          }
        ]
      },
      {
        id: 'hot-lead-fast',
        name: 'Hot Lead Fast Track',
        isActive: true,
        steps: [
          {
            order: 1,
            channel: OutreachChannel.EMAIL,
            delayDays: 0,
            delayHours: 2,
            message: 'Hi {{firstName}}, thanks for your interest! Let\'s schedule a quick call.',
            skipIf: { replied: true }
          },
          {
            order: 2,
            channel: OutreachChannel.PHONE,
            delayDays: 1,
            message: 'Calling to follow up on your inquiry.',
            skipIf: { replied: true }
          },
          {
            order: 3,
            channel: OutreachChannel.EMAIL,
            delayDays: 2,
            message: 'Hi {{firstName}}, just checking in. Still interested in connecting?',
            skipIf: { replied: true }
          }
        ]
      }
    ];
  }

  /**
   * Get empty channel stats
   */
  private getEmptyChannelStats(): Record<OutreachChannel, { completed: number; skipped: number; pending: number }> {
    const stats: Record<string, { completed: number; skipped: number; pending: number }> = {};
    for (const channel of Object.values(OutreachChannel)) {
      stats[channel] = { completed: 0, skipped: 0, pending: 0 };
    }
    return stats as Record<OutreachChannel, { completed: number; skipped: number; pending: number }>;
  }

  /**
   * Map MongoDB document to IFollowup
   */
  private mapToIFollowup(doc: any): IFollowup {
    return {
      id: (doc._id as mongoose.Types.ObjectId).toString(),
      tenantId: doc.tenantId as string,
      leadId: doc.leadId.toString(),
      outreachId: doc.outreachId?.toString(),
      channel: doc.channel as OutreachChannel,
      status: doc.status as FollowupStatus,
      scheduledFor: doc.scheduledFor as Date,
      message: doc.message as string | undefined,
      sentAt: doc.sentAt as Date | undefined,
      completedAt: doc.completedAt as Date | undefined,
      skippedReason: doc.skippedReason as string | undefined,
      createdAt: doc.createdAt as Date,
      updatedAt: doc.updatedAt as Date
    };
  }
}

import mongoose from 'mongoose';
import { Document } from 'mongoose';
export const followupManager = new FollowupManager();
