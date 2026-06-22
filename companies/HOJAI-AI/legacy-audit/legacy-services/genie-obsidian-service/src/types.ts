/**
 * GENIE Obsidian Service - Type Definitions
 * Version: 1.0.0 | Date: June 13, 2026
 */

export interface ObsidianNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  path: string;
  tags: string[];
  links: string[];
  backlinks: string[];
  created_at: string;
  updated_at: string;
}

export interface ObsidianVault {
  id: string;
  user_id: string;
  name: string;
  path: string;
  synced_at: string;
}
