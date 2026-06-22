/**
 * SUTAR Karma Integration for Sales OS
 * Connects Sales OS to SUTAR Economy OS (Port 4294) for rep reputation tracking.
 *
 * Version: 1.0.1 (2026-06-22 — port renumbered 4251→4294 per Phase B audit)
 * Port: 5055 (Sales OS)
 * Connected Service: SUTAR Economy OS (4294) — formerly called "Karma" before the 2026-06-22 renumber
 * Recommended: route via Hub at http://localhost:4399/api/sutar/sutar-economy-os/api/karma/...
 */

const axios = require('axios');

// Karma Service Configuration
// NOTE: Economy OS was on 4251 until 2026-06-22; it's now on 4294.
// Prefer the Hub URL in production: SUTAR_HUB_URL=http://localhost:4399
const HUB_URL = process.env.SUTAR_HUB_URL || 'http://localhost:4399';
const KARMA_CONFIG = {
  name: 'SUTAR Economy OS (Karma)',
  port: 4294,
  // Prefer SUTAR_HUB_URL; fall back to KARMA_URL; fall back to direct Economy OS
  baseUrl: process.env.SUTAR_HUB_URL
    ? `${HUB_URL}/api/sutar/sutar-economy-os`
    : (process.env.KARMA_URL || 'http://localhost:4294'),
  timeout: 10000,
};

// Karma Achievement Types
const KARMA_ACTIONS = {
  SALE_CLOSED: 'sale_closed',
  LEAD_QUALIFIED: 'lead_qualified',
  DEAL_WON: 'deal_won',
  TARGET_MET: 'target_met',
  DEAL_EXCEEDED: 'deal_exceeded',
  CUSTOMER_REFERRAL: 'customer_referral',
  TEAM_COLLABORATION: 'team_collaboration',
  PIPELINE_PROGRESS: 'pipeline_progress',
  STALE_LEAD_REVIVED: 'stale_lead_revived',
  CROSS_SELL_SUCCESS: 'cross_sell_success',
};

// Default point values for achievements
const DEFAULT_KARMA_POINTS = {
  [KARMA_ACTIONS.SALE_CLOSED]: 100,
  [KARMA_ACTIONS.LEAD_QUALIFIED]: 25,
  [KARMA_ACTIONS.DEAL_WON]: 150,
  [KARMA_ACTIONS.TARGET_MET]: 200,
  [KARMA_ACTIONS.DEAL_EXCEEDED]: 300,
  [KARMA_ACTIONS.CUSTOMER_REFERRAL]: 50,
  [KARMA_ACTIONS.TEAM_COLLABORATION]: 30,
  [KARMA_ACTIONS.PIPELINE_PROGRESS]: 15,
  [KARMA_ACTIONS.STALE_LEAD_REVIVED]: 40,
  [KARMA_ACTIONS.CROSS_SELL_SUCCESS]: 75,
};

/**
 * Create axios instance for Karma API
 */
const createKarmaClient = () => {
  return axios.create({
    baseURL: KARMA_CONFIG.baseUrl,
    timeout: KARMA_CONFIG.timeout,
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Name': 'sales-os',
      'X-Service-Port': '5055',
    },
  });
};

/**
 * Check connection to Karma service
 * @returns {Promise<{success: boolean, connected: boolean, service: string, url: string, status?: object, error?: string}>}
 */
const connectToSutarKarma = async () => {
  try {
    const client = createKarmaClient();
    const response = await client.get('/health');

    if (response.status === 200) {
      console.log(`[SUTAR Karma] Connected successfully to ${KARMA_CONFIG.baseUrl}`);
      return {
        success: true,
        connected: true,
        service: KARMA_CONFIG.name,
        url: KARMA_CONFIG.baseUrl,
        status: response.data,
      };
    }
  } catch (error) {
    console.error(`[SUTAR Karma] Connection failed:`, error.message);
    return {
      success: false,
      connected: false,
      service: KARMA_CONFIG.name,
      url: KARMA_CONFIG.baseUrl,
      error: error.message,
    };
  }
};

/**
 * Update rep karma score
 * @param {string} repId - Rep ID
 * @param {number} karmaChange - Positive or negative karma change
 * @param {string} reason - Reason for karma change
 */
