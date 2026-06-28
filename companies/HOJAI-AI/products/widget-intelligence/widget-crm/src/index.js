/**
 * HOJAI SiteOS - Widget CRM Service
 * CRM Widget: HubSpot and Salesforce Connectors (Port 5406)
 *
 * Features:
 * - CRM connectors for HubSpot and Salesforce
 * - On lead capture: create contact + deal
 * - On purchase: update contact LTV + create deal
 * - POST /api/crm/sync/:visitorId
 * - GET /api/crm/status
 */

import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import pino from 'pino';
import fetch from 'node-fetch';

// Logger setup
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Express app setup
const app = express();

// In-memory stores
const contactsStore = new Map();
const dealsStore = new Map();
const visitorsStore = new Map();
const syncLogsStore = new Map();
const crmConfigsStore = new Map();

// External API endpoints
const HUBSPOT_API = 'https://api.hubapi.com';
const SALESFORCE_API = 'https://login.salesforce.com/services/oauth2/token';

// ─────────────────────────────────────────────────────────────────────────────
// CRM Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Supported CRM types
 */
export const CRM_TYPES = {
  HUBSPOT: 'hubspot',
  SALESFORCE: 'salesforce',
};

/**
 * Create CRM configuration
 */
export function createCRMConfig(config) {
  const crmConfig = {
    id: config.id || uuidv4(),
    type: config.type, // 'hubspot' or 'salesforce'
    name: config.name,
    apiKey: config.apiKey,
    accessToken: config.accessToken,
    refreshToken: config.refreshToken,
    instanceUrl: config.instanceUrl,
    enabled: config.enabled ?? true,
    syncSettings: {
      onLeadCapture: config.syncSettings?.onLeadCapture ?? true,
      onPurchase: config.syncSettings?.onPurchase ?? true,
      autoCreateDeal: config.syncSettings?.autoCreateDeal ?? true,
      updateLTV: config.syncSettings?.updateLTV ?? true,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  crmConfigsStore.set(crmConfig.id, crmConfig);
  logger.info({ event: 'crm_config_created', configId: crmConfig.id, type: crmConfig.type });

  return crmConfig;
}

/**
 * Get CRM configuration
 */
export function getCRMConfig(configId) {
  return crmConfigsStore.get(configId);
}

/**
 * Get CRM configuration by type
 */
export function getCRMConfigByType(type) {
  return Array.from(crmConfigsStore.values()).find(c => c.type === type && c.enabled);
}

/**
 * Get all CRM configurations
 */
export function getAllCRMConfigs() {
  return Array.from(crmConfigsStore.values());
}

/**
 * Update CRM configuration
 */
export function updateCRMConfig(configId, updates) {
  const config = crmConfigsStore.get(configId);
  if (!config) return null;

  Object.assign(config, updates, { updatedAt: Date.now() });
  return config;
}

// ─────────────────────────────────────────────────────────────────────────────
// HubSpot Integration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create HubSpot contact
 */
export async function createHubSpotContact(config, contactData) {
  const url = `${HUBSPOT_API}/crm/v3/objects/contacts`;

  const properties = {
    email: contactData.email,
    firstname: contactData.firstName,
    lastname: contactData.lastName,
    phone: contactData.phone,
    company: contactData.company,
    jobtitle: contactData.jobTitle,
    ...contactData.customProperties,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken || config.apiKey}`,
      },
      body: JSON.stringify({ properties }),
    });

    const result = await response.json();

    if (!response.ok) {
      logger.error({ event: 'hubspot_create_contact_error', error: result });
      return { success: false, error: result };
    }

    logger.info({ event: 'hubspot_contact_created', contactId: result.id });
    return { success: true, contactId: result.id, data: result };
  } catch (err) {
    logger.error({ event: 'hubspot_fetch_error', error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Update HubSpot contact
 */
export async function updateHubSpotContact(config, contactId, updates) {
  const url = `${HUBSPOT_API}/crm/v3/objects/contacts/${contactId}`;

  const properties = {
    ...updates,
  };

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken || config.apiKey}`,
      },
      body: JSON.stringify({ properties }),
    });

    const result = await response.json();

    if (!response.ok) {
      logger.error({ event: 'hubspot_update_contact_error', error: result });
      return { success: false, error: result };
    }

    logger.info({ event: 'hubspot_contact_updated', contactId });
    return { success: true, data: result };
  } catch (err) {
    logger.error({ event: 'hubspot_fetch_error', error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Create HubSpot deal
 */
export async function createHubSpotDeal(config, dealData) {
  const url = `${HUBSPOT_API}/crm/v3/objects/deals`;

  const properties = {
    dealname: dealData.name,
    amount: dealData.amount,
    dealstage: dealData.stage || 'appointmentscheduled',
    closedate: dealData.closeDate,
    description: dealData.description,
    ...dealData.customProperties,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken || config.apiKey}`,
      },
      body: JSON.stringify({ properties }),
    });

    const result = await response.json();

    if (!response.ok) {
      logger.error({ event: 'hubspot_create_deal_error', error: result });
      return { success: false, error: result };
    }

    logger.info({ event: 'hubspot_deal_created', dealId: result.id });
    return { success: true, dealId: result.id, data: result };
  } catch (err) {
    logger.error({ event: 'hubspot_fetch_error', error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Associate deal with contact in HubSpot
 */
export async function associateHubSpotDealContact(config, dealId, contactId) {
  const url = `${HUBSPOT_API}/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/deal_to_contact`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.accessToken || config.apiKey}`,
      },
    });

    if (!response.ok) {
      const result = await response.json();
      logger.error({ event: 'hubspot_associate_error', error: result });
      return { success: false, error: result };
    }

    logger.info({ event: 'hubspot_deal_contact_associated', dealId, contactId });
    return { success: true };
  } catch (err) {
    logger.error({ event: 'hubspot_fetch_error', error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Search HubSpot contacts by email
 */
export async function searchHubSpotContact(config, email) {
  const url = `${HUBSPOT_API}/crm/v3/objects/contacts/search`;

  const body = {
    filterGroups: [
      {
        filters: [
          { propertyName: 'email', operator: 'EQ', value: email },
        ],
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken || config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      logger.error({ event: 'hubspot_search_error', error: result });
      return { success: false, error: result };
    }

    return {
      success: true,
      found: result.results?.length > 0,
      contact: result.results?.[0],
    };
  } catch (err) {
    logger.error({ event: 'hubspot_fetch_error', error: err.message });
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Salesforce Integration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create Salesforce contact
 */
export async function createSalesforceContact(config, contactData) {
  const url = `${config.instanceUrl}/services/data/v58.0/sobjects/Contact`;

  const fields = {
    Email: contactData.email,
    FirstName: contactData.firstName,
    LastName: contactData.lastName,
    Phone: contactData.phone,
    Company: contactData.company,
    Title: contactData.jobTitle,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({ ...fields, ...contactData.customFields }),
    });

    const result = await response.json();

    if (!response.ok) {
      logger.error({ event: 'salesforce_create_contact_error', error: result });
      return { success: false, error: result };
    }

    logger.info({ event: 'salesforce_contact_created', contactId: result.id });
    return { success: true, contactId: result.id, data: result };
  } catch (err) {
    logger.error({ event: 'salesforce_fetch_error', error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Update Salesforce contact
 */
export async function updateSalesforceContact(config, contactId, updates) {
  const url = `${config.instanceUrl}/services/data/v58.0/sobjects/Contact/${contactId}`;

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const result = await response.json();
      logger.error({ event: 'salesforce_update_contact_error', error: result });
      return { success: false, error: result };
    }

    logger.info({ event: 'salesforce_contact_updated', contactId });
    return { success: true };
  } catch (err) {
    logger.error({ event: 'salesforce_fetch_error', error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Create Salesforce opportunity (deal)
 */
export async function createSalesforceOpportunity(config, opportunityData) {
  const url = `${config.instanceUrl}/services/data/v58.0/sobjects/Opportunity`;

  const fields = {
    Name: opportunityData.name,
    Amount: opportunityData.amount,
    StageName: opportunityData.stage || 'Prospecting',
    CloseDate: opportunityData.closeDate || new Date().toISOString().split('T')[0],
    Description: opportunityData.description,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify(fields),
    });

    const result = await response.json();

    if (!response.ok) {
      logger.error({ event: 'salesforce_create_opportunity_error', error: result });
      return { success: false, error: result };
    }

    logger.info({ event: 'salesforce_opportunity_created', opportunityId: result.id });
    return { success: true, opportunityId: result.id, data: result };
  } catch (err) {
    logger.error({ event: 'salesforce_fetch_error', error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Associate opportunity with contact in Salesforce
 */
export async function associateSalesforceOpportunityContact(config, opportunityId, contactId) {
  const url = `${config.instanceUrl}/services/data/v58.0/sobjects/OpportunityContactRole`;

  const fields = {
    OpportunityId: opportunityId,
    ContactId: contactId,
    Role: 'Decision Maker',
    IsPrimary: true,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify(fields),
    });

    const result = await response.json();

    if (!response.ok) {
      logger.error({ event: 'salesforce_associate_error', error: result });
      return { success: false, error: result };
    }

    logger.info({ event: 'salesforce_opportunity_contact_associated', opportunityId, contactId });
    return { success: true };
  } catch (err) {
    logger.error({ event: 'salesforce_fetch_error', error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Query Salesforce contact by email
 */
export async function querySalesforceContact(config, email) {
  const url = `${config.instanceUrl}/services/data/v58.0/query`;

  const query = `SELECT Id, Email, FirstName, LastName, Phone, Account.Name, Title FROM Contact WHERE Email = '${email}'`;

  try {
    const response = await fetch(`${url}?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      logger.error({ event: 'salesforce_query_error', error: result });
      return { success: false, error: result };
    }

    return {
      success: true,
      found: result.totalSize > 0,
      contact: result.records?.[0],
    };
  } catch (err) {
    logger.error({ event: 'salesforce_fetch_error', error: err.message });
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Local Contact and Deal Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create local contact
 */
export function createLocalContact(contactData) {
  const contact = {
    id: uuidv4(),
    email: contactData.email,
    firstName: contactData.firstName,
    lastName: contactData.lastName,
    phone: contactData.phone,
    company: contactData.company,
    jobTitle: contactData.jobTitle,
    ltv: contactData.ltv || 0,
    visitorId: contactData.visitorId,
    externalIds: {}, // { hubspot: '...', salesforce: '...' }
    customProperties: contactData.customProperties || {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  contactsStore.set(contact.id, contact);
  logger.info({ event: 'local_contact_created', contactId: contact.id, email: contact.email });

  return contact;
}

/**
 * Get contact by ID
 */
export function getContact(contactId) {
  return contactsStore.get(contactId);
}

/**
 * Get contact by email
 */
export function getContactByEmail(email) {
  return Array.from(contactsStore.values()).find(c => c.email === email);
}

/**
 * Update contact
 */
export function updateContact(contactId, updates) {
  const contact = contactsStore.get(contactId);
  if (!contact) return null;

  Object.assign(contact, updates, { updatedAt: Date.now() });
  return contact;
}

/**
 * Create local deal
 */
export function createLocalDeal(dealData) {
  const deal = {
    id: uuidv4(),
    name: dealData.name,
    amount: dealData.amount || 0,
    stage: dealData.stage || 'lead',
    closeDate: dealData.closeDate,
    description: dealData.description,
    contactId: dealData.contactId,
    visitorId: dealData.visitorId,
    externalIds: {},
    customProperties: dealData.customProperties || {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  dealsStore.set(deal.id, deal);
  logger.info({ event: 'local_deal_created', dealId: deal.id, name: deal.name });

  return deal;
}

/**
 * Get deal by ID
 */
export function getDeal(dealId) {
  return dealsStore.get(dealId);
}

/**
 * Update deal
 */
export function updateDeal(dealId, updates) {
  const deal = dealsStore.get(dealId);
  if (!deal) return null;

  Object.assign(deal, updates, { updatedAt: Date.now() });
  return deal;
}

// ─────────────────────────────────────────────────────────────────────────────
// Visitor Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get or create visitor
 */
export function getOrCreateVisitor(visitorId, data = {}) {
  let visitor = visitorsStore.get(visitorId);

  if (!visitor) {
    visitor = {
      id: visitorId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      company: data.company,
      contactId: null,
      lastSyncedAt: null,
      syncHistory: [],
      createdAt: Date.now(),
    };
    visitorsStore.set(visitorId, visitor);
  } else {
    // Update with new data
    Object.assign(visitor, data, { lastActivity: Date.now() });
  }

  return visitor;
}

/**
 * Get visitor by ID
 */
export function getVisitor(visitorId) {
  return visitorsStore.get(visitorId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sync visitor to CRM
 */
export async function syncVisitorToCRM(visitorId, options = {}) {
  const visitor = getOrCreateVisitor(visitorId);
  if (!visitor.email && !options.email) {
    return { success: false, error: 'Email required for CRM sync' };
  }

  const email = options.email || visitor.email;
  const syncLog = {
    id: uuidv4(),
    visitorId,
    startedAt: Date.now(),
    completedAt: null,
    actions: [],
    errors: [],
    success: false,
  };

  syncLogsStore.set(syncLog.id, syncLog);

  const results = {
    localContact: null,
    localDeal: null,
    hubspot: null,
    salesforce: null,
  };

  try {
    // 1. Create/update local contact
    let contact = getContactByEmail(email);
    if (!contact) {
      contact = createLocalContact({
        email,
        firstName: options.firstName || visitor.firstName,
        lastName: options.lastName || visitor.lastName,
        phone: options.phone || visitor.phone,
        company: options.company || visitor.company,
        visitorId,
        ltv: options.ltv || 0,
      });
    }
    results.localContact = contact;

    // 2. Sync to HubSpot
    const hubspotConfig = getCRMConfigByType(CRM_TYPES.HUBSPOT);
    if (hubspotConfig && hubspotConfig.enabled) {
      if (hubspotConfig.syncSettings.onLeadCapture || options.syncAll) {
        // Check if contact exists in HubSpot
        const searchResult = await searchHubSpotContact(hubspotConfig, email);

        if (searchResult.found && searchResult.contact) {
          // Update existing contact
          const updateLtv = contact.ltv > 0 ? { total_revenue: contact.ltv } : {};
          const updateResult = await updateHubSpotContact(
            hubspotConfig,
            searchResult.contact.id,
            {
              firstname: contact.firstName,
              lastname: contact.lastName,
              phone: contact.phone,
              ...updateLtv,
            }
          );
          results.hubspot = { action: 'updated', ...updateResult };
          contact.externalIds.hubspot = searchResult.contact.id;
        } else {
          // Create new contact
          const createResult = await createHubSpotContact(hubspotConfig, contact);
          if (createResult.success) {
            results.hubspot = { action: 'created', ...createResult };
            contact.externalIds.hubspot = createResult.contactId;
          } else {
            results.hubspot = { action: 'failed', error: createResult.error };
            syncLog.errors.push({ crm: 'hubspot', error: createResult.error });
          }
        }
      }

      // Create deal on purchase
      if (hubspotConfig.syncSettings.onPurchase && options.amount) {
        const dealData = {
          name: `Deal for ${email}`,
          amount: options.amount,
          closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          description: options.description || `Purchase from visitor ${visitorId}`,
        };

        const dealResult = await createHubSpotDeal(hubspotConfig, dealData);
        if (dealResult.success && contact.externalIds.hubspot) {
          await associateHubSpotDealContact(hubspotConfig, dealResult.dealId, contact.externalIds.hubspot);
          results.localDeal = createLocalDeal({
            ...dealData,
            contactId: contact.id,
            visitorId,
            externalIds: { hubspot: dealResult.dealId },
          });
        }
        results.hubspot.deal = dealResult;
      }

      updateContact(contact.id, contact);
    }

    // 3. Sync to Salesforce
    const salesforceConfig = getCRMConfigByType(CRM_TYPES.SALESFORCE);
    if (salesforceConfig && salesforceConfig.enabled) {
      if (salesforceConfig.syncSettings.onLeadCapture || options.syncAll) {
        const queryResult = await querySalesforceContact(salesforceConfig, email);

        if (queryResult.found && queryResult.contact) {
          // Update existing contact
          const updateData = {
            FirstName: contact.firstName,
            LastName: contact.lastName,
            Phone: contact.phone,
          };
          if (contact.ltv > 0) {
            updateData['Total_Opportunity_Value__c'] = contact.ltv;
          }
          const updateResult = await updateSalesforceContact(salesforceConfig, queryResult.contact.Id, updateData);
          results.salesforce = { action: 'updated', ...updateResult };
          contact.externalIds.salesforce = queryResult.contact.Id;
        } else {
          // Create new contact
          const createResult = await createSalesforceContact(salesforceConfig, contact);
          if (createResult.success) {
            results.salesforce = { action: 'created', ...createResult };
            contact.externalIds.salesforce = createResult.contactId;
          } else {
            results.salesforce = { action: 'failed', error: createResult.error };
            syncLog.errors.push({ crm: 'salesforce', error: createResult.error });
          }
        }
      }

      // Create opportunity on purchase
      if (salesforceConfig.syncSettings.onPurchase && options.amount) {
        const oppData = {
          name: `Opportunity for ${email}`,
          amount: options.amount,
          closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: options.description || `Purchase from visitor ${visitorId}`,
        };

        const oppResult = await createSalesforceOpportunity(salesforceConfig, oppData);
        if (oppResult.success && contact.externalIds.salesforce) {
          await associateSalesforceOpportunityContact(salesforceConfig, oppResult.opportunityId, contact.externalIds.salesforce);
          if (!results.localDeal) {
            results.localDeal = createLocalDeal({
              ...oppData,
              contactId: contact.id,
              visitorId,
              externalIds: { salesforce: oppResult.opportunityId },
            });
          }
        }
        results.salesforce.opportunity = oppResult;
      }

      updateContact(contact.id, contact);
    }

    // 4. Update visitor sync status
    visitor.lastSyncedAt = Date.now();
    visitor.contactId = contact.id;
    visitor.syncHistory.push({
      syncedAt: Date.now(),
      results: { ...results },
    });

    syncLog.completedAt = Date.now();
    syncLog.actions = Object.entries(results).map(([key, value]) => ({ type: key, result: value }));
    syncLog.success = true;

    logger.info({ event: 'visitor_synced', visitorId, results });

    return {
      success: true,
      contact,
      deal: results.localDeal,
      syncLogId: syncLog.id,
      results,
    };
  } catch (err) {
    syncLog.errors.push({ error: err.message });
    syncLog.completedAt = Date.now();
    logger.error({ event: 'sync_error', visitorId, error: err.message });
    return { success: false, error: err.message, syncLogId: syncLog.id };
  }
}

/**
 * Update contact LTV
 */
export async function updateContactLTV(contactId, additionalAmount) {
  const contact = getContact(contactId);
  if (!contact) return null;

  contact.ltv = (contact.ltv || 0) + additionalAmount;
  updateContact(contactId, { ltv: contact.ltv });

  // Sync to HubSpot
  if (contact.externalIds.hubspot) {
    const config = getCRMConfigByType(CRM_TYPES.HUBSPOT);
    if (config) {
      await updateHubSpotContact(config, contact.externalIds.hubspot, {
        total_revenue: contact.ltv,
      });
    }
  }

  // Sync to Salesforce
  if (contact.externalIds.salesforce) {
    const config = getCRMConfigByType(CRM_TYPES.SALESFORCE);
    if (config) {
      await updateSalesforceContact(config, contact.externalIds.salesforce, {
        'Total_Opportunity_Value__c': contact.ltv,
      });
    }
  }

  logger.info({ event: 'ltv_updated', contactId, newLtv: contact.ltv });
  return contact;
}

// ─────────────────────────────────────────────────────────────────────────────
// Express Routes
// ─────────────────────────────────────────────────────────────────────────────

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Body parsing
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  const configs = getAllCRMConfigs();
  res.json({
    status: 'healthy',
    service: 'widget-crm',
    version: '1.0.0',
    port: process.env.PORT || 5406,
    timestamp: new Date().toISOString(),
    stats: {
      contacts: contactsStore.size,
      deals: dealsStore.size,
      visitors: visitorsStore.size,
      syncLogs: syncLogsStore.size,
      configs: configs.length,
      enabled: configs.filter(c => c.enabled).length,
    },
  });
});

// Readiness check
app.get('/ready', (req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────────────────────────────────────
// CRM Configuration Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create CRM configuration
 * POST /api/crm/config
 */
app.post('/api/crm/config',requireAuth,  (req, res) => {
  try {
    const schema = z.object({
      type: z.enum(['hubspot', 'salesforce']),
      name: z.string().min(1),
      apiKey: z.string().optional(),
      accessToken: z.string().optional(),
      refreshToken: z.string().optional(),
      instanceUrl: z.string().optional(),
      enabled: z.boolean().optional(),
      syncSettings: z.object({
        onLeadCapture: z.boolean().optional(),
        onPurchase: z.boolean().optional(),
        autoCreateDeal: z.boolean().optional(),
        updateLTV: z.boolean().optional(),
      }).optional(),
    });

    const config = createCRMConfig(schema.parse(req.body));
    res.status(201).json({ success: true, config });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all CRM configurations
 * GET /api/crm/config
 */
app.get('/api/crm/config', (req, res) => {
  const configs = getAllCRMConfigs().map(c => ({
    ...c,
    apiKey: c.apiKey ? '***' : undefined,
    accessToken: c.accessToken ? '***' : undefined,
  }));
  res.json({ success: true, configs });
});

/**
 * Get CRM configuration
 * GET /api/crm/config/:configId
 */
app.get('/api/crm/config/:configId', (req, res) => {
  const config = getCRMConfig(req.params.configId);
  if (!config) {
    return res.status(404).json({ error: 'CRM configuration not found' });
  }

  res.json({
    success: true,
    config: {
      ...config,
      apiKey: config.apiKey ? '***' : undefined,
      accessToken: config.accessToken ? '***' : undefined,
    },
  });
});

/**
 * Update CRM configuration
 * PATCH /api/crm/config/:configId
 */
app.patch('/api/crm/config/:configId',requireAuth,  (req, res) => {
  try {
    const schema = z.object({
      name: z.string().optional(),
      apiKey: z.string().optional(),
      accessToken: z.string().optional(),
      refreshToken: z.string().optional(),
      instanceUrl: z.string().optional(),
      enabled: z.boolean().optional(),
      syncSettings: z.object({
        onLeadCapture: z.boolean().optional(),
        onPurchase: z.boolean().optional(),
        autoCreateDeal: z.boolean().optional(),
        updateLTV: z.boolean().optional(),
      }).optional(),
    });

    const config = updateCRMConfig(req.params.configId, schema.parse(req.body));
    if (!config) {
      return res.status(404).json({ error: 'CRM configuration not found' });
    }

    res.json({ success: true, config });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Contact Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create local contact
 * POST /api/crm/contact
 */
app.post('/api/crm/contact',requireAuth,  (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      jobTitle: z.string().optional(),
      ltv: z.number().optional(),
      visitorId: z.string().optional(),
      customProperties: z.record(z.any()).optional(),
    });

    const contact = createLocalContact(schema.parse(req.body));
    res.status(201).json({ success: true, contact });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get contact
 * GET /api/crm/contact/:contactId
 */
app.get('/api/crm/contact/:contactId', (req, res) => {
  const contact = getContact(req.params.contactId);
  if (!contact) {
    return res.status(404).json({ error: 'Contact not found' });
  }
  res.json({ success: true, contact });
});

/**
 * Get contact by email
 * GET /api/crm/contact/email/:email
 */
app.get('/api/crm/contact/email/:email', (req, res) => {
  const contact = getContactByEmail(req.params.email);
  if (!contact) {
    return res.status(404).json({ error: 'Contact not found' });
  }
  res.json({ success: true, contact });
});

/**
 * Update contact
 * PATCH /api/crm/contact/:contactId
 */
app.patch('/api/crm/contact/:contactId',requireAuth,  (req, res) => {
  try {
    const schema = z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      jobTitle: z.string().optional(),
      ltv: z.number().optional(),
      customProperties: z.record(z.any()).optional(),
    });

    const contact = updateContact(req.params.contactId, schema.parse(req.body));
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ success: true, contact });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Deal Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create local deal
 * POST /api/crm/deal
 */
app.post('/api/crm/deal',requireAuth,  (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      amount: z.number().optional(),
      stage: z.string().optional(),
      closeDate: z.string().optional(),
      description: z.string().optional(),
      contactId: z.string().optional(),
      visitorId: z.string().optional(),
      customProperties: z.record(z.any()).optional(),
    });

    const deal = createLocalDeal(schema.parse(req.body));
    res.status(201).json({ success: true, deal });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get deal
 * GET /api/crm/deal/:dealId
 */
app.get('/api/crm/deal/:dealId', (req, res) => {
  const deal = getDeal(req.params.dealId);
  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }
  res.json({ success: true, deal });
});

/**
 * Update deal
 * PATCH /api/crm/deal/:dealId
 */
app.patch('/api/crm/deal/:dealId',requireAuth,  (req, res) => {
  try {
    const schema = z.object({
      name: z.string().optional(),
      amount: z.number().optional(),
      stage: z.string().optional(),
      closeDate: z.string().optional(),
      description: z.string().optional(),
      customProperties: z.record(z.any()).optional(),
    });

    const deal = updateDeal(req.params.dealId, schema.parse(req.body));
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json({ success: true, deal });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Sync Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sync visitor to CRM
 * POST /api/crm/sync/:visitorId
 */
app.post('/api/crm/sync/:visitorId',requireAuth,  async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      amount: z.number().optional(),
      description: z.string().optional(),
      syncAll: z.boolean().optional(),
    });

    const result = await syncVisitorToCRM(req.params.visitorId, schema.parse(req.body));
    res.json(result);
  } catch (err) {
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get sync status
 * GET /api/crm/sync/:visitorId
 */
app.get('/api/crm/sync/:visitorId', (req, res) => {
  const visitor = getVisitor(req.params.visitorId);
  if (!visitor) {
    return res.status(404).json({ error: 'Visitor not found' });
  }
  res.json({ success: true, visitor });
});

/**
 * Update contact LTV
 * POST /api/crm/contact/:contactId/ltv
 */
app.post('/api/crm/contact/:contactId/ltv',requireAuth,  async (req, res) => {
  try {
    const schema = z.object({
      amount: z.number(),
    });

    const { amount } = schema.parse(req.body);
    const contact = await updateContactLTV(req.params.contactId, amount);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ success: true, contact });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get CRM status
 * GET /api/crm/status
 */
app.get('/api/crm/status', (req, res) => {
  const configs = getAllCRMConfigs();
  const status = {
    totalContacts: contactsStore.size,
    totalDeals: dealsStore.size,
    totalVisitors: visitorsStore.size,
    totalSyncs: syncLogsStore.size,
    crms: configs.map(c => ({
      type: c.type,
      name: c.name,
      enabled: c.enabled,
      lastUpdated: c.updatedAt,
    })),
  };

  res.json({ success: true, status });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path, method: req.method });

  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors,
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5406;

export function startServer(port = PORT) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      logger.info(`Widget CRM Service running on port ${port}`);
      resolve(server);
    });
  });
}

// Start if run directly
const isMainModule = process.argv[1]?.includes('index.js');
if (isMainModule) {
  startServer();
}

export { app };
