/**
 * GENIE genie-discord-service - Business Logic
 */
import { createLogger } from '../utils/logger.js';
const logger = createLogger('genie-discord-service');

export async function getStatus(userId: string) {
  logger.info('get_status', { userId });
  return { service: 'genie-discord-service', status: 'operational', userId };
}