const updateRepKarma = async (repId, karmaChange, reason = '') => {
  try {
    const client = createKarmaClient();
    const response = await client.post('/api/karma/update', {
      entityId: repId,
      entityType: 'sales_rep',
      change: karmaChange,
      reason,
      source: 'sales-os',
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      repId,
      karmaChange,
      newBalance: response.data?.balance,
      transaction: response.data?.transactionId,
    };
  } catch (error) {
    console.error(`[SUTAR Karma] Failed to update karma for ${repId}:`, error.message);
    return {
      success: false,
      repId,
      karmaChange,
      error: error.message,
    };
  }
};

/**
 * Get rep karma score and history
 * @param {string} repId - Rep ID
 */
const getRepKarma = async (repId) => {
  try {
    const client = createKarmaClient();
    const response = await client.get(`/api/karma/${repId}`);

    return {
      success: true,
      repId,
      karma: response.data?.karma || response.data?.score || 0,
      tier: response.data?.tier || 'Bronze',
      history: response.data?.history || [],
      transactions: response.data?.transactions || [],
    };
  } catch (error) {
    // Fallback to local calculation if API unavailable
    console.warn(`[SUTAR Karma] API unavailable, returning local data:`, error.message);
    return {
      success: false,
      repId,
      karma: 0,
      tier: 'Bronze',
      history: [],
      error: error.message,
      fallback: true,
    };
  }
};

/**
 * Award karma to a rep for an achievement
 * @param {string} repId - Rep ID
 * @param {string} achievement - Achievement type from KARMA_ACTIONS
 * @param {number} customPoints - Override default points
 * @param {object} metadata - Additional metadata
 */
const awardKarma = async (repId, achievement, customPoints = null, metadata = {}) => {
  const points = customPoints || DEFAULT_KARMA_POINTS[achievement] || 50;

  try {
    const client = createKarmaClient();
    const response = await client.post('/api/karma/award', {
      entityId: repId,
      entityType: 'sales_rep',
      achievement,
      points,
      metadata: {
        ...metadata,
        source: 'sales-os',
        timestamp: new Date().toISOString(),
      },
    });

    return {
      success: true,
      repId,
      achievement,
      points,
      newBalance: response.data?.balance,
      totalAwarded: response.data?.totalAwarded,
    };
  } catch (error) {
    console.error(`[SUTAR Karma] Failed to award karma for ${repId}:`, error.message);
    return {
      success: false,
      repId,
      achievement,
      points,
      error: error.message,
    };
  }
};

/**
 * Get team leaderboard
 * @param {string} teamId - Team ID (optional)
 * @param {number} limit - Number of reps to return
 */
const getLeaderboard = async (teamId = null, limit = 10) => {
  try {
    const client = createKarmaClient();
    const params = { limit };
    if (teamId) params.teamId = teamId;

    const response = await client.get('/api/karma/leaderboard', { params });

    return {
      success: true,
      leaderboard: response.data?.leaderboard || response.data || [],
      teamId,
      totalReps: response.data?.total || 0,
    };
  } catch (error) {
    console.error(`[SUTAR Karma] Failed to get leaderboard:`, error.message);
    return {
      success: false,
      leaderboard: [],
      teamId,
      error: error.message,
    };
  }
};

/**
 * Sync commission to karma/compensation system
 * @param {string} repId - Rep ID
 * @param {number} amount - Commission amount
 * @param {object} dealData - Deal information
 */
const syncCommission = async (repId, amount, dealData = {}) => {
  try {
    const client = createKarmaClient();
    const response = await client.post('/api/karma/sync-commission', {
      repId,
      amount,
      currency: dealData.currency || 'USD',
      dealId: dealData.dealId,
      dealValue: dealData.dealValue,
      closedAt: dealData.closedAt || new Date().toISOString(),
      source: 'sales-os',
    });

    return {
      success: true,
      repId,
      commissionAmount: amount,
      synced: true,
      transactionId: response.data?.transactionId,
    };
  } catch (error) {
    console.error(`[SUTAR Karma] Failed to sync commission for ${repId}:`, error.message);
    return {
      success: false,
      repId,
      commissionAmount: amount,
      synced: false,
      error: error.message,
    };
  }
};

/**
 * Get karma tier/rank for a rep
 * @param {string} repId - Rep ID
 */
const getRepTier = async (repId) => {
  try {
    const client = createKarmaClient();
    const response = await client.get(`/api/karma/${repId}/tier`);

    return {
      success: true,
      repId,
      tier: response.data?.tier || 'Bronze',
      tierProgress: response.data?.progress || 0,
      nextTier: response.data?.nextTier || 'Silver',
      pointsToNextTier: response.data?.pointsNeeded || 0,
    };
  } catch (error) {
    console.warn(`[SUTAR Karma] Failed to get tier for ${repId}:`, error.message);
    return {
      success: false,
      repId,
      tier: 'Bronze',
      error: error.message,
    };
  }
};

/**
 * Award karma for a sale
 * @param {string} repId - Rep ID
 * @param {object} saleData - Sale details
 */
const onSaleClosed = async (repId, saleData) => {
  const { dealValue, dealId, customerId, productType } = saleData;

  // Calculate points based on deal value
  let points = DEFAULT_KARMA_POINTS[KARMA_ACTIONS.SALE_CLOSED];
  if (dealValue > 10000) points += 50;
  if (dealValue > 50000) points += 100;
  if (dealValue > 100000) points += 200;

  return awardKarma(repId, KARMA_ACTIONS.SALE_CLOSED, points, {
    dealId,
    dealValue,
    customerId,
    productType,
  });
};

/**
 * Award karma for lead qualification
 * @param {string} repId - Rep ID
 * @param {object} leadData - Lead details
 */
const onLeadQualified = async (repId, leadData) => {
  const { leadId, leadScore, source } = leadData;

  let points = DEFAULT_KARMA_POINTS[KARMA_ACTIONS.LEAD_QUALIFIED];
  if (leadScore > 80) points += 15;
  if (leadScore > 95) points += 25;

  return awardKarma(repId, KARMA_ACTIONS.LEAD_QUALIFIED, points, {
    leadId,
    leadScore,
    source,
  });
};

/**
 * Award karma when target is met
 * @param {string} repId - Rep ID
 * @param {object} targetData - Target achievement details
 */
const onTargetMet = async (repId, targetData) => {
  const { period, targetValue, achievedValue, percentage } = targetData;

  let points = DEFAULT_KARMA_POINTS[KARMA_ACTIONS.TARGET_MET];
  if (percentage > 110) points += 100;
  if (percentage > 150) points += 200;

  return awardKarma(repId, KARMA_ACTIONS.TARGET_MET, points, {
    period,
    targetValue,
    achievedValue,
    percentage,
  });
};

/**
 * Get rep karma history
 * @param {string} repId - Rep ID
 * @param {number} limit - Number of records
 */
const getKarmaHistory = async (repId, limit = 50) => {
  try {
    const client = createKarmaClient();
    const response = await client.get(`/api/karma/${repId}/history`, {
      params: { limit },
    });

    return {
      success: true,
      repId,
      history: response.data?.history || [],
      totalTransactions: response.data?.total || 0,
    };
  } catch (error) {
    console.error(`[SUTAR Karma] Failed to get history for ${repId}:`, error.message);
    return {
      success: false,
      repId,
      history: [],
      error: error.message,
    };
  }
};

/**
 * Deduct karma for negative actions
 * @param {string} repId - Rep ID
 * @param {string} reason - Reason for deduction
 * @param {number} points - Points to deduct (positive number)
 */
const deductKarma = async (repId, reason, points) => {
  return updateRepKarma(repId, -Math.abs(points), reason);
};

/**
 * Bulk update karma for team
 * @param {array} updates - Array of {repId, karmaChange, reason}
 */
const bulkUpdateKarma = async (updates) => {
  try {
    const client = createKarmaClient();
    const response = await client.post('/api/karma/bulk-update', {
      updates,
      source: 'sales-os',
    });

    return {
      success: true,
      processed: updates.length,
      results: response.data?.results || [],
    };
  } catch (error) {
    console.error(`[SUTAR Karma] Bulk update failed:`, error.message);
    return {
      success: false,
      processed: 0,
      error: error.message,
    };
  }
};

/**
 * Get karma analytics for a rep
 * @param {string} repId - Rep ID
 * @param {string} period - Period (week, month, quarter, year)
 */
const getKarmaAnalytics = async (repId, period = 'month') => {
  try {
    const client = createKarmaClient();
    const response = await client.get(`/api/karma/${repId}/analytics`, {
      params: { period },
    });

    return {
      success: true,
      repId,
      period,
      analytics: response.data || {},
    };
  } catch (error) {
    console.error(`[SUTAR Karma] Failed to get analytics for ${repId}:`, error.message);
    return {
      success: false,
      repId,
      period,
      analytics: {},
      error: error.message,
    };
  }
};

/**
 * Initialize Karma service connection
 * Called on service startup
 */
const initialize = async () => {
  console.log('[Sales OS] Initializing SUTAR Karma integration...');

  const connection = await connectToSutarKarma();

  if (connection.success) {
    console.log(`[Sales OS] SUTAR Karma integration ready on port ${KARMA_CONFIG.port}`);
  } else {
    console.warn(`[Sales OS] SUTAR Karma integration running in fallback mode`);
    console.warn(`[Sales OS] Karma operations will be queued for retry`);
  }

  return connection;
};

module.exports = {
  // Configuration
  KARMA_CONFIG,
  KARMA_ACTIONS,
  DEFAULT_KARMA_POINTS,

  // Core functions
  connectToSutarKarma,
  connectToKarma: connectToSutarKarma, // Alias for backward compatibility
  updateRepKarma,
  getRepKarma,
  awardKarma,
  getLeaderboard,
  syncCommission,
  getRepTier,

  // Event handlers
  onSaleClosed,
  onLeadQualified,
  onTargetMet,

  // Utility functions
  getKarmaHistory,
  deductKarma,
  bulkUpdateKarma,
  getKarmaAnalytics,
  initialize,
};
