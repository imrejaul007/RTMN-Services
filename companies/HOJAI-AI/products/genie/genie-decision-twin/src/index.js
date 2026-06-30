/**
 * Decision Twin Service — v1.0.0
 * =================================
 * Permanent decision memory that stores WHY decisions were made:
 * - Stores decision context, alternatives, stakeholders
 * - Query decisions: "Why did we choose Dubai?"
 * - Links decisions to meetings, tasks, relationships
 * - Tracks decision outcomes over time
 *
 * Port: 4740 (shared with genie-decision-intelligence)
 * NOTE: Run on 4741 to avoid conflict, or merge with genie-decision-intelligence
 *
 * This is the KEY service for: "Convert meetings into permanent institutional memory"
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4741; // Avoid conflict with genie-decision-intelligence (4740)

app.use(helmet());
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// Decision Object Model
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Decision Object Schema:
 * {
 *   decision_id: string,
 *   what: string,           // "Expand to Dubai"
 *   why: string,             // "High GCC hospitality demand"
 *   who: string[],          // ["Founder", "Investor A"]
 *   alternatives: string[],  // ["Singapore", "Malaysia"]
 *   rejected_alternatives: { name: string, reason: string }[],
 *   when: ISO string,
 *   confidence: number,     // 0-1
 *   revisit_date: ISO string | null,
 *   status: 'active' | 'revisited' | 'superseded' | 'reversed',
 *   outcome: string | null,
 *   linked_meetings: string[],
 *   linked_tasks: string[],
 *   linked_relationships: { userId: string, trust_change: number }[],
 *   created_by: string,
 *   created_at: ISO string,
 *   updated_at: ISO string,
 *   version: number
 * }
 */

// In-memory storage (use Redis + PostgreSQL in production)
const decisions = new Map();
const decisionIndex = new Map(); // For fast lookups
const relationshipDecisions = new Map(); // userId → decisionIds

app.use(helmet());
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// Decision Creation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/decision
 * Create a new decision
 */
