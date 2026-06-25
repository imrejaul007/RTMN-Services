/**
 * Letter Routes — letters from future self to present self
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { llmComplete, isLLMAvailable } = require('@rtmn/shared/lib/llm');

const DEFAULT_PROFILE = {
  values: ['growth', 'family', 'health'],
  goals: [],
};

module.exports = function({ profilesStore, lettersStore }) {
  const router = express.Router();

  /**
   * POST /letter/write/:userId
   * body: { year?: number (default 2040), subject?: string }
   * Generates a letter from future self using LLM (or template fallback).
   */
  router.post('/write/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { year = 2040, subject } = req.body || {};

      const profile = profilesStore.get(`fp-${userId}`) || DEFAULT_PROFILE;

      const { subject: finalSubject, body } = await generateLetter({ userId, year, subject, profile });

      const letter = {
        id: `letter-${uuidv4().slice(0, 8)}`,
        userId,
        year,
        subject: finalSubject,
        body,
        createdAt: new Date().toISOString(),
      };
      lettersStore.set(letter.id, letter);

      res.status(201).json({ success: true, data: letter });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /letter/list/:userId
   */
  router.get('/list/:userId', (req, res) => {
    const { userId } = req.params;
    const list = Array.from(lettersStore.entries())
      .filter(([_, v]) => v.userId === userId)
      .map(([k, v]) => ({ id: k, ...v }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    res.json({ success: true, total: list.length, letters: list });
  });

  /**
   * GET /letter/read/:letterId
   */
  router.get('/read/:letterId', (req, res) => {
    const { letterId } = req.params;
    const letter = lettersStore.get(letterId);
    if (!letter) return res.status(404).json({ success: false, error: 'Letter not found' });
    res.json({ success: true, data: letter });
  });

  return router;
};

async function generateLetter({ userId, year, subject, profile }) {
  const subjectLine = subject || `On your ${ordinal(profile.age || 35)} birthday, from ${year}`;

  if (await isLLMAvailable()) {
    try {
      const prompt = `Write a personal letter to my ${year - new Date().getFullYear()}-year-younger self. Length: 3-4 short paragraphs. Tone: warm, specific, a little bittersweet. Mention 2-3 things they were worrying about. Mention 1 surprise that actually happened. Reference: values=${(profile.values||[]).join(',')}, goals=${(profile.goals||[]).join(';')}. Start directly with "Dear younger me,".`;
      const r = await llmComplete({
        messages: [
          { role: 'system', content: 'You are the user\'s future self. Write a personal letter in first person. Output JSON: {"subject": "...", "body": "..."}' },
          { role: 'user', content: prompt },
        ],
        model: 'claude-3-haiku',
        maxTokens: 800,
        temperature: 0.8,
        metadata: { feature: 'future-self-letter', userId, year },
      });
      if (r.ok && r.text) {
        const parsed = parseJson(r.text);
        if (parsed?.body) {
          return { subject: parsed.subject || subjectLine, body: parsed.body };
        }
      }
    } catch (e) {
      console.warn('[future-self letter] LLM failed:', e.message);
    }
  }

  return { subject: subjectLine, body: templateLetter(profile, year) };
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

function templateLetter(profile, year) {
  const yearsAhead = year - new Date().getFullYear();
  const value = profile.values?.[0] || 'growth';
  return `Dear younger me,

It's me — you, but ${yearsAhead} years older. I'm writing to tell you the things I wish someone had told you back then.

First: you're going to be okay. The project you're working on right now will matter, but not for the reasons you think. What will matter is who you worked with, what you learned, and how you treated people when it was hard.

Second: I see you trying to optimize everything — your mornings, your sleep, your routines. Stop. The best moments are the ones you don't plan. The friends who show up at your door unannounced. The kid falling asleep on your shoulder. The unplanned Tuesday afternoon that becomes the memory.

Third: ${value}. Whatever it costs you, keep it close. The world will try to talk you out of it. Don't listen.

Yours in time,
You-at-${year}`;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}