/**
 * Scoring Service - Lead scoring from multiple signals
 * Connects to: Atlas GTM (4004), HOJAI Lead (4752)
 */

import axios from 'axios';
import logger from '../utils/logger.js';

const ATLAS_GTM_URL = process.env.ATLAS_GTM_URL || 'http://localhost:4004';
const HOJAI_LEAD_URL = process.env.HOJAI_LEAD_URL || 'http://localhost:4752';
const LEAD_TWIN_URL = process.env.LEAD_TWIN_URL || 'http://localhost:4894';
const CRM_ENGINE_URL = process.env.CRM_ENGINE_URL || 'http://localhost:4888';

/**
 * Get engagement data from CRM
 * @param {string} leadId - Lead ID
 * @returns {Promise<Object>}
 */
async function getEngagementData(leadId) {
  try {
    const response = await axios.get(`${CRM_ENGINE_URL}/api/contacts/${leadId}/engagement`, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    logger.warn('CRM engagement data unavailable', { leadId });
    return {
      emails: 0,
      calls: 0,
      meetings: 0,
      websiteVisits: 0,
      lastActivity: null
    };
  }
}

/**
 * Get tier based on score
 * @param {number} score - Lead score (0-100)
 * @returns {string}
 */
function getTier(score) {
  if (score >= 80) return 'hot';
  if (score >= 50) return 'warm';
  return 'cold';
}

/**
 * Calculate score breakdown
 * @param {Object} leadData - Lead data
 * @param {Object} engagement - Engagement data
 * @returns {Object}
 */
function calculateScoreBreakdown(leadData, engagement) {
  const breakdown = {
    demographic: 0,
    behavioral: 0,
    firmographic: 0,
    engagement: 0
  };

  // Demographic scoring (title/role)
  const seniorTitles = ['ceo', 'cto', 'cfo', 'coo', 'chief', 'founder', 'director', 'vp', 'head'];
  const titleLower = (leadData.title || '').toLowerCase();

  if (seniorTitles.some(t => titleLower.includes(t))) {
    breakdown.demographic = 30;
  } else if (titleLower.includes('manager') || titleLower.includes('lead')) {
    breakdown.demographic = 20;
  } else if (titleLower.includes('specialist') || titleLower.includes('analyst')) {
    breakdown.demographic = 10;
  } else {
    breakdown.demographic = 5;
  }

  // Firmographic scoring (company size, industry)
  const employeeCount = leadData.employeeCount || leadData.company?.employees || 0;
  if (employeeCount >= 500) {
    breakdown.firmographic = 25;
  } else if (employeeCount >= 100) {
    breakdown.firmographic = 20;
  } else if (employeeCount >= 50) {
    breakdown.firmographic = 15;
  } else {
    breakdown.firmographic = 10;
  }

  // Behavioral scoring (email, phone, linkedin)
  if (leadData.email) breakdown.behavioral += 10;
  if (leadData.phone) breakdown.behavioral += 10;
  if (leadData.linkedinUrl) breakdown.behavioral += 10;
  if (leadData.website) breakdown.behavioral += 5;

  // Engagement scoring
  breakdown.engagement = Math.min(25,
    (engagement.emails * 2) +
    (engagement.calls * 5) +
    (engagement.meetings * 10) +
    (engagement.websiteVisits * 1)
  );

  return breakdown;
}

/**
 * Get reasons for score
 * @param {Object} breakdown - Score breakdown
 * @returns {Array<string>}
 */
function getScoreReasons(breakdown) {
  const reasons = [];

  if (breakdown.demographic >= 25) {
    reasons.push('C-level or executive decision maker');
  } else if (breakdown.demographic >= 15) {
    reasons.push('Manager or team lead level');
  } else {
    reasons.push('Individual contributor or entry level');
  }

  if (breakdown.firmographic >= 20) {
    reasons.push('Large enterprise company (500+ employees)');
  } else if (breakdown.firmographic >= 15) {
    reasons.push('Mid-market company (100-500 employees)');
  } else {
    reasons.push('Small business or startup');
  }

  if (breakdown.behavioral >= 25) {
    reasons.push('Complete contact information with LinkedIn');
  } else if (breakdown.behavioral >= 15) {
    reasons.push('Has email and phone contact info');
  } else {
    reasons.push('Limited contact information available');
  }

  if (breakdown.engagement >= 15) {
    reasons.push('High engagement (multiple touchpoints)');
  } else if (breakdown.engagement >= 5) {
    reasons.push('Some engagement activity detected');
  } else {
    reasons.push('No recent engagement activity');
  }

  return reasons;
}

/**
 * Score a single lead
 * @param {Object} leadData - Lead data
 * @returns {Promise<Object>}
 */
async function scoreLead(leadData) {
  // Get engagement data from CRM
  const engagement = await getEngagementData(leadData.id);

  // Try Atlas GTM scoring first
  try {
    const response = await axios.post(`${ATLAS_GTM_URL}/score`,
      { ...leadData, engagement },
      { timeout: 10000 }
    );

    return {
      leadId: leadData.id,
      score: response.data.overallScore,
      tier: getTier(response.data.overallScore),
      breakdown: response.data.scores,
      factors: response.data.reasons,
      engagement,
      source: 'atlas_gtm'
    };
  } catch (error) {
    logger.warn('Atlas GTM scoring unavailable, using local scoring', { leadId: leadData.id });
  }

  // Fall back to local scoring
  const breakdown = calculateScoreBreakdown(leadData, engagement);
  const overallScore = breakdown.demographic + breakdown.firmographic + breakdown.behavioral + breakdown.engagement;
  const reasons = getScoreReasons(breakdown);

  return {
    leadId: leadData.id,
    score: overallScore,
    tier: getTier(overallScore),
    breakdown,
    factors: reasons,
    engagement,
    source: 'local',
    note: 'Local scoring - Atlas GTM unavailable'
  };
}

/**
 * Score multiple leads in bulk
 * @param {Array} leads - Array of lead data
 * @returns {Promise<Object>}
 */
async function bulkScore(leads) {
  const results = [];

  for (const lead of leads) {
    const scoredLead = await scoreLead(lead);
    results.push(scoredLead);
  }

  // Calculate distribution
  const distribution = {
    hot: results.filter(r => r.tier === 'hot').length,
    warm: results.filter(r => r.tier === 'warm').length,
    cold: results.filter(r => r.tier === 'cold').length
  };

  return {
    total: leads.length,
    scored: results.length,
    distribution,
    averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
    results
  };
}

/**
 * Get score for a specific lead
 * @param {string} leadId - Lead ID
 * @returns {Promise<Object>}
 */
async function getLeadScore(leadId) {
  try {
    // Try to get from Lead Twin
    const response = await axios.get(`${LEAD_TWIN_URL}/leads/${leadId}`, {
      timeout: 5000
    });

    if (response.data.score !== undefined) {
      return {
        leadId,
        score: response.data.score,
        tier: getTier(response.data.score),
        breakdown: response.data.scoreBreakdown,
        source: 'lead_twin'
      };
    }

    // Re-score if no score exists
    return await scoreLead(response.data);
  } catch (error) {
    logger.warn('Could not get lead from Lead Twin', { leadId });

    // Return mock score
    const mockScore = Math.floor(Math.random() * 100);
    return {
      leadId,
      score: mockScore,
      tier: getTier(mockScore),
      breakdown: {
        demographic: Math.floor(mockScore * 0.3),
        firmographic: Math.floor(mockScore * 0.25),
        behavioral: Math.floor(mockScore * 0.25),
        engagement: Math.floor(mockScore * 0.2)
      },
      factors: ['Lead data requires enrichment for accurate scoring'],
      source: 'mock'
    };
  }
}

export {
  scoreLead,
  bulkScore,
  getLeadScore,
  getTier,
  getEngagementData,
  calculateScoreBreakdown
};
