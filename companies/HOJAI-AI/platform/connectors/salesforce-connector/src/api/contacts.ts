/**
 * Salesforce Contacts API
 * CRUD operations for Salesforce Contact objects
 */

import { createApiClient, executeQuery, executeQueryAll } from './client.js';
import type {
  SalesforceContact,
  SalesforceContactCreateInput,
  SalesforceContactUpdateInput,
  SalesforceQueryParams,
  ListResponse,
  APIResponse,
} from '../types/index.js';

const OBJECT_NAME = 'Contact';

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
 * List contacts with optional filters and pagination
 */
export async function listContacts(
  params: SalesforceQueryParams = {},
  instanceUrl?: string
): Promise<ListResponse<SalesforceContact>> {
  const soql = buildSoqlQuery({ ...params, limit: params.limit || 100 }, OBJECT_NAME);
  const result = await executeQuery<SalesforceContact>(soql, instanceUrl);

  return {
    records: result.records,
    total: result.totalSize,
    hasMore: !result.done,
    nextRecordsUrl: result.nextRecordsUrl,
  };
}

/**
 * Search contacts using SOQL with full-text search
 */
export async function searchContacts(
  searchTerm: string,
  instanceUrl?: string
): Promise<ListResponse<SalesforceContact>> {
  const escapedTerm = searchTerm.replace(/'/g, "\\'");
  const soql = `
    SELECT Id, FirstName, LastName, Name, Email, Phone, Title, AccountId, AccountName, Department
    FROM Contact
    WHERE Name LIKE '%${escapedTerm}%'
       OR Email LIKE '%${escapedTerm}%'
       OR Title LIKE '%${escapedTerm}%'
    LIMIT 100
  `.trim();

  const result = await executeQuery<SalesforceContact>(soql, instanceUrl);

  return {
    records: result.records,
    total: result.totalSize,
    hasMore: false,
  };
}

/**
 * Get a single contact by ID
 */
export async function getContact(
  contactId: string,
  fields?: string[],
  instanceUrl?: string
): Promise<APIResponse<SalesforceContact>> {
  try {
    const fieldList = fields?.join(', ') || 'Id, FirstName, LastName, Name, Email, Phone, Title, AccountId, AccountName, Department, ReportsToId, Birthdate, MailingStreet, MailingCity, MailingState, MailingPostalCode, MailingCountry, Description, CreatedDate, LastModifiedDate';
    const soql = `SELECT ${fieldList} FROM Contact WHERE Id = '${contactId}' LIMIT 1`;
    const result = await executeQuery<SalesforceContact>(soql, instanceUrl);

    if (result.records.length === 0) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Contact not found: ${contactId}`,
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
 * Get contact by email
 */
export async function getContactByEmail(
  email: string,
  instanceUrl?: string
): Promise<APIResponse<SalesforceContact>> {
  try {
    const soql = `SELECT Id, FirstName, LastName, Name, Email, Phone, Title, AccountId, AccountName FROM Contact WHERE Email = '${email}' LIMIT 1`;
    const result = await executeQuery<SalesforceContact>(soql, instanceUrl);

    if (result.records.length === 0) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Contact not found with email: ${email}`,
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
 * Create a new contact
 */
export async function createContact(
  input: SalesforceContactCreateInput,
  instanceUrl?: string
): Promise<APIResponse<SalesforceContact>> {
  const client = createApiClient(instanceUrl);

  try {
    const response = await client.post(`/sobjects/${OBJECT_NAME}`, input);
    return getContact(response.data.id, undefined, instanceUrl);
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
 * Update an existing contact
 */
export async function updateContact(
  input: SalesforceContactUpdateInput,
  instanceUrl?: string
): Promise<APIResponse<SalesforceContact>> {
  const client = createApiClient(instanceUrl);

  try {
    const { Id, ...data } = input;
    await client.patch(`/sobjects/${OBJECT_NAME}/${Id}`, data);
    return getContact(Id, undefined, instanceUrl);
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
 * Delete a contact
 */
export async function deleteContact(
  contactId: string,
  instanceUrl?: string
): Promise<APIResponse<{ id: string; success: boolean }>> {
  const client = createApiClient(instanceUrl);

  try {
    await client.delete(`/sobjects/${OBJECT_NAME}/${contactId}`);
    return {
      success: true,
      data: {
        id: contactId,
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
): Promise<ListResponse<SalesforceContact>> {
  const soql = `
    SELECT Id, FirstName, LastName, Name, Email, Phone, Title, Department
    FROM Contact
    WHERE AccountId = '${accountId}'
    ORDER BY LastName, FirstName
    LIMIT 100
  `.trim();

  const result = await executeQuery<SalesforceContact>(soql, instanceUrl);

  return {
    records: result.records,
    total: result.totalSize,
    hasMore: false,
  };
}

/**
 * Get activities (tasks and events) for a contact
 */
export async function getContactActivities(
  contactId: string,
  instanceUrl?: string
): Promise<ListResponse<Record<string, unknown>>> {
  const soql = `
    SELECT Id, Subject, ActivityDate, Status, Type, Description, WhoId, WhatId, CreatedDate
    FROM Task
    WHERE WhoId = '${contactId}'
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

export const contacts = {
  listContacts,
  searchContacts,
  getContact,
  getContactByEmail,
  createContact,
  updateContact,
  deleteContact,
  getAccountContacts,
  getContactActivities,
};

export default contacts;