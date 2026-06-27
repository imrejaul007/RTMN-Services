/**
 * Opportunities API Routes
 * CRUD operations for Salesforce Opportunity objects
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

// Standard Salesforce opportunity stages
const OPP_STAGES = [
  'Prospecting',
  'Qualification',
  'Needs Analysis',
  'Value Proposition',
  'Id. Decision Makers',
  'Perception Analysis',
  'Proposal/Price Quote',
  'Negotiation/Review',
  'Closed Won',
  'Closed Lost',
] as const;

type OpportunityStage = typeof OPP_STAGES[number];

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
export function initOpportunitiesRoutes(tokens: Map<string, TokenStorage>): void {
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
 * GET /api/opportunities
 * List opportunities with optional filters and pagination
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const { where, fields, orderBy, limit, offset, search, stage, accountId, isClosed, isWon } = req.query;

    let soql = 'SELECT ';

    const defaultFields = [
      'Id', 'Name', 'AccountId', 'Account.Name', 'StageName', 'Amount', 'CloseDate',
      'Probability', 'Type', 'LeadSource', 'NextStep', 'Description', 'ForecastCategory',
      'OwnerId', 'Owner.Name', 'IsClosed', 'IsWon', 'FiscalYear', 'FiscalQuarter',
      'CreatedDate', 'LastModifiedDate'
    ];
    soql += (fields as string)?.split(',').map(f => f.trim()).filter(Boolean).join(', ') || defaultFields.join(', ');
    soql += ' FROM Opportunity';

    const conditions: string[] = [];
    if (where) conditions.push(where as string);
    if (search) {
      const term = (search as string).replace(/'/g, "\\'");
      conditions.push(`Name LIKE '%${term}%'`);
    }
    if (stage) {
      conditions.push(`StageName = '${(stage as string).replace(/'/g, "\\'")}'`);
    }
    if (accountId) {
      conditions.push(`AccountId = '${accountId}'`);
    }
    if (isClosed !== undefined) {
      const isClosedBool = isClosed === 'true' || isClosed === true;
      conditions.push(`IsClosed = ${isClosedBool}`);
    }
    if (isWon !== undefined) {
      const isWonBool = isWon === 'true' || isWon === true;
      conditions.push(`IsWon = ${isWonBool}`);
    }

    if (conditions.length > 0) {
      soql += ` WHERE ${conditions.join(' AND ')}`;
    }
    if (orderBy) soql += ` ORDER BY ${orderBy}`;
    else soql += ' ORDER BY CloseDate DESC';
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
    logger.error('List opportunities error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
});

/**
 * POST /api/opportunities
 * Create a new opportunity
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const oppData = normalizeInput(req.body);

    // Validate required fields
    if (!oppData.Name) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name is required' },
      });
      return;
    }
    if (!oppData.StageName) {
      oppData.StageName = 'Prospecting';
    }
    if (!oppData.CloseDate) {
      // Default to 30 days from now
      const date = new Date();
      date.setDate(date.getDate() + 30);
      oppData.CloseDate = date.toISOString().split('T')[0];
    }

    const response = await axios.post(
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/Opportunity`,
      oppData,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Opportunity created', { opportunityId: response.data.id, instanceUrl });

    const soql = `SELECT Id, Name, AccountId, Account.Name, StageName, Amount, CloseDate, Probability, Owner.Name FROM Opportunity WHERE Id = '${response.data.id}'`;
    const oppResponse = await axios.get(`${instanceUrl}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    res.status(201).json({
      success: true,
      data: oppResponse.data.records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }[]>;
    logger.error('Create opportunity error', { error: axiosError.message });
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
 * GET /api/opportunities/stages
 * Get available opportunity stages
 */
router.get('/stages', (_req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      stages: OPP_STAGES,
      default: 'Prospecting',
    },
  });
});

/**
 * GET /api/opportunities/pipeline/summary
 * Get pipeline summary by stage
 */
