/**
 * Salesforce Opportunities API
 * CRUD operations for Salesforce Opportunity objects
 */

import { createApiClient, executeQuery, executeQueryAll } from './client.js';
import type {
  SalesforceOpportunity,
  SalesforceOpportunityCreateInput,
  SalesforceOpportunityUpdateInput,
  SalesforceQueryParams,
  ListResponse,
  APIResponse,
} from '../types/index.js';

const OBJECT_NAME = 'Opportunity';

/**
 * Build SOQL WHERE clause from params
 */
function buildWhereClause(params: SalesforceQueryParams): string {
  const conditions: string[] = [];

  if (params.where) {
    conditions.push(params.where);
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}

/**
 * Build complete SOQL query string
 */
function buildSoqlQuery(params: SalesforceQueryParams, objectName: string): string {
  const fields = params.fields?.join(', ') || '*';
  const where = buildWhereClause(params);
  const orderBy = params.orderBy ? `ORDER BY ${params.orderBy}` : '';
  const limit = params.limit ? `LIMIT ${params.limit}` : 'LIMIT 100';
  const offset = params.offset ? `OFFSET ${params.offset}` : '';

  return `SELECT ${fields} FROM ${objectName} ${where} ${orderBy} ${limit} ${offset}`.trim();
}

/**
 * List opportunities with optional filters and pagination
 */
export async function listOpportunities(
  params: SalesforceQueryParams = {},
  instanceUrl?: string
): Promise<ListResponse<SalesforceOpportunity>> {
  const soql = buildSoqlQuery(
    {
      ...params,
      fields: params.fields || [
        'Id', 'Name', 'AccountId', 'AccountName', 'StageName', 'Amount',
        'CloseDate', 'Probability', 'Type', 'LeadSource', 'NextStep',
        'Description', 'OwnerId', 'OwnerName', 'IsClosed', 'IsWon',
        'CreatedDate', 'LastModifiedDate'
      ],
      limit: params.limit || 100
    },
    OBJECT_NAME
  );
  const result = await executeQuery<SalesforceOpportunity>(soql, instanceUrl);

  return {
    records: result.records,
    total: result.totalSize,
    hasMore: !result.done,
    nextRecordsUrl: result.nextRecordsUrl,
  };
}

/**
 * Search opportunities by name
 */
export async function searchOpportunities(
  searchTerm: string,
  instanceUrl?: string
): Promise<ListResponse<SalesforceOpportunity>> {
  const escapedTerm = searchTerm.replace(/'/g, "\\'");
  const soql = `
    SELECT Id, Name, AccountId, AccountName, StageName, Amount, CloseDate, Probability, OwnerName
    FROM Opportunity
    WHERE Name LIKE '%${escapedTerm}%'
    LIMIT 100
  `.trim();

  const result = await executeQuery<SalesforceOpportunity>(soql, instanceUrl);

  return {
    records: result.records,
    total: result.totalSize,
    hasMore: false,
  };
}

/**
 * Get a single opportunity by ID
 */
export async function getOpportunity(
  oppId: string,
  fields?: string[],
  instanceUrl?: string
): Promise<APIResponse<SalesforceOpportunity>> {
  try {
    const fieldList = fields?.join(', ') || 'Id, Name, AccountId, AccountName, StageName, Amount, CloseDate, Probability, Type, LeadSource, NextStep, Description, ForecastCategory, OwnerId, OwnerName, IsClosed, IsWon, FiscalYear, FiscalQuarter, CreatedDate, LastModifiedDate';
    const soql = `SELECT ${fieldList} FROM Opportunity WHERE Id = '${oppId}' LIMIT 1`;
    const result = await executeQuery<SalesforceOpportunity>(soql, instanceUrl);

    if (result.records.length === 0) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Opportunity not found: ${oppId}`,
        },
      };
    }

    return {
      success: true,
      data: result.records[0],
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'API_ERROR',
        message: (error as Error).message,
      },
    };
  }
}

/**
 * Create a new opportunity
 */
export async function createOpportunity(
  input: SalesforceOpportunityCreateInput,
  instanceUrl?: string
): Promise<APIResponse<SalesforceOpportunity>> {
  const client = createApiClient(instanceUrl);

  try {
    const response = await client.post(`/sobjects/${OBJECT_NAME}`, input);
    return getOpportunity(response.data.id, undefined, instanceUrl);
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string; errorCode?: string } } };
    return {
      success: false,
      error: {
        code: err.response?.data?.errorCode || 'CREATE_FAILED',
        message: err.response?.data?.message || (error as Error).message,
      },
    };
  }
}

/**
 * Update an existing opportunity
 */
export async function updateOpportunity(
  input: SalesforceOpportunityUpdateInput,
  instanceUrl?: string
): Promise<APIResponse<SalesforceOpportunity>> {
  const client = createApiClient(instanceUrl);

  try {
    const { Id, ...data } = input;
    await client.patch(`/sobjects/${OBJECT_NAME}/${Id}`, data);
    return getOpportunity(Id, undefined, instanceUrl);
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string; errorCode?: string } } };
    return {
      success: false,
      error: {
        code: err.response?.data?.errorCode || 'UPDATE_FAILED',
        message: err.response?.data?.message || (error as Error).message,
      },
    };
  }
}

/**
 * Delete an opportunity
 */
export async function deleteOpportunity(
  oppId: string,
  instanceUrl?: string
): Promise<APIResponse<{ id: string; success: boolean }>> {
  const client = createApiClient(instanceUrl);

  try {
    await client.delete(`/sobjects/${OBJECT_NAME}/${oppId}`);
    return {
      success: true,
      data: {
        id: oppId,
        success: true,
      },
    };
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string; errorCode?: string } } };
    return {
      success: false,
      error: {
        code: err.response?.data?.errorCode || 'DELETE_FAILED',
        message: err.response?.data?.message || (error as Error).message,
      },
    };
  }
}

/**
 * Close an opportunity as Won
 */
export async function closeWon(
  oppId: string,
  closeDate?: string,
  instanceUrl?: string
): Promise<APIResponse<SalesforceOpportunity>> {
  const updateData: SalesforceOpportunityUpdateInput = {
    Id: oppId,
    StageName: 'Closed Won',
  };

  if (closeDate) {
    updateData.CloseDate = closeDate;
  }

  return updateOpportunity(updateData, instanceUrl);
}

/**
 * Close an opportunity as Lost
 */
export async function closeLost(
  oppId: string,
  closeDate?: string,
  lostReason?: string,
  instanceUrl?: string
): Promise<APIResponse<SalesforceOpportunity>> {
  const updateData: SalesforceOpportunityUpdateInput = {
    Id: oppId,
    StageName: 'Closed Lost',
  };

  if (closeDate) {
    updateData.CloseDate = closeDate;
  }

  if (lostReason) {
    updateData.Description = `Lost Reason: ${lostReason}`;
  }

  return updateOpportunity(updateData, instanceUrl);
}

/**
 * Get opportunity stage history (Audit History)
 */
export async function getOpportunityHistory(
  oppId: string,
  instanceUrl?: string
): Promise<ListResponse<Record<string, unknown>>> {
  const soql = `
    SELECT Id, Field, OldValue, NewValue, CreatedDate, CreatedById, CreatedBy.Name
    FROM OpportunityFieldHistory
    WHERE OpportunityId = '${oppId}'
    ORDER BY CreatedDate DESC
    LIMIT 50
  `.trim();

  const result = await executeQuery<Record<string, unknown>>(soql, instanceUrl);

  return {
    records: result.records,
    total: result.totalSize,
    hasMore: false,
  };
}

/**
 * Get opportunities by stage with amounts
 */
export async function getOpportunitiesByStage(
  instanceUrl?: string
): Promise<Record<string, { count: number; totalAmount: number }>> {
  const soql = `
    SELECT StageName, COUNT(Id) oppCount, SUM(Amount) totalAmount
    FROM Opportunity
    WHERE IsClosed = false
    GROUP BY StageName
  `.trim();

  const result = await executeQuery<{ StageName: string; oppCount: number; totalAmount: number }>(soql, instanceUrl);

  const stageMap: Record<string, { count: number; totalAmount: number }> = {};
  for (const record of result.records) {
    stageMap[record.StageName] = {
      count: record.oppCount,
      totalAmount: record.totalAmount || 0,
    };
  }

  return stageMap;
}

/**
 * Get opportunities for an account
 */
export async function getAccountOpportunities(
  accountId: string,
  instanceUrl?: string
): Promise<ListResponse<SalesforceOpportunity>> {
  const soql = `
    SELECT Id, Name, StageName, Amount, CloseDate, Probability, OwnerName
    FROM Opportunity
    WHERE AccountId = '${accountId}'
    ORDER BY CloseDate DESC
    LIMIT 50
  `.trim();

  const result = await executeQuery<SalesforceOpportunity>(soql, instanceUrl);

  return {
    records: result.records,
    total: result.totalSize,
    hasMore: false,
  };
}

export const opportunities = {
  listOpportunities,
  searchOpportunities,
  getOpportunity,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  closeWon,
  closeLost,
  getOpportunityHistory,
  getOpportunitiesByStage,
  getAccountOpportunities,
};

export default opportunities;