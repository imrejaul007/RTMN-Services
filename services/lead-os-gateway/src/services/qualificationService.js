/**
 * Qualification Service - Lead qualification and classification
 * Classifies leads as Hot/Warm/Cold, spam, duplicate, competitor, customer, supplier
 */

import axios from 'axios';
import logger from '../utils/logger.js';
import { getTier } from './scoringService.js';

const HOJAI_WEB_INTEL_URL = process.env.HOJAI_WEB_INTEL_URL || 'http://localhost:4595';

// Known competitor domains
const KNOWN_COMPETITORS = [
  'salesforce.com', 'hubspot.com', 'pipedrive.com', 'zoho.com',
  'dynamics.microsoft.com', 'oracle.com', 'sap.com'
];

// Known customer domains (mock)
const KNOWN_CUSTOMERS = [
  'dubaihealth.ae', 'emaar.ae', 'enoc.com'
];

/**
 * Lead type classifications
 */
const LEAD_TYPES = {
  hot: {
    label: 'Hot Lead',
    description: 'Ready to buy, high intent, executive level',
    color: '#e53e3e'
  },
  warm: {
    label: 'Warm Lead',
    description: 'Showing interest, needs nurturing',
    color: '#dd6b20'
  },
  cold: {
    label: 'Cold Lead',
    description: 'Early stage, requires education',
    color: '#3182ce'
  },
  spam: {
    label: 'Spam/Invalid',
    description: 'Fake, spam, or invalid contact',
    color: '#718096'
  },
  duplicate: {
    label: 'Duplicate',
    description: 'Already exists in database',
    color: '#805ad5'
  },
  competitor: {
    label: 'Competitor',
    description: 'Works at competitor company',
    color: '#d53f8c'
  },
  customer: {
    label: 'Existing Customer',
    description: 'Already a customer',
    color: '#38a169'
  },
  supplier: {
    label: 'Supplier',
    description: 'Vendor or supplier company',
    color: '#00b5d8'
  }
};

/**
 * Run validation checks on lead
 * @param {Object} lead - Lead data
 * @returns {Promise<Object>}
 */
async function runChecks(lead) {
  const checks = {
    spam: { passed: true, score: 0, details: null },
    duplicate: { passed: true, score: 0, details: null },
    validity: { passed: true, score: 100, details: null }
  };

  // Spam check - simple heuristics
  const spamIndicators = [
    /\b(viagra|cialis|casino|lottery|winner|click here|act now)\b/i,
    /^[a-z0-9]{1,5}@[a-z]{2,}$/i,
    lead.email?.includes('test') && lead.email.startsWith('test'),
    lead.firstName === lead.lastName
  ];

  const spamScore = spamIndicators.filter(Boolean).length / spamIndicators.length;

  if (spamScore > 0.5) {
    checks.spam.passed = false;
    checks.spam.score = spamScore;
    checks.spam.details = 'Multiple spam indicators detected';
  } else {
    checks.spam.score = spamScore;
  }

  // Duplicate check - try CRM
  try {
    const response = await axios.post(`${HOJAI_WEB_INTEL_URL}/api/check/duplicate`,
      { email: lead.email },
      { timeout: 5000 }
    );

    if (response.data.isDuplicate) {
      checks.duplicate.passed = false;
      checks.duplicate.score = 1;
      checks.duplicate.details = response.data.details;
    }
  } catch (error) {
    // Duplicate check service unavailable, skip
    logger.debug('Duplicate check unavailable');
  }

  // Validity check
  if (!lead.email && !lead.phone) {
    checks.validity.passed = false;
    checks.validity.score = 0;
    checks.validity.details = 'No contact information provided';
  } else if (!lead.email) {
    checks.validity.score = 50;
    checks.validity.details = 'No email provided';
  } else if (!lead.phone) {
    checks.validity.score = 80;
    checks.validity.details = 'No phone provided';
  }

  return checks;
}

/**
 * Classify lead type
 * @param {Object} lead - Lead data
 * @returns {string}
 */
function classifyLead(lead) {
  // Check spam first
  if (lead.spamScore > 0.7 || lead.isSpam) {
    return 'spam';
  }

  // Check existing customer
  if (lead.isExistingCustomer || KNOWN_CUSTOMERS.some(c => lead.companyDomain?.includes(c))) {
    return 'customer';
  }

  // Check competitor
  if (lead.isCompetitor || KNOWN_COMPETITORS.some(c => lead.companyDomain?.includes(c))) {
    return 'competitor';
  }

  // Check supplier indicators
  if (lead.isSupplier || /\b(vendor|supplier|reseller|partner)\b/i.test(lead.title || '')) {
    return 'supplier';
  }

  // Use score-based classification
  const score = lead.score || lead.leadScore || 50;
  return getTier(score);
}

/**
 * Get reasons for classification
 * @param {string} type - Lead type
 * @param {Object} checks - Validation checks
 * @returns {Array<string>}
 */
