/**
 * Memory Routes
 *
 * CRUD operations for memories
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = function(memories, tags, categories, classifier) {
  const router = express.Router();

  /**
   * GET /api/memories
   * List memories with filters
   */
  router.get('/', (req, res) => {
    const { category, type, tag, search, limit = 50, offset = 0, sort = 'desc' } = req.query;

    let result = Array.from(memories.values());

    // Filters
    if (category) {
      result = result.filter(m => m.category === category);
    }
    if (type) {
      result = result.filter(m => m.type === type);
    }
    if (tag) {
      result = result.filter(m => m.tags?.includes(tag));
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(m =>
        m.title?.toLowerCase().includes(s) ||
        m.content?.toLowerCase().includes(s) ||
        m.tags?.some(t => t.toLowerCase().includes(s))
      );
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sort === 'asc' ? dateA - dateB : dateB - dateA;
    });

    // Stats
    const total = result.length;
    result = result.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      memories: result,
      total,
      limit: Number(limit),
      offset: Number(offset)
    });
  });

  /**
   * GET /api/memories/:id
   * Get single memory
   */
  router.get('/:id', (req, res) => {
    const memory = memories.get(req.params.id);

    if (!memory) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    res.json({ success: true, memory });
  });

  /**
   * POST /api/memories
   * Create memory (manual)
   */
  router.post('/', (req, res) => {
    const { userId, title, content, type = 'text', category, tags: memoryTags, metadata = {} } = req.body;

    if (!content && !title) {
      return res.status(400).json({ success: false, error: 'Content or title required' });
    }

    // Classify
    const classification = classifier.classify(content || title, { type, metadata });

    const memory = {
      id: uuidv4(),
      userId: userId || 'default',
      type,
      title: title || classification.title,
      content: content || '',
      category: category || classification.category,
      tags: memoryTags || classification.tags,
      classification,
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memories.set(memory.id, memory);

    // Update tag counts
    if (memory.tags) {
      memory.tags.forEach(tagName => {
        if (tags.has(tagName)) {
          const tag = tags.get(tagName);
          tag.count++;
          tags.set(tagName, tag);
        }
      });
    }

    res.status(201).json({ success: true, memory });
  });

  /**
   * PUT /api/memories/:id
   * Update memory
   */
  router.put('/:id', (req, res) => {
    const memory = memories.get(req.params.id);

    if (!memory) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    const { title, content, category, tags: memoryTags, metadata, reclassify } = req.body;

    // Re-classify if content changed
    if (reclassify && (content || title)) {
      const classification = classifier.classify(content || title, { type: memory.type });
      memory.classification = classification;
      if (!memoryTags) memory.tags = classification.tags;
    }

    if (title) memory.title = title;
    if (content) memory.content = content;
    if (category) memory.category = category;
    if (memoryTags) memory.tags = memoryTags;
    if (metadata) memory.metadata = { ...memory.metadata, ...metadata };

    memory.updatedAt = new Date().toISOString();
    memories.set(memory.id, memory);

    res.json({ success: true, memory });
  });

  /**
   * DELETE /api/memories/:id
   * Delete memory
   */
  router.delete('/:id', (req, res) => {
    const memory = memories.get(req.params.id);

    if (!memory) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    // Update tag counts
    if (memory.tags) {
      memory.tags.forEach(tagName => {
        if (tags.has(tagName)) {
          const tag = tags.get(tagName);
          tag.count = Math.max(0, tag.count - 1);
          tags.set(tagName, tag);
        }
      });
    }

    memories.delete(req.params.id);

    res.json({ success: true, message: 'Memory deleted' });
  });

  /**
   * POST /api/memories/:id/classify
   * Re-classify memory
   */
  router.post('/:id/classify', (req, res) => {
    const memory = memories.get(req.params.id);

    if (!memory) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    const classification = classifier.classify(memory.content || memory.title, {
      type: memory.type,
      metadata: memory.metadata
    });

    memory.classification = classification;
    memory.updatedAt = new Date().toISOString();
    memories.set(memory.id, memory);

    res.json({ success: true, classification });
  });

  /**
   * POST /api/memories/:id/tags
   * Add tags to memory
   */
  router.post('/:id/tags', (req, res) => {
    const memory = memories.get(req.params.id);

    if (!memory) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    const { tags: newTags } = req.body;

    if (!newTags || !Array.isArray(newTags)) {
      return res.status(400).json({ success: false, error: 'Tags array required' });
    }

    // Add new tags
    memory.tags = [...new Set([...(memory.tags || []), ...newTags])];
    memory.updatedAt = new Date().toISOString();

    // Update tag counts
    newTags.forEach(tagName => {
      if (!tags.has(tagName)) {
        tags.set(tagName, { name: tagName, count: 0 });
      }
      const tag = tags.get(tagName);
      tag.count++;
      tags.set(tagName, tag);
    });

    memories.set(memory.id, memory);

    res.json({ success: true, tags: memory.tags });
  });

  /**
   * GET /api/memories/user/:userId
   * Get user's memories
   */
  router.get('/user/:userId', (req, res) => {
    const { limit = 50, offset = 0 } = req.query;

    const userMemories = Array.from(memories.values())
      .filter(m => m.userId === req.params.userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      memories: userMemories,
      total: Array.from(memories.values()).filter(m => m.userId === req.params.userId).length
    });
  });

  return router;
};
