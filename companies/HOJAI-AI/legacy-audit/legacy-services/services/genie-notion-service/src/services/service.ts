/**
 * GENIE genie-notion-service - Business Logic
 */
import { createLogger } from '../utils/logger.js';
const logger = createLogger('genie-notion-service');

export async function getStatus(userId: string) {
  logger.info('get_status', { userId });
  return { service: 'genie-notion-service', status: 'operational', userId };
}
