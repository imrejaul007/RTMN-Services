/**
 * AI Board Advisor Routes — 4 expert personas give advice to founders
 *
 * Personas:
 *   - VC:      "Will this scale? What's the market?"
 *   - Operator:"How do I execute faster with fewer people?"
 *   - Customer:"Why would I pay for this?"
 *   - Mentor:  "What am I missing? What's the next level?"
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { callLLM } = require('@rtmn/shared/lib/llm');

const PERSONAS = {
  vc: {
    name: 'Patricia (VC Partner)',
    icon: '💼',
    color: '#4a90e2',
    lens: 'market size, defensibility, return potential',
    systemPrompt: 'You are a sharp, no-BS VC partner. Think about market size, defensibility, return potential. Reference Paul Graham / a16z mental models. Keep it tight.',
  },
  operator: {
    name: 'Marco (Operator)',
    icon: '⚙️',
    color: '#7ed321',
    lens: 'execution speed, focus, leverage',
    systemPrompt: 'You are a veteran operator who has scaled multiple companies. Focus on execution speed, focus, and leverage. Reference Lean Startup, Shape Up, Working Backwards.',
  },
  customer: {
    name: 'Riya (Customer)',
    icon: '🎯',
    color: '#f5a623',
    lens: 'why would I pay, what is the value moment',
    systemPrompt: 'You are the ideal customer. Be specific about why you would pay, what would make you stop using it, what the magic moment is. Refuse corporate-speak.',
  },
  mentor: {
    name: 'Eleanor (Mentor)',
    icon: '🦉',
    color: '#9013fe',
    lens: 'blind spots, character, next-level growth',
    systemPrompt: 'You are a wise founder-mentor who has seen 1000+ founders. Focus on blind spots, character, what they are not seeing, and the next-level growth edge. Be direct, kind, and specific.',
  },
};

module.exports = function({ adviceStore, founderStore }) {
  const router = express.Router();

  // === LIST BOARD (all 4 personas with descriptions) ===
  router.get('/:userId', (req, res) => {
    const f = founderStore.get(req.params.userId);
    const board = Object.entries(PERSONAS).map(([key, p]) => ({
      id: key,
      name: p.name,
      icon: p.icon,
      color: p.color,
      lens: p.lens,
      context: f ? `${f.companyName} (${f.stage}, ${f.industry})` : null,
    }));
    res.json({ success: true, board });
  });

  // === ASK THE BOARD (LLM picks persona based on topic) ===
  router.post('/ask/:userId', async (req, res) => {
    const { question, persona = 'operator' } = req.body || {};
    if (!question || question.trim().length < 5) {
      return res.status(400).json({ success: false, error: 'question required (min 5 chars)' });
    }
    const personaKey = PERSONAS[persona] ? persona : 'operator';
    const p = PERSONAS[personaKey];
    const f = founderStore.get(req.params.userId);

    const context = f
      ? `Founder context: ${f.companyName} (${f.stage} stage, ${f.industry}), ${f.runwayMonths}mo runway, $${f.arr} ARR, ${f.customers} customers, ${f.teamSize}-person team. Mission: ${f.mission}`
      : 'No founder profile yet.';

    const prompt = `${context}

Question: ${question}

Give advice from the ${p.name} lens (${p.lens}). Be specific, opinionated, and short — 3-4 paragraphs max. End with ONE concrete action the founder should take this week.`;

    const fallback = {
      persona: personaKey,
      personaName: p.name,
      icon: p.icon,
      color: p.color,
      advice: `From the ${p.lens} lens: this is the right kind of question to ask. Most founders face this exact trade-off. The honest answer is: it depends on your runway, your team, and your market signal.

If you have >12 months runway and a small team, optimize for learning. If <6 months, optimize for revenue.

This week: write down the 3 things you would tell a friend in your exact situation. Then do the top one.`,
      question,
      source: 'template',
      generatedAt: new Date().toISOString(),
    };

    let advice = fallback.advice;
    let source = 'template';
    try {
      const out = await callLLM({
        prompt,
        system: p.systemPrompt,
        maxTokens: 500,
      });
      const text = typeof out === 'string' ? out : (out?.text || out?.content || '');
      if (text) { advice = text; source = 'llm'; }
    } catch { /* fall through */ }

    const id = `ba-${uuidv4().slice(0, 8)}`;
    const record = {
      id,
      userId: req.params.userId,
      persona: personaKey,
      personaName: p.name,
      icon: p.icon,
      color: p.color,
      question,
      advice,
      source,
      createdAt: new Date().toISOString(),
    };
    adviceStore.set(id, record);

    res.status(201).json({ success: true, data: record });
  });

  // === LIST ADVICE HISTORY ===
  router.get('/history/:userId', (req, res) => {
    const list = Array.from(adviceStore.entries()).map(([k, v]) => ({ id: k, ...v })).filter(a => a.userId === req.params.userId);
    res.json({ success: true, total: list.length, advice: list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  });

  return router;
};