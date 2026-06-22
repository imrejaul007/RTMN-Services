/**
 * Notes Module - Note Taking & Organization
 *
 * Handles creating, organizing, and managing notes
 */

import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  Collaborator,
  ApiResponse
} from '../types.js';

const router = Router();

// ============================================================================
// IN-MEMORY STORE (Mock Implementation)
// In production, use MongoDB or a document store
// ============================================================================

const notes: Map<string, Note> = new Map();

// ============================================================================
// HELPERS
// ============================================================================

function generateNoteId(): string {
  return `note_${Date.now()}_${uuid().split('-')[0]}`;
}

function validateNoteInput(input: CreateNoteInput): void {
  if (!input.title?.trim()) {
    throw new Error('Title is required');
  }
  if (!input.content?.trim()) {
    throw new Error('Content is required');
  }
}

function serializeNote(note: Note): Note {
  return {
    ...note,
    createdAt: new Date(note.createdAt),
    updatedAt: new Date(note.updatedAt)
  };
}

function getUserId(req: Request): string {
  return (req.headers['x-user-id'] as string) || 'default-user';
}

function getTenantId(req: Request): string {
  return (req.headers['x-tenant-id'] as string) || 'default';
}

function searchNotes(notesList: Note[], search: string): Note[] {
  const searchLower = search.toLowerCase();
  return notesList.filter(note =>
    note.title.toLowerCase().includes(searchLower) ||
    note.content.toLowerCase().includes(searchLower) ||
    note.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
    note.folder?.toLowerCase().includes(searchLower)
  );
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/notes
 * Create a new note
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const input: CreateNoteInput = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    validateNoteInput(input);

    const collaborators: Collaborator[] = (input.collaborators || []).map(col => ({
      userId: col.userId,
      email: `user_${col.userId}@example.com`,
      name: col.name,
      permission: col.permission || 'read'
    }));

    const note: Note = {
      id: generateNoteId(),
      userId,
      tenantId,
      title: input.title.trim(),
      content: input.content.trim(),
      contentHtml: input.contentHtml,
      format: input.format || 'plain',
      isPinned: input.isPinned || false,
      isArchived: false,
      color: input.color,
      tags: input.tags || [],
      folder: input.folder,
      linkedEvents: [],
      linkedTasks: [],
      collaborators,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    notes.set(note.id, note);

    const response: ApiResponse<Note> = {
      success: true,
      data: serializeNote(note),
      message: 'Note created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create note';
    res.status(400).json({ success: false, error: message });
  }
});

/**
 * GET /api/notes
 * List all notes for the user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const tenantId = getTenantId(req);
    const {
      folder,
      tag,
      search,
      isArchived,
      pinned,
      page = '1',
      limit = '20',
      sort = 'updatedAt',
      order = 'desc'
    } = req.query;

    let filtered = Array.from(notes.values()).filter(
      note => note.userId === userId && note.tenantId === tenantId
    );

    // Filter by folder
    if (folder) {
      filtered = filtered.filter(n => n.folder === folder);
    }

    // Filter by tag
    if (tag) {
      filtered = filtered.filter(n => n.tags?.includes(tag as string));
    }

    // Filter by archived status
    if (isArchived !== undefined) {
      const archived = isArchived === 'true';
      filtered = filtered.filter(n => n.isArchived === archived);
    } else {
      // Default: exclude archived notes
      filtered = filtered.filter(n => !n.isArchived);
    }

    // Filter by pinned
    if (pinned !== undefined) {
      const pinnedNotes = pinned === 'true';
      filtered = filtered.filter(n => n.isPinned === pinnedNotes);
    }

    // Search
    if (search) {
      filtered = searchNotes(filtered, search as string);
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sort as keyof Note];
      const bVal = b[sort as keyof Note];

      if (aVal === undefined || bVal === undefined) return 0;

      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else if (aVal instanceof Date && bVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime();
      }

      return order === 'desc' ? -comparison : comparison;
    });

    // Separate pinned notes to top
    const pinnedNotes = filtered.filter(n => n.isPinned);
    const unpinnedNotes = filtered.filter(n => !n.isPinned);

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const total = filtered.length;
    const totalPages = Math.ceil(total / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedNotes = [...pinnedNotes, ...unpinnedNotes].slice(startIndex, startIndex + limitNum);

    // Get unique folders and tags
    const folders = [...new Set(filtered.filter(n => n.folder).map(n => n.folder!))];
    const tags = [...new Set(filtered.flatMap(n => n.tags || []))];

    const response: ApiResponse<Note[]> = {
      success: true,
      data: paginatedNotes.map(serializeNote),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    };

    // Attach metadata
    res.json({
      ...response,
      meta: { folders, tags, totalNotes: filtered.length }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list notes';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/notes/:id
 * Get a specific note
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const note = notes.get(id);

    if (!note || note.userId !== userId || note.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const response: ApiResponse<Note> = {
      success: true,
      data: serializeNote(note)
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get note';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * PATCH /api/notes/:id
 * Update a note
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const input: UpdateNoteInput = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const note = notes.get(id);

    if (!note || note.userId !== userId || note.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    // Update fields
    if (input.title !== undefined) note.title = input.title.trim();
    if (input.content !== undefined) note.content = input.content.trim();
    if (input.contentHtml !== undefined) note.contentHtml = input.contentHtml;
    if (input.format !== undefined) note.format = input.format;
    if (input.isPinned !== undefined) note.isPinned = input.isPinned;
    if (input.isArchived !== undefined) note.isArchived = input.isArchived;
    if (input.color !== undefined) note.color = input.color;
    if (input.tags !== undefined) note.tags = input.tags;
    if (input.folder !== undefined) note.folder = input.folder;
    if (input.metadata !== undefined) note.metadata = input.metadata;

    note.updatedAt = new Date();

    const response: ApiResponse<Note> = {
      success: true,
      data: serializeNote(note),
      message: 'Note updated successfully'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update note';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/notes/:id
 * Delete a note
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const note = notes.get(id);

    if (!note || note.userId !== userId || note.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    notes.delete(id);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Note deleted'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete note';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/notes/:id/pin
 * Pin/unpin a note
 */
