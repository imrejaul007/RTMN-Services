/**
 * Config Routes - Forgetting Preferences Management
 */

const express = require('express');
const router = express.Router();

// Default configuration
const defaultConfig = {
  enabled: true,
  autoArchive: true,
  autoDelete: false, // Never auto-delete, always keep archived
  privacyMode: true,

  // Retention rules (in days)
  retention: {
    lowImportance: 90,
    mediumImportance: 180,
    highImportance: 365,
    archivedRetention: 730
  },

  // What to archive vs keep forever
  archivePolicy: {
    lowImportance: true,
    mediumImportance: true,
    highImportance: false,
    financial: false, // Never archive financial
    health: false      // Never archive health
  },

  // Redaction settings
  redaction: {
    enabled: true,
    redactFinancial: true,
    redactHealth: true,
    redactPersonal: false
  },

  // Notification preferences
  notifications: {
    beforeArchive: true,
    beforeDelete: true,
    weeklySummary: true,
    digestDay: 'sunday'
  },

  // Smart forgetting features
  smartFeatures: {
    importanceLearning: true,  // Learn from user actions
    freshnessTracking: true,     // Track memory freshness
    contextAwareness: true,     // Consider context
    emotionalResonance: true    // Factor in emotions
  }
};

/**
 * GET /api/config
 * Get forgetting configuration
 */
router.get('/', (req, res) => {
  const { userId = 'default' } = req.query;

  res.json({
    success: true,
    userId,
    config: defaultConfig,
    updatedAt: '2026-06-18T00:00:00Z'
  });
});

/**
 * PUT /api/config
 * Update forgetting configuration
 */
router.put('/', (req, res) => {
  const { userId = 'default', config: newConfig } = req.body;

  if (!newConfig) {
    return res.status(400).json({
      success: false,
      error: 'config object required'
    });
  }

  // Merge with defaults
  const updated = {
    ...defaultConfig,
    ...newConfig,
    retention: {
      ...defaultConfig.retention,
      ...(newConfig.retention || {})
    },
    archivePolicy: {
      ...defaultConfig.archivePolicy,
      ...(newConfig.archivePolicy || {})
    }
  };

  res.json({
    success: true,
    message: 'Configuration updated',
    userId,
    config: updated,
    updatedAt: new Date().toISOString()
  });
});

/**
 * GET /api/config/retention
 * Get retention policy details
 */
router.get('/retention', (req, res) => {
  const { userId = 'default' } = req.query;

  res.json({
    success: true,
    userId,
    retention: {
      current: defaultConfig.retention,
      presets: [
        {
          name: 'Aggressive',
          description: 'Archive after 30/60/90 days',
          values: { lowImportance: 30, mediumImportance: 60, highImportance: 90, archivedRetention: 365 }
        },
        {
          name: 'Standard',
          description: 'Archive after 90/180/365 days',
          values: { lowImportance: 90, mediumImportance: 180, highImportance: 365, archivedRetention: 730 }
        },
        {
          name: 'Conservative',
          description: 'Archive after 180/365/730 days',
          values: { lowImportance: 180, mediumImportance: 365, highImportance: 730, archivedRetention: 1095 }
        },
        {
          name: 'Keep All',
          description: 'Only archive, never delete',
          values: { lowImportance: 365, mediumImportance: 730, highImportance: 9999, archivedRetention: 9999 }
        }
      ]
    }
  });
});

/**
 * PUT /api/config/retention
 * Update retention policy
 */
router.put('/retention', (req, res) => {
  const { userId = 'default', retention } = req.body;

  if (!retention) {
    return res.status(400).json({
      success: false,
      error: 'retention object required'
    });
  }

  defaultConfig.retention = {
    ...defaultConfig.retention,
    ...retention
  };

  res.json({
    success: true,
    message: 'Retention policy updated',
    userId,
    retention: defaultConfig.retention,
    updatedAt: new Date().toISOString()
  });
});

/**
 * POST /api/config/reset
 * Reset to default configuration
 */
router.post('/reset', (req, res) => {
  const { userId = 'default' } = req.body;

  res.json({
    success: true,
    message: 'Configuration reset to defaults',
    userId,
    config: defaultConfig,
    updatedAt: new Date().toISOString()
  });
});

/**
 * GET /api/config/presets
 * Get available configuration presets
 */
router.get('/presets', (req, res) => {
  res.json({
    success: true,
    presets: [
      {
        id: 'minimal',
        name: 'Minimal Forgetting',
        description: 'Only archive very old, low-importance memories',
        features: {
          autoArchive: true,
          archivePolicy: { lowImportance: true, mediumImportance: false, highImportance: false }
        }
      },
      {
        id: 'balanced',
        name: 'Balanced',
        description: 'Smart archive based on importance',
        features: defaultConfig
      },
      {
        id: 'aggressive',
        name: 'Aggressive Cleanup',
        description: 'Archive more aggressively to save space',
        features: {
          autoArchive: true,
          retention: { lowImportance: 30, mediumImportance: 90, highImportance: 180 }
        }
      },
      {
        id: 'privacy',
        name: 'Privacy First',
        description: 'Maximum privacy with aggressive redaction',
        features: {
          privacyMode: true,
          redaction: { enabled: true, redactFinancial: true, redactHealth: true, redactPersonal: true }
        }
      }
    ]
  });
});

/**
 * POST /api/config/presets/:presetId
 * Apply a preset configuration
 */
router.post('/presets/:presetId', (req, res) => {
  const { presetId } = req.params;
  const { userId = 'default' } = req.body;

  const presets = {
    minimal: {
      enabled: true,
      autoArchive: true,
      retention: { lowImportance: 30, mediumImportance: 90, highImportance: 365 },
      archivePolicy: { lowImportance: true, mediumImportance: false, highImportance: false }
    },
    balanced: defaultConfig,
    aggressive: {
      enabled: true,
      autoArchive: true,
      retention: { lowImportance: 30, mediumImportance: 60, highImportance: 90 }
    },
    privacy: {
      enabled: true,
      autoArchive: true,
      privacyMode: true,
      redaction: { enabled: true, redactFinancial: true, redactHealth: true, redactPersonal: true }
    }
  };

  const preset = presets[presetId];

  if (!preset) {
    return res.status(404).json({
      success: false,
      error: 'Preset not found'
    });
  }

  res.json({
    success: true,
    message: `Applied "${presetId}" preset`,
    userId,
    config: preset,
    updatedAt: new Date().toISOString()
  });
});

module.exports = router;
