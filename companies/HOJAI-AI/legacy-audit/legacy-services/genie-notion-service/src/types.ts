/**
 * GENIE Notion Service - Type Definitions
 * Version: 1.0.0 | Date: June 13, 2026
 */

export interface NotionPage {
  id: string;
  user_id: string;
  notion_id: string;
  title: string;
  content: string;
  properties: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface NotionDatabase {
  id: string;
  user_id: string;
  name: string;
  notion_id: string;
}
