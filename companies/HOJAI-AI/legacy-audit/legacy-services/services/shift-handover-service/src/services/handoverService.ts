import { v4 as uuidv4 } from 'uuid';
import {
  ShiftHandover,
  IShiftHandover,
  HandoverStatus,
  TaskStatus,
  IPatientHandover,
  ITaskHandover,
  IAlertHandover,
  IHandoverAcknowledgment
} from '../models/handover';
import { logger } from '../utils/logger';

export interface CreateHandoverInput {
  outgoingShiftId: string;
  incomingShiftId?: string;
  outgoingStaffId: string;
  outgoingStaffName: string;
  incomingStaffId?: string;
  incomingStaffName?: string;
  shiftDate: Date;
  shiftType: 'day' | 'night' | 'evening';
  facilityId: string;
  facilityName: string;
  departmentId?: string;
  departmentName?: string;
  templateId?: string;
  templateName?: string;
  scheduledTime?: Date;
}

export interface AddPatientInput {
  patientId: string;
  patientName: string;
  roomNumber: string;
  bedNumber?: string;
  condition: string;
  diagnosis?: string;
  treatmentPlan?: string;
  pendingTasks?: string[];
  concerns?: string[];
  vitals?: IPatientHandover['vitals'];
}

export interface AddTaskInput {
  description: string;
  category?: string;
  assignedTo?: string;
  assignedToName?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dueTime?: Date;
  patientId?: string;
  notes?: string;
}

export interface AddAlertInput {
  type: 'critical' | 'urgent' | 'warning' | 'info' | 'allergy' | 'fall_risk' | 'medication' | 'lab_result';
  patientId?: string;
  patientName?: string;
  description: string;
  actionRequired: string;
  createdBy: string;
}

export interface AcknowledgeInput {
  userId: string;
  userName: string;
  role: string;
  comments?: string;
  signature?: string;
}

export class HandoverService {
  /**
   * Create a new shift handover record
   */
  async createHandover(input: CreateHandoverInput): Promise<IShiftHandover> {
    try {
      const handoverId = `HO-${uuidv4().substring(0, 8).toUpperCase()}`;

      const handover = new ShiftHandover({
        handoverId,
        ...input,
        status: HandoverStatus.DRAFT,
        sections: {
          patients: [],
          tasks: [],
          alerts: [],
          notes: ''
        },
        acknowledgments: []
      });

      await handover.save();
      logger.info(`Handover created: ${handoverId}`);

      return handover;
    } catch (error) {
      logger.error('Failed to create handover:', error);
      throw error;
    }
  }

  /**
   * Get a handover by ID
   */
  async getHandover(handoverId: string): Promise<IShiftHandover | null> {
    try {
      const handover = await ShiftHandover.findOne({ handoverId }).exec();
      return handover;
    } catch (error) {
      logger.error(`Failed to get handover ${handoverId}:`, error);
      throw error;
    }
  }

  /**
   * Get handovers by date
   */
  async getHandoversByDate(
    date: Date,
    facilityId?: string,
    departmentId?: string
  ): Promise<IShiftHandover[]> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const query: Record<string, unknown> = {
        shiftDate: { $gte: startOfDay, $lte: endOfDay }
      };

      if (facilityId) {
        query.facilityId = facilityId;
      }

      if (departmentId) {
        query.departmentId = departmentId;
      }

      const handovers = await ShiftHandover.find(query)
        .sort({ shiftType: 1, createdAt: -1 })
        .exec();

