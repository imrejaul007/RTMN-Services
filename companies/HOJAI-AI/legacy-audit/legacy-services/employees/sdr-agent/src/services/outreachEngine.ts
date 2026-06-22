// ============================================
// HOJAI AI - SDR Agent Outreach Engine Service
// ============================================

import { v4 as uuidv4 } from 'uuid';
import { Lead, Outreach, Activity, Contact } from '../models';
import {
  IOutreach,
  OutreachChannel,
  OutreachStatus,
  LeadStage,
  OutreachMessageSchema
} from '../types';
import { logger } from '../utils/logger';

export interface OutreachTemplate {
  id: string;
  name: string;
  channel: OutreachChannel;
  subject?: string;
  body: string;
  variables: string[];
  isActive: boolean;
}

export interface OutreachConfig {
  channels: {
    email: {
      enabled: boolean;
      apiKey?: string;
      fromName?: string;
      fromEmail?: string;
      dailyLimit?: number;
    };
    linkedin: {
      enabled: boolean;
      apiKey?: string;
      username?: string;
    };
    phone: {
      enabled: boolean;
      twilioAccountSid?: string;
      twilioAuthToken?: string;
      fromNumber?: string;
    };
    sms: {
      enabled: boolean;
      twilioAccountSid?: string;
      twilioAuthToken?: string;
      fromNumber?: string;
    };
    whatsapp: {
      enabled: boolean;
      twilioAccountSid?: string;
      twilioAuthToken?: string;
      fromNumber?: string;
    };
  };
  templates: OutreachTemplate[];
  personalization: {
    firstName: boolean;
    companyName: boolean;
    title: boolean;
    painPoints: boolean;
    recentNews: boolean;
  };
  scheduling: {
    timezone: string;
    bestTimes: { day: number; hour: number }[];
    avoidTimes: { day: number; hour: number }[];
  };
}

export class OutreachEngine {
  private config: OutreachConfig;

  constructor(config?: Partial<OutreachConfig>) {
    this.config = {
      channels: config?.channels || {
        email: { enabled: true },
        linkedin: { enabled: false },
        phone: { enabled: false },
        sms: { enabled: false },
        whatsapp: { enabled: false }
      },
      templates: config?.templates || this.getDefaultTemplates(),
      personalization: config?.personalization || {
        firstName: true,
        companyName: true,
        title: true,
        painPoints: true,
        recentNews: false
      },
      scheduling: config?.scheduling || {
        timezone: 'America/New_York',
        bestTimes: [
          { day: 1, hour: 9 },
          { day: 1, hour: 14 },
          { day: 2, hour: 10 },
          { day: 3, hour: 11 },
          { day: 4, hour: 9 },
          { day: 4, hour: 15 }
        ],
        avoidTimes: [
          { day: 5, hour: 17 },
          { day: 6, hour: 12 },
          { day: 0, hour: 12 }
        ]
      }
    };
  }

