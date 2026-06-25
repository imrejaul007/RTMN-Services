/**
 * Household Routes — manage household + lists + meals + chores + events
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const VALID_ROLES = ['owner', 'adult', 'child', 'guest'];
const VALID_LIST_CATS = ['shopping', 'todo', 'packing', 'wishlist', 'other'];
const VALID_MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
const VALID_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const VALID_CADENCES = ['daily', 'weekly', 'biweekly', 'monthly', 'once'];
const VALID_EVENT_TYPES = ['birthday', 'anniversary', 'trip', 'holiday', 'appointment', 'other'];

module.exports = function({ householdsStore, listsStore, mealsStore, choresStore, eventsStore }) {
  const router = express.Router();

  // === LIST HOUSEHOLDS A USER IS IN ===
  router.get('/list/:userId', (req, res) => {
    const { userId } = req.params;
    const all = Array.from(householdsStore.entries()).map(([k, v]) => ({ id: k, ...v }));
    const mine = all.filter(h => (h.members || []).some(m => m.userId === userId));
    res.json({ success: true, total: mine.length, households: mine });
  });

  // === GET FULL HOUSEHOLD (with counts) ===
  router.get('/get/:householdId', (req, res) => {
    const { householdId } = req.params;
    const h = householdsStore.get(householdId);
    if (!h) return res.status(404).json({ success: false, error: 'Household not found' });

    const items = Array.from(listsStore.entries()).map(([k, v]) => ({ id: k, ...v })).filter(i => i.householdId === householdId);
    const meals = Array.from(mealsStore.entries()).map(([k, v]) => ({ id: k, ...v })).filter(m => m.householdId === householdId);
    const chores = Array.from(choresStore.entries()).map(([k, v]) => ({ id: k, ...v })).filter(c => c.householdId === householdId);
    const events = Array.from(eventsStore.entries()).map(([k, v]) => ({ id: k, ...v })).filter(e => e.householdId === householdId);

    res.json({
      success: true,
      data: {
        ...h,
        counts: {
          members: (h.members || []).length,
          listItems: items.length,
          listUnchecked: items.filter(i => !i.checked).length,
          meals: meals.length,
          chores: chores.length,
          choresOpen: chores.filter(c => !c.done).length,
          events: events.length,
        },
      },
    });
  });

  // === CREATE HOUSEHOLD ===
  router.post('/create/:userId', (req, res) => {
    const { userId } = req.params;
    const { name, timezone = 'UTC' } = req.body || {};
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'name required (min 2 chars)' });
    }
    const id = `hh-${uuidv4().slice(0, 8)}`;
    const h = {
      id,
      name: name.trim(),
      ownerId: userId,
      members: [{ userId, name: 'Owner', role: 'owner', avatar: '👤' }],
      timezone,
      createdAt: new Date().toISOString(),
    };
    householdsStore.set(id, h);
    res.status(201).json({ success: true, data: h });
  });

  // === MEMBERS ===
  router.post('/:householdId/members/add/:userId', (req, res) => {
    const { householdId, userId: invitedBy } = req.params;
    const { userId, name, role = 'adult', avatar = '👤' } = req.body || {};
    const h = householdsStore.get(householdId);
    if (!h) return res.status(404).json({ success: false, error: 'Household not found' });
    if (!h.members.find(m => m.userId === invitedBy)) {
      return res.status(403).json({ success: false, error: 'Only household members can add' });
    }
    if (!userId || !name) {
      return res.status(400).json({ success: false, error: 'userId + name required' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: `role must be one of: ${VALID_ROLES.join(', ')}` });
    }
    if (h.members.find(m => m.userId === userId)) {
      return res.status(409).json({ success: false, error: 'Already a member' });
    }
    h.members.push({ userId, name: name.trim(), role, avatar });
    householdsStore.set(householdId, h);
    res.status(201).json({ success: true, data: h });
  });

  // === LISTS ===
  router.post('/:householdId/lists/add/:userId', (req, res) => {
    const { householdId, userId } = req.params;
    const { text, category = 'shopping' } = req.body || {};
    if (!text || text.trim().length < 1) {
      return res.status(400).json({ success: false, error: 'text required' });
    }
    if (!VALID_LIST_CATS.includes(category)) {
      return res.status(400).json({ success: false, error: `category must be one of: ${VALID_LIST_CATS.join(', ')}` });
    }
    const id = `li-${uuidv4().slice(0, 8)}`;
    const item = { id, householdId, text: text.trim(), category, addedBy: userId, checked: false, addedAt: new Date().toISOString() };
    listsStore.set(id, item);
    res.status(201).json({ success: true, data: item });
  });

  router.get('/:householdId/lists/list', (req, res) => {
    const { householdId } = req.params;
    const { category } = req.query;
    let items = Array.from(listsStore.entries()).map(([k, v]) => ({ id: k, ...v })).filter(i => i.householdId === householdId);
    if (category && VALID_LIST_CATS.includes(category)) {
      items = items.filter(i => i.category === category);
    }
    const grouped = {};
    for (const i of items) {
      if (!grouped[i.category]) grouped[i.category] = [];
      grouped[i.category].push(i);
    }
    res.json({ success: true, total: items.length, unchecked: items.filter(i => !i.checked).length, items, grouped });
  });

  router.post('/:householdId/lists/check/:itemId/:userId', (req, res) => {
    const { itemId, userId } = req.params;
    const item = listsStore.get(itemId);
    if (!item) return res.status(404).json({ success: false, error: 'Item not found' });
    item.checked = true;
    item.checkedBy = userId;
    item.checkedAt = new Date().toISOString();
    listsStore.set(itemId, item);
    res.json({ success: true, data: item });
  });

  // === MEALS ===
  router.post('/:householdId/meals/add/:userId', (req, res) => {
    const { householdId, userId } = req.params;
    const { day, meal, title, cook, notes } = req.body || {};
    if (!day || !VALID_DAYS.includes(day)) {
      return res.status(400).json({ success: false, error: `day must be one of: ${VALID_DAYS.join(', ')}` });
    }
    if (!meal || !VALID_MEALS.includes(meal)) {
      return res.status(400).json({ success: false, error: `meal must be one of: ${VALID_MEALS.join(', ')}` });
    }
    if (!title || title.trim().length < 1) {
      return res.status(400).json({ success: false, error: 'title required' });
    }
    const id = `ml-${uuidv4().slice(0, 8)}`;
    const m = { id, householdId, day, meal, title: title.trim(), cook: cook || userId, notes: notes || '', addedBy: userId, addedAt: new Date().toISOString() };
    mealsStore.set(id, m);
    res.status(201).json({ success: true, data: m });
  });

  router.get('/:householdId/meals/week', (req, res) => {
    const { householdId } = req.params;
    const meals = Array.from(mealsStore.entries()).map(([k, v]) => ({ id: k, ...v })).filter(m => m.householdId === householdId);
    // Group by day
    const week = {};
    for (const d of VALID_DAYS) week[d] = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const m of meals) {
      if (week[m.day]) week[m.day][m.meal].push(m);
    }
    res.json({ success: true, total: meals.length, week });
  });

  // === CHORES ===
  router.post('/:householdId/chores/add/:userId', (req, res) => {
    const { householdId, userId } = req.params;
    const { title, assignedTo, cadence = 'weekly' } = req.body || {};
    if (!title || title.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'title required (min 2 chars)' });
    }
    if (!VALID_CADENCES.includes(cadence)) {
      return res.status(400).json({ success: false, error: `cadence must be one of: ${VALID_CADENCES.join(', ')}` });
    }
    const id = `ch-${uuidv4().slice(0, 8)}`;
    const c = { id, householdId, title: title.trim(), assignedTo: assignedTo || userId, cadence, done: false, addedBy: userId, addedAt: new Date().toISOString() };
    choresStore.set(id, c);
    res.status(201).json({ success: true, data: c });
  });

  router.get('/:householdId/chores/list', (req, res) => {
    const { householdId } = req.params;
    const chores = Array.from(choresStore.entries()).map(([k, v]) => ({ id: k, ...v })).filter(c => c.householdId === householdId);
    res.json({ success: true, total: chores.length, open: chores.filter(c => !c.done).length, chores });
  });

  // === EVENTS ===
  router.post('/:householdId/events/add/:userId', (req, res) => {
    const { householdId, userId } = req.params;
    const { title, date, type = 'other' } = req.body || {};
    if (!title || title.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'title required (min 2 chars)' });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'date required (YYYY-MM-DD)' });
    }
    if (!VALID_EVENT_TYPES.includes(type)) {
      return res.status(400).json({ success: false, error: `type must be one of: ${VALID_EVENT_TYPES.join(', ')}` });
    }
    const id = `ev-${uuidv4().slice(0, 8)}`;
    const e = { id, householdId, title: title.trim(), date, type, addedBy: userId, addedAt: new Date().toISOString() };
    eventsStore.set(id, e);
    res.status(201).json({ success: true, data: e });
  });

  router.get('/:householdId/events/list', (req, res) => {
    const { householdId } = req.params;
    const events = Array.from(eventsStore.entries()).map(([k, v]) => ({ id: k, ...v })).filter(e => e.householdId === householdId);
    events.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    res.json({ success: true, total: events.length, events });
  });

  return router;
};