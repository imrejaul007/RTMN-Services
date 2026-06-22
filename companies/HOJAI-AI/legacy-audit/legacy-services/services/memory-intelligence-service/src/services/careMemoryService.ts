// Care Memory Service - Healthcare longitudinal memory

import { v4 as uuidv4 } from 'uuid';
import mongoose, { Schema, Model } from 'mongoose';
import {
  CareVisit,
  CareTimeline,
  TimelineEvent,
  ActionItem,
  CareDiagnosis,
  CareMedication,
  CareFollowUp,
} from '../models/careMemory.js';
import { logger } from '../utils/logger.js';

// MongoDB Schemas
const CareVisitSchema = new Schema({
  id: { type: String, required: true, unique: true },
  profileId: { type: String, required: true, index: true },
  visitId: String,
  date: { type: Date, required: true },
  type: { type: String, enum: ['consultation', 'follow_up', 'emergency', 'teleconsult', 'home_visit'] },
  provider: {
    id: String,
    name: String,
    specialty: String,
    hospital: String,
  },
  summary: String,
  transcript: String,
  keyPoints: [String],
  diagnoses: [{
    condition: String,
    icdCode: String,
    status: String,
    diagnosedDate: Date,
    notes: String,
  }],
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    route: String,
    duration: String,
    instructions: String,
    status: String,
    startDate: Date,
    endDate: Date,
    prescribedBy: String,
  }],
  instructions: [String],
  followUps: [{
    id: String,
    type: String,
    description: String,
    urgency: String,
    dueDate: Date,
    completed: { type: Boolean, default: false },
    completedDate: Date,
  }],
  questionsForNextVisit: [String],
  redFlags: [String],
  sentiment: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  source: String,
});

const TimelineEventSchema = new Schema({
  id: { type: String, required: true, unique: true },
  profileId: { type: String, required: true, index: true },
  date: { type: Date, required: true },
  type: { type: String, required: true },
  category: String,
  title: { type: String, required: true },
  description: String,
  relatedEntityId: String,
  relatedEntityType: String,
  metadata: Schema.Types.Mixed,
  sentiment: Number,
  importance: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
});

