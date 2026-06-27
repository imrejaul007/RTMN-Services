/**
 * Leads API Routes
 * CRUD operations for Salesforce Lead objects
 */

import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import * as winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

const router = Router();

const SF_API_VERSION = 'v59.0';

// Token storage interface
interface TokenStorage {
  instanceUrl: string;
  token: {
    access_token: string;
    refresh_token?: string;
  };
}

let tokenStorage: Map<string, TokenStorage>;

/**
 * Initialize with storage reference
 */
export function initLeadsRoutes(tokens: Map<string, TokenStorage>): void {
  tokenStorage = tokens;
}

/**
 * Get authenticated instance URL from request
 */
function getInstanceUrl(req: Request): string | undefined {
  const sessionId = req.headers['x-session-id'] as string;
  if (sessionId) {
    const stored = tokenStorage.get(sessionId);
    if (stored) return stored.instanceUrl;
  }
  return Array.from(tokenStorage.keys())[0];
}

/**
 * Validate required fields
 */
function validateLeadInput(data: Record<string, unknown>, isCreate: boolean): string | null {
  if (isCreate) {
    if (!data.LastName && !data.lastName && !data.Name && !data.name) {
      return 'LastName is required';
    }
    if (!data.Company && !data.company) {
      return 'Company is required';
    }
  }
  return null;
}

/**
 * Normalize field names (camelCase to PascalCase)
 */
function normalizeLeadInput(data: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
    normalized[pascalKey] = value;
  }
  return normalized;
}

/**
 * GET /api/leads
 * List leads with optional filters and pagination
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const { where, fields, orderBy, limit, offset, search, status } = req.query;

    let soql = 'SELECT ';

    // Default fields
    const defaultFields = [
      'Id', 'FirstName', 'LastName', 'Name', 'Email', 'Phone', 'MobilePhone',
      'Company', 'Title', 'Status', 'LeadSource', 'Industry', 'Rating',
      'AnnualRevenue', 'NumberOfEmployees', 'CreatedDate', 'LastModifiedDate'
    ];
    soql += (fields as string)?.split(',').map(f => f.trim()).filter(Boolean).join(', ') || defaultFields.join(', ');
    soql += ' FROM Lead';

    const conditions: string[] = [];
    if (where) conditions.push(where as string);
    if (search) {
      const term = (search as string).replace(/'/g, "\\'");
      conditions.push(`(Name LIKE '%${term}%' OR Email LIKE '%${term}%' OR Company LIKE '%${term}%' OR Title LIKE '%${term}%')`);
    }
    if (status) {
      conditions.push(`Status = '${(status as string).replace(/'/g, "\\'")}'`);
    }

    if (conditions.length > 0) {
      soql += ` WHERE ${conditions.join(' AND ')}`;
    }
    if (orderBy) soql += ` ORDER BY ${orderBy}`;
    else soql += ' ORDER BY CreatedDate DESC';
    soql += ` LIMIT ${Math.min(parseInt(limit as string) || 100, 1000)}`;
    if (offset) soql += ` OFFSET ${offset}`;

    const response = await axios.get(`${instanceUrl}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    res.json({
      success: true,
      data: {
        records: response.data.records,
        total: response.data.totalSize,
        hasMore: !response.data.done,
        nextRecordsUrl: response.data.nextRecordsUrl,
        query: soql,
      },
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }[]>;
    logger.error('List leads error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'API_ERROR',
        message: axiosError.response?.data?.[0]?.message || axiosError.message,
      },
    });
  }
});

/**
 * POST /api/leads
 * Create a new lead
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const leadData = normalizeLeadInput(req.body);

    const validationError = validateLeadInput(leadData, true);
    if (validationError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: validationError },
      });
      return;
    }

    const response = await axios.post(
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/Lead`,
      leadData,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Lead created', { leadId: response.data.id, instanceUrl });

    // Fetch and return the created lead
    const soql = `SELECT Id, FirstName, LastName, Name, Email, Phone, Company, Title, Status, LeadSource, Industry, CreatedDate FROM Lead WHERE Id = '${response.data.id}'`;
    const leadResponse = await axios.get(`${instanceUrl}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    res.status(201).json({
      success: true,
      data: leadResponse.data.records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string; errorCode?: string }[]>;
    logger.error('Create lead error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: axiosError.response?.data?.[0]?.message || axiosError.message,
        details: axiosError.response?.data,
      },
    });
  }
});

/**
 * GET /api/leads/:id
 * Get a specific lead
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const { id } = req.params;
    const { fields } = req.query;

    const fieldList = (fields as string)?.split(',').map(f => f.trim()).filter(Boolean).join(', ') ||
      'Id, FirstName, LastName, Name, Email, Phone, MobilePhone, Company, Title, Department, Status, LeadSource, Industry, Rating, AnnualRevenue, NumberOfEmployees, Description, Street, City, State, PostalCode, Country, Website, IsConverted, OwnerId, Owner.Name, CreatedDate, LastModifiedDate';

    const soql = `SELECT ${fieldList} FROM Lead WHERE Id = '${id}' LIMIT 1`;

    const response = await axios.get(`${instanceUrl}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    if (response.data.totalSize === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Lead not found: ${id}` },
      });
      return;
    }

    res.json({
      success: true,
      data: response.data.records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Get lead error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
});

/**
 * PATCH /api/leads/:id
 * Update a lead
 */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const { id } = req.params;
    const updateData = normalizeLeadInput(req.body);

    await axios.patch(
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/Lead/${id}`,
      updateData,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Lead updated', { leadId: id, instanceUrl });

    // Return updated lead
    const soql = `SELECT Id, FirstName, LastName, Name, Email, Phone, Company, Title, Status, LeadSource, Industry, LastModifiedDate FROM Lead WHERE Id = '${id}'`;
    const response = await axios.get(`${instanceUrl}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    res.json({
      success: true,
      data: response.data.records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }[]>;
    logger.error('Update lead error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: axiosError.response?.data?.[0]?.message || axiosError.message,
      },
    });
  }
});

/**
 * DELETE /api/leads/:id
 * Delete a lead
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const { id } = req.params;

    await axios.delete(
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/Lead/${id}`,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Lead deleted', { leadId: id, instanceUrl });

    res.json({
      success: true,
      data: { id, success: true },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Delete lead error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: axiosError.message },
    });
  }
});

/**
 * POST /api/leads/:id/convert
 * Convert a lead to a contact/account/opportunity
 */
router.post('/:id/convert', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const { id } = req.params;
    const { accountId, doNotCreateOpportunity, opportunityName, sendNotificationEmail } = req.body;

    const payload: Record<string, unknown> = {
      leadId: id,
    };

    if (accountId) payload.accountId = accountId;
    if (doNotCreateOpportunity !== undefined) payload.doNotCreateOpportunity = doNotCreateOpportunity;
    if (opportunityName) payload.opportunityName = opportunityName;
    if (sendNotificationEmail !== undefined) payload.sendNotificationEmail = sendNotificationEmail;

    const response = await axios.post(
      `${instanceUrl}/services/data/${SF_API_VERSION}/lead/convert`,
      payload,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Lead converted', { leadId: id, instanceUrl });

    res.json({
      success: true,
      data: {
        accountId: response.data.accountId,
        contactId: response.data.contactId,
        opportunityId: response.data.opportunityId,
        leadId: id,
      },
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }[]>;
    logger.error('Convert lead error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'CONVERT_ERROR',
        message: axiosError.response?.data?.[0]?.message || axiosError.message,
      },
    });
  }
});

export default router;
