import { ValidationError } from '../utils/errors';
const VALID_METRICS = ['uptime', 'latency', 'throughput', 'error_rate', 'response_time', 'availability'];
const VALID_COMPARATORS = ['gte', 'lte', 'eq', 'between'];

export const validateSLA = (data: any): void => {
  if (!data) throw new ValidationError('Body required');
  if (!data.name) throw new ValidationError('name is required');
  if (!data.serviceId) throw new ValidationError('serviceId is required');
  if (!data.provider) throw new ValidationError('provider is required');
  if (!data.consumer) throw new ValidationError('consumer is required');
  if (!data.targets || !Array.isArray(data.targets) || data.targets.length === 0) {
    throw new ValidationError('targets must be a non-empty array');
  }
  for (const t of data.targets) {
    if (!VALID_METRICS.includes(t.metric)) throw new ValidationError(`Invalid metric: ${t.metric}`);
    if (!VALID_COMPARATORS.includes(t.comparator)) throw new ValidationError(`Invalid comparator: ${t.comparator}`);
    if (typeof t.threshold !== 'number') throw new ValidationError('threshold must be a number');
  }
  if (!data.startDate || !data.endDate) throw new ValidationError('startDate and endDate are required');
};