  /**
   * Send outreach message to a lead
   */
  async sendOutreach(
    tenantId: string,
    leadId: string,
    channel: OutreachChannel,
    message: {
      body: string;
      subject?: string;
      templateId?: string;
      personalization?: Record<string, string>;
      attachments?: { name: string; url: string }[];
    },
    scheduledFor?: string,
    ownerId?: string
  ): Promise<{
    success: boolean;
    outreach: IOutreach;
    error?: string;
  }> {
    logger.info('Sending outreach', { tenantId, leadId, channel });

    // Validate channel is enabled
    if (!this.isChannelEnabled(channel)) {
      return {
        success: false,
        outreach: {} as IOutreach,
        error: `${channel} channel is not enabled`
      };
    }

    // Get lead
    const lead = await Lead.findOne({ _id: leadId, tenantId });
    if (!lead) {
      return {
        success: false,
        outreach: {} as IOutreach,
        error: 'Lead not found'
      };
    }

    // Get contact for personalization
    const contact = await Contact.findById(lead.contactId);
    if (!contact) {
      return {
        success: false,
        outreach: {} as IOutreach,
        error: 'Contact not found'
      };
    }

    // Personalize message
    const personalizedMessage = this.personalizeMessage(
      message.body,
      contact,
      message.personalization
    );

    const personalizedSubject = message.subject
      ? this.personalizeMessage(message.subject, contact, message.personalization)
      : undefined;

    // Create outreach record
    const outreach = await Outreach.create({
      tenantId,
      leadId: lead._id,
      channel,
      status: OutreachStatus.PENDING,
      subject: personalizedSubject,
      body: personalizedMessage,
      templateId: message.templateId,
      personalization: message.personalization,
      metadata: {
        attachments: message.attachments,
        scheduledFor,
        createdBy: ownerId
      }
    });

    // If scheduled, mark as pending
    if (scheduledFor) {
      logger.info('Outreach scheduled', { tenantId, leadId, scheduledFor });
      return {
        success: true,
        outreach: this.mapToIOutreach(outreach)
      };
    }

    // Send immediately
    try {
      await this.sendViaChannel(channel, contact, {
        subject: personalizedSubject,
        body: personalizedMessage,
        attachments: message.attachments
      });

      // Update outreach status
      outreach.status = OutreachStatus.SENT;
      outreach.sentAt = new Date();
      await outreach.save();

      // Update lead
      lead.lastContactedAt = new Date();
      if (lead.stage === LeadStage.NEW) {
        lead.stage = LeadStage.CONTACTED;
      }
      await lead.save();

      // Log activity
      await Activity.create({
        tenantId,
        leadId: lead._id,
        type: 'outreach',
        description: `Sent ${channel} outreach`,
        metadata: { outreachId: outreach._id, channel },
        createdBy: ownerId || 'system'
      });

      logger.info('Outreach sent successfully', { tenantId, leadId, outreachId: outreach._id });

      return {
        success: true,
        outreach: this.mapToIOutreach(outreach)
      };
    } catch (error) {
      // Mark as failed
      outreach.status = OutreachStatus.FAILED;
      outreach.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await outreach.save();

      logger.error('Outreach failed', { tenantId, leadId, error });

      return {
        success: false,
        outreach: this.mapToIOutreach(outreach),
        error: outreach.errorMessage
      };
    }
  }

