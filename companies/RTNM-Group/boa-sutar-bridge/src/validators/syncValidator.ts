import { ValidationError } from '../utils/errors';

export const validateSyncRequest = (data: any): void => {
  if (!data) throw new ValidationError('Request body required');
  if (!data.boaObjectiveId) throw new ValidationError('boaObjectiveId is required');
  if (typeof data.boaObjectiveId !== 'string') throw new ValidationError('boaObjectiveId must be a string');
};

export const validateFeedback = (data: any): void => {
  if (!data) throw new ValidationError('Request body required');
  if (!data.sutarGoalId) throw new ValidationError('sutarGoalId is required');
  if (!data.boaObjectiveId) throw new ValidationError('boaObjectiveId is required');
  if (!data.message) throw new ValidationError('message is required');
  if (!data.feedbackType) throw new ValidationError('feedbackType is required');
  if (!['progress', 'blocker', 'completion', 'deviation', 'insight'].includes(data.feedbackType)) {
    throw new ValidationError('feedbackType must be progress, blocker, completion, deviation, or insight');
  }
};
