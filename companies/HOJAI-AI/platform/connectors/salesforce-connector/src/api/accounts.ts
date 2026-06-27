/**
 * Salesforce Accounts API
 * CRUD operations for Salesforce Account objects
 */

import { createApiClient, executeQuery, executeQueryAll } from './client.js';
import type {
  SalesforceAccount,
  SalesforceAccountCreateInput,
  SalesforceAccountUpdateInput,
  SalesforceQueryParams,
  ListResponse,
  APIResponse,
} from '../types/index.js';

const OBJECT_NAME = 'Account';

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
 * List accounts with optional filters and pagination
 */
export async function listAccounts(
  params: SalesforceQueryParams = {},
  instanceUrl?: string
): Promise<ListResponse<SalesforceAccount>> {
  const soql = buildSoqlQuery(
    {
      ...params,
      fields: params.fields || [
        'Id', 'Name', 'Type', 'Industry', 'AnnualRevenue', 'NumberOfEmployees',
        'Description', 'Website', 'Phone', 'BillingCity', 'BillingState',
        'OwnerId', 'CreatedDate', 'LastModifiedDate'
      ],
      limit: params.limit || 100
    },
    OBJECT_NAME
  );
  const result = await executeQuery<SalesforceAccount>(soql, instanceUrl);

  return {
    records: result.records,
    total: result.totalSize,
    hasMore: !result.done,
    nextRecordsUrl: result.nextRecordsUrl,
  };
}

/**
 * Search accounts by name or website
 */
