/**
 * Founder Routes — twin + dashboard + briefing + milestones + OKRs + team
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { callLLM } = require('@rtmn/shared/lib/llm');

const VALID_STAGES = ['idea', 'pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'growth', 'mature'];

module.exports = function({ founderStore, milestonesStore, okrsStore, teamStore }) {
  const router = express.Router();

  // === GET FOUNDER PROFILE ===
  router.get('/get/:userId', (req, res) => {
    const f = founderStore.get(req.params.userId);
    if (!f) return res.status(404).json({ success: false, error: 'Founder profile not found' });
    res.json({ success: true, data: f });
  });

  // === UPDATE FOUNDER PROFILE ===
  router.put('/update/:userId', (req, res) => {
    const cur = founderStore.get(req.params.userId) || { id: req.params.userId };
    const allowed = ['companyName', 'stage', 'industry', 'mission', 'vision', 'values', 'runwayMonths', 'arr', 'customers', 'teamSize'];
    const next = { ...cur, updatedAt: new Date().toISOString() };
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        if (k === 'stage' && !VALID_STAGES.includes(req.body[k])) {
          return res.status(400).json({ success: false, error: `stage must be one of: ${VALID_STAGES.join(', ')}` });
        }
        if (k === 'values' && !Array.isArray(req.body[k])) {
          return res.status(400).json({ success: false, error: 'values must be an array' });
        }
        if (['runwayMonths', 'arr', 'customers', 'teamSize'].includes(k) && typeof req.body[k] !== 'number') {
          return res.status(400).json({ success: false, error: `${k} must be a number` });
        }
        next[k] = req.body[k];
      }
    }
    founderStore.set(req.params.userId, next);
    res.json({ success: true, data: next });
  });

  // === DASHBOARD (aggregated KPIs) ===
  router.get('/dashboard/:userId', (req, res) => {
    const f = founderStore.get(req.params.userId);
    if (!f) return res.status(404).json({ success: false, error: 'Founder profile not found' });

    const milestones = Array.from(milestonesStore.entries()).map(([k, v]) => ({ id: k, ...v })).filter(m => m.userId === req.params.userId);
    const okrs = Array.from(okrsStore.entries()).map(([k, v]) => ({ id: k, ...v })).filter(o => o.userId === req.params.userId);
    const team = Array.from(teamStore.entries()).map(([k, v]) => ({ id: k, ...v })).filter(t => t.userId === req.params.userId);

    const milestoneCounts = {
      done: milestones.filter(m => m.status === 'done').length,
      inProgress: milestones.filter(m => m.status === 'in_progress').length,
      todo: milestones.filter(m => m.status === 'todo').length,
    };

    const okrProgress = okrs.length > 0
      ? Math.round(okrs.flatMap(o => o.keyResults).reduce((a, kr) => a + (kr.progress || 0), 0) / okrs.flatMap(o => o.keyResults).length)
      : 0;

    res.json({
      success: true,
      data: {
        profile: f,
        milestones: { total: milestones.length, ...milestoneCounts, list: milestones.slice(0, 5) },
        okrs: { total: okrs.length, averageProgress: okrProgress, list: okrs.slice(0, 3) },
        team: { size: team.length, totalEquity: team.reduce((a, m) => a + (m.equity || 0), 0), list: team },
        kpis: {
          arr: f.arr || 0,
          mrr: Math.round((f.arr || 0) / 12),
          customers: f.customers || 0,
          runwayMonths: f.runwayMonths || 0,
          teamSize: f.teamSize || team.length,
        },
      },
    });
  });

  // === WEEKLY BRIEFING (LLM + template fallback) ===
  router.get('/briefing/:userId', async (req, res) => {
    const f = founderStore.get(req.params.userId);
    if (!f) return res.status(404).json({ success: false, error: 'Founder profile not found' });

    const type = req.query.type || 'weekly';
    const milestones = Array.from(milestonesStore.entries()).map(([k, v]) => ({ id: k, ...v })).filter(m => m.userId === req.params.userId);
    const inProgress = milestones.filter(m => m.status === 'in_progress');
    const done = milestones.filter(m => m.status === 'done');

    const prompt = `You are the AI Co-founder for ${f.companyName} (${f.stage} stage, ${f.industry}).
Mission: ${f.mission}

Generate a ${type} founder briefing. Structure:
1. STATE — 2 sentences on where we are (stage, runway, ARR)
2. WINS — 2 wins from completed milestones: ${done.slice(0, 2).map(m => m.title).join('; ') || 'none yet'}
3. IN PROGRESS — 2 things currently moving: ${inProgress.slice(0, 2).map(m => m.title).join('; ') || 'none set'}
4. RISKS — 2 biggest risks given ${f.runwayMonths}mo runway and ${f.teamSize} team
5. NEXT 7 DAYS — 3 concrete actions

Keep it tight, founder-voice, no fluff.`;

    const fallback = {
      state: `${f.companyName} is a ${f.stage}-stage ${f.industry} company. ${f.runwayMonths}-month runway, $${f.arr} ARR, ${f.customers} customers.`,
      wins: done.slice(0, 2).map(m => `✅ ${m.title}`),
      inProgress: inProgress.slice(0, 2).map(m => `🔨 ${m.title}`),
      risks: [
        `Runway of ${f.runwayMonths} months — fundraise window is ~${Math.max(1, f.runwayMonths - 3)} months away`,
        `Solo founder + ${f.teamSize - 1} team — execution speed risk`,
      ],
      next7Days: [
        `Ship one milestone: ${inProgress[0]?.title || 'set your first milestone'}`,
        'Talk to 3 customers about what would make them stay forever',
        'Block 4 hours of deep work, no meetings',
      ],
      generatedAt: new Date().toISOString(),
      type,
      source: 'template',
    };

    try {
      const out = await callLLM({
        prompt,
        system: 'You are a YC partner writing a tight weekly briefing for an early-stage founder.',
        maxTokens: 600,
      });
      const text = typeof out === 'string' ? out : (out?.text || out?.content || '');
      res.json({
        success: true,
        data: {
          text,
          structured: fallback,
          type,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch {
      res.json({
        success: true,
        data: {
          structured: fallback,
          type,
          generatedAt: new Date().toISOString(),
        },
      });
    }
  });

  // === MILESTONES ===
  router.get('/milestones/:userId', (req, res) => {
    const ms = Array.from(milestonesStore.entries()).map(([k, v]) => ({ id: k, ...v })).filter(m => m.userId === req.params.userId);
    res.json({ success: true, total: ms.length, milestones: ms });
  });

  router.post('/milestones/add/:userId', (req, res) => {
    const { title, targetDate, notes = '', status = 'todo' } = req.body || {};
    if (!title || title.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'title required (min 3 chars)' });
    }
    if (!['todo', 'in_progress', 'done'].includes(status)) {
      return res.status(400).json({ success: false, error: 'status must be todo|in_progress|done' });
    }
    const id = `ms-${uuidv4().slice(0, 8)}`;
    const m = { id, userId: req.params.userId, title: title.trim(), status, targetDate, notes, createdAt: new Date().toISOString() };
    milestonesStore.set(id, m);
    res.status(201).json({ success: true, data: m });
  });

  router.post('/milestones/complete/:milestoneId/:userId', (req, res) => {
    const m = milestonesStore.get(req.params.milestoneId);
    if (!m) return res.status(404).json({ success: false, error: 'Milestone not found' });
    if (m.userId !== req.params.userId) {
      return res.status(403).json({ success: false, error: 'Milestone does not belong to user' });
    }
    m.status = 'done';
    m.completedAt = new Date().toISOString();
    milestonesStore.set(req.params.milestoneId, m);
    res.json({ success: true, data: m });
  });

  // === OKRs ===
  router.get('/okrs/:userId', (req, res) => {
    const okrs = Array.from(okrsStore.entries()).map(([k, v]) => ({ id: k, ...v })).filter(o => o.userId === req.params.userId);
    res.json({ success: true, total: okrs.length, okrs });
  });

  router.post('/okrs/add/:userId', (req, res) => {
    const { objective, quarter, keyResults = [] } = req.body || {};
    if (!objective || objective.trim().length < 5) {
      return res.status(400).json({ success: false, error: 'objective required (min 5 chars)' });
    }
    if (!Array.isArray(keyResults) || keyResults.length === 0) {
      return res.status(400).json({ success: false, error: 'keyResults must be a non-empty array' });
    }
    const id = `okr-${uuidv4().slice(0, 8)}`;
    const o = {
      id,
      userId: req.params.userId,
      objective: objective.trim(),
      quarter,
      keyResults: keyResults.map((kr, i) => ({
        id: `kr-${id.slice(-4)}-${i}`,
        text: typeof kr === 'string' ? kr : kr.text,
        progress: typeof kr === 'object' ? (kr.progress || 0) : 0,
      })),
      createdAt: new Date().toISOString(),
    };
    okrsStore.set(id, o);
    res.status(201).json({ success: true, data: o });
  });

  // === TEAM ===
  router.get('/team/:userId', (req, res) => {
    const team = Array.from(teamStore.entries()).map(([k, v]) => ({ id: k, ...v })).filter(t => t.userId === req.params.userId);
    const totalEquity = team.reduce((a, m) => a + (m.equity || 0), 0);
    res.json({ success: true, total: team.length, totalEquity, team });
  });

  router.post('/team/add/:userId', (req, res) => {
    const { name, role, equity = 0, joinedAt } = req.body || {};
    if (!name || !role) return res.status(400).json({ success: false, error: 'name + role required' });
    if (typeof equity !== 'number' || equity < 0 || equity > 100) {
      return res.status(400).json({ success: false, error: 'equity must be 0-100' });
    }
    const id = `tm-${uuidv4().slice(0, 8)}`;
    const t = { id, userId: req.params.userId, name: name.trim(), role: role.trim(), equity, joinedAt: joinedAt || new Date().toISOString() };
    teamStore.set(id, t);
    res.status(201).json({ success: true, data: t });
  });

  return router;
};