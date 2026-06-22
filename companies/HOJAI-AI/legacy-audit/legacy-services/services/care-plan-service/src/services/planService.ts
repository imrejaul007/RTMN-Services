import { v4 as uuidv4 } from 'uuid';
import { CarePlan, ICarePlan, CarePlanStatus, GoalStatus, ICareGoal, ICareIntervention, ICareReview, ICareNote, NoteType } from '../models/carePlan';
import { logger } from '../utils/logger';

export interface CreatePlanInput {
  patientId: string;
  patientName: string;
  title: string;
  description?: string;
  category: string;
  priority?: string;
  startDate: Date;
  endDate: Date;
  createdBy: string;
  riskFactors?: string[];
  allergies?: string[];
  medications?: ICarePlan['medications'];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdatePlanInput {
  title?: string;
  description?: string;
  status?: CarePlanStatus;
  priority?: string;
  startDate?: Date;
  endDate?: Date;
  nextReviewDate?: Date;
  updatedBy?: string;
  riskFactors?: string[];
  allergies?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface AddGoalInput {
  type: string;
  description: string;
  priority?: string;
  targetDate: Date;
  startDate: Date;
  milestones?: ICareGoal['milestones'];
  measurements?: ICareGoal['measurements'];
  barriers?: string[];
  facilitators?: string[];
  notes?: string;
}

export interface UpdateGoalInput {
  description?: string;
  status?: GoalStatus;
  priority?: string;
  targetDate?: Date;
  completionPercentage?: number;
  milestones?: ICareGoal['milestones'];
  measurements?: ICareGoal['measurements'];
  barriers?: string[];
  facilitators?: string[];
  notes?: string;
}

export interface AddInterventionInput {
  type: string;
  description: string;
  frequency: string;
  duration: string;
  assignedTo: string;
  assignedToRole?: string;
  startDate: Date;
  endDate?: Date;
  resources?: ICareIntervention['resources'];
  instructions?: string;
  expectedOutcome?: string;
  reminders?: ICareIntervention['reminders'];
}

export interface AddNoteInput {
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  type?: NoteType;
  isPrivate?: boolean;
  attachments?: ICareNote['attachments'];
  relatedGoalIds?: string[];
  relatedInterventionIds?: string[];
  tags?: string[];
}

export interface AddReviewInput {
  reviewerId: string;
  reviewerName: string;
  reviewerRole: string;
  date: Date;
  type?: 'scheduled' | 'unscheduled' | 'milestone' | 'discharge';
  notes: string;
  outcome: 'improving' | 'stable' | 'declining' | 'achieved';
  goalStatuses?: ICareReview['goalStatuses'];
  interventionStatuses?: ICareReview['interventionStatuses'];
  recommendations?: string[];
  nextReviewDate?: Date;
  attachments?: string[];
}

export class PlanService {
  /**
   * Create a new care plan
   */
  async createPlan(input: CreatePlanInput): Promise<ICarePlan> {
    try {
      logger.info('Creating new care plan', { patientId: input.patientId, title: input.title });

      const planId = `CP-${uuidv4().substring(0, 8).toUpperCase()}`;

      const carePlan = new CarePlan({
        planId,
        patientId: input.patientId,
        patientName: input.patientName,
        title: input.title,
        description: input.description || '',
        status: CarePlanStatus.DRAFT,
        priority: input.priority || 'medium',
        category: input.category,
        startDate: input.startDate,
        endDate: input.endDate,
        createdBy: input.createdBy,
        riskFactors: input.riskFactors || [],
        allergies: input.allergies || [],
        medications: input.medications || [],
        tags: input.tags || [],
        metadata: input.metadata || {},
      });

      const savedPlan = await carePlan.save();
      logger.info('Care plan created successfully', { planId: savedPlan.planId });

      return savedPlan;
    } catch (error) {
      logger.error('Failed to create care plan', { error, input });
      throw error;
    }
  }

  /**
   * Get a care plan by ID with all details
   */
  async getPlan(planId: string): Promise<ICarePlan | null> {
    try {
      logger.debug('Fetching care plan', { planId });

      const plan = await CarePlan.findOne({ planId });

      if (!plan) {
        logger.warn('Care plan not found', { planId });
        return null;
      }

      return plan;
    } catch (error) {
      logger.error('Failed to fetch care plan', { error, planId });
      throw error;
    }
  }

  /**
   * Get all plans for a patient
   */
  async getPlansByPatient(patientId: string): Promise<ICarePlan[]> {
    try {
      logger.debug('Fetching care plans for patient', { patientId });

      const plans = await CarePlan.find({ patientId })
        .sort({ createdAt: -1 })
        .lean();

      return plans as ICarePlan[];
    } catch (error) {
      logger.error('Failed to fetch patient care plans', { error, patientId });
      throw error;
    }
  }

  /**
   * Update a care plan
   */
  async updatePlan(planId: string, updates: UpdatePlanInput): Promise<ICarePlan | null> {
    try {
      logger.info('Updating care plan', { planId, updates });

      const plan = await CarePlan.findOneAndUpdate(
        { planId },
        {
          $set: {
            ...updates,
            updatedAt: new Date(),
          },
        },
        { new: true, runValidators: true }
      );

      if (!plan) {
        logger.warn('Care plan not found for update', { planId });
        return null;
      }

      logger.info('Care plan updated successfully', { planId });
      return plan;
    } catch (error) {
      logger.error('Failed to update care plan', { error, planId });
      throw error;
    }
  }

  /**
   * Add a goal to a care plan
   */
  async addGoal(planId: string, goalInput: AddGoalInput): Promise<ICareGoal | null> {
    try {
      logger.info('Adding goal to care plan', { planId, description: goalInput.description });

      const goalId = `G-${uuidv4().substring(0, 8).toUpperCase()}`;

      const newGoal: ICareGoal = {
        goalId,
        type: goalInput.type as ICareGoal['type'],
        description: goalInput.description,
        status: GoalStatus.NOT_STARTED,
        priority: (goalInput.priority || 'medium') as ICareGoal['priority'],
        targetDate: goalInput.targetDate,
        startDate: goalInput.startDate,
        completionPercentage: 0,
        progressHistory: [],
        milestones: goalInput.milestones || [],
        measurements: goalInput.measurements || [],
        barriers: goalInput.barriers || [],
        facilitators: goalInput.facilitators || [],
        notes: goalInput.notes || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const plan = await CarePlan.findOneAndUpdate(
        { planId },
        {
          $push: { goals: newGoal },
          $set: { updatedAt: new Date() },
        },
        { new: true, runValidators: true }
      );

      if (!plan) {
        logger.warn('Care plan not found for adding goal', { planId });
        return null;
      }

      const addedGoal = plan.goals.find((g) => g.goalId === goalId);
      logger.info('Goal added successfully', { planId, goalId });

      return addedGoal || null;
    } catch (error) {
      logger.error('Failed to add goal', { error, planId });
      throw error;
    }
  }

  /**
   * Update a goal within a care plan
   */
  async updateGoal(planId: string, goalId: string, updates: UpdateGoalInput): Promise<ICareGoal | null> {
    try {
      logger.info('Updating goal', { planId, goalId, updates });

      // Build update object for nested goal
      const updateFields: Record<string, unknown> = {};
      if (updates.description !== undefined) updateFields['goals.$.description'] = updates.description;
      if (updates.status !== undefined) updateFields['goals.$.status'] = updates.status;
      if (updates.priority !== undefined) updateFields['goals.$.priority'] = updates.priority;
      if (updates.targetDate !== undefined) updateFields['goals.$.targetDate'] = updates.targetDate;
      if (updates.completionPercentage !== undefined) {
        updateFields['goals.$.completionPercentage'] = updates.completionPercentage;
        updateFields['goals.$.updatedAt'] = new Date();
      }
      if (updates.milestones !== undefined) updateFields['goals.$.milestones'] = updates.milestones;
      if (updates.measurements !== undefined) updateFields['goals.$.measurements'] = updates.measurements;
      if (updates.barriers !== undefined) updateFields['goals.$.barriers'] = updates.barriers;
      if (updates.facilitators !== undefined) updateFields['goals.$.facilitators'] = updates.facilitators;
      if (updates.notes !== undefined) updateFields['goals.$.notes'] = updates.notes;

      // Handle achieved status
      if (updates.status === GoalStatus.ACHIEVED) {
        updateFields['goals.$.achievedDate'] = new Date();
        updateFields['goals.$.completionPercentage'] = 100;
      }

      const plan = await CarePlan.findOneAndUpdate(
        { planId, 'goals.goalId': goalId },
        {
          $set: {
            ...updateFields,
            updatedAt: new Date(),
          },
        },
        { new: true, runValidators: true }
      );

      if (!plan) {
        logger.warn('Goal not found for update', { planId, goalId });
        return null;
      }

      const updatedGoal = plan.goals.find((g) => g.goalId === goalId);
      logger.info('Goal updated successfully', { planId, goalId });

      return updatedGoal || null;
    } catch (error) {
      logger.error('Failed to update goal', { error, planId, goalId });
      throw error;
    }
  }

  /**
   * Add an intervention to a care plan
   */
  async addIntervention(planId: string, interventionInput: AddInterventionInput): Promise<ICareIntervention | null> {
    try {
      logger.info('Adding intervention to care plan', { planId, description: interventionInput.description });

      const interventionId = `I-${uuidv4().substring(0, 8).toUpperCase()}`;

      const newIntervention: ICareIntervention = {
        interventionId,
        type: interventionInput.type as ICareIntervention['type'],
        description: interventionInput.description,
        frequency: interventionInput.frequency,
        duration: interventionInput.duration,
        assignedTo: interventionInput.assignedTo,
        assignedToRole: interventionInput.assignedToRole,
        status: 'planned',
        startDate: interventionInput.startDate,
        endDate: interventionInput.endDate,
        resources: interventionInput.resources || [],
        instructions: interventionInput.instructions || '',
        expectedOutcome: interventionInput.expectedOutcome || '',
        notes: '',
        reminders: interventionInput.reminders,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const plan = await CarePlan.findOneAndUpdate(
        { planId },
        {
          $push: { interventions: newIntervention },
          $set: { updatedAt: new Date() },
        },
        { new: true, runValidators: true }
      );

      if (!plan) {
        logger.warn('Care plan not found for adding intervention', { planId });
        return null;
      }

      const addedIntervention = plan.interventions.find((i) => i.interventionId === interventionId);
      logger.info('Intervention added successfully', { planId, interventionId });

      return addedIntervention || null;
    } catch (error) {
      logger.error('Failed to add intervention', { error, planId });
      throw error;
    }
  }

  /**
   * Update an intervention within a care plan
   */
  async updateIntervention(
    planId: string,
    interventionId: string,
    updates: Partial<ICareIntervention>
  ): Promise<ICareIntervention | null> {
    try {
      logger.info('Updating intervention', { planId, interventionId });

      const plan = await CarePlan.findOne({ planId });
      if (!plan) {
        logger.warn('Care plan not found', { planId });
        return null;
      }

      const interventionIndex = plan.interventions.findIndex((i) => i.interventionId === interventionId);
      if (interventionIndex === -1) {
        logger.warn('Intervention not found', { planId, interventionId });
        return null;
      }

      // Update intervention fields
      Object.assign(plan.interventions[interventionIndex], {
        ...updates,
        updatedAt: new Date(),
      });

      await plan.save();

      logger.info('Intervention updated successfully', { planId, interventionId });
      return plan.interventions[interventionIndex];
    } catch (error) {
      logger.error('Failed to update intervention', { error, planId, interventionId });
      throw error;
    }
  }

  /**
   * Add a note to a care plan
   */
  async addNote(planId: string, noteInput: AddNoteInput): Promise<ICareNote | null> {
    try {
      logger.info('Adding note to care plan', { planId, authorName: noteInput.authorName });

      const noteId = `N-${uuidv4().substring(0, 8).toUpperCase()}`;

      const newNote: ICareNote = {
        noteId,
        authorId: noteInput.authorId,
        authorName: noteInput.authorName,
        authorRole: noteInput.authorRole,
        content: noteInput.content,
        type: noteInput.type || NoteType.GENERAL,
        isPrivate: noteInput.isPrivate || false,
        attachments: noteInput.attachments || [],
        relatedGoalIds: noteInput.relatedGoalIds || [],
        relatedInterventionIds: noteInput.relatedInterventionIds || [],
        tags: noteInput.tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const plan = await CarePlan.findOneAndUpdate(
        { planId },
        {
          $push: { notes: newNote },
          $set: { updatedAt: new Date() },
        },
        { new: true, runValidators: true }
      );

      if (!plan) {
        logger.warn('Care plan not found for adding note', { planId });
        return null;
      }

      const addedNote = plan.notes.find((n) => n.noteId === noteId);
      logger.info('Note added successfully', { planId, noteId });

      return addedNote || null;
    } catch (error) {
      logger.error('Failed to add note', { error, planId });
      throw error;
    }
  }

  /**
   * Add a review to a care plan
   */
  async reviewPlan(planId: string, reviewInput: AddReviewInput): Promise<ICareReview | null> {
    try {
      logger.info('Adding review to care plan', { planId, reviewerName: reviewInput.reviewerName });

      const reviewId = `R-${uuidv4().substring(0, 8).toUpperCase()}`;

      const newReview: ICareReview = {
        reviewId,
        reviewerId: reviewInput.reviewerId,
        reviewerName: reviewInput.reviewerName,
        reviewerRole: reviewInput.reviewerRole,
        date: reviewInput.date,
        type: reviewInput.type || 'scheduled',
        notes: reviewInput.notes,
        outcome: reviewInput.outcome,
        goalStatuses: reviewInput.goalStatuses || [],
        interventionStatuses: reviewInput.interventionStatuses || [],
        recommendations: reviewInput.recommendations || [],
        nextReviewDate: reviewInput.nextReviewDate,
        attachments: reviewInput.attachments || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const plan = await CarePlan.findOneAndUpdate(
        { planId },
        {
          $push: { reviews: newReview },
          $set: {
            lastReviewDate: reviewInput.date,
            nextReviewDate: reviewInput.nextReviewDate,
            updatedAt: new Date(),
          },
        },
        { new: true, runValidators: true }
      );

      if (!plan) {
        logger.warn('Care plan not found for adding review', { planId });
        return null;
      }

      const addedReview = plan.reviews.find((r) => r.reviewId === reviewId);
      logger.info('Review added successfully', { planId, reviewId });

      return addedReview || null;
    } catch (error) {
      logger.error('Failed to add review', { error, planId });
      throw error;
    }
  }

  /**
   * Archive a care plan
   */
  async archivePlan(planId: string): Promise<ICarePlan | null> {
    try {
      logger.info('Archiving care plan', { planId });

      const plan = await CarePlan.findOneAndUpdate(
        { planId },
        {
          $set: {
            status: CarePlanStatus.ARCHIVED,
            updatedAt: new Date(),
          },
        },
        { new: true, runValidators: true }
      );

      if (!plan) {
        logger.warn('Care plan not found for archiving', { planId });
        return null;
      }

      logger.info('Care plan archived successfully', { planId });
      return plan;
    } catch (error) {
      logger.error('Failed to archive care plan', { error, planId });
      throw error;
    }
  }

  /**
   * Get active (non-archived) plans for a patient
   */
  async getActivePlans(patientId: string): Promise<ICarePlan[]> {
    try {
      logger.debug('Fetching active care plans for patient', { patientId });

      const plans = await CarePlan.find({
        patientId,
        status: { $ne: CarePlanStatus.ARCHIVED },
      })
        .sort({ createdAt: -1 })
        .lean();

      return plans as ICarePlan[];
    } catch (error) {
      logger.error('Failed to fetch active care plans', { error, patientId });
      throw error;
    }
  }

  /**
   * Delete a care plan
   */
  async deletePlan(planId: string): Promise<boolean> {
    try {
      logger.info('Deleting care plan', { planId });

      const result = await CarePlan.deleteOne({ planId });

      if (result.deletedCount === 0) {
        logger.warn('Care plan not found for deletion', { planId });
        return false;
      }

      logger.info('Care plan deleted successfully', { planId });
      return true;
    } catch (error) {
      logger.error('Failed to delete care plan', { error, planId });
      throw error;
    }
  }

  /**
   * Get plans due for review
   */
  async getPlansDueForReview(): Promise<ICarePlan[]> {
    try {
      const now = new Date();
      logger.debug('Fetching plans due for review', { asOf: now });

      const plans = await CarePlan.find({
        status: CarePlanStatus.ACTIVE,
        nextReviewDate: { $lte: now },
      })
        .sort({ nextReviewDate: 1 })
        .lean();

      return plans as ICarePlan[];
    } catch (error) {
      logger.error('Failed to fetch plans due for review', { error });
      throw error;
    }
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(
    planId: string,
    goalId: string,
    progress: number,
    updatedBy: string,
    note?: string
  ): Promise<ICareGoal | null> {
    try {
      logger.info('Updating goal progress', { planId, goalId, progress });

      const progressUpdate = {
        value: progress,
        note,
        updatedBy,
        updatedAt: new Date(),
      };

      const plan = await CarePlan.findOne({ planId });
      if (!plan) {
        logger.warn('Care plan not found', { planId });
        return null;
      }

      const goalIndex = plan.goals.findIndex((g) => g.goalId === goalId);
      if (goalIndex === -1) {
        logger.warn('Goal not found', { planId, goalId });
        return null;
      }

      // Update progress
      plan.goals[goalIndex].progressHistory.push(progressUpdate);
      plan.goals[goalIndex].completionPercentage = progress;
      plan.goals[goalIndex].updatedAt = new Date();

      // Auto-update status based on progress
      if (progress >= 100) {
        plan.goals[goalIndex].status = GoalStatus.ACHIEVED;
        plan.goals[goalIndex].achievedDate = new Date();
      } else if (progress >= 75) {
        plan.goals[goalIndex].status = GoalStatus.ON_TRACK;
      } else if (progress >= 25) {
        plan.goals[goalIndex].status = GoalStatus.IN_PROGRESS;
      }

      await plan.save();

      logger.info('Goal progress updated successfully', { planId, goalId, progress });
      return plan.goals[goalIndex];
    } catch (error) {
      logger.error('Failed to update goal progress', { error, planId, goalId });
      throw error;
    }
  }

  /**
   * Get goal by ID from a plan
   */
  async getGoal(planId: string, goalId: string): Promise<ICareGoal | null> {
    try {
      const plan = await CarePlan.findOne({ planId, 'goals.goalId': goalId });

      if (!plan) {
        return null;
      }

      return plan.goals.find((g) => g.goalId === goalId) || null;
    } catch (error) {
      logger.error('Failed to get goal', { error, planId, goalId });
      throw error;
    }
  }

  /**
   * Bulk update goals status (e.g., mark overdue)
   */
  async bulkUpdateGoalStatuses(): Promise<number> {
    try {
      const now = new Date();
      logger.info('Running bulk goal status update', { asOf: now });

      const result = await CarePlan.updateMany(
        {
          'goals.targetDate': { $lt: now },
          'goals.status': { $nin: [GoalStatus.ACHIEVED, GoalStatus.PARTIALLY_ACHIEVED, GoalStatus.NOT_ACHIEVED] },
        },
        {
          $set: {
            'goals.$[elem].status': GoalStatus.AT_RISK,
            'goals.$[elem].updatedAt': now,
          },
        },
        {
          arrayFilters: [
            {
              'elem.targetDate': { $lt: now },
              'elem.status': { $nin: [GoalStatus.ACHIEVED, GoalStatus.PARTIALLY_ACHIEVED, GoalStatus.NOT_ACHIEVED] },
            },
          ],
        }
      );

      logger.info('Bulk goal status update complete', { modifiedCount: result.modifiedCount });
      return result.modifiedCount;
    } catch (error) {
      logger.error('Failed to bulk update goal statuses', { error });
      throw error;
    }
  }
}

export const planService = new PlanService();
export default planService;
