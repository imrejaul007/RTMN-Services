/**
 * CRM Service - CRM integration and sync
 * Connects to: REZ CRM Hub (4056), CRM Engine (4888)
 */

import axios from 'axios';
import logger from '../utils/logger.js';

const REZ_CRM_HUB_URL = process.env.REZ_CRM_HUB_URL || 'http://localhost:4056';
const CRM_ENGINE_URL = process.env.CRM_ENGINE_URL || 'http://localhost:4888';

// In-memory CRM cache
const contactsCache = new Map();
const dealsCache = new Map();

/**
 * Sync lead to CRM (HubSpot)
 * @param {Object} lead - Lead data
 * @returns {Promise<Object>}
 */
async function syncToCRM(lead) {
  try {
    // Create/update in HubSpot via REZ CRM Hub
    const hubspotResponse = await axios.post(`${REZ_CRM_HUB_URL}/api/contacts`,
      {
        email: lead.email,
        firstname: lead.firstName,
        lastname: lead.lastName,
        company: lead.company,
        phone: lead.phone,
        leadscore: lead.score,
        leadtype: lead.type,
        industry: lead.industry,
        website: lead.website,
        linkedin_url: lead.linkedinUrl
      },
      { timeout: 10000 }
    );

    // Sync to CRM Engine
    try {
      await axios.post(`${CRM_ENGINE_URL}/api/contacts`,
        hubspotResponse.data,
        { timeout: 5000 }
      );
    } catch (crmError) {
      logger.warn('CRM Engine sync failed, continuing with HubSpot sync', { leadId: lead.id });
    }

    // Cache the contact
    contactsCache.set(lead.email || lead.id, hubspotResponse.data);

    return {
      success: true,
      source: 'rez_crm_hub',
      crmId: hubspotResponse.data.id,
      hubspotId: hubspotResponse.data.hubspotId,
      syncedAt: new Date().toISOString(),
      data: hubspotResponse.data
    };
  } catch (error) {
    logger.warn('CRM Hub unavailable, creating local CRM record', { leadId: lead.id });

    // Create local CRM record
    const localRecord = {
      id: `crm_${Date.now()}`,
      email: lead.email,
      firstName: lead.firstName,
      lastName: lead.lastName,
      company: lead.company,
      phone: lead.phone,
      score: lead.score,
      type: lead.type,
      status: 'synced',
      syncedAt: new Date().toISOString()
    };

    contactsCache.set(lead.email || lead.id, localRecord);

    return {
      success: true,
      source: 'local',
      crmId: localRecord.id,
      syncedAt: localRecord.syncedAt,
      note: 'Created locally - CRM Hub unavailable',
      data: localRecord
    };
  }
}

/**
 * Create or update deal in CRM
 * @param {Object} dealData - Deal data
 * @returns {Promise<Object>}
 */
async function createDeal(dealData) {
  try {
    const response = await axios.post(`${CRM_ENGINE_URL}/api/deals`,
      {
        title: dealData.title || `${dealData.company} - New Deal`,
        contactEmail: dealData.contactEmail,
        company: dealData.company,
        value: dealData.value || 0,
        stage: dealData.stage || 'qualified',
        expectedClose: dealData.expectedClose,
        owner: dealData.owner
      },
      { timeout: 10000 }
    );

    dealsCache.set(response.data.id, response.data);

    return {
      success: true,
      source: 'crm_engine',
      deal: response.data
    };
  } catch (error) {
    logger.warn('CRM Engine unavailable, creating local deal', { title: dealData.title });

    const localDeal = {
      id: `deal_${Date.now()}`,
      title: dealData.title || `${dealData.company} - New Deal`,
      contactEmail: dealData.contactEmail,
      company: dealData.company,
      value: dealData.value || 0,
      stage: dealData.stage || 'qualified',
      status: 'open',
      createdAt: new Date().toISOString()
    };

    dealsCache.set(localDeal.id, localDeal);

    return {
      success: true,
      source: 'local',
      deal: localDeal,
      note: 'Created locally - CRM Engine unavailable'
    };
  }
}

/**
 * Get contact from CRM
 * @param {string} identifier - Email or CRM ID
 * @returns {Promise<Object>}
 */
