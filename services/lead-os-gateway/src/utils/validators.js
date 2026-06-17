/**
 * Validators for LeadOS Gateway API requests
 */

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate domain format
 * @param {string} domain
 * @returns {boolean}
 */
export function isValidDomain(domain) {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

/**
 * Validate lead data
 * @param {Object} lead
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateLead(lead) {
  const errors = [];

  if (!lead.email && !lead.phone) {
    errors.push('Either email or phone is required');
  }

  if (lead.email && !isValidEmail(lead.email)) {
    errors.push('Invalid email format');
  }

  if (lead.phone && !isValidPhone(lead.phone)) {
    errors.push('Invalid phone format');
  }

  if (lead.companyDomain && !isValidDomain(lead.companyDomain)) {
    errors.push('Invalid domain format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate enrichment request
 * @param {Object} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateEnrichment(data) {
  const errors = [];

  if (!data.email && !data.domain) {
    errors.push('Either email or domain is required');
  }

  if (data.email && !isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }

  if (data.domain && !isValidDomain(data.domain)) {
    errors.push('Invalid domain format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate score request
 * @param {Object} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateScoreRequest(data) {
  const errors = [];

  if (!data.leadId && !data.email && !data.company) {
    errors.push('At least one of leadId, email, or company is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate outreach request
 * @param {Object} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateOutreachRequest(data) {
  const errors = [];

  if (!data.leadId) {
    errors.push('Lead ID is required');
  }

  if (data.channels && !Array.isArray(data.channels)) {
    errors.push('Channels must be an array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate discovery request
 * @param {Object} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateDiscoveryRequest(data) {
  const errors = [];

  if (!data.query && !data.location) {
    errors.push('Query or location is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
