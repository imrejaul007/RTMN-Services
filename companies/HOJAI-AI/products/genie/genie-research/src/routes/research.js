/**
 * Research Routes — query / list / save / topics
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = function({ researchStore, sourcesStore }) {
  const router = express.Router();

  // === SOURCE CATALOG ===
  router.get('/sources', (req, res) => {
    const sources = Array.from(sourcesStore.entries()).map(([k, v]) => ({ id: k, ...v }));
    res.json({ success: true, total: sources.length, sources });
  });

  // === RUN RESEARCH QUERY ===
  router.post('/research/query/:userId', async (req, res) => {
    const { question, topic } = req.body || {};
    if (!question || question.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'question required (min 10 chars)' });
    }
    const userId = req.params.userId;

    const allSources = Array.from(sourcesStore.entries()).map(([k, v]) => ({ id: k, ...v }));
    // Pick 3 most relevant sources by simple keyword match (no LLM yet)
    const keywords = question.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const ranked = allSources.map(s => ({
      ...s,
      relevance: keywords.filter(k => (s.description || '').toLowerCase().includes(k) || (s.name || '').toLowerCase().includes(k)).length,
    })).sort((a, b) => b.relevance - a.relevance);
    const chosen = ranked.slice(0, 3).map(s => s.id);

    const prompt = `You are a research analyst. Answer this question concisely (3-4 paragraphs), cite relevant evidence, and acknowledge uncertainty.

Question: ${question}

Format:
- Summary (2-3 sentences)
- Key points (3-5 bullets)
- Caveats (what's still uncertain or contested)`;

    let summary = '';
    let keyPoints = [];
    let source = 'template';

    try {
      const out = await callLLM({ prompt, system: 'You are a careful research analyst who cites evidence and acknowledges uncertainty.', maxTokens: 600 });
      const text = typeof out === 'string' ? out : (out?.text || out?.content || '');
      if (text) {
        summary = text;
        // Best-effort parse: find bullets under "Key points"
        const m = text.match(/key points?[:\s]+([\s\S]+?)(?:\n\n|caveats|$)/i);
        if (m) keyPoints = m[1].split(/\n[-•]\s+/).map(s => s.trim()).filter(s => s.length > 0).slice(0, 5);
        source = 'llm';
      }
    } catch { /* fall through */ }

    if (!summary) {
      summary = `Research on "${question}" would draw on academic literature (OpenAlex, PubMed), reference works (Wikipedia), and current expert opinion. Without live API access, here's the synthesis framework:\n\nKey points to investigate:\n- Look for systematic reviews and meta-analyses (highest evidence)\n- Check for RCTs in humans (gold standard)\n- Note where evidence is contested or absent\n- Consider expert consensus vs. fringe views\n\nNext step: send this question to OpenAlex or PubMed for real citations.`;
      keyPoints = [
        `Question scope: ${question.slice(0, 60)}${question.length > 60 ? '…' : ''}`,
        `Recommended primary sources: ${chosen.map(id => allSources.find(s => s.id === id)?.name).filter(Boolean).join(', ')}`,
        'Caveat: live LLM synthesis not available — using structured fallback',
      ];
    }

    const id = `rs-${uuidv4().slice(0, 8)}`;
    const record = {
      id,
      userId,
      topic: topic || question.slice(0, 40),
      question: question.trim(),
      summary,
      sources: chosen,
      keyPoints,
      saved: false,
      createdAt: new Date().toISOString(),
      source,
    };
    researchStore.set(id, record);
    res.status(201).json({ success: true, data: record });
  });

  // === LIST RESEARCH BY USER ===
  router.get('/research/list/:userId', (req, res) => {
    const all = Array.from(researchStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(r => r.userId === req.params.userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (req.query.topic) {
      const filtered = all.filter(r => r.topic && r.topic.toLowerCase().includes(req.query.topic.toLowerCase()));
      return res.json({ success: true, total: filtered.length, research: filtered });
    }
    res.json({ success: true, total: all.length, research: all });
  });

  // === GET ONE RESEARCH RECORD ===
  router.get('/research/get/:researchId', (req, res) => {
    const r = researchStore.get(req.params.researchId);
    if (!r) return res.status(404).json({ success: false, error: 'Research not found' });
    // Hydrate sources
    const sources = (r.sources || []).map(id => sourcesStore.get(id)).filter(Boolean);
    res.json({ success: true, data: { ...r, sourceDetails: sources } });
  });

  // === DELETE RESEARCH ===
  router.delete('/research/delete/:researchId/:userId', (req, res) => {
    const r = researchStore.get(req.params.researchId);
    if (!r) return res.status(404).json({ success: false, error: 'Research not found' });
    if (r.userId !== req.params.userId) return res.status(403).json({ success: false, error: 'Not your research' });
    researchStore.delete(req.params.researchId);
    res.json({ success: true, deleted: req.params.researchId });
  });

  // === SAVE RESEARCH AS NOTE (mark saved) ===
  router.post('/research/:researchId/save/:userId', (req, res) => {
    const r = researchStore.get(req.params.researchId);
    if (!r) return res.status(404).json({ success: false, error: 'Research not found' });
    if (r.userId !== req.params.userId) return res.status(403).json({ success: false, error: 'Not your research' });
    r.saved = true;
    r.savedAt = new Date().toISOString();
    researchStore.set(req.params.researchId, r);
    res.json({ success: true, data: r });
  });

  // === LIST TOPICS ===
  router.get('/topics/:userId', (req, res) => {
    const items = Array.from(researchStore.entries()).map(([k, v]) => ({ id: k, ...v }))
      .filter(r => r.userId === req.params.userId);
    const topicCounts = {};
    for (const r of items) {
      const t = r.topic || 'untitled';
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    }
    const topics = Object.entries(topicCounts).map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);
    res.json({ success: true, total: topics.length, topics });
  });

  return router;
};