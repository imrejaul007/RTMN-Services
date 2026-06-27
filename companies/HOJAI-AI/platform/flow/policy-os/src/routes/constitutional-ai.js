/**
 * PolicyOS — Constitutional AI (Phase 8)
 *
 * Endpoints:
 *  - GET  /api/constitutions          — list constitutions
 *  - POST /api/constitutions          — create constitution
 *  - GET  /api/constitutions/:id      — get one
 *  - PATCH /api/constitutions/:id     — update
 *  - POST /api/constitutions/:id/review — submit review
 *  - GET  /api/constitutions/:id/reviews — list reviews
 *  - POST /api/constitutions/:id/evaluate — evaluate against constitution
 *  - GET  /api/harm-categories        — list harm categories
 */

const constitutions = new Map();
let constitutionIdCounter = 0;
const reviews = new Map();
let reviewIdCounter = 0;

export const CONSTITUTION_STATUS = {
  DRAFT: 'draft',
  REVIEW: 'review',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  ARCHIVED: 'archived',
};

export const REVIEW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REVISION_REQUESTED: 'revision_requested',
};

export const HARM_CATEGORIES = {
  VIOLENCE: { id: 'violence', name: 'Violence & Harm', severity: 'critical', description: 'Content promoting physical harm, murder, assault, weapons' },
  HATE_SPEECH: { id: 'hate_speech', name: 'Hate Speech', severity: 'critical', description: 'Discriminatory content targeting groups based on protected characteristics' },
  SELF_HARM: { id: 'self_harm', name: 'Self-Harm', severity: 'critical', description: 'Content encouraging self-injury or suicide' },
  ILLEGAL: { id: 'illegal', name: 'Illegal Activity', severity: 'critical', description: 'Instructions for illegal activities, fraud, hacking' },
  SEXUAL: { id: 'sexual', name: 'Sexual Content', severity: 'high', description: 'Explicit sexual content, CSAM' },
  PRIVACY: { id: 'privacy', name: 'Privacy Violation', severity: 'high', description: 'Unauthorized PII disclosure, doxxing' },
  MANIPULATION: { id: 'manipulation', name: 'Manipulation', severity: 'high', description: 'Deceptive practices, psychological manipulation' },
  MISINFORMATION: { id: 'misinformation', name: 'Misinformation', severity: 'medium', description: 'False information presented as fact' },
  HARASSMENT: { id: 'harassment', name: 'Harassment', severity: 'medium', description: 'Bullying, intimidation, targeted harassment' },
  IP_VIOLATION: { id: 'ip_violation', name: 'IP Violation', severity: 'medium', description: 'Copyright, trademark infringement' },
};

function evaluateAgainstConstitution(text, constitution) {
  const { rules = [], blockedPatterns = [] } = constitution;
  const violations = [];
  const lower = text.toLowerCase();

  // Check blocked patterns
  for (const pattern of blockedPatterns) {
    try {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(text)) {
        violations.push({ type: 'blocked_pattern', pattern, severity: 'error' });
      }
    } catch { /* invalid regex, skip */ }
  }

  // Check harm categories
  for (const [key, cat] of Object.entries(HARM_CATEGORIES)) {
    if (constitution.harmCategories?.includes(key)) {
      const harmfulPhrases = {
        [HARM_CATEGORIES.VIOLENCE.id]: ['kill', 'murder', 'assassinate', 'torture'],
        [HARM_CATEGORIES.HATE_SPEECH.id]: ['hate', 'slur', 'supremac'],
        [HARM_CATEGORIES.SELF_HARM.id]: ['suicide', 'self-harm', 'cut myself'],
        [HARM_CATEGORIES.ILLEGAL.id]: ['how to make bomb', 'how to hack'],
      };
      const phrases = harmfulPhrases[cat.id] || [];
      for (const phrase of phrases) {
        if (lower.includes(phrase)) {
          violations.push({ type: 'harm_category', category: cat.id, severity: cat.severity, phrase });
        }
      }
    }
  }

  const hasCritical = violations.some(v => v.severity === 'critical');
  const score = Math.max(0, 100 - violations.length * 10 - (hasCritical ? 30 : 0));

  return {
    score,
    verdict: score >= 70 ? 'pass' : score >= 40 ? 'warn' : 'fail',
    violations,
    evaluatedAt: new Date().toISOString(),
  };
}