router.get('/pipeline/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;

    const soql = `
      SELECT StageName,
             COUNT(Id) opportunityCount,
             SUM(Amount) totalAmount,
             AVG(Probability) avgProbability,
             MAX(CloseDate) furthestCloseDate,
             MIN(CloseDate) nearestCloseDate
      FROM Opportunity
      WHERE IsClosed = false
      GROUP BY StageName
      ORDER BY COUNT(Id) DESC
    `.trim();

    const response = await axios.get(`${instanceUrl}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    const pipeline = response.data.records.map((record: Record<string, unknown>) => ({
      stage: record.StageName,
      count: record.opportunityCount,
      totalAmount: record.totalAmount || 0,
      avgProbability: Math.round((record.avgProbability as number) || 0),
      weightedAmount: ((record.totalAmount as number) || 0) * ((record.avgProbability as number) || 0) / 100,
      furthestCloseDate: record.furthestCloseDate,
      nearestCloseDate: record.nearestCloseDate,
    }));

    const totals = pipeline.reduce(
      (acc: { count: number; amount: number; weighted: number }, stage: { count: number; totalAmount: number; weightedAmount: number }) => ({
        count: acc.count + stage.count,
        amount: acc.amount + stage.totalAmount,
        weighted: acc.weighted + stage.weightedAmount,
      }),
      { count: 0, amount: 0, weighted: 0 }
    );

    res.json({
      success: true,
      data: {
        pipeline,
        totals: {
          ...totals,
          avgProbability: totals.amount > 0 ? Math.round((totals.weighted / totals.amount) * 100) : 0,
        },
      },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Pipeline summary error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
});

/**
 * GET /api/opportunities/:id
 * Get a specific opportunity
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
      'Id, Name, AccountId, Account.Name, Type, StageName, Amount, CloseDate, Probability, ForecastCategory, LeadSource, NextStep, Description, OwnerId, Owner.Name, IsClosed, IsWon, FiscalYear, FiscalQuarter, CampaignId, Campaign.Name, CreatedDate, LastModifiedDate';

    const soql = `SELECT ${fieldList} FROM Opportunity WHERE Id = '${id}' LIMIT 1`;

    const response = await axios.get(`${instanceUrl}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    if (response.data.totalSize === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Opportunity not found: ${id}` },
      });
      return;
    }

    res.json({
      success: true,
      data: response.data.records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Get opportunity error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
});

/**
 * PATCH /api/opportunities/:id
 * Update an opportunity (including stage updates)
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

    const response = await axios.patch(
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/Opportunity/${id}`,
      updateData,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    if (updateData.StageName) {
      logger.info('Opportunity stage updated', { opportunityId: id, newStage: updateData.StageName, instanceUrl });
    } else {
      logger.info('Opportunity updated', { opportunityId: id, instanceUrl });
    }

    // Return updated opportunity
    const soql = `SELECT Id, Name, AccountId, Account.Name, StageName, Amount, CloseDate, Probability, Owner.Name, LastModifiedDate FROM Opportunity WHERE Id = '${id}'`;
    const oppResponse = await axios.get(`${instanceUrl}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    res.json({
      success: true,
      data: oppResponse.data.records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }[]>;
    logger.error('Update opportunity error', { error: axiosError.message });
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
 * POST /api/opportunities/:id/close-won
 * Close opportunity as Won
 */
router.post('/:id/close-won', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const { id } = req.params;
    const { closeDate } = req.body;

    const updateData: Record<string, unknown> = {
      StageName: 'Closed Won',
      IsWon: true,
      IsClosed: true,
    };

    if (closeDate) {
      updateData.CloseDate = closeDate;
    }

    await axios.patch(
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/Opportunity/${id}`,
      updateData,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Opportunity closed won', { opportunityId: id, instanceUrl });

    const soql = `SELECT Id, Name, AccountId, Account.Name, StageName, Amount, CloseDate, Probability, Owner.Name FROM Opportunity WHERE Id = '${id}'`;
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
    logger.error('Close won error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'CLOSE_ERROR',
        message: axiosError.response?.data?.[0]?.message || axiosError.message,
      },
    });
  }
});

/**
 * POST /api/opportunities/:id/close-lost
 * Close opportunity as Lost
 */
router.post('/:id/close-lost', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const { id } = req.params;
    const { closeDate, lostReason } = req.body;

    const updateData: Record<string, unknown> = {
      StageName: 'Closed Lost',
      IsWon: false,
      IsClosed: true,
    };

    if (closeDate) {
      updateData.CloseDate = closeDate;
    }
    if (lostReason) {
      updateData.Description = `Lost Reason: ${lostReason}`;
    }

    await axios.patch(
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/Opportunity/${id}`,
      updateData,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Opportunity closed lost', { opportunityId: id, instanceUrl });

    const soql = `SELECT Id, Name, AccountId, Account.Name, StageName, Amount, CloseDate, Owner.Name FROM Opportunity WHERE Id = '${id}'`;
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
    logger.error('Close lost error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'CLOSE_ERROR',
        message: axiosError.response?.data?.[0]?.message || axiosError.message,
      },
    });
  }
});

/**
 * DELETE /api/opportunities/:id
 * Delete an opportunity
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
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/Opportunity/${id}`,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Opportunity deleted', { opportunityId: id, instanceUrl });

    res.json({
      success: true,
      data: { id, success: true },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Delete opportunity error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: axiosError.message },
    });
  }
});

/**
 * GET /api/opportunities/:id/history
 * Get opportunity stage history
 */
router.get('/:id/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = getInstanceUrl(req);
    if (!instanceUrl) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const token = tokenStorage.get(instanceUrl)!;
    const { id } = req.params;

    const soql = `
      SELECT Id, Field, OldValue, NewValue, CreatedDate, CreatedById, CreatedBy.Name
      FROM OpportunityFieldHistory
      WHERE OpportunityId = '${id}'
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
    logger.error('Get opportunity history error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
});

export default router;