router.post('/:id/pin', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isPinned = true } = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const note = notes.get(id);

    if (!note || note.userId !== userId || note.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    note.isPinned = isPinned;
    note.updatedAt = new Date();

    const response: ApiResponse<Note> = {
      success: true,
      data: serializeNote(note),
      message: isPinned ? 'Note pinned' : 'Note unpinned'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to pin note';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/notes/:id/archive
 * Archive/unarchive a note
 */
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isArchived = true } = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const note = notes.get(id);

    if (!note || note.userId !== userId || note.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    note.isArchived = isArchived;
    note.updatedAt = new Date();

    const response: ApiResponse<Note> = {
      success: true,
      data: serializeNote(note),
      message: isArchived ? 'Note archived' : 'Note unarchived'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to archive note';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/notes/:id/tags
 * Add tags to a note
 */
router.post('/:id/tags', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({ success: false, error: 'Tags array is required' });
    }

    const note = notes.get(id);

    if (!note || note.userId !== userId || note.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const existingTags = new Set(note.tags || []);
    tags.forEach(tag => existingTags.add(tag.trim()));
    note.tags = Array.from(existingTags);
    note.updatedAt = new Date();

    const response: ApiResponse<Note> = {
      success: true,
      data: serializeNote(note),
      message: 'Tags added'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add tags';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/notes/:id/tags/:tag
 * Remove a tag from a note
 */
router.delete('/:id/tags/:tag', async (req: Request, res: Response) => {
  try {
    const { id, tag } = req.params;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const note = notes.get(id);

    if (!note || note.userId !== userId || note.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    note.tags = (note.tags || []).filter(t => t !== tag);
    note.updatedAt = new Date();

    const response: ApiResponse<Note> = {
      success: true,
      data: serializeNote(note),
      message: 'Tag removed'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove tag';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/notes/folders/list
 * Get all folders
 */
router.get('/folders/list', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const userNotes = Array.from(notes.values()).filter(
      n => n.userId === userId && n.tenantId === tenantId && n.folder
    );

    const folders = Array.from(new Set(userNotes.map(n => n.folder!)));

    const folderStats = folders.map(folder => {
      const folderNotes = userNotes.filter(n => n.folder === folder);
      return {
        name: folder,
        count: folderNotes.length,
        lastUpdated: folderNotes.sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0]?.updatedAt
      };
    });

    res.json({ success: true, data: folderStats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list folders';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/notes/tags/list
 * Get all tags
 */
router.get('/tags/list', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const userNotes = Array.from(notes.values()).filter(
      n => n.userId === userId && n.tenantId === tenantId && n.tags && n.tags.length > 0
    );

    const tagCounts = new Map<string, number>();

    userNotes.forEach(note => {
      note.tags!.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const tags = Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ success: true, data: tags });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list tags';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/notes/:id/duplicate
 * Duplicate a note
 */
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const original = notes.get(id);

    if (!original || original.userId !== userId || original.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const duplicate: Note = {
      ...original,
      id: generateNoteId(),
      title: `${original.title} (Copy)`,
      isPinned: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    notes.set(duplicate.id, duplicate);

    const response: ApiResponse<Note> = {
      success: true,
      data: serializeNote(duplicate),
      message: 'Note duplicated'
    };

    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to duplicate note';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/notes/bulk-delete
 * Delete multiple notes
 */
router.post('/bulk-delete', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ success: false, error: 'IDs array is required' });
    }

    const deleted: string[] = [];
    const notFound: string[] = [];

    ids.forEach(id => {
      const note = notes.get(id);
      if (note && note.userId === userId && note.tenantId === tenantId) {
        notes.delete(id);
        deleted.push(id);
      } else {
        notFound.push(id);
      }
    });

    res.json({
      success: true,
      message: `${deleted.length} notes deleted`,
      data: { deleted, notFound }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bulk delete';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