export function registerConstitutionalAIRoutes(app, { auditLog, customAuth }) {

  app.get('/api/constitutions', customAuth, (req, res) => {
    const { status, type, limit = 50 } = req.query;
    let list = [...constitutions.values()];
    if (status) list = list.filter(c => c.status === status);
    if (type) list = list.filter(c => c.type === type);
    res.json({ count: list.length, constitutions: list.slice(0, parseInt(limit)) });
  });

  app.post('/api/constitutions', customAuth, (req, res) => {
    const { name, description, type, rules, blockedPatterns, harmCategories, metadata } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'name and type are required' });

    const tenantId = req.auth?.tenantId || req.auth?.owner || null;
    const id = `const-${++constitutionIdCounter}-${Date.now()}`;
    const constitution = {
      id, name, description, type,
      rules: rules || [],
      blockedPatterns: blockedPatterns || [],
      harmCategories: harmCategories || [],
      status: CONSTITUTION_STATUS.DRAFT,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      createdBy: req.auth?.sub,
      tenantId,
      version: 1,
    };
    constitutions.set(id, constitution);
    res.status(201).json({ ok: true, constitution });
  });

  app.get('/api/constitutions/:id', customAuth, (req, res) => {
    const c = constitutions.get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Constitution not found' });
    res.json({ constitution: c });
  });

  app.patch('/api/constitutions/:id', customAuth, (req, res) => {
    const c = constitutions.get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Constitution not found' });
    const { name, description, rules, blockedPatterns, harmCategories, status } = req.body;
    if (name) c.name = name;
    if (description !== undefined) c.description = description;
    if (rules) c.rules = rules;
    if (blockedPatterns) c.blockedPatterns = blockedPatterns;
    if (harmCategories) c.harmCategories = harmCategories;
    if (status && Object.values(CONSTITUTION_STATUS).includes(status)) c.status = status;
    c.updatedAt = new Date().toISOString();
    c.version++;
    res.json({ ok: true, constitution: c });
  });

  app.post('/api/constitutions/:id/review', customAuth, (req, res) => {
    const c = constitutions.get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Constitution not found' });

    const { status: reviewStatus, comments } = req.body;
    if (!reviewStatus || !Object.values(REVIEW_STATUS).includes(reviewStatus)) {
      return res.status(400).json({ error: 'Valid reviewStatus is required' });
    }

    const id = `review-${++reviewIdCounter}-${Date.now()}`;
    const review = {
      id,
      constitutionId: req.params.id,
      status: reviewStatus,
      comments: comments || '',
      reviewer: req.auth?.sub,
      createdAt: new Date().toISOString(),
    };
    reviews.set(id, review);

    if (reviewStatus === REVIEW_STATUS.APPROVED && c.status === CONSTITUTION_STATUS.REVIEW) {
      c.status = CONSTITUTION_STATUS.ACTIVE;
    }

    res.status(201).json({ ok: true, review });
  });

  app.get('/api/constitutions/:id/reviews', customAuth, (req, res) => {
    const list = [...reviews.values()].filter(r => r.constitutionId === req.params.id);
    res.json({ count: list.length, reviews: list });
  });

  app.post('/api/constitutions/:id/evaluate', customAuth, (req, res) => {
    const c = constitutions.get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Constitution not found' });
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const result = evaluateAgainstConstitution(text, c);
    res.json({ ok: true, constitutionId: req.params.id, ...result });
  });

  app.get('/api/harm-categories', customAuth, (req, res) => {
    res.json({ categories: Object.values(HARM_CATEGORIES) });
  });
}