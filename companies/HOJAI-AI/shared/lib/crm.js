/**
 * REZ CRM Connector - Connect Industry OS to REZ CRM Hub
 *
 * Usage:
 *   import { crm, createCRMClient } from '../shared/lib/crm';
 *
 *   // In routes
 *   const customer = await crm.contacts.create({ name: 'John', email: 'john@example.com' });
 *   const deals = await crm.deals.list({ status: 'open' });
 */

const CRM_URL = process.env.CRM_HUB_URL || process.env.REZ_CRM_HUB_URL || 'http://localhost:4056';
const CRM_TOKEN = process.env.CRM_HUB_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '';

/**
 * Make authenticated request to REZ CRM Hub
 */
async function crmRequest(path, options = {}) {
  const url = `${CRM_URL}/api${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(CRM_TOKEN && { 'Authorization': `Bearer ${CRM_TOKEN}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `CRM request failed: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`CRM Error [${path}]:`, error.message);
    throw error;
  }
}

/**
 * CRM Contacts API
 */
const contacts = {
  /**
   * List contacts
   */
  list: async (query = {}) => {
    const params = new URLSearchParams({
      industry: query.industry || 'restaurant',
      ...(query.search && { search: query.search }),
      ...(query.limit && { limit: query.limit.toString() }),
    });
    return crmRequest(`/contacts?${params}`);
  },

  /**
   * Get single contact
   */
  get: async (id) => {
    return crmRequest(`/contacts/${id}`);
  },

  /**
   * Create contact (customer)
   */
  create: async (data) => {
    return crmRequest('/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update contact
   */
  update: async (id, data) => {
    return crmRequest(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete contact
   */
  delete: async (id) => {
    return crmRequest(`/contacts/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Search contacts
   */
  search: async (term) => {
    return crmRequest(`/contacts?search=${encodeURIComponent(term)}`);
  },
};

/**
 * CRM Deals API
 */
const deals = {
  /**
   * List deals
   */
  list: async (query = {}) => {
    const params = new URLSearchParams({
      industry: query.industry || 'restaurant',
      ...(query.status && { status: query.status }),
      ...(query.limit && { limit: query.limit.toString() }),
    });
    return crmRequest(`/deals?${params}`);
  },

  /**
   * Get single deal
   */
  get: async (id) => {
    return crmRequest(`/deals/${id}`);
  },

  /**
   * Create deal
   */
  create: async (data) => {
    return crmRequest('/deals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update deal
   */
  update: async (id, data) => {
    return crmRequest(`/deals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete deal
   */
  delete: async (id) => {
    return crmRequest(`/deals/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get deal stats
   */
  stats: async () => {
    return crmRequest('/deals/stats');
  },

  /**
   * Get deals by contact
   */
  byContact: async (contactId) => {
    return crmRequest(`/deals/contact/${contactId}`);
  },
};

/**
 * CRM Health check
 */
async function healthCheck() {
  try {
    const response = await fetch(`${CRM_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Create industry-specific CRM client
 */
function createIndustryCRM(industry) {
  return {
    contacts: {
      list: async (query = {}) => contacts.list({ ...query, industry }),
      get: contacts.get,
      create: async (data) => contacts.create({ ...data, industry }),
      update: contacts.update,
      delete: contacts.delete,
      search: contacts.search,
    },
    deals: {
      list: async (query = {}) => deals.list({ ...query, industry }),
      get: deals.get,
      create: async (data) => deals.create({ ...data, industry }),
      update: deals.update,
      delete: deals.delete,
      stats: deals.stats,
      byContact: deals.byContact,
    },
  };
}

export const crm = { contacts, deals, healthCheck };
export { createIndustryCRM };
export default { contacts, deals, healthCheck, createIndustryCRM };