      return handovers;
    } catch (error) {
      logger.error(`Failed to get handovers for date ${date}:`, error);
      throw error;
    }
  }

  /**
   * Add a patient update to a handover
   */
  async addPatientUpdate(
    handoverId: string,
    patient: AddPatientInput
  ): Promise<IPatientHandover | null> {
    try {
      const handover = await ShiftHandover.findOne({ handoverId }).exec();
      if (!handover) {
        throw new Error(`Handover not found: ${handoverId}`);
      }

      if (
        handover.status !== HandoverStatus.DRAFT &&
        handover.status !== HandoverStatus.IN_PROGRESS
      ) {
        throw new Error(`Cannot modify handover in status: ${handover.status}`);
      }

      const patientHandover: IPatientHandover = {
        patientId: patient.patientId,
        patientName: patient.patientName,
        roomNumber: patient.roomNumber,
        bedNumber: patient.bedNumber,
        condition: patient.condition,
        diagnosis: patient.diagnosis,
        treatmentPlan: patient.treatmentPlan,
        pendingTasks: patient.pendingTasks || [],
        concerns: patient.concerns || [],
        vitals: patient.vitals,
        lastUpdated: new Date()
      };

      handover.sections.patients.push(patientHandover);

      // Update status to in_progress if it was draft
      if (handover.status === HandoverStatus.DRAFT) {
        handover.status = HandoverStatus.IN_PROGRESS;
        handover.startedAt = new Date();
      }

      await handover.save();
      logger.info(`Patient ${patient.patientId} added to handover ${handoverId}`);

      return patientHandover;
    } catch (error) {
      logger.error(`Failed to add patient to handover ${handoverId}:`, error);
      throw error;
    }
  }

  /**
   * Add a task to a handover
   */
  async addTask(handoverId: string, task: AddTaskInput): Promise<ITaskHandover | null> {
    try {
      const handover = await ShiftHandover.findOne({ handoverId }).exec();
      if (!handover) {
        throw new Error(`Handover not found: ${handoverId}`);
      }

      if (
        handover.status !== HandoverStatus.DRAFT &&
        handover.status !== HandoverStatus.IN_PROGRESS
      ) {
        throw new Error(`Cannot modify handover in status: ${handover.status}`);
      }

      const taskHandover: ITaskHandover = {
        taskId: `TASK-${uuidv4().substring(0, 8).toUpperCase()}`,
        description: task.description,
        category: task.category,
        assignedTo: task.assignedTo,
        assignedToName: task.assignedToName,
        status: TaskStatus.PENDING,
        priority: task.priority || 'medium',
        dueTime: task.dueTime,
        patientId: task.patientId,
        notes: task.notes,
        createdAt: new Date()
      };

      handover.sections.tasks.push(taskHandover);

      if (handover.status === HandoverStatus.DRAFT) {
        handover.status = HandoverStatus.IN_PROGRESS;
        handover.startedAt = new Date();
      }

      await handover.save();
      logger.info(`Task ${taskHandover.taskId} added to handover ${handoverId}`);

      return taskHandover;
    } catch (error) {
      logger.error(`Failed to add task to handover ${handoverId}:`, error);
      throw error;
    }
  }

  /**
   * Add an alert to a handover
   */
  async addAlert(handoverId: string, alert: AddAlertInput): Promise<IAlertHandover | null> {
    try {
      const handover = await ShiftHandover.findOne({ handoverId }).exec();
      if (!handover) {
        throw new Error(`Handover not found: ${handoverId}`);
      }

      if (
        handover.status !== HandoverStatus.DRAFT &&
        handover.status !== HandoverStatus.IN_PROGRESS
      ) {
        throw new Error(`Cannot modify handover in status: ${handover.status}`);
      }

      const alertHandover: IAlertHandover = {
        alertId: `ALERT-${uuidv4().substring(0, 8).toUpperCase()}`,
        type: alert.type,
        patientId: alert.patientId,
        patientName: alert.patientName,
        description: alert.description,
        actionRequired: alert.actionRequired,
        createdBy: alert.createdBy,
        createdAt: new Date()
      };

      handover.sections.alerts.push(alertHandover);

      if (handover.status === HandoverStatus.DRAFT) {
        handover.status = HandoverStatus.IN_PROGRESS;
        handover.startedAt = new Date();
      }

      await handover.save();
      logger.info(`Alert ${alertHandover.alertId} added to handover ${handoverId}`);

      return alertHandover;
    } catch (error) {
      logger.error(`Failed to add alert to handover ${handoverId}:`, error);
      throw error;
    }
  }

  /**
   * Acknowledge a handover
   */
  async acknowledgeHandover(
    handoverId: string,
    acknowledgment: AcknowledgeInput
  ): Promise<IHandoverAcknowledgment | null> {
    try {
      const handover = await ShiftHandover.findOne({ handoverId }).exec();
      if (!handover) {
        throw new Error(`Handover not found: ${handoverId}`);
      }

      if (
        handover.status !== HandoverStatus.IN_PROGRESS &&
        handover.status !== HandoverStatus.PENDING_ACKNOWLEDGMENT
      ) {
        throw new Error(`Cannot acknowledge handover in status: ${handover.status}`);
      }

      // Check if user already acknowledged
      const existingAck = handover.acknowledgments.find(
        (ack) => ack.userId === acknowledgment.userId
      );
      if (existingAck) {
        throw new Error(`User ${acknowledgment.userId} has already acknowledged this handover`);
      }

      const ack: IHandoverAcknowledgment = {
        userId: acknowledgment.userId,
        userName: acknowledgment.userName,
        role: acknowledgment.role,
        acknowledgedAt: new Date(),
        comments: acknowledgment.comments,
        signature: acknowledgment.signature
      };

      handover.acknowledgments.push(ack);

      // Update status if this is the incoming staff
      if (acknowledgment.userId === handover.incomingStaffId) {
        handover.status = HandoverStatus.PENDING_ACKNOWLEDGMENT;
      }

      await handover.save();
      logger.info(`Handover ${handoverId} acknowledged by ${acknowledgment.userId}`);

      return ack;
    } catch (error) {
      logger.error(`Failed to acknowledge handover ${handoverId}:`, error);
      throw error;
    }
  }

  /**
   * Complete a handover
   */
  async completeHandover(handoverId: string): Promise<IShiftHandover | null> {
    try {
      const handover = await ShiftHandover.findOne({ handoverId }).exec();
      if (!handover) {
        throw new Error(`Handover not found: ${handoverId}`);
      }

      if (
        handover.status !== HandoverStatus.IN_PROGRESS &&
        handover.status !== HandoverStatus.PENDING_ACKNOWLEDGMENT
      ) {
        throw new Error(`Cannot complete handover in status: ${handover.status}`);
      }

      handover.status = HandoverStatus.COMPLETED;
      handover.completedAt = new Date();

      await handover.save();
      logger.info(`Handover ${handoverId} completed`);

      return handover;
    } catch (error) {
      logger.error(`Failed to complete handover ${handoverId}:`, error);
      throw error;
    }
  }

  /**
   * Get pending handover for a user
   */
  async getPendingHandover(userId: string): Promise<IShiftHandover[]> {
    try {
      const handovers = await ShiftHandover.find({
        incomingStaffId: userId,
        status: {
          $in: [
            HandoverStatus.IN_PROGRESS,
            HandoverStatus.PENDING_ACKNOWLEDGMENT
          ]
        }
      })
        .sort({ shiftDate: -1, shiftType: 1 })
        .exec();

      return handovers;
    } catch (error) {
      logger.error(`Failed to get pending handovers for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update handover notes
   */
  async updateNotes(handoverId: string, notes: string): Promise<IShiftHandover | null> {
    try {
      const handover = await ShiftHandover.findOne({ handoverId }).exec();
      if (!handover) {
        throw new Error(`Handover not found: ${handoverId}`);
      }

      if (
        handover.status !== HandoverStatus.DRAFT &&
        handover.status !== HandoverStatus.IN_PROGRESS
      ) {
        throw new Error(`Cannot modify handover in status: ${handover.status}`);
      }

      handover.sections.notes = notes;
      await handover.save();

      logger.info(`Notes updated for handover ${handoverId}`);
      return handover;
    } catch (error) {
      logger.error(`Failed to update notes for handover ${handoverId}:`, error);
      throw error;
    }
  }

  /**
   * Update a task status
   */
  async updateTaskStatus(
    handoverId: string,
    taskId: string,
    status: TaskStatus
  ): Promise<ITaskHandover | null> {
    try {
      const handover = await ShiftHandover.findOne({ handoverId }).exec();
      if (!handover) {
        throw new Error(`Handover not found: ${handoverId}`);
      }

      const task = handover.sections.tasks.find((t) => t.taskId === taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      task.status = status;
      if (status === TaskStatus.COMPLETED) {
        task.completedAt = new Date();
      }

      await handover.save();
      logger.info(`Task ${taskId} status updated to ${status}`);

      return task;
    } catch (error) {
      logger.error(`Failed to update task status:`, error);
      throw error;
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(
    handoverId: string,
    alertId: string,
    actionTaken: string,
    resolvedBy: string
  ): Promise<IAlertHandover | null> {
    try {
      const handover = await ShiftHandover.findOne({ handoverId }).exec();
      if (!handover) {
        throw new Error(`Handover not found: ${handoverId}`);
      }

      const alert = handover.sections.alerts.find((a) => a.alertId === alertId);
      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      alert.actionTaken = actionTaken;
      alert.acknowledgedBy = resolvedBy;
      alert.acknowledgedAt = new Date();
      alert.resolvedAt = new Date();

      await handover.save();
      logger.info(`Alert ${alertId} resolved`);

      return alert;
    } catch (error) {
      logger.error(`Failed to resolve alert:`, error);
      throw error;
    }
  }

  /**
   * Get handover statistics
   */
  async getHandoverStats(
    facilityId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalHandovers: number;
    completedHandovers: number;
    pendingHandovers: number;
    totalPatients: number;
    totalTasks: number;
    completedTasks: number;
    totalAlerts: number;
    criticalAlerts: number;
  }> {
    try {
      const handovers = await ShiftHandover.find({
        facilityId,
        shiftDate: { $gte: startDate, $lte: endDate }
      }).exec();

      const stats = {
        totalHandovers: handovers.length,
        completedHandovers: handovers.filter(
          (h) => h.status === HandoverStatus.COMPLETED
        ).length,
        pendingHandovers: handovers.filter(
          (h) =>
            h.status === HandoverStatus.IN_PROGRESS ||
            h.status === HandoverStatus.PENDING_ACKNOWLEDGMENT
        ).length,
        totalPatients: handovers.reduce(
          (sum, h) => sum + h.sections.patients.length,
          0
        ),
        totalTasks: handovers.reduce(
          (sum, h) => sum + h.sections.tasks.length,
          0
        ),
        completedTasks: handovers.reduce(
          (sum, h) =>
            sum +
            h.sections.tasks.filter((t) => t.status === TaskStatus.COMPLETED)
              .length,
          0
        ),
        totalAlerts: handovers.reduce(
          (sum, h) => sum + h.sections.alerts.length,
          0
        ),
        criticalAlerts: handovers.reduce(
          (sum, h) =>
            sum +
            h.sections.alerts.filter((a) => a.type === 'critical' || a.type === 'urgent')
              .length,
          0
        )
      };

      return stats;
    } catch (error) {
      logger.error('Failed to get handover stats:', error);
      throw error;
    }
  }

  /**
   * Cancel a handover
   */
  async cancelHandover(handoverId: string, reason: string): Promise<IShiftHandover | null> {
    try {
      const handover = await ShiftHandover.findOne({ handoverId }).exec();
      if (!handover) {
        throw new Error(`Handover not found: ${handoverId}`);
      }

      if (
        handover.status === HandoverStatus.COMPLETED ||
        handover.status === HandoverStatus.ARCHIVED
      ) {
        throw new Error(`Cannot cancel handover in status: ${handover.status}`);
      }

      handover.status = HandoverStatus.CANCELLED;
      handover.metadata = { ...handover.metadata, cancellationReason: reason };

      await handover.save();
      logger.info(`Handover ${handoverId} cancelled: ${reason}`);

      return handover;
    } catch (error) {
      logger.error(`Failed to cancel handover ${handoverId}:`, error);
      throw error;
    }
  }
}

export const handoverService = new HandoverService();
