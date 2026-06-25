/**
 * Creator Routes — templates, drafts, calendar, stats.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const STATUSES = ['draft', 'in-review', 'published', 'archived'];
const CHANNELS = ['blog', 'twitter', 'instagram', 'youtube', 'podcast', 'email', 'linkedin', 'tiktok', 'other'];

module.exports = function({ templatesStore, draftsStore, calendarStore, assetsStore }) {
  const router = express.Router();

  // === TEMPLATES (no :userId) ===
  router.get('/templates', (req, res) => {
    const list = Array.from(templatesStore.entries()).map(([k, v]) => ({ id: k, ...v }));
    res.json({ success: true, total: list.length, templates: list });
  });

  router.get('/templates/:templateId', (req, res) => {
    const t = templatesStore.get(req.params.templateId);
    if (!t) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, data: t });
  });

  // === DRAFTS ===
  router.get('/drafts/by-user/:userId', (req, res) => {
    const list = Array.from(draftsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(d => d.userId === req.params.userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    res.json({ success: true, total: list.length, drafts: list });
  });

  router.post('/drafts/by-user/:userId', (req, res) => {
    const { title, templateId, body = '', tags = [] } = req.body || {};
    if (!title || title.trim().length < 2) return res.status(400).json({ success: false, error: 'title required' });
    if (templateId && !templatesStore.get(templateId)) return res.status(400).json({ success: false, error: 'unknown template' });
    const id = `dr-${uuidv4().slice(0, 8)}`;
    const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
    const d = {
      id, userId: req.params.userId, title: title.trim(), templateId: templateId || null,
      body, wordCount, tags, status: 'draft',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    draftsStore.set(id, d);
    res.status(201).json({ success: true, data: d });
  });

  // Specific draft routes MUST come before /drafts/by-user pattern matching
  router.get('/drafts/:draftId', (req, res) => {
    const d = draftsStore.get(req.params.draftId);
    if (!d) return res.status(404).json({ success: false, error: 'Draft not found' });
    res.json({ success: true, data: d });
  });

  router.patch('/drafts/:draftId', (req, res) => {
    const d = draftsStore.get(req.params.draftId);
    if (!d) return res.status(404).json({ success: false, error: 'Draft not found' });
    const { title, body, status, tags, templateId } = req.body || {};
    if (title !== undefined) d.title = title;
    if (body !== undefined) { d.body = body; d.wordCount = body.trim().split(/\s+/).filter(Boolean).length; }
    if (status !== undefined) {
      if (!STATUSES.includes(status)) return res.status(400).json({ success: false, error: `status must be: ${STATUSES.join(', ')}` });
      d.status = status;
    }
    if (tags !== undefined) d.tags = tags;
    if (templateId !== undefined) d.templateId = templateId || null;
    d.updatedAt = new Date().toISOString();
    draftsStore.set(req.params.draftId, d);
    res.json({ success: true, data: d });
  });

  router.delete('/drafts/:draftId', (req, res) => {
    const d = draftsStore.get(req.params.draftId);
    if (!d) return res.status(404).json({ success: false, error: 'Draft not found' });
    draftsStore.delete(req.params.draftId);
    res.json({ success: true, deleted: req.params.draftId });
  });

  router.post('/drafts/:draftId/publish', (req, res) => {
    const d = draftsStore.get(req.params.draftId);
    if (!d) return res.status(404).json({ success: false, error: 'Draft not found' });
    d.status = 'published';
    d.publishedAt = new Date().toISOString();
    d.updatedAt = d.publishedAt;
    draftsStore.set(req.params.draftId, d);
    res.json({ success: true, data: d });
  });

  // === CALENDAR ===
  router.get('/calendar/by-user/:userId', (req, res) => {
    const list = Array.from(calendarStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(c => c.userId === req.params.userId)
      .sort((a, b) => a.date.localeCompare(b.date));
    res.json({ success: true, total: list.length, entries: list });
  });

  router.post('/calendar/by-user/:userId', (req, res) => {
    const { title, type = 'publish', channel, date, draftId } = req.body || {};
    if (!title || !channel || !date) return res.status(400).json({ success: false, error: 'title, channel, date required' });
    if (!CHANNELS.includes(channel)) return res.status(400).json({ success: false, error: `channel must be: ${CHANNELS.join(', ')}` });
    const id = `cal-${uuidv4().slice(0, 8)}`;
    const c = { id, userId: req.params.userId, title, type, channel, date, draftId: draftId || null, status: 'scheduled' };
    calendarStore.set(id, c);
    res.status(201).json({ success: true, data: c });
  });

  // === STATS ===
  router.get('/stats/:userId', (req, res) => {
    const drafts = Array.from(draftsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(d => d.userId === req.params.userId);
    const calendar = Array.from(calendarStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(c => c.userId === req.params.userId);
    const byStatus = { draft: 0, 'in-review': 0, published: 0, archived: 0 };
    for (const d of drafts) byStatus[d.status] = (byStatus[d.status] || 0) + 1;
    const totalWords = drafts.reduce((s, d) => s + (d.wordCount || 0), 0);
    const byChannel = {};
    for (const c of calendar) byChannel[c.channel] = (byChannel[c.channel] || 0) + 1;
    res.json({
      success: true,
      data: {
        totalDrafts: drafts.length,
        byStatus,
        totalWords,
        totalScheduled: calendar.filter(c => c.status === 'scheduled').length,
        totalPublished: drafts.filter(d => d.status === 'published').length,
        byChannel,
      },
    });
  });

  return router;
};