app.post('/api/decision', (req, res) => {
  try {
    const {
      what,
      why,
      who = [],
      alternatives = [],
      rejectedAlternatives = [],
      confidence = 0.8,
      revisitDate = null,
      linkedMeetings = [],
      linkedTasks = [],
      linkedRelationships = [],
      createdBy,
      tags = []
    } = req.body;

    if (!what) {
      return res.status(400).json({ error: 'what (decision description) required' });
    }

    const decisionId = `dec_${uuidv4()}`;
    const now = new Date().toISOString();

    const decision = {
      decision_id: decisionId,
      what: what.trim(),
      why: why?.trim() || null,
      who: Array.isArray(who) ? who : [who],
      alternatives: Array.isArray(alternatives) ? alternatives : [alternatives],
      rejected_alternatives: rejectedAlternatives || [],
      when: now,
      confidence,
      revisit_date: revisitDate,
      status: 'active',
      outcome: null,
      linked_meetings: linkedMeetings,
      linked_tasks: linkedTasks,
      linked_relationships: linkedRelationships,
      tags: tags || [],
      created_by: createdBy || 'system',
      created_at: now,
      updated_at: now,
      version: 1
    };

    // Store decision
    decisions.set(decisionId, decision);

    // Update index
    indexDecision(decision);

    // Update relationship index
    for (const rel of linkedRelationships) {
      const existing = relationshipDecisions.get(rel.userId) || [];
      existing.push({ decisionId, trust_change: rel.trust_change });
      relationshipDecisions.set(rel.userId, existing);
    }

    res.status(201).json({
      success: true,
      decision,
      message: 'Decision recorded permanently'
    });
  } catch (error) {
    console.error('[decision-twin]', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/decisions/extract
 * Extract decisions from meeting transcript or conversation
 *
 * This is called by meeting-intelligence after extracting decisions
 */
app.post('/api/decisions/extract', (req, res) => {
  try {
    const { decisions: extractedDecisions, meetingId, speakerId, userId } = req.body;

    if (!extractedDecisions || !Array.isArray(extractedDecisions)) {
      return res.status(400).json({ error: 'decisions array required' });
    }

    const results = [];

    for (const extracted of extractedDecisions) {
      const decision = {
        decision_id: `dec_${uuidv4()}`,
        what: extracted.decision || extracted.text || 'Extracted decision',
        why: extracted.reason || extracted.context || null,
        who: [speakerId, userId].filter(Boolean),
        alternatives: extracted.alternatives || [],
        rejected_alternatives: [],
        when: extracted.timestamp ? new Date(extracted.timestamp).toISOString() : new Date().toISOString(),
        confidence: extracted.confidence || 0.7,
        revisit_date: null,
        status: 'active',
        outcome: null,
        linked_meetings: meetingId ? [meetingId] : [],
        linked_tasks: [],
        linked_relationships: [],
        tags: extracted.tags || ['auto-extracted'],
        created_by: 'meeting-intelligence',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        source_meeting: meetingId,
        source_segment: extracted.meetingSegment
      };

      decisions.set(decision.decision_id, decision);
      indexDecision(decision);

      results.push(decision);
    }

    res.json({
      success: true,
      decisions_extracted: results.length,
      decisions: results
    });
  } catch (error) {
    console.error('[decision-twin]', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/decisions/link
 * Link a decision to other entities
 */
app.post('/api/decisions/link', (req, res) => {
  const { decisionId, meetings, tasks, relationships } = req.body;

  const decision = decisions.get(decisionId);
  if (!decision) {
    return res.status(404).json({ error: 'Decision not found' });
  }

  if (meetings) {
    decision.linked_meetings = [...new Set([...decision.linked_meetings, ...meetings])];
  }
  if (tasks) {
    decision.linked_tasks = [...new Set([...decision.linked_tasks, ...tasks])];
  }
  if (relationships) {
    for (const rel of relationships) {
      const existing = decision.linked_relationships.find(r => r.userId === rel.userId);
      if (existing) {
        existing.trust_change += rel.trust_change;
      } else {
        decision.linked_relationships.push(rel);
      }
    }
  }

  decision.updated_at = new Date().toISOString();
  decision.version++;

  res.json({
    success: true,
    decision
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Decision Retrieval
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/decision/:decisionId
 * Get a specific decision with full context
 */
app.get('/api/decision/:decisionId', (req, res) => {
  const { decisionId } = req.params;
  const decision = decisions.get(decisionId);

  if (!decision) {
    return res.status(404).json({ error: 'Decision not found' });
  }

  // Enrich with related decisions
  const relatedDecisions = findRelatedDecisions(decision);

  res.json({
    decision,
    related: relatedDecisions
  });
});

/**
 * GET /api/decisions
 * List all decisions with filtering
 */
app.get('/api/decisions', (req, res) => {
  const {
    userId,
    status,
    tag,
    since,
    until,
    limit = 50,
    offset = 0
  } = req.query;

  let results = Array.from(decisions.values());

  // Filter by user involvement
  if (userId) {
    results = results.filter(d =>
      d.created_by === userId ||
      d.who.includes(userId) ||
      d.linked_relationships.some(r => r.userId === userId)
    );
  }

  // Filter by status
  if (status) {
    results = results.filter(d => d.status === status);
  }

  // Filter by tag
  if (tag) {
    results = results.filter(d => d.tags.includes(tag));
  }

  // Filter by date range
  if (since) {
    results = results.filter(d => new Date(d.when) >= new Date(since));
  }
  if (until) {
    results = results.filter(d => new Date(d.when) <= new Date(until));
  }

  // Sort by date descending
  results.sort((a, b) => new Date(b.when) - new Date(a.when));

  // Paginate
  const total = results.length;
  results = results.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  res.json({
    decisions: results,
    total,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
});

/**
 * GET /api/decisions/search
 * Search decisions by content
 *
 * THE KEY USE CASE: "Why did we choose Dubai?"
 */
app.get('/api/decisions/search', (req, res) => {
  const { q, type = 'all', limit = 20 } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  const query = q.toLowerCase();
  let results = [];

  // Search in decision index
  const indexedResults = decisionIndex.get(query) || [];

  // Also search full text
  for (const [id, decision] of decisions) {
    if (
      decision.what.toLowerCase().includes(query) ||
      (decision.why && decision.why.toLowerCase().includes(query)) ||
      decision.alternatives.some(a => a.toLowerCase().includes(query)) ||
      decision.tags.some(t => t.toLowerCase().includes(query))
    ) {
      if (!indexedResults.includes(id)) {
        indexedResults.push(id);
      }
    }
  }

  results = indexedResults
    .slice(0, parseInt(limit))
    .map(id => decisions.get(id))
    .filter(Boolean);

  res.json({
    query: q,
    results,
    count: results.length
  });
});

/**
 * GET /api/decisions/why
 * Direct question: "Why did we [X]?"
 *
 * Example: GET /api/decisions/why?what=Dubai
 */
app.get('/api/decisions/why', (req, res) => {
  const { what } = req.query;

  if (!what) {
    return res.status(400).json({ error: 'what query required' });
  }

  const query = what.toLowerCase();
  const matches = [];

  for (const decision of decisions.values()) {
    if (decision.what.toLowerCase().includes(query)) {
      matches.push({
        decision_id: decision.decision_id,
        what: decision.what,
        why: decision.why,
        when: decision.when,
        who: decision.who,
        confidence: decision.confidence,
        outcome: decision.outcome
      });
    }
  }

  if (matches.length === 0) {
    return res.json({
      found: false,
      message: `No decision found matching "${what}"`,
      suggestion: 'Try a broader search term'
    });
  }

  res.json({
    found: true,
    query: what,
    matches,
    primary_match: matches[0]
  });
});

/**
 * GET /api/decisions/timeline
 * Get decisions as a timeline
 */
app.get('/api/decisions/timeline', (req, res) => {
  const { userId, groupBy = 'month' } = req.query;

  let results = Array.from(decisions.values());

  if (userId) {
    results = results.filter(d =>
      d.created_by === userId ||
      d.who.includes(userId)
    );
  }

  // Sort by date
  results.sort((a, b) => new Date(a.when) - new Date(b.when));

  // Group by period
  const groups = {};
  for (const decision of results) {
    const date = new Date(decision.when);
    let key;

    switch (groupBy) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'year':
        key = date.getFullYear().toString();
        break;
      case 'quarter':
        const quarter = Math.ceil((date.getMonth() + 1) / 3);
        key = `${date.getFullYear()}-Q${quarter}`;
        break;
      default: // month
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(decision);
  }

  res.json({
    timeline: Object.entries(groups).map(([period, decisions]) => ({
      period,
      decisions,
      count: decisions.length
    })),
    total: results.length
  });
});

/**
 * GET /api/decisions/relationships/:userId
 * Get all decisions involving a specific person
 */
app.get('/api/decisions/relationships/:userId', (req, res) => {
  const { userId } = req.params;

  const decisionsForUser = Array.from(decisions.values()).filter(d =>
    d.created_by === userId ||
    d.who.includes(userId) ||
    d.linked_relationships.some(r => r.userId === userId)
  );

  decisionsForUser.sort((a, b) => new Date(b.when) - new Date(a.when));

  res.json({
    userId,
    decisions: decisionsForUser,
    count: decisionsForUser.length
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Decision Updates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PUT /api/decision/:decisionId
 * Update a decision (add outcome, revise, etc.)
 */
app.put('/api/decision/:decisionId', (req, res) => {
  const { decisionId } = req.params;
  const decision = decisions.get(decisionId);

  if (!decision) {
    return res.status(404).json({ error: 'Decision not found' });
  }

  const updates = req.body;
  const allowedUpdates = [
    'what', 'why', 'who', 'alternatives', 'rejected_alternatives',
    'confidence', 'revisit_date', 'status', 'outcome', 'tags'
  ];

  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      decision[key] = updates[key];
    }
  }

  decision.updated_at = new Date().toISOString();
  decision.version++;

  // Re-index
  indexDecision(decision);

  res.json({
    success: true,
    decision
  });
});

/**
 * POST /api/decision/:decisionId/revisit
 * Mark a decision as revisited
 */
app.post('/api/decision/:decisionId/revisit', (req, res) => {
  const { decisionId } = req.params;
  const { outcome, notes, new_decision } = req.body;

  const decision = decisions.get(decisionId);
  if (!decision) {
    return res.status(404).json({ error: 'Decision not found' });
  }

  // Mark original as revisited
  decision.status = 'revisited';
  decision.outcome = outcome || null;
  decision.updated_at = new Date().toISOString();
  decision.version++;

  // Create new decision if provided
  let newDecision = null;
  if (new_decision) {
    newDecision = {
      decision_id: `dec_${uuidv4()}`,
      what: new_decision.what,
      why: `${decision.what} was revisited. ${new_decision.why || ''}`,
      who: new_decision.who || decision.who,
      alternatives: new_decision.alternatives || [],
      when: new Date().toISOString(),
      confidence: new_decision.confidence || 0.7,
      revisit_date: null,
      status: 'active',
      outcome: null,
      linked_meetings: [...decision.linked_meetings],
      linked_tasks: [],
      linked_relationships: decision.linked_relationships,
      tags: [...decision.tags, 'revisit'],
      created_by: new_decision.createdBy || 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      superseded_by: new_decision.what
    };

    decisions.set(newDecision.decision_id, newDecision);
    indexDecision(newDecision);
  }

  res.json({
    success: true,
    original_decision: decision,
    new_decision: newDecision
  });
});

/**
 * POST /api/decision/:decisionId/reverse
 * Reverse or overturn a decision
 */
app.post('/api/decision/:decisionId/reverse', (req, res) => {
  const { decisionId } = req.params;
  const { reason } = req.body;

  const decision = decisions.get(decisionId);
  if (!decision) {
    return res.status(404).json({ error: 'Decision not found' });
  }

  decision.status = 'reversed';
  decision.outcome = reason || 'Decision reversed';
  decision.updated_at = new Date().toISOString();
  decision.version++;

  res.json({
    success: true,
    decision
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Decision Analytics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/decisions/stats
 * Get decision statistics
 */
app.get('/api/decisions/stats', (req, res) => {
  const allDecisions = Array.from(decisions.values());

  const stats = {
    total: allDecisions.length,
    by_status: {
      active: 0,
      revisited: 0,
      superseded: 0,
      reversed: 0
    },
    by_confidence: {
      high: 0,    // > 0.8
      medium: 0,   // 0.5-0.8
      low: 0      // < 0.5
    },
    needs_revisit: [],
    recent_count: 0,
    top_tags: {}
  };

  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  for (const d of allDecisions) {
    // By status
    if (stats.by_status[d.status] !== undefined) {
      stats.by_status[d.status]++;
    }

    // By confidence
    if (d.confidence > 0.8) stats.by_confidence.high++;
    else if (d.confidence >= 0.5) stats.by_confidence.medium++;
    else stats.by_confidence.low++;

    // Needs revisit
    if (d.revisit_date && new Date(d.revisit_date) <= now && d.status === 'active') {
      stats.needs_revisit.push({
        decision_id: d.decision_id,
        what: d.what,
        revisit_date: d.revisit_date
      });
    }

    // Recent
    if (new Date(d.when) >= thirtyDaysAgo) {
      stats.recent_count++;
    }

    // Tags
    for (const tag of d.tags) {
      stats.top_tags[tag] = (stats.top_tags[tag] || 0) + 1;
    }
  }

  // Sort tags
  stats.top_tags = Object.entries(stats.top_tags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .reduce((obj, [tag, count]) => ({ ...obj, [tag]: count }), {});

  res.json(stats);
});

/**
 * GET /api/decisions/conflicts
 * Find conflicting decisions
 */
app.get('/api/decisions/conflicts', (req, res) => {
  const conflicts = [];

  // Simple conflict detection: decisions about the same topic with different outcomes
  const decisionsByTopic = new Map();

  for (const decision of decisions.values()) {
    const topic = extractTopic(decision.what);
    if (!decisionsByTopic.has(topic)) {
      decisionsByTopic.set(topic, []);
    }
    decisionsByTopic.get(topic).push(decision);
  }

  for (const [topic, topicDecisions] of decisionsByTopic) {
    if (topicDecisions.length > 1) {
      const statuses = new Set(topicDecisions.map(d => d.status));
      if (statuses.has('active') && statuses.has('reversed')) {
        conflicts.push({
          topic,
          decisions: topicDecisions.map(d => ({
            decision_id: d.decision_id,
            what: d.what,
            status: d.status,
            when: d.when
          }))
        });
      }
    }
  }

  res.json({
    conflicts,
    count: conflicts.length
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function indexDecision(decision) {
  // Index decision for fast search
  const words = [
    decision.what.toLowerCase(),
    decision.why?.toLowerCase() || '',
    ...decision.alternatives.map(a => a.toLowerCase()),
    ...decision.tags.map(t => t.toLowerCase())
  ].join(' ').split(/\s+/);

  for (const word of words) {
    if (word.length < 3) continue;

    const existing = decisionIndex.get(word) || [];
    if (!existing.includes(decision.decision_id)) {
      existing.push(decision.decision_id);
      decisionIndex.set(word, existing);
    }
  }
}

function findRelatedDecisions(decision) {
  const related = [];

  // Find decisions sharing meetings
  for (const other of decisions.values()) {
    if (other.decision_id === decision.decision_id) continue;

    const sharedMeetings = decision.linked_meetings.filter(m =>
      other.linked_meetings.includes(m)
    );

    const sharedTasks = decision.linked_tasks.filter(t =>
      other.linked_tasks.includes(t)
    );

    if (sharedMeetings.length > 0 || sharedTasks.length > 0) {
      related.push({
        ...other,
        relationship: sharedMeetings.length > 0 ? 'same_meeting' : 'same_task',
        shared_count: sharedMeetings.length || sharedTasks.length
      });
    }
  }

  return related.slice(0, 5);
}

function extractTopic(what) {
  // Simple topic extraction
  const cleaned = what
    .toLowerCase()
    .replace(/^(expand|launch|hire|buy|invest|build|create|move|choose)/, '')
    .trim();

  return cleaned.split(/[,.\s]/).slice(0, 3).join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Health & Status
// ─────────────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'decision-twin',
    port: PORT,
    version: '1.0.0',
    stats: {
      total_decisions: decisions.size,
      active: Array.from(decisions.values()).filter(d => d.status === 'active').length,
      index_size: decisionIndex.size
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  res.json({
    ready: true,
    services: {
      decisionStorage: true,
      indexing: true,
      search: true
    },
    timestamp: new Date().toISOString()
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║       DECISION TWIN SERVICE v1.0.0                       ║
║                                                                ║
║  🎯  Permanent Decision Memory                           ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║                                                                ║
║  THE KEY USE CASE:                                           ║
║  "Why did we choose Dubai?"                                 ║
║  → Answer: "High GCC hospitality demand"                     ║
║    Who decided: Founder + Investor A                         ║
║    When: 2026-06-30                                          ║
║    Alternatives rejected: Singapore, Malaysia                 ║
║                                                                ║
║  Decision Object:                                           ║
║  • what: The decision                                       ║
║  • why: Reason/context                                       ║
║  • who: Stakeholders                                         ║
║  • alternatives: Options considered                          ║
║  • outcomes: Result of decision                              ║
║  • revisit_date: When to review                             ║
║                                                                ║
║  Endpoints:                                                   ║
║  • POST /api/decision            — Create decision           ║
║  • POST /api/decisions/extract  — Extract from meeting      ║
║  • GET  /api/decisions/why      — "Why did we X?"            ║
║  • GET  /api/decisions/search   — Search decisions           ║
║  • GET  /api/decisions/timeline — Timeline view             ║
║  • PUT  /api/decision/:id       — Update decision           ║
║  • POST /api/decision/:id/revisit — Revisit decision        ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('[decision-twin] Shutting down...');
  process.exit(0);
});

export default app;