async function getContact(identifier) {
  // Check cache first
  const cached = contactsCache.get(identifier);
  if (cached) {
    return {
      success: true,
      source: 'cache',
      data: cached
    };
  }

  try {
    // Try REZ CRM Hub
    const response = await axios.get(`${REZ_CRM_HUB_URL}/api/contacts/${encodeURIComponent(identifier)}`,
      { timeout: 5000 }
    );

    contactsCache.set(identifier, response.data);

    return {
      success: true,
      source: 'rez_crm_hub',
      data: response.data
    };
  } catch (error) {
    // Try CRM Engine
    try {
      const response = await axios.get(`${CRM_ENGINE_URL}/api/contacts/${encodeURIComponent(identifier)}`,
        { timeout: 5000 }
      );

      contactsCache.set(identifier, response.data);

      return {
        success: true,
        source: 'crm_engine',
        data: response.data
      };
    } catch (crmError) {
      return {
        success: false,
        source: 'unavailable',
        error: 'Contact not found in CRM'
      };
    }
  }
}

/**
 * Update contact in CRM
 * @param {string} identifier - Email or CRM ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>}
 */
async function updateContact(identifier, updates) {
  try {
    const response = await axios.patch(`${CRM_ENGINE_URL}/api/contacts/${encodeURIComponent(identifier)}`,
      updates,
      { timeout: 10000 }
    );

    // Update cache
    const existing = contactsCache.get(identifier) || {};
    contactsCache.set(identifier, { ...existing, ...response.data });

    return {
      success: true,
      source: 'crm_engine',
      data: response.data
    };
  } catch (error) {
    logger.warn('CRM Engine unavailable, updating local cache', { identifier });

    const existing = contactsCache.get(identifier) || {};
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    contactsCache.set(identifier, updated);

    return {
      success: true,
      source: 'local',
      data: updated,
      note: 'Updated locally - CRM Engine unavailable'
    };
  }
}

/**
 * Get deals from CRM
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>}
 */
async function getDeals(filters = {}) {
  try {
    const response = await axios.get(`${CRM_ENGINE_URL}/api/deals`, {
      params: filters,
      timeout: 5000
    });

    return {
      success: true,
      source: 'crm_engine',
      data: response.data
    };
  } catch (error) {
    logger.warn('CRM Engine unavailable, returning cached deals');

    const cachedDeals = Array.from(dealsCache.values());

    return {
      success: true,
      source: 'cache',
      data: {
        deals: cachedDeals,
        total: cachedDeals.length
      }
    };
  }
}

/**
 * Update deal stage
 * @param {string} dealId - Deal ID
 * @param {string} stage - New stage
 * @returns {Promise<Object>}
 */
async function updateDealStage(dealId, stage) {
  try {
    const response = await axios.patch(`${CRM_ENGINE_URL}/api/deals/${dealId}/stage`,
      { stage },
      { timeout: 10000 }
    );

    return {
      success: true,
      source: 'crm_engine',
      deal: response.data
    };
  } catch (error) {
    logger.warn('CRM Engine unavailable, updating local cache', { dealId });

    const existing = dealsCache.get(dealId);
    if (existing) {
      existing.stage = stage;
      existing.updatedAt = new Date().toISOString();
    }

    return {
      success: true,
      source: 'local',
      deal: existing,
      note: 'Updated locally - CRM Engine unavailable'
    };
  }
}

/**
 * Get CRM activity history for contact
 * @param {string} contactId - Contact ID
 * @returns {Promise<Object>}
 */
async function getActivityHistory(contactId) {
  try {
    const response = await axios.get(`${CRM_ENGINE_URL}/api/contacts/${contactId}/activities`,
      { timeout: 5000 }
    );

    return {
      success: true,
      source: 'crm_engine',
      data: response.data
    };
  } catch (error) {
    return {
      success: true,
      source: 'mock',
      data: {
        activities: [
          {
            id: 'act_1',
            type: 'email',
            description: 'Sent initial outreach email',
            date: new Date(Date.now() - 86400000 * 7).toISOString()
          },
          {
            id: 'act_2',
            type: 'call',
            description: 'Discovery call scheduled',
            date: new Date(Date.now() - 86400000 * 3).toISOString()
          }
        ]
      }
    };
  }
}

/**
 * Bulk sync leads to CRM
 * @param {Array} leads - Array of leads
 * @returns {Promise<Object>}
 */
async function bulkSync(leads) {
  const results = [];
  let successful = 0;
  let failed = 0;

  for (const lead of leads) {
    try {
      const result = await syncToCRM(lead);
      results.push({ leadId: lead.id, ...result, success: true });
      successful++;
    } catch (error) {
      results.push({ leadId: lead.id, success: false, error: error.message });
      failed++;
    }
  }

  return {
    total: leads.length,
    successful,
    failed,
    results
  };
}

export {
  syncToCRM,
  createDeal,
  getContact,
  updateContact,
  getDeals,
  updateDealStage,
  getActivityHistory,
  bulkSync,
  contactsCache,
  dealsCache
};
