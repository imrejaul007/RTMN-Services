/**
 * Replay Routes
 *
 * Generate AI-assisted life reviews (monthly / yearly / life-to-date).
 * Pulls data from multiple specialist services and synthesizes a narrative.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { llmComplete, isLLMAvailable } = require('@rtmn/shared/lib/llm');
const axios = require('axios');

module.exports = function({ replayStore, services }) {
  const router = express.Router();

  /**
   * POST /replay/period/:userId
   * Generate a new life replay for the given period.
   * body: { period: 'monthly'|'yearly'|'life', periodStart?: ISO, periodEnd?: ISO }
   */
  router.post('/period/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { period = 'monthly', periodStart, periodEnd } = req.body || {};

      // 1. Compute date range
      const { start, end } = computePeriod(period, periodStart, periodEnd);

      // 2. Pull data from specialist services in parallel
      const data = await gatherPeriodData(userId, start, end, services);

      // 3. Compute stats + themes
      const stats = computeStats(data);
      const themes = extractThemes(data);

      // 4. Generate AI summary (with stub fallback)
      const { title, summary, highlights, aiUsed } = await generateSummary({
        userId, period, start, end, stats, themes, data
      });

      // 5. Persist the replay
      const replay = {
        id: `replay-${uuidv4().slice(0, 8)}`,
        userId,
        period,
        periodStart: start.toISOString().slice(0, 10),
        periodEnd: end.toISOString().slice(0, 10),
        title,
        summary,
        highlights,
        themes,
        stats,
        aiUsed,
        createdAt: new Date().toISOString(),
      };
      replayStore.set(replay.id, replay);

      res.status(201).json({ success: true, data: replay });
    } catch (err) {
      console.error('Replay error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /replay/history/:userId
   * List all replays for a user.
   */
  router.get('/history/:userId', (req, res) => {
    const { userId } = req.params;
    const list = Array.from(replayStore.entries())
      .filter(([_, v]) => v.userId === userId)
      .map(([k, v]) => ({ id: k, ...v }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    res.json({ success: true, total: list.length, replays: list });
  });

  /**
   * GET /replay/get/:replayId
   * Get a specific replay.
   */
  router.get('/get/:replayId', (req, res) => {
    const { replayId } = req.params;
    const replay = replayStore.get(replayId);
    if (!replay) return res.status(404).json({ success: false, error: 'Replay not found' });
    res.json({ success: true, data: replay });
  });

  return router;
};

// --- Helpers ---

function computePeriod(period, customStart, customEnd) {
  const now = new Date();
  let start, end;

  if (customStart && customEnd) {
    return { start: new Date(customStart), end: new Date(customEnd) };
  }

  if (period === 'monthly') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  } else if (period === 'yearly') {
    start = new Date(now.getFullYear() - 1, 0, 1);
    end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
  } else if (period === 'life') {
    start = new Date('2000-01-01');
    end = now;
  } else {
    // default: last 30 days
    end = now;
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return { start, end };
}

async function gatherPeriodData(userId, start, end, services) {
  const startStr = start.toISOString();
  const endStr = end.toISOString();

  const safe = (promise) => promise.catch((e) => ({ error: e.message, data: null }));

  const [memories, moods, prayers, gratitudes, meditations] = await Promise.all([
    safe(axios.get(`${services.memory}/api/timeline`, {
      params: { userId, startDate: startStr, endDate: endStr, limit: 500 },
      timeout: 5000,
    })),
    safe(axios.get(`${services.wellness}/api/wellness/moods`, { timeout: 5000 })),
    safe(axios.get(`${services.spiritual}/api/spiritual/prayers`, { timeout: 5000 })),
    safe(axios.get(`${services.spiritual}/api/spiritual/gratitude`, { timeout: 5000 })),
    safe(axios.get(`${services.spiritual}/api/spiritual/meditations`, { timeout: 5000 })),
  ]);

  return {
    memories: filterByDateRange(memories.data?.memories || [], start, end, 'createdAt'),
    moods: filterByDateRange(moods.data?.moods || [], start, end),
    prayers: filterByDateRange(prayers.data?.prayers || [], start, end, 'createdAt'),
    gratitudes: filterByDateRange(gratitudes.data?.gratitude || [], start, end),
    meditations: filterByDateRange(meditations.data?.meditations || [], start, end, 'completedAt'),
  };
}

function filterByDateRange(items, start, end, dateField = 'date') {
  return items.filter((item) => {
    const d = new Date(item[dateField]);
    return d >= start && d <= end;
  });
}

function computeStats(data) {
  const moodScores = data.moods.map((m) => m.score).filter((s) => typeof s === 'number');
  return {
    memories: data.memories.length,
    moods: data.moods.length,
    prayers: data.prayers.length,
    prayersAnswered: data.prayers.filter((p) => p.answered).length,
    gratitudes: data.gratitudes.length,
    gratitudeItems: data.gratitudes.reduce((sum, g) => sum + (g.items?.length || 0), 0),
    meditations: data.meditations.length,
    meditationMinutes: data.meditations.reduce((sum, m) => sum + (m.minutes || 0), 0),
    moodAvg: moodScores.length > 0
      ? Math.round(moodScores.reduce((a, b) => a + b, 0) / moodScores.length * 10) / 10
      : null,
  };
}

function extractThemes(data) {
  const themeCounts = {};
  const allText = [
    ...data.memories.map((m) => m.content || m.text || ''),
    ...data.gratitudes.flatMap((g) => g.items || []),
    ...data.reflections?.map?.((r) => r.body || '') || [],
  ].join(' ').toLowerCase();

  // Simple keyword extraction
  const keywords = [
    'family', 'work', 'career', 'health', 'fitness', 'travel', 'learning',
    'gratitude', 'meditation', 'prayer', 'friends', 'love', 'projects',
    'creativity', 'mindfulness', 'sleep', 'food', 'exercise', 'reading',
    'music', 'nature', 'spirituality', 'relationships', 'kids', 'parents'
  ];

  for (const kw of keywords) {
    const matches = (allText.match(new RegExp(`\\b${kw}\\b`, 'g')) || []).length;
    if (matches > 0) themeCounts[kw] = matches;
  }

  return Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([theme]) => theme);
}

async function generateSummary({ userId, period, start, end, stats, themes, data }) {
  const periodLabel = period === 'monthly'
    ? `${start.toLocaleString('default', { month: 'long' })} ${start.getFullYear()}`
    : period === 'yearly' ? `${start.getFullYear()}` : 'your life so far';

  // Try LLM, fall back to deterministic template
  if (await isLLMAvailable()) {
    try {
      const prompt = buildPrompt({ userId, periodLabel, start, end, stats, themes, data });
      const r = await llmComplete({
        messages: [
          { role: 'system', content: 'You are a thoughtful life coach writing a personal year-in-review style summary. Be warm, observant, specific, and avoid clichés. Output JSON: {"title": "...", "summary": "...", "highlights": ["...", "..."]}' },
          { role: 'user', content: prompt },
        ],
        model: 'claude-3-haiku',
        maxTokens: 800,
        temperature: 0.7,
        metadata: { feature: 'life-replay', userId, period },
      });
      if (r.ok && r.text) {
        const parsed = parseJsonResponse(r.text);
        if (parsed?.title && parsed?.summary) {
          return {
            title: parsed.title,
            summary: parsed.summary,
            highlights: parsed.highlights || extractHighlights(stats, themes, data),
            aiUsed: true,
          };
        }
      }
    } catch (e) {
      console.warn('[life-replay] LLM failed, using template:', e.message);
    }
  }

  // Template fallback
  return {
    title: generateTitle(periodLabel, themes),
    summary: generateTemplateSummary(periodLabel, stats, themes, data),
    highlights: extractHighlights(stats, themes, data),
    aiUsed: false,
  };
}

function buildPrompt({ userId, periodLabel, start, end, stats, themes, data }) {
  const lines = [];
  lines.push(`Period: ${periodLabel}`);
  lines.push(`Memories captured: ${stats.memories}`);
  lines.push(`Mood entries: ${stats.moods}${stats.moodAvg ? ` (avg ${stats.moodAvg}/10)` : ''}`);
  lines.push(`Gratitude entries: ${stats.gratitudes} (${stats.gratitudeItems} items)`);
  lines.push(`Prayers: ${stats.prayers} (${stats.prayersAnswered} answered)`);
  lines.push(`Meditation: ${stats.meditations} sessions (${stats.meditationMinutes} min total)`);
  if (themes.length > 0) lines.push(`Top themes: ${themes.join(', ')}`);

  // Sample a few recent memories for grounding
  const recentMemories = data.memories.slice(0, 5);
  if (recentMemories.length > 0) {
    lines.push(`\nRecent memories:`);
    for (const m of recentMemories) {
      const txt = (m.content || m.text || '').slice(0, 150);
      if (txt) lines.push(`- ${txt}`);
    }
  }

  const sampleGratitude = data.gratitudes.slice(0, 3);
  if (sampleGratitude.length > 0) {
    lines.push(`\nRecent gratitudes:`);
    for (const g of sampleGratitude) {
      lines.push(`- ${(g.items || []).slice(0, 3).join(', ')}`);
    }
  }

  lines.push(`\nWrite a warm, specific 2-3 sentence summary for ${periodLabel}, plus 3-5 highlights.`);
  return lines.join('\n');
}

function parseJsonResponse(text) {
  // Try direct parse
  try { return JSON.parse(text); } catch {}
  // Try extracting from code fence
  const m = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (m) {
    try { return JSON.parse(m[1]); } catch {}
  }
  // Try first {...} block
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    try { return JSON.parse(text.slice(first, last + 1)); } catch {}
  }
  return null;
}

function generateTitle(periodLabel, themes) {
  if (themes.length === 0) return `${periodLabel} — A Period of Growth`;
  const top = themes[0];
  return `${periodLabel} — A Period of ${capitalize(top)}`;
}

function generateTemplateSummary(periodLabel, stats, themes, data) {
  const parts = [];
  parts.push(`${periodLabel} was a period of steady practice and quiet wins.`);

  if (stats.memories > 0) parts.push(`You captured ${stats.memories} memories, showing an active inner life.`);
  if (stats.gratitudes > 0) parts.push(`Gratitude showed up ${stats.gratitudes} times — a clear through-line.`);
  if (stats.meditationMinutes > 0) parts.push(`You meditated for ${stats.meditationMinutes} minutes total.`);
  if (stats.moodAvg) parts.push(`Your average mood was ${stats.moodAvg}/10.`);
  if (themes.length > 0) parts.push(`Recurring themes: ${themes.join(', ')}.`);

  return parts.join(' ');
}

function extractHighlights(stats, themes, data) {
  const h = [];
  if (stats.memories >= 50) h.push(`Captured ${stats.memories} memories`);
  if (stats.gratitudes >= 20) h.push(`${stats.gratitudes} gratitude entries`);
  if (stats.meditationMinutes >= 200) h.push(`${stats.meditationMinutes} minutes of meditation`);
  if (stats.prayersAnswered > 0) h.push(`${stats.prayersAnswered} prayers answered`);
  if (themes[0]) h.push(`Strong on: ${themes[0]}`);
  if (themes[1]) h.push(`Also: ${themes[1]}`);
  if (h.length < 3) h.push('Steady daily practice');
  return h.slice(0, 5);
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}