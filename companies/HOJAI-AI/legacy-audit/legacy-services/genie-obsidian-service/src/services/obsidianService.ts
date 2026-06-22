/**
 * GENIE Obsidian Service - Business Logic
 */
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('obsidian-service');
const notes = new Map<string, any>();

export async function getNotes(userId: string) {
  logger.info('get_notes', { userId });
  return Array.from(notes.values()).filter(n => n.user_id === userId);
}

export async function createNote(userId: string, input: { title: string; content: string; tags?: string[] }) {
  const note = {
    id: uuidv4(), user_id: userId, title: input.title, content: input.content,
    path: `/${input.title.toLowerCase().replace(/\s+/g, '-')}.md`,
    tags: input.tags || [], links: [], backlinks: [],
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  };
  notes.set(note.id, note);
  logger.info('note_created', { noteId: note.id, userId });
  return note;
}

export async function searchNotes(userId: string, query: string) {
  const q = query.toLowerCase();
  return Array.from(notes.values()).filter(n =>
    n.user_id === userId && (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
  );
}
