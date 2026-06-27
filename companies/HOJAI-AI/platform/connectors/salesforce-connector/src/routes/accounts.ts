/**
 * Accounts API Routes
 * CRUD operations for Salesforce Account objects
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
export function initAccountsRoutes(tokens: Map<string, TokenStorage>): void {
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
 * GET /api/accounts
 * List accounts with optional filters and pagination
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const { where, fields, orderBy, limit, offset, search, industry, type } = req.query;

    let soql = 'SELECT ';

    const defaultFields = [
      'Id', 'Name', 'Type', 'Industry', 'AnnualRevenue', 'NumberOfEmployees',
      'Description', 'Website', 'Phone', 'Fax',
      'BillingStreet', 'BillingCity', 'BillingState', 'BillingPostalCode', 'BillingCountry',
      'ShippingStreet', 'ShippingCity', 'ShippingState', 'ShippingPostalCode', 'ShippingCountry',
      'ParentId', 'Parent.Name', 'OwnerId', 'Owner.Name',
      'CreatedDate', 'LastModifiedDate'
    ];
    soql += (fields as string)?.split(',').map(f => f.trim()).filter(Boolean).join(', ') || defaultFields.join(', ');
    soql += ' FROM Account';

    const conditions: string[] = [];
    if (where) conditions.push(where as string);
    if (search) {
      const term = (search as string).replace(/'/g, "\\'");
      conditions.push(`(Name LIKE '%${term}%' OR Website LIKE '%${term}%' OR Phone LIKE '%${term}%')`);
    }
    if (industry) {
      conditions.push(`Industry = '${(industry as string).replace(/'/g, "\\'")}'`);
    }
    if (type) {
      conditions.push(`Type = '${(type as string).replace(/'/g, "\\'")}'`);
    }

    if (conditions.length > 0) {
      soql += ` WHERE ${conditions.join(' AND ')}`;
    }
    if (orderBy) soql += ` ORDER BY ${orderBy}`;
    else soql += ' ORDER BY Name';
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
    logger.error('List accounts error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
});

/**
 * POST /api/accounts
 * Create a new account
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const accountData = normalizeInput(req.body);

    if (!accountData.Name) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name is required' },
      });
      return;
    }

    const response = await axios.post(
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/Account`,
      accountData,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Account created', { accountId: response.data.id, instanceUrl });

    const soql = `SELECT Id, Name, Type, Industry, Website, Phone, Owner.Name FROM Account WHERE Id = '${response.data.id}'`;
    const accountResponse = await axios.get(`${instanceUrl}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    res.status(201).json({
      success: true,
      data: accountResponse.data.records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }[]>;
    logger.error('Create account error', { error: axiosError.message });
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
 * GET /api/accounts/:id
 * Get a specific account
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
      'Id, Name, Type, Industry, AnnualRevenue, NumberOfEmployees, Description, Website, Phone, Fax, ParentId, Parent.Name, OwnerId, Owner.Name, BillingStreet, BillingCity, BillingState, BillingPostalCode, BillingCountry, ShippingStreet, ShippingCity, ShippingState, ShippingPostalCode, ShippingCountry, CreatedDate, LastModifiedDate';

    const soql = `SELECT ${fieldList} FROM Account WHERE Id = '${id}' LIMIT 1`;

    const response = await axios.get(`${instanceUrl}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    if (response.data.totalSize === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Account not found: ${id}` },
      });
      return;
    }

    res.json({
      success: true,
      data: response.data.records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Get account error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
});

/**
 * PATCH /api/accounts/:id
 * Update an account
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
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/Account/${id}`,
      updateData,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Account updated', { accountId: id, instanceUrl });

    const soql = `SELECT Id, Name, Type, Industry, Website, Phone, LastModifiedDate FROM Account WHERE Id = '${id}'`;
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
    logger.error('Update account error', { error: axiosError.message });
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
 * DELETE /api/accounts/:id
 * Delete an account
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
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/Account/${id}`,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Account deleted', { accountId: id, instanceUrl });

    res.json({
      success: true,
      data: { id, success: true },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Delete account error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: axiosError.message },
    });
  }
});

/**
 * GET /api/accounts/:id/contacts
 * Get contacts for an account
 */
