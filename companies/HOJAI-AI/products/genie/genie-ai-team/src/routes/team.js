/**
 * Team Routes — manage personal AI specialists
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { llmComplete, isLLMAvailable } = require('@rtmn/shared/lib/llm');

const VALID_ROLES = ['coach', 'doctor', 'lawyer', 'therapist', 'tutor', 'chef', 'trainer', 'advisor', 'creative', 'mentor'];

module.exports = function({ teamStore, conversationsStore }) {
  const router = express.Router();

  // --- LIST ---
  router.get('/list/:userId', (req, res) => {
    const { userId } = req.params;
    const team = Array.from(teamStore.entries())
      .map(([k, v]) => ({ id: k, ...v }))
      .filter(m => m.userId === userId);
    res.json({ success: true, total: team.length, team });
  });

  // --- GET ONE ---
  router.get('/get/:memberId', (req, res) => {
    const { memberId } = req.params;
    const m = teamStore.get(memberId);
    if (!m) return res.status(404).json({ success: false, error: 'Specialist not found' });
    res.json({ success: true, data: { id: memberId, ...m } });
  });

  // --- HIRE (create new specialist) ---
  router.post('/hire/:userId', (req, res) => {
    const { userId } = req.params;
    const { name, role, avatar = '🤖', specialty, persona, systemPrompt, expertise = [] } = req.body || {};

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'name required (min 2 chars)' });
    }
    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: `role required (${VALID_ROLES.join('|')})` });
    }
    if (!specialty || specialty.trim().length < 5) {
      return res.status(400).json({ success: false, error: 'specialty required (min 5 chars)' });
    }
    if (!persona || persona.trim().length < 5) {
      return res.status(400).json({ success: false, error: 'persona required (min 5 chars)' });
    }

    const id = `mem-${uuidv4().slice(0, 8)}`;
    const member = {
      id, userId,
      name: name.trim(),
      role,
      avatar,
      specialty: specialty.trim(),
      persona: persona.trim(),
      systemPrompt: (systemPrompt || `You are ${name}, a ${role} who specializes in ${specialty}. Be authentic to your persona.`).trim(),
      expertise: Array.isArray(expertise) ? expertise : [],
      rating: 0,
      hiredAt: new Date().toISOString(),
    };
    teamStore.set(id, member);
    res.status(201).json({ success: true, data: member });
  });

  // --- FIRE (remove specialist) ---
  router.delete('/fire/:userId/:memberId', (req, res) => {
    const { userId, memberId } = req.params;
    const m = teamStore.get(memberId);
    if (!m) return res.status(404).json({ success: false, error: 'Specialist not found' });
    if (m.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Not your specialist' });
    }
    teamStore.delete(memberId);
    res.json({ success: true, removed: memberId });
  });

  // --- CHAT (send a message, get a reply) ---
  router.post('/chat/:userId/:memberId', async (req, res) => {
    try {
      const { userId, memberId } = req.params;
      const { message, useAI = true } = req.body || {};

      if (!message || message.trim().length < 1) {
        return res.status(400).json({ success: false, error: 'message required' });
      }

      const member = teamStore.get(memberId);
      if (!member) return res.status(404).json({ success: false, error: 'Specialist not found' });
      if (member.userId !== userId) {
        return res.status(403).json({ success: false, error: 'Not your specialist' });
      }

      // Build conversation key
      const convKey = `${userId}-${memberId}`;
      const conv = conversationsStore.get(convKey) || {
        userId, memberId, memberName: member.name, messages: [],
        createdAt: new Date().toISOString(),
      };

      // Append user message
      const userMsg = {
        id: `msg-${uuidv4().slice(0, 8)}`,
        role: 'user',
        content: message.trim(),
        timestamp: new Date().toISOString(),
      };
      conv.messages.push(userMsg);

      // Generate reply
      let replyText;
      let aiUsed = false;

      if (useAI && await isLLMAvailable()) {
        try {
          const prompt = `${member.systemPrompt}\n\nRecent conversation:\n${conv.messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')}\n\n${member.name}:`;
          replyText = (await llmComplete(prompt, { maxTokens: 300, temperature: 0.7 })).trim();
          aiUsed = true;
        } catch (e) {
          console.warn('[ai-team] LLM failed, using template reply:', e.message);
        }
      }

      if (!replyText) {
        replyText = generateTemplateReply(member, message);
      }

      const replyMsg = {
        id: `msg-${uuidv4().slice(0, 8)}`,
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toISOString(),
        aiUsed,
      };
      conv.messages.push(replyMsg);
      conv.updatedAt = new Date().toISOString();
      conversationsStore.set(convKey, conv);

      res.status(201).json({ success: true, data: { userMessage: userMsg, reply: replyMsg, conversationLength: conv.messages.length } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- HISTORY ---
  router.get('/history/:userId/:memberId', (req, res) => {
    const { userId, memberId } = req.params;
    const conv = conversationsStore.get(`${userId}-${memberId}`);
    if (!conv) return res.json({ success: true, total: 0, messages: [], memberId });
    res.json({ success: true, total: conv.messages.length, messages: conv.messages, memberId });
  });

  // --- RECOMMEND (suggest best specialist for a query) ---
  router.get('/recommend/:userId', (req, res) => {
    const { userId } = req.params;
    const { message = '' } = req.query;
    const m = message.toLowerCase();

    const team = Array.from(teamStore.entries())
      .map(([k, v]) => ({ id: k, ...v }))
      .filter(m => m.userId === userId);

    if (team.length === 0) {
      return res.json({ success: true, recommendations: [], reason: 'No specialists hired yet' });
    }

    // Keyword match
    const scored = team.map(member => {
      const text = `${member.name} ${member.role} ${member.specialty} ${(member.expertise || []).join(' ')}`.toLowerCase();
      let score = 0;
      // Naive keyword scoring
      const keywords = m.split(/\s+/).filter(w => w.length > 3);
      keywords.forEach(kw => { if (text.includes(kw)) score += 2; });
      if (member.rating) score += member.rating;
      return { member, score };
    }).sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      recommendations: scored.slice(0, 3).map(s => ({
        id: s.member.id,
        name: s.member.name,
        role: s.member.role,
        avatar: s.member.avatar,
        specialty: s.member.specialty,
        score: s.score,
        reason: s.score > 0 ? 'Keyword match + rating' : 'Highest rated available',
      })),
    });
  });

  return router;
};

function generateTemplateReply(member, message) {
  const templates = [
    `${member.name}: Good question. From my ${member.role} perspective, I'd start by clarifying what you really want here. What does success look like for you in this situation?`,
    `${member.name}: Let me reflect that back. It sounds like you're navigating ${(message.split(' ').slice(0, 4).join(' ') || 'something important')}. What's the smallest next step you could take this week?`,
    `${member.name}: I hear you. In my experience, the key is to focus on what you can control. What part of this is fully in your hands?`,
    `${member.name}: Thanks for sharing. A useful frame: separate the facts from the story you're telling yourself about the facts. What are the facts here?`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}
