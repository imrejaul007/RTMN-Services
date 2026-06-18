/**
 * Genie Smart Forgetting Service
 *
 * Intelligent memory archival system that automatically manages memory lifecycle.
 * - Determines what to keep, archive, or delete
 * - Respects user preferences and privacy
 * - Maintains memory freshness and relevance
 *
 * Port: 4715
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const forgettingRoutes = require('./routes/forgetting');
const archiveRoutes = require('./routes/archive');
const configRoutes = require('./routes/config');

const app = express();
const PORT = process.env.PORT || 4715;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'genie-smart-forgetting-service',
    status: 'healthy',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/forgetting', forgettingRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/config', configRoutes);

// ============================================
// SMARTER FORGETTING ENGINE
// ============================================

// Memory lifecycle states
const MEMORY_STATES = {
  ACTIVE: 'active',           // Frequently accessed, important
  DORMANT: 'dormant',         // Not accessed in a while, may archive
  ARCHIVED: 'archived',       // Moved to cold storage
  DELETED: 'deleted'          // Permanently removed
};

// Archive rules configuration
const DEFAULT_RULES = {
  // Time-based rules (in days)
  timeRules: {
    lowImportanceAge: 90,        // Archive low importance after 90 days
    mediumImportanceAge: 180,    // Archive medium importance after 180 days
    highImportanceAge: 365,      // Archive high importance after 1 year
    archivedAge: 730,            // Delete archived after 2 years
  },

  // Access-based rules
  accessRules: {
    dormantThreshold: 30,         // Days without access to mark dormant
    minAccessForActive: 2,        // Min accesses per week to stay active
  },

  // Content-based rules
  contentRules: {
    autoArchivePatterns: [
      /^temp/i,
      /test/i,
      /^draft/i,
      /^old/i,
    ],
    neverArchivePatterns: [
      /important/i,
      /permanent/i,
      /keep/i,
      /contract/i,
      /legal/i,
    ]
  },

  // Privacy rules
  privacyRules: {
    redactOnArchive: true,        // Redact sensitive data when archiving
    sensitiveTypes: ['financial', 'health', 'credentials']
  }
};

// Memory importance classifier
const classifyImportance = (memory) => {
  const { content, tags, entities, twinType } = memory;
  const text = (content || '').toLowerCase();

  let score = 0;

  // Twin type influence
  const twinScores = {
    financial: 10,    // Financial memories are always important
    health: 10,       // Health memories are critical
    relationship: 5,  // Relationships matter
    personal: 4,     // Personal memories are meaningful
    creative: 3,      // Creative work has medium importance
    business: 4,     // Business memories matter
    learning: 3,     // Learning is valuable
  };
  score += twinScores[twinType] || 3;

  // Entity importance
  if (entities && entities.length > 0) {
    score += Math.min(entities.length, 5); // Cap at 5
  }

  // Tag importance
  if (tags && tags.length > 0) {
    const importantTags = ['important', 'milestone', 'achievement', 'goal', 'family', 'milestone'];
    const hasImportant = tags.some(t => importantTags.includes(t.toLowerCase()));
    if (hasImportant) score += 5;

    // Count tags
    score += Math.min(tags.length, 3);
  }

  // Content analysis for importance signals
  const importantKeywords = [
    'important', 'milestone', 'achievement', 'celebrate', 'significant',
    'milestone', 'first', 'best', 'worst', 'remember', 'never forget',
    'contract', 'agreement', 'commitment', 'promise', 'goal'
  ];

  const lowImportanceKeywords = [
    'maybe', 'probably', 'might', 'perhaps', 'sometime', 'optional',
    'draft', 'temp', 'test', 'ignore', 'delete later'
  ];

  importantKeywords.forEach(keyword => {
    if (text.includes(keyword)) score += 2;
  });

  lowImportanceKeywords.forEach(keyword => {
    if (text.includes(keyword)) score -= 1;
  });

  // Sentiment intensity
  if (memory.sentiment && memory.sentiment.intensity > 0.7) {
    score += 3; // Strong emotions = more important
  }

  // Cap score
  score = Math.max(1, Math.min(10, score));

  // Map score to importance level
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
};

// Forgetting analyzer
const analyzeForgetting = (memories, rules = DEFAULT_RULES) => {
  const now = new Date();
  const analysis = {
    toArchive: [],
    toDelete: [],
    toKeep: [],
    dormant: [],
    statistics: {
      total: memories.length,
      byState: {},
      byImportance: {},
      estimatedSavings: 0 // Storage savings in KB
    }
  };

  memories.forEach(memory => {
    const age = Math.floor((now - new Date(memory.createdAt)) / (1000 * 60 * 60 * 24));
    const lastAccessed = memory.lastAccessedAt
      ? Math.floor((now - new Date(memory.lastAccessedAt)) / (1000 * 60 * 60 * 24))
      : age;

    const importance = memory.importance || classifyImportance(memory);
    const memorySize = memory.sizeEstimate || 1; // KB estimate
    const state = memory.state || MEMORY_STATES.ACTIVE;

    // Track statistics
    analysis.statistics.byState[state] = (analysis.statistics.byState[state] || 0) + 1;
    analysis.statistics.byImportance[importance] = (analysis.statistics.byImportance[importance] || 0) + 1;

    // Decision logic
    if (state === MEMORY_STATES.ARCHIVED) {
      // Check if archived memories should be deleted
      if (age > rules.timeRules.archivedAge) {
        analysis.toDelete.push({
          ...memory,
          reason: `Archived for ${age} days exceeds limit of ${rules.timeRules.archivedAge}`,
          age,
          state: MEMORY_STATES.DELETED
        });
        analysis.statistics.estimatedSavings += memorySize;
      } else {
        analysis.toKeep.push({ ...memory, reason: 'Archived but within retention period', age });
      }
    } else if (state === MEMORY_STATES.ACTIVE) {
      // Check if active memory should become dormant
      if (lastAccessed > rules.accessRules.dormantThreshold) {
        analysis.dormant.push({
          ...memory,
          reason: `Not accessed for ${lastAccessed} days`,
          age,
          state: MEMORY_STATES.DORMANT,
          lastAccessedDays: lastAccessed
        });
      } else {
        analysis.toKeep.push({ ...memory, reason: 'Still active and accessed', age });
      }
    } else if (state === MEMORY_STATES.DORMANT) {
      // Check if dormant memory should be archived
      const archiveThreshold = rules.timeRules[`${importance}ImportanceAge`] || 180;
      if (age > archiveThreshold) {
        analysis.toArchive.push({
          ...memory,
          reason: `Dormant for ${age} days, ${importance} importance`,
          age,
          state: MEMORY_STATES.ARCHIVED,
          importance,
          archivePriority: importance === 'high' ? 'low' : 'high' // Don't archive high importance
        });

        // Only add to savings if we're archiving (not keeping high importance)
        if (importance !== 'high') {
          analysis.statistics.estimatedSavings += memorySize;
        }
      } else {
        analysis.toKeep.push({ ...memory, reason: 'Dormant but within archive threshold', age });
      }
    } else {
      // New or unclassified memories
      analysis.toKeep.push({ ...memory, reason: 'New or unclassified', age });
    }
  });

  // Sort archive queue by priority (high priority first)
  analysis.toArchive.sort((a, b) => {
    if (a.archivePriority === 'high' && b.archivePriority !== 'high') return -1;
    if (b.archivePriority === 'high' && a.archivePriority !== 'high') return 1;
    return b.age - a.age; // Older first
  });

  return analysis;
};

// Smart archive function
const smartArchive = (memory, options = {}) => {
  const {
    redactSensitive = true,
    compress = true,
    keepMetadata = true
  } = options;

  const archived = {
    id: memory.id,
    archivedAt: new Date().toISOString(),
    originalCreatedAt: memory.createdAt,
    originalTwinType: memory.twinType,
    state: MEMORY_STATES.ARCHIVED
  };

  if (keepMetadata) {
    archived.metadata = {
      importance: memory.importance || classifyImportance(memory),
      tags: memory.tags,
      entities: memory.entities,
      accessCount: memory.accessCount || 0,
      lastAccessedAt: memory.lastAccessedAt
    };
  }

  if (redactSensitive && memory.twinType === 'financial') {
    // Redact specific financial details but keep structure
    archived.content = redactSensitiveContent(memory.content);
    archived.redacted = true;
    archived.redactedFields = ['amounts', 'account_numbers', 'card_numbers'];
  } else if (compress && memory.content) {
    // Store compressed content reference
    archived.contentHash = hashContent(memory.content);
    archived.contentLength = memory.content.length;
    archived.compressed = true;
  } else {
    archived.content = memory.content;
  }

  return archived;
};

// Redact sensitive content patterns
const redactSensitiveContent = (content) => {
  if (!content) return '';

  return content
    .replace(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, '****-****-****-****') // Card numbers
    .replace(/\d{10,}/g, '***') // Long numbers (phone, account)
    .replace(/\$\d+(\.\d{2})?/g, '$***') // Dollar amounts
    .replace(/€\d+(\.\d{2})?/g, '€***') // Euro amounts
    .replace(/₹\d+(\.\d{2})?/g, '₹***'); // Rupee amounts
};

// Simple hash for content verification
const hashContent = (content) => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

// Memory freshness calculator
const calculateFreshness = (memory) => {
  const now = new Date();
  const created = new Date(memory.createdAt);
  const age = (now - created) / (1000 * 60 * 60 * 24); // Days

  const factors = {
    age: 1 - Math.min(age / 365, 0.9), // Older = less fresh, max 90% reduction
    access: memory.lastAccessedAt
      ? 1 - Math.min((now - new Date(memory.lastAccessedAt)) / (1000 * 60 * 60 * 24 * 30), 0.7)
      : 0.5, // Default if never accessed
    importance: memory.importance === 'high' ? 1.2 : memory.importance === 'medium' ? 1 : 0.7,
    emotional: memory.sentiment?.intensity > 0.7 ? 1.3 : 1
  };

  const freshness = Object.values(factors).reduce((a, b) => a * b, 1);
  return Math.min(Math.max(freshness, 0), 1);
};

// Export for routes
app.locals.analyzeForgetting = analyzeForgetting;
app.locals.smartArchive = smartArchive;
app.locals.calculateFreshness = calculateFreshness;
app.locals.classifyImportance = classifyImportance;
app.locals.MEMORY_STATES = MEMORY_STATES;
app.locals.DEFAULT_RULES = DEFAULT_RULES;

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║     GENIE SMART FORGETTING SERVICE                         ║
║     Intelligent Memory Archival                            ║
╠═══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                              ║
║  Status: Running                                            ║
║                                                           ║
║  Features:                                                 ║
║  • Smart Archive Decisions                                  ║
║  • Privacy-Preserving Redaction                             ║
║  • Memory Freshness Scoring                                ║
║  • Lifecycle Management                                     ║
║  • Retention Policies                                       ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