router.get('/:id/contacts', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const { id } = req.params;
    const { limit } = req.query;

    const soql = `
      SELECT Id, FirstName, LastName, Name, Email, Phone, Title, Department,
             OwnerId, Owner.Name, CreatedDate
      FROM Contact
      WHERE AccountId = '${id}'
      ORDER BY LastName, FirstName
      LIMIT ${Math.min(parseInt(limit as string) || 100, 500)}
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
    logger.error('Get account contacts error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
});

/**
 * GET /api/accounts/:id/opportunities
 * Get opportunities for an account
 */
router.get('/:id/opportunities', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const { id } = req.params;
    const { limit, isClosed } = req.query;

    let soql = `
      SELECT Id, Name, StageName, Amount, CloseDate, Probability, OwnerId, Owner.Name,
             Type, IsClosed, IsWon, CreatedDate
      FROM Opportunity
      WHERE AccountId = '${id}'
    `;

    if (isClosed !== undefined) {
      soql += ` AND IsClosed = ${isClosed === 'true'}`;
    }

    soql += ` ORDER BY CloseDate DESC LIMIT ${Math.min(parseInt(limit as string) || 50, 500)}`;

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
    logger.error('Get account opportunities error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
});

/**
 * GET /api/accounts/:id/hierarchy
 * Get account hierarchy (parent and children)
 */
router.get('/:id/hierarchy', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const { id } = req.params;

    // Get the account
    const accountSoql = `SELECT Id, Name, Type, Industry, ParentId, Parent.Name, OwnerId, Owner.Name FROM Account WHERE Id = '${id}'`;
    const accountResponse = await axios.get(`${instanceUrl}/services/data/${SF_API_VERSION}/query`, {
      params: { q: accountSoql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    if (accountResponse.data.totalSize === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Account not found: ${id}` },
      });
      return;
    }

    const account = accountResponse.data.records[0];

    // Get parent account if exists
    let parent = null;
    if (account.ParentId) {
      const parentSoql = `SELECT Id, Name, Type, Industry FROM Account WHERE Id = '${account.ParentId}'`;
      const parentResponse = await axios.get(`${instanceUrl}/services/data/${SF_API_VERSION}/query`, {
        params: { q: parentSoql },
        headers: { Authorization: `Bearer ${token.token.access_token}` },
      });
      if (parentResponse.data.totalSize > 0) {
        parent = parentResponse.data.records[0];
      }
    }

    // Get child accounts
    const childrenSoql = `SELECT Id, Name, Type, Industry, OwnerId, Owner.Name FROM Account WHERE ParentId = '${id}' ORDER BY Name`;
    const childrenResponse = await axios.get(`${instanceUrl}/services/data/${SF_API_VERSION}/query`, {
      params: { q: childrenSoql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    res.json({
      success: true,
      data: {
        account,
        parent,
        children: childrenResponse.data.records,
        childrenCount: childrenResponse.data.totalSize,
      },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Get account hierarchy error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
});

/**
 * GET /api/accounts/:id/revenue
 * Get account revenue summary
 */
router.get('/:id/revenue', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const { id } = req.params;

    const soql = `
      SELECT
        SUM(Amount) totalRevenue,
        COUNT(CASE WHEN IsClosed = false THEN 1 END) openOpportunities,
        COUNT(CASE WHEN IsWon = true THEN 1 END) closedWon,
        COUNT(CASE WHEN IsWon = true AND CALENDAR_YEAR(CloseDate) = THIS_YEAR THEN 1 END) closedWonThisYear,
        COUNT(CASE WHEN IsClosed = true AND IsWon = false THEN 1 END) closedLost,
        AVG(CASE WHEN IsClosed = true AND IsWon = true THEN Amount END) avgDealSize
      FROM Opportunity
      WHERE AccountId = '${id}'
    `.trim();

    const response = await axios.get(`${instanceUrl}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    const record = response.data.records[0] || {};

    res.json({
      success: true,
      data: {
        totalRevenue: record.expr0 || 0,
        openOpportunities: record.expr1 || 0,
        closedWon: record.expr2 || 0,
        closedWonThisYear: record.expr3 || 0,
        closedLost: record.expr4 || 0,
        avgDealSize: record.expr5 || 0,
        winRate: (record.expr2 || 0) > 0
          ? Math.round(((record.expr2 as number) / ((record.expr2 as number) + (record.expr4 as number))) * 100)
          : 0,
      },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Get account revenue error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
});

/**
 * GET /api/accounts/name/:name
 * Get account by name
 */
router.get('/name/:name', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const { name } = req.params;

    const soql = `SELECT Id, Name, Type, Industry, Website, Phone, Owner.Name FROM Account WHERE Name = '${name.replace(/'/g, "\\'")}' LIMIT 1`;

    const response = await axios.get(`${instanceUrl}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    if (response.data.totalSize === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Account not found: ${name}` },
      });
      return;
    }

    res.json({
      success: true,
      data: response.data.records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Get account by name error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
});

export default router;