const ActionItemSchema = new Schema({
  id: { type: String, required: true, unique: true },
  profileId: { type: String, required: true, index: true },
  visitId: String,
  type: { type: String, enum: ['medication', 'appointment', 'test', 'procedure', 'referral', 'lifestyle', 'other'] },
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
  dueDate: Date,
  completedDate: Date,
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  reminders: [{
    id: String,
    scheduledFor: Date,
    sent: { type: Boolean, default: false },
    sentAt: Date,
    channel: String,
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Models
let CareVisitModel: Model<any>;
let TimelineEventModel: Model<any>;
let ActionItemModel: Model<any>;

export class CareMemoryService {
  constructor() {
    this.initializeModels();
  }

  private initializeModels() {
    try {
      CareVisitModel = mongoose.model('CareVisit', CareVisitSchema) || mongoose.models.CareVisit;
      TimelineEventModel = mongoose.model('TimelineEvent', TimelineEventSchema) || mongoose.models.TimelineEvent;
      ActionItemModel = mongoose.model('ActionItem', ActionItemSchema) || mongoose.models.ActionItem;
    } catch {
      CareVisitModel = mongoose.model('CareVisit', CareVisitSchema);
      TimelineEventModel = mongoose.model('TimelineEvent', TimelineEventSchema);
      ActionItemModel = mongoose.model('ActionItem', ActionItemSchema);
    }
  }

  /**
   * Add a care visit to memory
   */
  async addCareVisit(visit: Omit<CareVisit, 'id' | 'createdAt' | 'updatedAt'>): Promise<CareVisit> {
    const id = `care_visit_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    const now = new Date();

    const careVisit = {
      ...visit,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await CareVisitModel.create(careVisit);

    // Add to timeline
    await this.addTimelineEvent({
      id: `timeline_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
      profileId: visit.profileId,
      date: visit.date,
      type: 'visit',
      category: visit.provider.specialty || 'general',
      title: `${visit.type} with ${visit.provider.name}`,
      description: visit.summary,
      relatedEntityId: id,
      relatedEntityType: 'care_visit',
      sentiment: visit.sentiment,
      importance: visit.redFlags?.length > 0 ? 'critical' : 'medium',
    });

    // Extract and create action items from follow-ups
    if (visit.followUps?.length > 0) {
      for (const followUp of visit.followUps) {
        await this.createActionItem({
          id: `action_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
          profileId: visit.profileId,
          visitId: id,
          type: followUp.type as any,
          title: followUp.description,
          description: followUp.description,
          status: 'pending',
          dueDate: followUp.dueDate,
          priority: followUp.urgency as any,
          reminders: [],
        });
      }
    }

    logger.info(`Care visit added`, { id, profileId: visit.profileId });

    return careVisit as CareVisit;
  }

  /**
   * Get care timeline for a profile
   */
  async getCareTimeline(profileId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    types?: string[];
    limit?: number;
  }): Promise<CareTimeline> {
    const query: any = { profileId };

    if (options?.startDate || options?.endDate) {
      query.date = {};
      if (options.startDate) query.date.$gte = options.startDate;
      if (options.endDate) query.date.$lte = options.endDate;
    }

    if (options?.types) {
      query.type = { $in: options.types };
    }

    const events = await TimelineEventModel
      .find(query)
      .sort({ date: -1 })
      .limit(options?.limit || 100)
      .lean();

    return {
      profileId,
      events: events as TimelineEvent[],
      lastUpdated: new Date(),
    };
  }

  /**
   * Add timeline event
   */
  async addTimelineEvent(event: Omit<TimelineEvent, never>): Promise<TimelineEvent> {
    await TimelineEventModel.create(event);
    return event;
  }

  /**
   * Create action item
   */
  async createActionItem(item: Omit<ActionItem, 'createdAt' | 'updatedAt'>): Promise<ActionItem> {
    const now = new Date();
    const actionItem = {
      ...item,
      createdAt: now,
      updatedAt: now,
    };

    await ActionItemModel.create(actionItem);

    // Add to timeline
    await this.addTimelineEvent({
      id: `timeline_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
      profileId: item.profileId,
      date: item.dueDate || new Date(),
      type: 'action_item',
      category: item.type,
      title: item.title,
      description: item.description,
      relatedEntityId: item.id,
      relatedEntityType: 'action_item',
      importance: item.priority === 'high' ? 'high' : 'medium',
    });

    logger.info(`Action item created`, { id: item.id, profileId: item.profileId });

    return actionItem as ActionItem;
  }

  /**
   * Get pending action items
   */
  async getPendingActionItems(profileId: string): Promise<ActionItem[]> {
    return ActionItemModel
      .find({
        profileId,
        status: { $in: ['pending', 'in_progress'] },
        $or: [
          { dueDate: { $exists: false } },
          { dueDate: { $gte: new Date() } },
        ],
      })
      .sort({ priority: -1, dueDate: 1 })
      .lean() as any;
  }

  /**
   * Complete action item
   */
  async completeActionItem(itemId: string): Promise<ActionItem | null> {
    const item = await ActionItemModel.findOneAndUpdate(
      { id: itemId },
      {
        status: 'completed',
        completedDate: new Date(),
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (item) {
      // Mark follow-up as completed
      const visit = await CareVisitModel.findOne({ 'followUps.id': itemId });
      if (visit) {
        await CareVisitModel.updateOne(
          { _id: visit._id, 'followUps.id': itemId },
          {
            $set: {
              'followUps.$.completed': true,
              'followUps.$.completedDate': new Date(),
            },
          }
        );
      }
    }

    return item as any;
  }

  /**
   * Get visit history
   */
  async getVisitHistory(profileId: string, options?: {
    limit?: number;
    type?: string;
  }): Promise<CareVisit[]> {
    const query: any = { profileId };
    if (options?.type) {
      query.type = options.type;
    }

    return CareVisitModel
      .find(query)
      .sort({ date: -1 })
      .limit(options?.limit || 50)
      .lean() as any;
  }

  /**
   * Get active diagnoses
   */
  async getActiveDiagnoses(profileId: string): Promise<CareDiagnosis[]> {
    const visits = await CareVisitModel
      .find({ profileId })
      .sort({ date: -1 })
      .lean();

    const diagnoses: CareDiagnosis[] = [];

    visits.forEach((visit: any) => {
      visit.diagnoses?.forEach((diagnosis: CareDiagnosis) => {
        if (diagnosis.status === 'active' || diagnosis.status === 'chronic') {
          // Check if already added
          if (!diagnoses.find(d => d.condition === diagnosis.condition)) {
            diagnoses.push(diagnosis);
          }
        }
      });
    });

    return diagnoses;
  }

  /**
   * Get active medications
   */
  async getActiveMedications(profileId: string): Promise<CareMedication[]> {
    const visits = await CareVisitModel
      .find({ profileId })
      .sort({ date: -1 })
      .lean();

    const medications: CareMedication[] = [];

    visits.forEach((visit: any) => {
      visit.medications?.forEach((medication: CareMedication) => {
        if (medication.status === 'active') {
          // Check if already added
          if (!medications.find(m => m.name === medication.name)) {
            medications.push(medication);
          }
        }
      });
    });

    return medications;
  }

  /**
   * Get upcoming follow-ups
   */
  async getUpcomingFollowUps(profileId: string): Promise<CareFollowUp[]> {
    const visits = await CareVisitModel
      .find({
        profileId,
        'followUps.completed': false,
        'followUps.dueDate': { $gte: new Date() },
      })
      .sort({ date: -1 })
      .lean();

    const followUps: CareFollowUp[] = [];

    visits.forEach((visit: any) => {
      visit.followUps?.forEach((followUp: CareFollowUp) => {
        if (!followUp.completed && followUp.dueDate && new Date(followUp.dueDate) >= new Date()) {
          followUps.push(followUp);
        }
      });
    });

    return followUps.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  }
}

export const careMemoryService = new CareMemoryService();
