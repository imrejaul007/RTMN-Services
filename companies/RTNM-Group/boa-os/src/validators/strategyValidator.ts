// ============================================================================
// Strategy Validator
// ============================================================================

import { ValidationError } from '../utils/errors';

export const validateStrategy = (data: any): void => {
  if (!data) throw new ValidationError('Request body is required');
  if (!data.name || typeof data.name !== 'string') throw new ValidationError('name is required and must be a string');
  if (data.name.length < 3) throw new ValidationError('name must be at least 3 characters');
  if (data.name.length > 200) throw new ValidationError('name must not exceed 200 characters');
  if (!data.vision) throw new ValidationError('vision is required');
  if (!data.mission) throw new ValidationError('mission is required');
  if (!data.owner) throw new ValidationError('owner is required');
  if (!data.horizon) throw new ValidationError('horizon is required');
  if (!['1-year', '3-year', '5-year', '10-year'].includes(data.horizon)) {
    throw new ValidationError('horizon must be 1-year, 3-year, 5-year, or 10-year');
  }
  if (!data.startDate || !data.endDate) throw new ValidationError('startDate and endDate are required');
  if (new Date(data.endDate) <= new Date(data.startDate)) {
    throw new ValidationError('endDate must be after startDate');
  }
};

export const validateObjective = (data: any): void => {
  if (!data) throw new ValidationError('Request body is required');
  if (!data.title) throw new ValidationError('title is required');
  if (data.title.length < 3) throw new ValidationError('title must be at least 3 characters');
  if (!data.strategyId) throw new ValidationError('strategyId is required');
  if (!data.pillarId) throw new ValidationError('pillarId is required');
  if (!data.owner) throw new ValidationError('owner is required');
  if (data.priority && !['low', 'medium', 'high', 'critical'].includes(data.priority)) {
    throw new ValidationError('priority must be low, medium, high, or critical');
  }
  if (data.keyResults && !Array.isArray(data.keyResults)) {
    throw new ValidationError('keyResults must be an array');
  }
};

export const validateRoadmap = (data: any): void => {
  if (!data) throw new ValidationError('Request body is required');
  if (!data.name) throw new ValidationError('name is required');
  if (!data.strategyId) throw new ValidationError('strategyId is required');
  if (!data.startDate || !data.endDate) throw new ValidationError('startDate and endDate are required');
  if (!data.milestones || !Array.isArray(data.milestones)) {
    throw new ValidationError('milestones must be an array');
  }
  for (const m of data.milestones) {
    if (!m.title) throw new ValidationError('Each milestone must have a title');
    if (!m.targetDate) throw new ValidationError('Each milestone must have a targetDate');
  }
};