export async function searchAccounts(
  searchTerm: string,
  instanceUrl?: string
): Promise<ListResponse<SalesforceAccount>> {
  const escapedTerm = searchTerm.replace(/'/g, "\\'");
  const soql = `
    SELECT Id, Name, Type, Industry, Website, Phone, BillingCity, BillingState
    FROM Account
    WHERE Name LIKE '%${escapedTerm}%'
       OR Website LIKE '%${escapedTerm}%'
    LIMIT 100
  `.trim();

  const result = await executeQuery<SalesforceAccount>(soql, instanceUrl);

  return {
    records: result.records,
    total: result.totalSize,
    hasMore: false,
  };
}

/**
 * Get a single account by ID
 */
export async function getAccount(
  accountId: string,
  fields?: string[],
  instanceUrl?: string
): Promise<APIResponse<SalesforceAccount>> {
  try {
    const fieldList = fields?.join(', ') || 'Id, Name, Type, Industry, AnnualRevenue, NumberOfEmployees, Description, Website, Phone, Fax, BillingStreet, BillingCity, BillingState, BillingPostalCode, BillingCountry, ShippingStreet, ShippingCity, ShippingState, ShippingPostalCode, ShippingCountry, OwnerId, CreatedDate, LastModifiedDate';
    const soql = `SELECT ${fieldList} FROM Account WHERE Id = '${accountId}' LIMIT 1`;
    const result = await executeQuery<SalesforceAccount>(soql, instanceUrl);

    if (result.records.length === 0) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Account not found: ${accountId}`,
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
 * Get account by name
 */
export async function getAccountByName(
  name: string,
  instanceUrl?: string
): Promise<APIResponse<SalesforceAccount>> {
  try {
    const escapedName = name.replace(/'/g, "\\'");
    const soql = `SELECT Id, Name, Type, Industry, Website, Phone FROM Account WHERE Name = '${escapedName}' LIMIT 1`;
    const result = await executeQuery<SalesforceAccount>(soql, instanceUrl);

    if (result.records.length === 0) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Account not found: ${name}`,
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
 * Create a new account
 */
export async function createAccount(
  input: SalesforceAccountCreateInput,
  instanceUrl?: string
): Promise<APIResponse<SalesforceAccount>> {
  const client = createApiClient(instanceUrl);

  try {
    const response = await client.post(`/sobjects/${OBJECT_NAME}`, input);
    return getAccount(response.data.id, undefined, instanceUrl);
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
 * Update an existing account
 */
export async function updateAccount(
  input: SalesforceAccountUpdateInput,
  instanceUrl?: string
): Promise<APIResponse<SalesforceAccount>> {
  const client = createApiClient(instanceUrl);

  try {
    const { Id, ...data } = input;
    await client.patch(`/sobjects/${OBJECT_NAME}/${Id}`, data);
    return getAccount(Id, undefined, instanceUrl);
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
 * Delete an account
 */
export async function deleteAccount(
  accountId: string,
  instanceUrl?: string
): Promise<APIResponse<{ id: string; success: boolean }>> {
  const client = createApiClient(instanceUrl);

  try {
    await client.delete(`/sobjects/${OBJECT_NAME}/${accountId}`);
    return {
      success: true,
      data: {
        id: accountId,
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
 * Get contacts for an account
 */
export async function getAccountContacts(
  accountId: string,
  instanceUrl?: string
): Promise<ListResponse<Record<string, unknown>>> {
  const soql = `
    SELECT Id, FirstName, LastName, Name, Email, Phone, Title, Department
    FROM Contact
    WHERE AccountId = '${accountId}'
    ORDER BY LastName, FirstName
    LIMIT 100
  `.trim();

  const result = await executeQuery<Record<string, unknown>>(soql, instanceUrl);

  return {
    records: result.records,
    total: result.totalSize,
    hasMore: false,
  };
}

/**
 * Get opportunities for an account
 */
export async function getAccountOpportunities(
  accountId: string,
  instanceUrl?: string
): Promise<ListResponse<Record<string, unknown>>> {
  const soql = `
    SELECT Id, Name, StageName, Amount, CloseDate, Probability, OwnerName
    FROM Opportunity
    WHERE AccountId = '${accountId}'
    ORDER BY CloseDate DESC
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
 * Get account hierarchy (parent and children)
 */
export async function getAccountHierarchy(
  accountId: string,
  instanceUrl?: string
): Promise<{ parent?: SalesforceAccount; children: SalesforceAccount[] }> {
  // Get the account and its parent
  const accountResult = await getAccount(accountId, undefined, instanceUrl);
  if (!accountResult.success || !accountResult.data) {
    return { children: [] };
  }

  const account = accountResult.data;

  // Get parent account if exists
  let parent: SalesforceAccount | undefined;
  if ('ParentId' in account && (account as unknown as { ParentId?: string }).ParentId) {
    const parentResult = await getAccount((account as unknown as { ParentId: string }).ParentId, undefined, instanceUrl);
    if (parentResult.success) {
      parent = parentResult.data;
    }
  }

  // Get child accounts
  const childrenSoql = `
    SELECT Id, Name, Type, Industry, Website, Phone
    FROM Account
    WHERE ParentId = '${accountId}'
    ORDER BY Name
  `.trim();

  const childrenResult = await executeQuery<SalesforceAccount>(childrenSoql, instanceUrl);

  return {
    parent,
    children: childrenResult.records,
  };
}

/**
 * Get account revenue summary
 */
export async function getAccountRevenueSummary(
  accountId: string,
  instanceUrl?: string
): Promise<{
  totalRevenue: number;
  openOpportunities: number;
  closedWonThisYear: number;
  lastActivityDate?: string;
}> {
  const soql = `
    SELECT
      SUM(Amount) totalRevenue,
      COUNT(CASE WHEN IsClosed = false THEN 1 END) openOpps,
      COUNT(CASE WHEN IsWon = true AND CALENDAR_YEAR(CloseDate) = THIS_YEAR THEN 1 END) closedWon
    FROM Opportunity
    WHERE AccountId = '${accountId}'
  `.trim();

  const result = await executeQuery<{
    totalRevenue: number;
    openOpps: number;
    closedWon: number;
  }>(soql, instanceUrl);

  const record = result.records[0];

  return {
    totalRevenue: record?.totalRevenue || 0,
    openOpportunities: record?.openOpps || 0,
    closedWonThisYear: record?.closedWon || 0,
  };
}

export const accounts = {
  listAccounts,
  searchAccounts,
  getAccount,
  getAccountByName,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountContacts,
  getAccountOpportunities,
  getAccountHierarchy,
  getAccountRevenueSummary,
};

export default accounts;