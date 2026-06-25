/**
 * Learner Routes — decks / cards / reviews / paths / streak
 *
 * Spaced repetition: SM-2-lite algorithm.
 *   again → reset interval to 0, ease -= 0.2 (min 1.3)
 *   hard  → interval *= 1.2, ease -= 0.15
 *   good  → interval *= ease (first review: 1 day)
 *   easy  → interval *= ease * 1.3, ease += 0.15
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const RATINGS = ['again', 'hard', 'good', 'easy'];

// User IDs look like "user-XXXX" or "u-XXXX"; deck/card IDs start with dk-/cd-.
// We use this guard so /decks/:userId never accidentally matches a deck id.
const isUserId = (s) => /^user-|^u-/i.test(s) || s === 'user-001';

function nextSchedule(card, rating, now = Date.now()) {
  let { interval = 0, ease = 2.5, reps = 0 } = card;
  if (rating === 'again') { interval = 0; ease = Math.max(1.3, ease - 0.2); reps = 0; }
  else if (rating === 'hard') { interval = Math.max(1, Math.round(interval * 1.2 || 1)); ease = Math.max(1.3, ease - 0.15); reps += 1; }
  else if (rating === 'good') { interval = reps === 0 ? 1 : Math.max(1, Math.round(interval * ease || 1)); reps += 1; }
  else if (rating === 'easy') { interval = Math.max(1, Math.round((interval || 1) * ease * 1.3)); ease = Math.min(3.5, ease + 0.15); reps += 1; }
  const dueAt = new Date(now + interval * 86400000).toISOString();
  return { interval, ease: Math.round(ease * 100) / 100, reps, dueAt };
}

module.exports = function({ decksStore, cardsStore, reviewsStore, pathsStore }) {
  const router = express.Router();

  // === PATHS (no :userId) ===
  router.get('/paths', (req, res) => {
    const list = Array.from(pathsStore.entries()).map(([k, v]) => ({ id: k, ...v }));
    res.json({ success: true, total: list.length, paths: list });
  });

  router.get('/paths/:pathId', (req, res) => {
    const p = pathsStore.get(req.params.pathId);
    if (!p) return res.status(404).json({ success: false, error: 'Path not found' });
    res.json({ success: true, data: p });
  });

  // === SPECIFIC DECK (by deckId) — must come BEFORE /decks/:userId ===
  router.get('/decks/:deckId', (req, res) => {
    if (isUserId(req.params.deckId)) {
      // Fall through to list route
      const list = Array.from(decksStore.entries()).map(([k, v]) => ({ id: k, ...v }))
        .filter(d => d.userId === req.params.deckId);
      return res.json({ success: true, total: list.length, decks: list });
    }
    const d = decksStore.get(req.params.deckId);
    if (!d) return res.status(404).json({ success: false, error: 'Deck not found' });
    const cards = Array.from(cardsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(c => c.deckId === req.params.deckId);
    res.json({ success: true, data: { ...d, cards } });
  });

  router.delete('/decks/:deckId/:userId', (req, res) => {
    const d = decksStore.get(req.params.deckId);
    if (!d) return res.status(404).json({ success: false, error: 'Deck not found' });
    if (d.userId !== req.params.userId) return res.status(403).json({ success: false, error: 'Not your deck' });
    const cards = Array.from(cardsStore.entries()).filter(([k, v]) => v.deckId === req.params.deckId);
    for (const [k] of cards) cardsStore.delete(k);
    decksStore.delete(req.params.deckId);
    res.json({ success: true, deleted: req.params.deckId, cardsDeleted: cards.length });
  });

  // === DECKS BY USER ===
  router.get('/decks/by-user/:userId', (req, res) => {
    const list = Array.from(decksStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(d => d.userId === req.params.userId);
    res.json({ success: true, total: list.length, decks: list });
  });

  router.post('/decks/by-user/:userId', (req, res) => {
    const { title, description = '', tags = [] } = req.body || {};
    if (!title || title.trim().length < 2) return res.status(400).json({ success: false, error: 'title required' });
    const id = `dk-${uuidv4().slice(0, 8)}`;
    const d = { id, userId: req.params.userId, title: title.trim(), description, tags, cardCount: 0, createdAt: new Date().toISOString() };
    decksStore.set(id, d);
    res.status(201).json({ success: true, data: d });
  });

  // === CARDS ===
  router.post('/decks/:deckId/cards', (req, res) => {
    const d = decksStore.get(req.params.deckId);
    if (!d) return res.status(404).json({ success: false, error: 'Deck not found' });
    const { front, back, tags = [], userId } = req.body || {};
    if (!userId || d.userId !== userId) return res.status(403).json({ success: false, error: 'Not your deck' });
    if (!front || !back) return res.status(400).json({ success: false, error: 'front + back required' });
    const id = `cd-${uuidv4().slice(0, 8)}`;
    const c = { id, deckId: req.params.deckId, front: front.trim(), back: back.trim(), tags, interval: 0, ease: 2.5, reps: 0, dueAt: new Date().toISOString(), createdAt: new Date().toISOString() };
    cardsStore.set(id, c);
    d.cardCount = (d.cardCount || 0) + 1;
    decksStore.set(req.params.deckId, d);
    res.status(201).json({ success: true, data: c });
  });

  router.delete('/cards/:cardId', (req, res) => {
    const c = cardsStore.get(req.params.cardId);
    if (!c) return res.status(404).json({ success: false, error: 'Card not found' });
    const d = decksStore.get(c.deckId);
    const { userId } = req.body || {};
    if (!d || !userId || d.userId !== userId) return res.status(403).json({ success: false, error: 'Not your card' });
    cardsStore.delete(req.params.cardId);
    if (d) { d.cardCount = Math.max(0, (d.cardCount || 1) - 1); decksStore.set(d.id, d); }
    res.json({ success: true, deleted: req.params.cardId });
  });

  // === REVIEW (spaced repetition) ===
  router.get('/decks/:deckId/review', (req, res) => {
    const d = decksStore.get(req.params.deckId);
    if (!d) return res.status(404).json({ success: false, error: 'Deck not found' });
    const userId = req.query.userId;
    if (!userId || d.userId !== userId) return res.status(403).json({ success: false, error: 'Not your deck' });
    const now = new Date().toISOString();
    const due = Array.from(cardsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(c => c.deckId === req.params.deckId && c.dueAt <= now)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    res.json({ success: true, total: due.length, due });
  });

  router.post('/review/:cardId', (req, res) => {
    const c = cardsStore.get(req.params.cardId);
    if (!c) return res.status(404).json({ success: false, error: 'Card not found' });
    const d = decksStore.get(c.deckId);
    const { rating, userId } = req.body || {};
    if (!d || !userId || d.userId !== userId) return res.status(403).json({ success: false, error: 'Not your card' });
    if (!RATINGS.includes(rating)) return res.status(400).json({ success: false, error: `rating must be one of: ${RATINGS.join(', ')}` });
    const schedule = nextSchedule(c, rating);
    Object.assign(c, schedule);
    cardsStore.set(req.params.cardId, c);
    const revId = `rv-${uuidv4().slice(0, 8)}`;
    const rev = { id: revId, cardId: c.id, deckId: c.deckId, userId, rating, reviewedAt: new Date().toISOString() };
    reviewsStore.set(revId, rev);
    res.json({ success: true, data: { card: c, review: rev } });
  });

  // === STREAK ===
  router.get('/users/:userId/streak', (req, res) => {
    const allReviews = Array.from(reviewsStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(r => r.userId === req.params.userId)
      .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
    const days = new Set();
    for (const r of allReviews) days.add(r.reviewedAt.slice(0, 10));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
      if (days.has(d)) streak += 1;
      else if (i > 0) break;
    }
    const cards = Array.from(cardsStore.entries()).map(([k, v]) => ({ id: k, ...v }));
    const now = new Date().toISOString();
    res.json({
      success: true,
      data: {
        totalReviews: allReviews.length,
        streakDays: streak,
        totalCards: cards.length,
        cardsDue: cards.filter(c => c.dueAt <= now).length,
        lastReviewAt: allReviews[0]?.reviewedAt || null,
      },
    });
  });

  return router;
};
