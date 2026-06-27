/**
 * Contacts API Routes
 * CRUD operations for Salesforce Contact objects
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
  };
}

let tokenStorage: Map<string, TokenStorage>;

/**
 * Initialize with storage reference
 */
export function initContactsRoutes(tokens: Map<string, TokenStorage>): void {
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
 * Normalize field names (camelCase to PascalCase)
 */
function normalizeInput(data: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
    normalized[pascalKey] = value;
  }
  return normalized;
}

/**
 * GET /api/contacts
 * List contacts with optional filters and pagination
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const { where, fields, orderBy, limit, offset, search, email, accountId } = req.query;

    let soql = 'SELECT ';

    const defaultFields = [
      'Id', 'FirstName', 'LastName', 'Name', 'Email', 'Phone', 'MobilePhone',
      'Title', 'Department', 'AccountId', 'Account.Name', 'ReportsToId', 'ReportsTo.Name',
      'MailingStreet', 'MailingCity', 'MailingState', 'MailingPostalCode', 'MailingCountry',
      'Birthdate', 'Description', 'OwnerId', 'Owner.Name', 'CreatedDate', 'LastModifiedDate'
    ];
    soql += (fields as string)?.split(',').map(f => f.trim()).filter(Boolean).join(', ') || defaultFields.join(', ');
    soql += ' FROM Contact';

    const conditions: string[] = [];
    if (where) conditions.push(where as string);
    if (search) {
      const term = (search as string).replace(/'/g, "\\'");
      conditions.push(`(Name LIKE '%${term}%' OR Email LIKE '%${term}%' OR Title LIKE '%${term}%')`);
    }
    if (email) {
      conditions.push(`Email = '${(email as string).replace(/'/g, "\\'")}'`);
    }
    if (accountId) {
      conditions.push(`AccountId = '${accountId}'`);
    }

    if (conditions.length > 0) {
      soql += ` WHERE ${conditions.join(' AND ')}`;
    }
    if (orderBy) soql += ` ORDER BY ${orderBy}`;
    else soql += ' ORDER BY LastName, FirstName';
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
      },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('List contacts error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
});

/**
 * POST /api/contacts
 * Create a new contact
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const contactData = normalizeInput(req.body);

    if (!contactData.LastName) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'LastName is required' },
      });
      return;
    }

    const response = await axios.post(
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/Contact`,
      contactData,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Contact created', { contactId: response.data.id, instanceUrl });

    const soql = `SELECT Id, FirstName, LastName, Name, Email, Phone, Title, AccountId, Account.Name, CreatedDate FROM Contact WHERE Id = '${response.data.id}'`;
    const contactResponse = await axios.get(`${instanceUrl}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    res.status(201).json({
      success: true,
      data: contactResponse.data.records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }[]>;
    logger.error('Create contact error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: axiosError.response?.data?.[0]?.message || axiosError.message,
      },
    });
  }
});

/**
 * GET /api/contacts/:id
 * Get a specific contact
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
      'Id, FirstName, LastName, Name, Email, Phone, MobilePhone, Title, Department, AccountId, Account.Name, ReportsToId, ReportsTo.Name, Birthdate, MailingStreet, MailingCity, MailingState, MailingPostalCode, MailingCountry, Description, OwnerId, Owner.Name, CreatedDate, LastModifiedDate';

    const soql = `SELECT ${fieldList} FROM Contact WHERE Id = '${id}' LIMIT 1`;

    const response = await axios.get(`${instanceUrl}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    if (response.data.totalSize === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Contact not found: ${id}` },
      });
      return;
    }

    res.json({
      success: true,
      data: response.data.records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Get contact error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
});

/**
 * PATCH /api/contacts/:id
 * Update a contact
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
    const updateData = normalizeInput(req.body);

    await axios.patch(
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/Contact/${id}`,
      updateData,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Contact updated', { contactId: id, instanceUrl });

    const soql = `SELECT Id, FirstName, LastName, Name, Email, Phone, Title, AccountId, Account.Name, LastModifiedDate FROM Contact WHERE Id = '${id}'`;
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
    logger.error('Update contact error', { error: axiosError.message });
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
 * DELETE /api/contacts/:id
 * Delete a contact
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
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/Contact/${id}`,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Contact deleted', { contactId: id, instanceUrl });

    res.json({
      success: true,
      data: { id, success: true },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Delete contact error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: axiosError.message },
    });
  }
});

/**
 * GET /api/contacts/email/:email
 * Get contact by email
 */
router.get('/email/:email', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const { email } = req.params;

    const soql = `SELECT Id, FirstName, LastName, Name, Email, Phone, Title, AccountId, Account.Name FROM Contact WHERE Email = '${email.replace(/'/g, "\\'")}' LIMIT 1`;

    const response = await axios.get(`${instanceUrl}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    if (response.data.totalSize === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Contact not found with email: ${email}` },
      });
      return;
    }

    res.json({
      success: true,
      data: response.data.records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Get contact by email error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
});

/**
 * GET /api/contacts/:id/activities
 * Get activities for a contact
 */
router.get('/:id/activities', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const { id } = req.params;

    const soql = `
      SELECT Id, Subject, ActivityDate, Status, Type, Description, WhoId, WhatId, CreatedDate, CreatedBy.Name
      FROM Task
      WHERE WhoId = '${id}'
      ORDER BY CreatedDate DESC
      LIMIT 50
    `.trim();

    const response = await axios.get(`${instanceUrl}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    res.json({
      success: true,
      data: {
        records: response.data.records,
        total: response.data.totalSize,
      },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Get contact activities error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
});

export default router;
