/**
 * GENIE Notion Service - Business Logic
 */
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('notion-service');
const pages = new Map<string, any>();

export async function getPages(userId: string) {
  logger.info('get_pages', { userId });
  return Array.from(pages.values()).filter(p => p.user_id === userId);
}

export async function createPage(userId: string, input: { title: string; content?: string }) {
  const page = {
    id: uuidv4(), user_id: userId, notion_id: uuidv4(),
    title: input.title, content: input.content || '',
    properties: {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  };
  pages.set(page.id, page);
  logger.info('page_created', { pageId: page.id, userId });
  return page;
}
