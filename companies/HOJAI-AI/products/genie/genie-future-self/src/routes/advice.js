/**
 * Advice Routes — "What would 2035-me recommend?"
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { llmComplete, isLLMAvailable } = require('@rtmn/shared/lib/llm');

const DEFAULT_PROFILE = {
  values: ['growth', 'family', 'health'],
  goals: [],
  priorities: [],
  fears: [],
  hopes: [],
};

module.exports = function({ profilesStore, adviceStore }) {
  const router = express.Router();

  /**
   * POST /advice/ask/:userId
   * body: { question: string, year?: number (default 2035) }
   */
  router.post('/ask/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { question, year = 2035 } = req.body || {};

      if (!question || question.trim().length < 3) {
        return res.status(400).json({ success: false, error: 'question required (min 3 chars)' });
      }

      const profile = profilesStore.get(`fp-${userId}`) || DEFAULT_PROFILE;

      const { advice, themes, aiUsed } = await generateAdvice({
        question: question.trim(),
        year,
        profile,
        userId,
      });

      const entry = {
        id: `advice-${uuidv4().slice(0, 8)}`,
        userId,
        question: question.trim(),
        year,
        advice,
        themes,
        aiUsed,
        createdAt: new Date().toISOString(),
      };
      adviceStore.set(entry.id, entry);

      res.status(201).json({ success: true, data: entry });
    } catch (err) {
      console.error('advice error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /advice/history/:userId
   */
  router.get('/history/:userId', (req, res) => {
    const { userId } = req.params;
    const list = Array.from(adviceStore.entries())
      .filter(([_, v]) => v.userId === userId)
      .map(([k, v]) => ({ id: k, ...v }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    res.json({ success: true, total: list.length, advice: list });
  });

  /**
   * GET /advice/get/:adviceId
   */
  router.get('/get/:adviceId', (req, res) => {
    const { adviceId } = req.params;
    const advice = adviceStore.get(adviceId);
    if (!advice) return res.status(404).json({ success: false, error: 'Advice not found' });
    res.json({ success: true, data: advice });
  });

  return router;
};

async function generateAdvice({ question, year, profile, userId }) {
  if (await isLLMAvailable()) {
    try {
      const prompt = buildPrompt({ question, year, profile });
      const r = await llmComplete({
        messages: [
          {
            role: 'system',
            content: `You are the user's future self, ${year - new Date().getFullYear()} years older. Speak in first person. Be warm, specific, and a little wiser. Reference their values and goals. Output JSON: {"advice": "2-4 sentences", "themes": ["theme1","theme2"]}`,
          },
          { role: 'user', content: prompt },
        ],
        model: 'claude-3-haiku',
        maxTokens: 600,
        temperature: 0.75,
        metadata: { feature: 'future-self-advice', userId, year },
      });
      if (r.ok && r.text) {
        const parsed = parseJson(r.text);
        if (parsed?.advice) {
          return {
            advice: parsed.advice,
            themes: parsed.themes || extractThemes(question),
            aiUsed: true,
          };
        }
      }
    } catch (e) {
      console.warn('[future-self] LLM failed, using template:', e.message);
    }
  }
  return {
    advice: templateAdvice(question, year, profile),
    themes: extractThemes(question),
    aiUsed: false,
  };
}

function buildPrompt({ question, year, profile }) {
  const lines = [];
  lines.push(`Question from my younger self: "${question}"`);
  lines.push(`\nWhat I know now (from age ${profile.age || 35} in ${year}):`);
  if (profile.values?.length) lines.push(`Values I held: ${profile.values.join(', ')}`);
  if (profile.goals?.length) lines.push(`Goals I was working toward: ${profile.goals.join('; ')}`);
  if (profile.priorities?.length) lines.push(`Priorities: ${profile.priorities.join(', ')}`);
  if (profile.fears?.length) lines.push(`Fears I had: ${profile.fears.join(', ')}`);
  if (profile.hopes?.length) lines.push(`Hopes: ${profile.hopes.join(', ')}`);
  lines.push(`\nWrite back as my older self.`);
  return lines.join('\n');
}

function parseJson(text) {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (m) try { return JSON.parse(m[1]); } catch {}
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1) try { return JSON.parse(text.slice(first, last + 1)); } catch {}
  return null;
}

function templateAdvice(question, year, profile) {
  const yearsAhead = year - new Date().getFullYear();
  const value = profile.values?.[0] || 'growth';
  return `At ${year}, looking back ${yearsAhead} years: the question you're asking isn't really about the surface — it's about whether you'll choose ${value} when it's hard. The answer is: yes, you will, more often than you think. The version of you reading this has already lived through this choice. Be patient with the decision, but be brave with the action.`;
}

function extractThemes(text) {
  const t = text.toLowerCase();
  const themes = [];
  if (t.includes('job') || t.includes('career') || t.includes('work')) themes.push('career');
  if (t.includes('relationship') || t.includes('partner') || t.includes('marriage')) themes.push('relationships');
  if (t.includes('family') || t.includes('kids') || t.includes('parent')) themes.push('family');
  if (t.includes('health') || t.includes('sleep') || t.includes('exercise')) themes.push('health');
  if (t.includes('money') || t.includes('finance') || t.includes('invest')) themes.push('money');
  if (t.includes('learn') || t.includes('read') || t.includes('study')) themes.push('learning');
  if (t.includes('move') || t.includes('travel') || t.includes('relocate')) themes.push('travel');
  if (t.includes('time') || t.includes('habit') || t.includes('routine')) themes.push('habits');
  return themes.length > 0 ? themes.slice(0, 3) : ['general'];
}