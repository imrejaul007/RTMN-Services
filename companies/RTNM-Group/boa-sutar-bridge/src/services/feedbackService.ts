// Feedback Service - Captures execution feedback from SUTAR to BOA
import { v4 as uuidv4 } from 'uuid';
import { FeedbackLoop } from '../types';
import { logger } from '../utils/logger';
import { eventBus } from '../utils/eventBus';

export class FeedbackService {
  private feedbacks: Map<string, FeedbackLoop> = new Map();
  private handlers: Map<string, Array<(fb: FeedbackLoop) => void>> = new Map();

  /**
   * Capture feedback from SUTAR
   */
  capture(input: {
    sutarGoalId: string;
    boaObjectiveId: string;
    feedbackType: FeedbackLoop['feedbackType'];
    message: string;
    data?: Record<string, any>;
    severity?: FeedbackLoop['severity'];
  }): FeedbackLoop {
    const feedback: FeedbackLoop = {
      id: uuidv4(),
      sutarGoalId: input.sutarGoalId,
      boaObjectiveId: input.boaObjectiveId,
      feedbackType: input.feedbackType,
      message: input.message,
      data: input.data || {},
      severity: input.severity || 'info',
      createdAt: new Date(),
      processed: false,
    };

    this.feedbacks.set(feedback.id, feedback);
    logger.info(`[Feedback] ${feedback.feedbackType} (${feedback.severity}): ${feedback.message}`);

    // Invoke handlers
    const handlers = this.handlers.get(input.feedbackType) || [];
    handlers.forEach(h => h(feedback));

    // Publish event
    eventBus.publish('bridge.feedback.received', {
      feedbackId: feedback.id,
      feedbackType: feedback.feedbackType,
      severity: feedback.severity,
      boaObjectiveId: feedback.boaObjectiveId,
    });

    return feedback;
  }

  /**
   * Register a handler for a feedback type
   */
  registerHandler(feedbackType: FeedbackLoop['feedbackType'], handler: (fb: FeedbackLoop) => void): void {
    if (!this.handlers.has(feedbackType)) this.handlers.set(feedbackType, []);
    this.handlers.get(feedbackType)!.push(handler);
  }

  /**
   * Mark feedback as processed
   */
  markProcessed(id: string): boolean {
    const fb = this.feedbacks.get(id);
    if (!fb) return false;
    fb.processed = true;
    return true;
  }

  /**
   * Get feedback for an objective
   */
  getForObjective(boaObjectiveId: string): FeedbackLoop[] {
    return Array.from(this.feedbacks.values()).filter(f => f.boaObjectiveId === boaObjectiveId);
  }

  /**
   * Get unprocessed feedback
   */
  getUnprocessed(): FeedbackLoop[] {
    return Array.from(this.feedbacks.values()).filter(f => !f.processed);
  }

  /**
   * Get feedback by severity
   */
  getBySeverity(severity: FeedbackLoop['severity']): FeedbackLoop[] {
    return Array.from(this.feedbacks.values()).filter(f => f.severity === severity);
  }

  /**
   * Get feedback statistics
   */
  getStats(): { total: number; processed: number; unprocessed: number; bySeverity: Record<string, number>; byType: Record<string, number> } {
    const all = Array.from(this.feedbacks.values());
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    all.forEach(f => {
      bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
      byType[f.feedbackType] = (byType[f.feedbackType] || 0) + 1;
    });
    return {
      total: all.length,
      processed: all.filter(f => f.processed).length,
      unprocessed: all.filter(f => !f.processed).length,
      bySeverity,
      byType,
    };
  }
}

export const feedbackService = new FeedbackService();
export default feedbackService;
