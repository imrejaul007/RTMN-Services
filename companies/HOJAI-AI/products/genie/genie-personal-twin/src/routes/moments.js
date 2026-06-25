/**
 * Moments Routes — life moments (turning points)
 *
 * A moment is a single dated event in the user's life:
 *   - type: 'milestone' | 'relationship' | 'learning' | 'loss' | 'win' | 'travel' | 'health' | 'career'
 *   - title, date (YYYY-MM-DD), description, impact ('low' | 'medium' | 'high' | 'transformative')
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const VALID_TYPES = ['milestone', 'relationship', 'learning', 'loss', 'win', 'travel', 'health', 'career'];
const VALID_IMPACTS = ['low', 'medium', 'high', 'transformative'];

module.exports = function({ momentsStore, twinsStore }) {
  const router = express.Router();

  router.post('/add/:userId', (req, res) => {
    const { userId } = req.params;
    const { type = 'milestone', title, date, description = '', impact = 'medium' } = req.body || {};

    if (!title || title.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'title required (min 2 chars)' });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'date required (YYYY-MM-DD)' });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ success: false, error: `type required (${VALID_TYPES.join('|')})` });
    }
    if (!VALID_IMPACTS.includes(impact)) {
      return res.status(400).json({ success: false, error: `impact required (${VALID_IMPACTS.join('|')})` });
    }

    const id = `mmt-${uuidv4().slice(0, 8)}`;
    const moment = {
      id, userId, type, title: title.trim(), date, description, impact,
      createdAt: new Date().toISOString(),
    };
    momentsStore.set(id, moment);

    res.status(201).json({ success: true, data: moment });
  });

  router.get('/list/:userId', (req, res) => {
    const { userId } = req.params;
    const { type } = req.query;
    let moments = Array.from(momentsStore.entries())
      .map(([k, v]) => ({ id: k, ...v }))
      .filter(m => m.userId === userId);
    if (type && VALID_TYPES.includes(type)) {
      moments = moments.filter(m => m.type === type);
    }
    moments.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    res.json({ success: true, total: moments.length, moments });
  });

  router.get('/get/:momentId', (req, res) => {
    const { momentId } = req.params;
    const m = momentsStore.get(momentId);
    if (!m) return res.status(404).json({ success: false, error: 'Moment not found' });
    res.json({ success: true, data: { id: momentId, ...m } });
  });

  return router;
};