function getReasons(type, checks) {
  const reasons = [];

  switch (type) {
    case 'hot':
      reasons.push('High lead score (80+)');
      reasons.push('Executive-level contact');
      reasons.push('Strong company profile');
      break;
    case 'warm':
      reasons.push('Moderate lead score (50-79)');
      reasons.push('Good engagement signals');
      break;
    case 'cold':
      reasons.push('Lower lead score');
      reasons.push('Limited engagement');
      reasons.push('May need more nurturing');
      break;
    case 'spam':
      reasons.push('Spam indicators detected');
      if (checks?.spam?.details) reasons.push(checks.spam.details);
      break;
    case 'duplicate':
      reasons.push('Contact already exists in database');
      if (checks?.duplicate?.details) reasons.push(checks.duplicate.details);
      break;
    case 'competitor':
      reasons.push('Works at competitor company');
      break;
    case 'customer':
      reasons.push('Already an existing customer');
      break;
    case 'supplier':
      reasons.push('Identified as vendor/supplier');
      break;
  }

  return reasons;
}

/**
 * Get recommendations based on lead type
 * @param {string} type - Lead type
 * @returns {Array<Object>}
 */
function getRecommendations(type) {
  const recommendations = [];

  switch (type) {
    case 'hot':
      recommendations.push({
        action: 'Immediate outreach',
        priority: 'high',
        channel: 'phone',
        message: 'Schedule immediate demo call'
      });
      recommendations.push({
        action: 'Escalate to sales',
        priority: 'high',
        message: 'Notify account executive'
      });
      break;
    case 'warm':
      recommendations.push({
        action: 'Schedule follow-up',
        priority: 'medium',
        channel: 'email',
        message: 'Send personalized follow-up sequence'
      });
      recommendations.push({
        action: 'Share case study',
        priority: 'medium',
        message: 'Send relevant industry case study'
      });
      break;
    case 'cold':
      recommendations.push({
        action: 'Add to nurture sequence',
        priority: 'low',
        channel: 'email',
        message: 'Long-term nurturing campaign'
      });
      recommendations.push({
        action: 'Social engagement',
        priority: 'low',
        channel: 'linkedin',
        message: 'Engage on LinkedIn posts'
      });
      break;
    case 'spam':
      recommendations.push({
        action: 'Mark as spam',
        priority: 'high',
        message: 'Block and mark as spam'
      });
      break;
    case 'duplicate':
      recommendations.push({
        action: 'Merge records',
        priority: 'medium',
        message: 'Combine with existing lead'
      });
      break;
    case 'competitor':
      recommendations.push({
        action: 'Track for intel',
        priority: 'low',
        message: 'Add to competitive intelligence list'
      });
      break;
    case 'customer':
      recommendations.push({
        action: 'Cross-sell/Upsell',
        priority: 'medium',
        message: 'Connect with customer success team'
      });
      break;
    case 'supplier':
      recommendations.push({
        action: 'Procurement review',
        priority: 'medium',
        message: 'Send to procurement team'
      });
      break;
  }

  return recommendations;
}

/**
 * Qualify a single lead
 * @param {Object} leadData - Lead data
 * @returns {Promise<Object>}
 */
async function qualifyLead(leadData) {
  // Run validation checks
  const checks = await runChecks(leadData);

  // Classify lead type
  const type = classifyLead(leadData);

  // Determine if qualified
  const qualified = !['spam', 'duplicate', 'competitor'].includes(type) && checks.validity.passed;

  // Get reasons and recommendations
  const reasons = getReasons(type, checks);
  const recommendations = getRecommendations(type);

  // Calculate confidence
  const confidence = checks.spam.passed && checks.validity.passed ? 0.85 : 0.6;

  return {
    leadId: leadData.id,
    qualified,
    classification: {
      type,
      label: LEAD_TYPES[type].label,
      description: LEAD_TYPES[type].description,
      confidence,
      reasons
    },
    checks,
    recommendations,
    scoredAt: new Date().toISOString()
  };
}

/**
 * Classify multiple leads
 * @param {Array} leads - Array of lead data
 * @returns {Promise<Object>}
 */
async function classifyLeads(leads) {
  const results = [];

  for (const lead of leads) {
    const qualification = await qualifyLead(lead);
    results.push(qualification);
  }

  // Calculate distribution
  const distribution = {};
  for (const type of Object.keys(LEAD_TYPES)) {
    distribution[type] = results.filter(r => r.classification.type === type).length;
  }

  return {
    total: leads.length,
    qualified: results.filter(r => r.qualified).length,
    unqualified: results.filter(r => !r.qualified).length,
    distribution,
    results
  };
}

/**
 * Get all lead type definitions
 * @returns {Object}
 */
function getLeadTypes() {
  return LEAD_TYPES;
}

export {
  qualifyLead,
  classifyLeads,
  getLeadTypes,
  runChecks,
  classifyLead,
  getReasons,
  getRecommendations,
  LEAD_TYPES
};
