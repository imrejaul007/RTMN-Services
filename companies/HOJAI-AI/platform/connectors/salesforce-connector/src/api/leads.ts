/**
 * Salesforce Leads API
 * CRUD operations for Salesforce Lead objects
 */

import { createApiClient } from './client.js';
import { executeQuery, executeQueryAll } from './client.js';
import type {
  SalesforceLead,
  SalesforceLeadCreateInput,
  SalesforceLeadUpdateInput,
  SalesforceQueryParams,
  ListResponse,
  APIResponse,
} from '../types/index.js';

const OBJECT_NAME = 'Lead';

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
 * List leads with optional filters and pagination
 */
export async function listLeads(
  params: SalesforceQueryParams = {},
  instanceUrl?: string
): Promise<ListResponse<SalesforceLead>> {
  const soql = buildSoqlQuery({ ...params, limit: params.limit || 100 }, OBJECT_NAME);
  const result = await executeQuery<SalesforceLead>(soql, instanceUrl);

  return {
    records: result.records,
    total: result.totalSize,
    hasMore: !result.done,
    nextRecordsUrl: result.nextRecordsUrl,
  };
}

/**
 * Search leads using SOQL with full-text search
 */
export async function searchLeads(
  searchTerm: string,
  instanceUrl?: string
): Promise<ListResponse<SalesforceLead>> {
  const escapedTerm = searchTerm.replace(/'/g, "\\'");
  const soql = `
    SELECT Id, FirstName, LastName, Name, Email, Phone, Company, Title, Status, Industry, CreatedDate
    FROM Lead
    WHERE Name LIKE '%${escapedTerm}%'
       OR Email LIKE '%${escapedTerm}%'
       OR Company LIKE '%${escapedTerm}%'
       OR Title LIKE '%${escapedTerm}%'
    LIMIT 100
  `.trim();

  const result = await executeQuery<SalesforceLead>(soql, instanceUrl);

  return {
    records: result.records,
    total: result.totalSize,
    hasMore: false,
  };
}

/**
 * Get a single lead by ID
 */
export async function getLead(
  leadId: string,
  fields?: string[],
  instanceUrl?: string
): Promise<APIResponse<SalesforceLead>> {
  const client = createApiClient(instanceUrl);

  try {
    const fieldList = fields?.join(', ') || 'Id, FirstName, LastName, Name, Email, Phone, Company, Title, Status, Industry, LeadSource, Rating, AnnualRevenue, NumberOfEmployees, CreatedDate, LastModifiedDate';
    const soql = `SELECT ${fieldList} FROM Lead WHERE Id = '${leadId}' LIMIT 1`;
    const result = await executeQuery<SalesforceLead>(soql, instanceUrl);

    if (result.records.length === 0) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Lead not found: ${leadId}`,
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
 * Create a new lead
 */
export async function createLead(
  input: SalesforceLeadCreateInput,
  instanceUrl?: string
): Promise<APIResponse<SalesforceLead>> {
  const client = createApiClient(instanceUrl);

  try {
    const response = await client.post(`/sobjects/${OBJECT_NAME}`, input);

    // Fetch the created record
    return getLead(response.data.id, undefined, instanceUrl);
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
 * Update an existing lead
 */
export async function updateLead(
  input: SalesforceLeadUpdateInput,
  instanceUrl?: string
): Promise<APIResponse<SalesforceLead>> {
  const client = createApiClient(instanceUrl);

  try {
    const { Id, ...data } = input;
    await client.patch(`/sobjects/${OBJECT_NAME}/${Id}`, data);

    // Fetch the updated record
    return getLead(Id, undefined, instanceUrl);
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
 * Delete a lead
 */
export async function deleteLead(
  leadId: string,
  instanceUrl?: string
): Promise<APIResponse<{ id: string; success: boolean }>> {
  const client = createApiClient(instanceUrl);

  try {
    await client.delete(`/sobjects/${OBJECT_NAME}/${leadId}`);

    return {
      success: true,
      data: {
        id: leadId,
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
 * Convert a lead to Contact, Account, and optionally Opportunity
 */
export async function convertLead(
  leadId: string,
  options: {
    accountId?: string;
    doNotCreateOpportunity?: boolean;
    opportunityName?: string;
    overwriteLeadSource?: boolean;
    ownerId?: string;
    sendNotificationEmail?: boolean;
  } = {},
  instanceUrl?: string
): Promise<APIResponse<{
  accountId: string;
  contactId: string;
  opportunityId?: string;
  leadId: string;
}>> {
  const client = createApiClient(instanceUrl);

  const payload: Record<string, unknown> = {
    leadId,
    convertedStatus: options.accountId ? undefined : 'Closed - Converted',
  };

  if (options.accountId) payload.accountId = options.accountId;
  if (options.doNotCreateOpportunity) payload.doNotCreateOpportunity = true;
  if (options.opportunityName) payload.opportunityName = options.opportunityName;
  if (options.overwriteLeadSource) payload.overwriteLeadSource = true;
  if (options.ownerId) payload.ownerId = options.ownerId;
  if (options.sendNotificationEmail) payload.sendNotificationEmail = true;

  try {
    const response = await client.post('/lead/convert', payload);

    return {
      success: true,
      data: response.data,
    };
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string; errorCode?: string } } };
    return {
      success: false,
      error: {
        code: err.response?.data?.errorCode || 'CONVERT_FAILED',
        message: err.response?.data?.message || (error as Error).message,
      },
    };
  }
}

/**
 * Get all leads (generator for pagination)
 */
export async function* getAllLeads(
  params: SalesforceQueryParams = {},
  instanceUrl?: string
): AsyncGenerator<SalesforceLead> {
  const soql = buildSoqlQuery(params, OBJECT_NAME);

  for await (const records of executeQueryAll<SalesforceLead>(soql, instanceUrl)) {
    yield* records;
  }
}

export const leads = {
  listLeads,
  searchLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  convertLead,
  getAllLeads,
};

export default leads;