  /**
   * Send outreach via specific channel
   */
  private async sendViaChannel(
    channel: OutreachChannel,
    contact: any,
    message: { subject?: string; body: string; attachments?: { name: string; url: string }[] }
  ): Promise<void> {
    const email = contact.email as string;
    const phone = contact.phone as string;

    switch (channel) {
      case OutreachChannel.EMAIL:
        await this.sendEmail(email, message.subject || '', message.body, message.attachments);
        break;

      case OutreachChannel.LINKEDIN:
        const linkedinUrl = contact.linkedinUrl as string;
        if (!linkedinUrl) throw new Error('No LinkedIn URL for contact');
        await this.sendLinkedInMessage(linkedinUrl, message.body);
        break;

      case OutreachChannel.PHONE:
        if (!phone) throw new Error('No phone number for contact');
        await this.initiateCall(phone, message.body);
        break;

      case OutreachChannel.SMS:
        if (!phone) throw new Error('No phone number for contact');
        await this.sendSMS(phone, message.body);
        break;

      case OutreachChannel.WHATSAPP:
        if (!phone) throw new Error('No phone number for contact');
        await this.sendWhatsApp(phone, message.body);
        break;

      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  /**
   * Send email via configured provider
   */
  private async sendEmail(
    to: string,
    subject: string,
    body: string,
    attachments?: { name: string; url: string }[]
  ): Promise<void> {
    // In production, integrate with SendGrid, Mailgun, AWS SES, etc.
    logger.info('Sending email', { to, subject });

    if (!this.config.channels.email.enabled) {
      throw new Error('Email channel not configured');
    }

    // Simulate email send (in production, call actual email API)
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // await sgMail.send({ to, from: this.config.channels.email.fromEmail, subject, html: body });

    return Promise.resolve();
  }

  /**
   * Send LinkedIn message
   */
  private async sendLinkedInMessage(linkedinUrl: string, message: string): Promise<void> {
    if (!this.config.channels.linkedin.enabled) {
      throw new Error('LinkedIn channel not configured');
    }

    logger.info('Sending LinkedIn message', { linkedinUrl, messageLength: message.length });
    // In production, integrate with LinkedIn API or use a service like Phantombuster
    return Promise.resolve();
  }

  /**
   * Initiate phone call
   */
  private async initiateCall(phone: string, message: string): Promise<void> {
    if (!this.config.channels.phone.enabled) {
      throw new Error('Phone channel not configured');
    }

    logger.info('Initiating call', { phone, messagePreview: message.substring(0, 50) });
    // In production, integrate with Twilio for click-to-call
    return Promise.resolve();
  }

  /**
   * Send SMS
   */
  private async sendSMS(phone: string, message: string): Promise<void> {
    if (!this.config.channels.sms.enabled) {
      throw new Error('SMS channel not configured');
    }

    logger.info('Sending SMS', { phone, messageLength: message.length });
    // In production, integrate with Twilio, AWS SNS, etc.
    return Promise.resolve();
  }

  /**
   * Send WhatsApp message
   */
  private async sendWhatsApp(phone: string, message: string): Promise<void> {
    if (!this.config.channels.whatsapp.enabled) {
      throw new Error('WhatsApp channel not configured');
    }

    logger.info('Sending WhatsApp message', { phone, messageLength: message.length });
    // In production, integrate with Twilio WhatsApp API
    return Promise.resolve();
  }

  /**
   * Personalize message with contact data
   */
  private personalizeMessage(
    template: string,
    contact: any,
    additionalVars?: Record<string, string>
  ): string {
    let personalized = template;

    // Standard variables
    const replacements: Record<string, string> = {
      '{{firstName}}': (contact.firstName as string) || 'there',
      '{{lastName}}': (contact.lastName as string) || '',
      '{{fullName}}': `${contact.firstName}${contact.lastName ? ' ' + contact.lastName : ''}`,
      '{{email}}': (contact.email as string) || '',
      '{{title}}': (contact.title as string) || '',
      '{{company}}': (contact.company as string) || '',
      '{{companySize}}': (contact.companySize as string) || ''
    };

    // Add additional variables
    if (additionalVars) {
      for (const [key, value] of Object.entries(additionalVars)) {
        replacements[`{{${key}}}`] = value;
      }
    }

    // Replace all variables
    for (const [variable, value] of Object.entries(replacements)) {
      personalized = personalized.replace(new RegExp(variable, 'g'), value);
    }

    return personalized;
  }

  /**
   * Check if channel is enabled
   */
  private isChannelEnabled(channel: OutreachChannel): boolean {
    switch (channel) {
      case OutreachChannel.EMAIL:
        return this.config.channels.email.enabled;
      case OutreachChannel.LINKEDIN:
        return this.config.channels.linkedin.enabled;
      case OutreachChannel.PHONE:
        return this.config.channels.phone.enabled;
      case OutreachChannel.SMS:
        return this.config.channels.sms.enabled;
      case OutreachChannel.WHATSAPP:
        return this.config.channels.whatsapp.enabled;
      default:
        return false;
    }
  }

  /**
   * Get outreach history for a lead
   */
  async getOutreachHistory(
    tenantId: string,
    leadId: string
  ): Promise<IOutreach[]> {
    const outreaches = await Outreach.find({ tenantId, leadId })
      .sort({ createdAt: -1 });

    return outreaches.map(o => this.mapToIOutreach(o));
  }

  /**
   * Update outreach status (webhook from external services)
   */
  async updateOutreachStatus(
    tenantId: string,
    outreachId: string,
    status: OutreachStatus,
    metadata?: {
      deliveredAt?: Date;
      openedAt?: Date;
      clickedAt?: Date;
      repliedAt?: Date;
    }
  ): Promise<IOutreach | null> {
    const outreach = await Outreach.findOne({ _id: outreachId, tenantId });
    if (!outreach) {
      return null;
    }

    outreach.status = status;

    if (metadata) {
      if (metadata.deliveredAt) outreach.deliveredAt = metadata.deliveredAt;
      if (metadata.openedAt) outreach.openedAt = metadata.openedAt;
      if (metadata.clickedAt) outreach.clickedAt = metadata.clickedAt;
      if (metadata.repliedAt) outreach.repliedAt = metadata.repliedAt;
    }

    await outreach.save();

    // Log activity if opened/clicked/replied
    if (status === OutreachStatus.OPENED) {
      await Activity.create({
        tenantId,
        leadId: outreach.leadId,
        type: 'email_opened',
        description: 'Opened email',
        metadata: { outreachId: outreach._id },
        createdBy: 'system'
      });
    } else if (status === OutreachStatus.CLICKED) {
      await Activity.create({
        tenantId,
        leadId: outreach.leadId,
        type: 'email_clicked',
        description: 'Clicked link in email',
        metadata: { outreachId: outreach._id },
        createdBy: 'system'
      });
    } else if (status === OutreachStatus.REPLIED) {
      await Activity.create({
        tenantId,
        leadId: outreach.leadId,
        type: 'email_replied',
        description: 'Replied to email',
        metadata: { outreachId: outreach._id },
        createdBy: 'system'
      });

      // Update lead stage to qualified if first reply
      await Lead.findByIdAndUpdate(outreach.leadId, {
        stage: LeadStage.QUALIFIED
      });
    }

    return this.mapToIOutreach(outreach);
  }

  /**
   * Get best time to send outreach
   */
  getBestSendTime(timezone?: string): Date {
    const tz = timezone || this.config.scheduling.timezone;
    const now = new Date();

    // Simple implementation: return next best time slot
    // In production, use proper timezone handling with libraries like luxon or date-fns-tz

    const nextBestTime = new Date(now);
    nextBestTime.setDate(nextBestTime.getDate() + 1);
    nextBestTime.setHours(9, 0, 0, 0);

    return nextBestTime;
  }

  /**
   * Get default outreach templates
   */
  private getDefaultTemplates(): OutreachTemplate[] {
    return [
      {
        id: 'cold-email-intro',
        name: 'Cold Email Introduction',
        channel: OutreachChannel.EMAIL,
        subject: 'Quick question about {{company}}',
        body: `Hi {{firstName}},

I noticed {{company}} is growing rapidly in the {{industry}} space. I wanted to reach out because we've helped similar companies solve their biggest challenge: [specific problem].

Would you be open to a quick 15-minute call this week to see if there's a fit?

Best,
[Your name]`,
        variables: ['firstName', 'company', 'industry'],
        isActive: true
      },
      {
        id: 'linkedin-connection',
        name: 'LinkedIn Connection Request',
        channel: OutreachChannel.LINKEDIN,
        subject: undefined,
        body: `Hi {{firstName}}, I noticed your work at {{company}} and I'd love to connect to learn more about what you're building.`,
        variables: ['firstName', 'company'],
        isActive: true
      },
      {
        id: 'follow-up-email',
        name: 'Follow-up Email',
        channel: OutreachChannel.EMAIL,
        subject: 'Following up on my note',
        body: `Hi {{firstName}},

Just wanted to follow up on my previous message. I know you're busy, but I believe [product] could help {{company}} achieve [specific goal].

Would you have 10 minutes this week for a quick chat?

Best,
[Your name]`,
        variables: ['firstName', 'company'],
        isActive: true
      }
    ];
  }

  /**
   * Map MongoDB document to IOutreach
   */
  private mapToIOutreach(doc: any): IOutreach {
    return {
      id: (doc._id as mongoose.Types.ObjectId).toString(),
      tenantId: doc.tenantId as string,
      leadId: doc.leadId.toString(),
      channel: doc.channel as OutreachChannel,
      status: doc.status as OutreachStatus,
      subject: doc.subject as string | undefined,
      body: doc.body as string,
      templateId: doc.templateId as string | undefined,
      personalization: doc.personalization as Record<string, string> | undefined,
      sentAt: doc.sentAt as Date | undefined,
      deliveredAt: doc.deliveredAt as Date | undefined,
      openedAt: doc.openedAt as Date | undefined,
      clickedAt: doc.clickedAt as Date | undefined,
      repliedAt: doc.repliedAt as Date | undefined,
      errorMessage: doc.errorMessage as string | undefined,
      createdAt: doc.createdAt as Date,
      updatedAt: doc.updatedAt as Date
    };
  }
}

import mongoose from 'mongoose';
import { Document } from 'mongoose';
export const outreachEngine = new OutreachEngine();
