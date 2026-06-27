/**
 * Jira Issues API
 * Issue CRUD, search, transitions, comments, attachments, and worklogs
 */

import type {
  JiraIssue,
  JiraIssueCreate,
  JiraIssueUpdate,
  JiraIssueFields,
  JiraSearchParams,
  JiraSearchResult,
  JiraTransition,
  JiraTransitionRequest,
  JiraComment,
  JiraCommentCreate,
  JiraAttachment,
  JiraWorklog,
  JiraWorklogCreate,
  JiraWorklogUpdate,
  JiraUser,
  JiraContent,
} from '../types/index.js';
import {
  jiraGet,
  jiraPost,
  jiraPut,
  jiraDelete,
  jiraUpload,
  buildFieldsParam,
  buildExpandParam,
  validateConfig,
  fetchAllPages,
  PaginatedResult,
} from './client.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('jira-issues');

// ============================================================================
// Issue Search
// ============================================================================

/**
 * Search issues using JQL
 * GET /rest/api/3/search
 */
export async function searchIssues(
  jql?: string,
  params?: JiraSearchParams
): Promise<JiraSearchResult> {
  validateConfig();
  logger.info('Searching issues', { jql, params });

  const searchParams: Record<string, unknown> = {
    jql: jql || 'ORDER BY created DESC',
    ...params,
  };

  if (params?.expand) {
    searchParams.expand = buildExpandParam(params.expand);
  }

  if (params?.fields) {
    searchParams.fields = buildFieldsParam(params.fields);
  }

  const result = await jiraGet<JiraSearchResult>('/rest/api/3/search', searchParams);
  logger.info('Search complete', { total: result.total, returned: result.issues.length });
  return result;
}

/**
 * Search issues and return all results (handles pagination)
 */
export async function searchAllIssues(
  jql?: string,
  params?: JiraSearchParams
): Promise<JiraIssue[]> {
  validateConfig();
  logger.info('Searching all issues', { jql, params });

  const allIssues: JiraIssue[] = await fetchAllPages(
    async (startAt, maxResults) => {
      const result = await searchIssues(jql, { ...params, startAt, maxResults });
      return {
        values: result.issues,
        startAt: result.startAt,
        maxResults: result.maxResults,
        total: result.total,
        isLast: result.startAt + result.issues.length >= result.total,
      };
    },
    params?.maxResults || 100
  );

  return allIssues;
}

/**
 * Search issues by project
 */
export async function searchProjectIssues(
  projectKey: string,
  options?: {
    status?: string | string[];
    type?: string | string[];
    assignee?: string;
    reporter?: string;
    labels?: string | string[];
    sprint?: number;
    fixVersion?: string;
    createdAfter?: Date;
    createdBefore?: Date;
    updatedAfter?: Date;
    updatedBefore?: Date;
    fields?: string | string[];
    expand?: string | string[];
    startAt?: number;
    maxResults?: number;
  }
): Promise<JiraIssue[]> {
  const conditions: string[] = [`project = ${projectKey}`];

  if (options?.status) {
    const statuses = Array.isArray(options.status) ? options.status : [options.status];
    if (statuses.length === 1) {
      conditions.push(`status = "${statuses[0]}"`);
    } else {
      conditions.push(`status IN (${statuses.map(s => `"${s}"`).join(', ')})`);
    }
  }

  if (options?.type) {
    const types = Array.isArray(options.type) ? options.type : [options.type];
    if (types.length === 1) {
      conditions.push(`issuetype = "${types[0]}"`);
    } else {
      conditions.push(`issuetype IN (${types.map(t => `"${t}"`).join(', ')})`);
    }
  }

  if (options?.assignee) {
    conditions.push(`assignee = "${options.assignee}"`);
  }

  if (options?.reporter) {
    conditions.push(`reporter = "${options.reporter}"`);
  }

  if (options?.labels) {
    const labels = Array.isArray(options.labels) ? options.labels : [options.labels];
    conditions.push(`labels IN (${labels.map(l => `"${l}"`).join(', ')})`);
  }

  if (options?.sprint) {
    conditions.push(`sprint = ${options.sprint}`);
  }

  if (options?.fixVersion) {
    conditions.push(`fixVersion = "${options.fixVersion}"`);
  }

  if (options?.createdAfter) {
    conditions.push(`created >= "${options.createdAfter.toISOString()}"`);
  }

  if (options?.createdBefore) {
    conditions.push(`created <= "${options.createdBefore.toISOString()}"`);
  }

  if (options?.updatedAfter) {
    conditions.push(`updated >= "${options.updatedAfter.toISOString()}"`);
  }

  if (options?.updatedBefore) {
    conditions.push(`updated <= "${options.updatedBefore.toISOString()}"`);
  }

  const jql = conditions.join(' AND ');

  return searchAllIssues(jql, {
    fields: options?.fields,
    expand: options?.expand,
    startAt: options?.startAt,
    maxResults: options?.maxResults,
  });
}

// ============================================================================
// Issue CRUD
// ============================================================================

/**
 * Get issue by key or ID
 * GET /rest/api/3/issue/{issueIdOrKey}
 */
export async function getIssue(
  issueKeyOrId: string,
  options?: {
    fields?: string | string[];
    expand?: string | string[];
    properties?: string | string[];
    fieldsByKeys?: boolean;
    updateHistory?: boolean;
  }
): Promise<JiraIssue> {
  validateConfig();
  logger.info('Getting issue', { issueKeyOrId });

  const params: Record<string, unknown> = {};

  if (options?.fields) {
    params.fields = buildFieldsParam(options.fields);
  }

  if (options?.expand) {
    params.expand = buildExpandParam(options.expand);
  }

  if (options?.properties) {
    params.properties = Array.isArray(options.properties)
      ? options.properties.join(',')
      : options.properties;
  }

  if (options?.fieldsByKeys !== undefined) {
    params.fieldsByKeys = options.fieldsByKeys;
  }

  if (options?.updateHistory !== undefined) {
    params.updateHistory = options.updateHistory;
  }

  const issue = await jiraGet<JiraIssue>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}`,
    params
  );
  return issue;
}

/**
 * Get issue fields only (lighter weight)
 */
export async function getIssueFields(
  issueKeyOrId: string,
  fields?: string[]
): Promise<JiraIssueFields> {
  const issue = await getIssue(issueKeyOrId, { fields });
  return issue.fields!;
}

/**
 * Create a new issue
 * POST /rest/api/3/issue
 */
export async function createIssue(data: JiraIssueCreate): Promise<JiraIssue> {
  validateConfig();
  logger.info('Creating issue', {
    project: typeof data.fields.project === 'object' ? data.fields.project.key || data.fields.project.id : data.fields.project,
    summary: data.fields.summary,
    type: typeof data.fields.issuetype === 'object'
      ? (data.fields.issuetype as { name?: string }).name
      : data.fields.issuetype,
  });

  const issue = await jiraPost<JiraIssue>('/rest/api/3/issue', data);
  logger.info('Issue created', { key: issue.key, id: issue.id });
  return issue;
}

/**
 * Create multiple issues in one request
 * POST /rest/api/3/issue/bulk
 */
export async function createIssues(
  issues: JiraIssueCreate[]
): Promise<{ issues: JiraIssue[]; errors: unknown[] }> {
  validateConfig();
  logger.info('Creating bulk issues', { count: issues.length });

  const response = await jiraPost<{ issues: JiraIssue[]; errors: unknown[] }>(
    '/rest/api/3/issue/bulk',
    { issueUpdates: issues }
  );
  logger.info('Bulk issues created', {
    created: response.issues?.length || 0,
    errors: response.errors?.length || 0,
  });
  return response;
}

/**
 * Update an issue
 * PUT /rest/api/3/issue/{issueIdOrKey}
 */
export async function updateIssue(
  issueKeyOrId: string,
  data: JiraIssueUpdate
): Promise<JiraIssue> {
  validateConfig();
  logger.info('Updating issue', { issueKeyOrId });

  const issue = await jiraPut<JiraIssue>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}`,
    data
  );
  logger.info('Issue updated', { issueKeyOrId });
  return issue;
}

/**
 * Delete an issue
 * DELETE /rest/api/3/issue/{issueIdOrKey}
 */
export async function deleteIssue(
  issueKeyOrId: string,
  deleteSubtasks?: boolean
): Promise<void> {
  validateConfig();
  logger.info('Deleting issue', { issueKeyOrId, deleteSubtasks });

  const params: Record<string, boolean> = {};
  if (deleteSubtasks !== undefined) {
    params.deleteSubtasks = deleteSubtasks;
  }

  await jiraDelete<void>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}`,
    params
  );
  logger.info('Issue deleted', { issueKeyOrId });
}

// ============================================================================
// Issue Assignee
// ============================================================================

/**
 * Assign an issue to a user
 * PUT /rest/api/3/issue/{issueIdOrKey}/assignee
 */
export async function assignIssue(
  issueKeyOrId: string,
  accountId: string | null
): Promise<void> {
  validateConfig();
  logger.info('Assigning issue', { issueKeyOrId, accountId });

  await jiraPut<void>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/assignee`,
    { accountId }
  );
  logger.info('Issue assigned', { issueKeyOrId, accountId });
}

/**
 * Get the current assignee of an issue
 */
export async function getIssueAssignee(
  issueKeyOrId: string
): Promise<JiraUser | null> {
  const issue = await getIssue(issueKeyOrId, {
    fields: ['assignee'],
  });
  return issue.fields?.assignee || null;
}

// ============================================================================
// Issue Transitions
// ============================================================================

/**
 * Get available transitions for an issue
 * GET /rest/api/3/issue/{issueIdOrKey}/transitions
 */
export async function getIssueTransitions(
  issueKeyOrId: string,
  expand?: string
): Promise<JiraTransition[]> {
  validateConfig();
  logger.info('Getting transitions', { issueKeyOrId });

  const params: Record<string, string> = {};
  if (expand) {
    params.expand = expand;
  }

  const response = await jiraGet<{ transitions: JiraTransition[] }>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/transitions`,
    params
  );
  return response.transitions;
}

/**
 * Get transitions by name
 */
export async function getTransitionByName(
  issueKeyOrId: string,
  transitionName: string
): Promise<JiraTransition | null> {
  const transitions = await getIssueTransitions(issueKeyOrId);
  return transitions.find(t => t.name.toLowerCase() === transitionName.toLowerCase()) || null;
}

/**
 * Transition an issue
 * POST /rest/api/3/issue/{issueIdOrKey}/transitions
 */
export async function transitionIssue(
  issueKeyOrId: string,
  transitionId: string,
  data?: JiraTransitionRequest
): Promise<void> {
  validateConfig();
  logger.info('Transitioning issue', { issueKeyOrId, transitionId });

  const body: JiraTransitionRequest = {
    transition: { id: transitionId },
    ...data,
  };

  await jiraPost<void>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/transitions`,
    body
  );
  logger.info('Issue transitioned', { issueKeyOrId, transitionId });
}

/**
 * Transition an issue by transition name
 */
export async function transitionIssueByName(
  issueKeyOrId: string,
  transitionName: string,
  data?: JiraTransitionRequest
): Promise<void> {
  const transition = await getTransitionByName(issueKeyOrId, transitionName);
  if (!transition) {
    throw new Error(`Transition "${transitionName}" not found for issue ${issueKeyOrId}`);
  }
  await transitionIssue(issueKeyOrId, transition.id, data);
}

// ============================================================================
// Issue Comments
// ============================================================================

/**
 * Get comments for an issue
 * GET /rest/api/3/issue/{issueIdOrKey}/comment
 */
export async function getComments(
  issueKeyOrId: string,
  options?: {
    startAt?: number;
    maxResults?: number;
    expand?: string;
  }
): Promise<{ comments: JiraComment[]; total: number }> {
  validateConfig();
  logger.info('Getting comments', { issueKeyOrId });

  const params: Record<string, unknown> = {
    startAt: options?.startAt ?? 0,
    maxResults: options?.maxResults ?? 50,
  };

  if (options?.expand) {
    params.expand = options.expand;
  }

  const response = await jiraGet<{
    comments: JiraComment[];
    total: number;
    startAt: number;
    maxResults: number;
  }>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/comment`,
    params
  );
  return {
    comments: response.comments,
    total: response.total,
  };
}

/**
 * Get all comments (handles pagination)
 */
export async function getAllComments(
  issueKeyOrId: string
): Promise<JiraComment[]> {
  const allComments: JiraComment[] = await fetchAllPages(
    async (startAt, maxResults) => {
      const result = await getComments(issueKeyOrId, { startAt, maxResults });
      return {
        values: result.comments,
        startAt,
        maxResults,
        total: result.total,
        isLast: startAt + result.comments.length >= result.total,
      };
    }
  );
  return allComments;
}

/**
 * Add a comment to an issue
 * POST /rest/api/3/issue/{issueIdOrKey}/comment
 */
export async function addComment(
  issueKeyOrId: string,
  comment: JiraCommentCreate
): Promise<JiraComment> {
  validateConfig();
  logger.info('Adding comment', { issueKeyOrId });

  const newComment = await jiraPost<JiraComment>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/comment`,
    comment
  );
  logger.info('Comment added', { issueKeyOrId, commentId: newComment.id });
  return newComment;
}

/**
 * Update a comment
 * PUT /rest/api/3/issue/{issueIdOrKey}/comment/{commentId}
 */
export async function updateComment(
  issueKeyOrId: string,
  commentId: string,
  comment: JiraCommentCreate
): Promise<JiraComment> {
  validateConfig();
  logger.info('Updating comment', { issueKeyOrId, commentId });

  const updatedComment = await jiraPut<JiraComment>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/comment/${encodeURIComponent(commentId)}`,
    comment
  );
  return updatedComment;
}

/**
 * Delete a comment
 * DELETE /rest/api/3/issue/{issueIdOrKey}/comment/{commentId}
 */
export async function deleteComment(
  issueKeyOrId: string,
  commentId: string
): Promise<void> {
  validateConfig();
  logger.info('Deleting comment', { issueKeyOrId, commentId });

  await jiraDelete<void>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/comment/${encodeURIComponent(commentId)}`
  );
}

// ============================================================================
// Issue Attachments
// ============================================================================

/**
 * Add attachments to an issue
 * POST /rest/api/3/issue/{issueIdOrKey}/attachments
 */
export async function addAttachment(
  issueKeyOrId: string,
  files: { buffer: Buffer; filename: string; mimeType: string }[]
): Promise<JiraAttachment[]> {
  validateConfig();
  logger.info('Adding attachments', { issueKeyOrId, count: files.length });

  const attachments: JiraAttachment[] = [];

  for (const file of files) {
    const attachment = await jiraUpload<JiraAttachment>(
      `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/attachments`,
      file.buffer,
      file.filename,
      file.mimeType
    );
    attachments.push(attachment);
  }

  logger.info('Attachments added', { issueKeyOrId, added: attachments.length });
  return attachments;
}

/**
 * Get attachments for an issue
 */
export async function getAttachments(
  issueKeyOrId: string
): Promise<JiraAttachment[]> {
  const issue = await getIssue(issueKeyOrId, {
    fields: ['attachment'],
    expand: 'renderedFields',
  });
  return issue.fields?.attachment || [];
}

// ============================================================================
// Issue Worklogs
// ============================================================================

/**
 * Get worklogs for an issue
 * GET /rest/api/3/issue/{issueIdOrKey}/worklog
 */
export async function getWorklogs(
  issueKeyOrId: string,
  options?: {
    startAt?: number;
    maxResults?: number;
    expand?: string;
  }
): Promise<{ worklogs: JiraWorklog[]; total: number }> {
  validateConfig();
  logger.info('Getting worklogs', { issueKeyOrId });

  const params: Record<string, unknown> = {
    startAt: options?.startAt ?? 0,
    maxResults: options?.maxResults ?? 100,
  };

  if (options?.expand) {
    params.expand = options.expand;
  }

  const response = await jiraGet<{
    worklogs: JiraWorklog[];
    total: number;
    startAt: number;
    maxResults: number;
  }>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/worklog`,
    params
  );
  return {
    worklogs: response.worklogs,
    total: response.total,
  };
}

/**
 * Get all worklogs (handles pagination)
 */
export async function getAllWorklogs(
  issueKeyOrId: string
): Promise<JiraWorklog[]> {
  const allWorklogs: JiraWorklog[] = await fetchAllPages(
    async (startAt, maxResults) => {
      const result = await getWorklogs(issueKeyOrId, { startAt, maxResults });
      return {
        values: result.worklogs,
        startAt,
        maxResults,
        total: result.total,
        isLast: startAt + result.worklogs.length >= result.total,
      };
    }
  );
  return allWorklogs;
}

/**
 * Add a worklog to an issue
 * POST /rest/api/3/issue/{issueIdOrKey}/worklog
 */
export async function addWorklog(
  issueKeyOrId: string,
  data: JiraWorklogCreate
): Promise<JiraWorklog> {
  validateConfig();
  logger.info('Adding worklog', { issueKeyOrId, timeSpent: data.timeSpent });

  const worklog = await jiraPost<JiraWorklog>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/worklog`,
    data
  );
  logger.info('Worklog added', { issueKeyOrId, worklogId: worklog.id });
  return worklog;
}

/**
 * Update a worklog
 * PUT /rest/api/3/issue/{issueIdOrKey}/worklog/{worklogId}
 */
export async function updateWorklog(
  issueKeyOrId: string,
  worklogId: string,
  data: JiraWorklogUpdate
): Promise<JiraWorklog> {
  validateConfig();
  logger.info('Updating worklog', { issueKeyOrId, worklogId });

  const worklog = await jiraPut<JiraWorklog>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/worklog/${encodeURIComponent(worklogId)}`,
    data
  );
  return worklog;
}

/**
 * Delete a worklog
 * DELETE /rest/api/3/issue/{issueIdOrKey}/worklog/{worklogId}
 */
export async function deleteWorklog(
  issueKeyOrId: string,
  worklogId: string,
  adjustEstimate?: 'new' | 'leave' | 'manual' | string,
  newEstimate?: string
): Promise<void> {
  validateConfig();
  logger.info('Deleting worklog', { issueKeyOrId, worklogId });

  const params: Record<string, string> = {};
  if (adjustEstimate) {
    params.adjustEstimate = adjustEstimate;
  }
  if (newEstimate) {
    params.newEstimate = newEstimate;
  }

  await jiraDelete<void>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/worklog/${encodeURIComponent(worklogId)}`,
    params
  );
}

// ============================================================================
// Issue Links
// ============================================================================

/**
 * Get issue links
 */
export async function getIssueLinks(
  issueKeyOrId: string
): Promise<unknown[]> {
  const issue = await getIssue(issueKeyOrId, {
    expand: ['renderedFields'],
  });
  return (issue.fields as Record<string, unknown>)?.issuelinks as unknown[] || [];
}

/**
 * Link two issues
 * POST /rest/api/3/issueLink
 */
export async function linkIssues(
  data: {
    type: { name: string };
    inwardIssue: { key: string };
    outwardIssue: { key: string };
  }
): Promise<void> {
  validateConfig();
  logger.info('Linking issues', {
    type: data.type.name,
    inward: data.inwardIssue.key,
    outward: data.outwardIssue.key,
  });

  await jiraPost<void>('/rest/api/3/issueLink', data);
  logger.info('Issues linked');
}

// ============================================================================
// Issue Votes & Watches
// ============================================================================

/**
 * Get voters for an issue
 */
export async function getVoters(
  issueKeyOrId: string
): Promise<JiraUser[]> {
  validateConfig();
  logger.info('Getting voters', { issueKeyOrId });

  const response = await jiraGet<{ voters: JiraUser[] }>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/votes`
  );
  return response.voters;
}

/**
 * Add vote to an issue
 */
export async function addVote(
  issueKeyOrId: string
): Promise<void> {
  validateConfig();
  logger.info('Adding vote', { issueKeyOrId });

  await jiraPost<void>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/votes`
  );
}

/**
 * Remove vote from an issue
 */
export async function removeVote(
  issueKeyOrId: string
): Promise<void> {
  validateConfig();
  logger.info('Removing vote', { issueKeyOrId });

  await jiraDelete<void>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/votes`
  );
}

/**
 * Get watchers for an issue
 */
export async function getWatchers(
  issueKeyOrId: string
): Promise<{ watchers: JiraUser[]; isWatching: boolean; watchCount: number }> {
  validateConfig();
  logger.info('Getting watchers', { issueKeyOrId });

  const response = await jiraGet<{
    watchers: JiraUser[];
    isWatching: boolean;
    watchCount: number;
  }>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/watchers`
  );
  return response;
}

/**
 * Add watcher to an issue
 */
export async function addWatcher(
  issueKeyOrId: string,
  accountId: string
): Promise<void> {
  validateConfig();
  logger.info('Adding watcher', { issueKeyOrId, accountId });

  await jiraPost<void>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/watchers`,
    { accountId }
  );
}

/**
 * Remove watcher from an issue
 */
export async function removeWatcher(
  issueKeyOrId: string,
  accountId: string
): Promise<void> {
  validateConfig();
  logger.info('Removing watcher', { issueKeyOrId, accountId });

  await jiraDelete<void>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/watchers`,
    { accountId }
  );
}

// ============================================================================
// Issue Edit Metadata
// ============================================================================

/**
 * Get edit metadata for an issue
 */
export async function getEditMetadata(
  issueKeyOrId: string
): Promise<unknown> {
  validateConfig();
  logger.info('Getting edit metadata', { issueKeyOrId });

  const metadata = await jiraGet<unknown>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/editmeta`
  );
  return metadata;
}

// ============================================================================
// Remote Links
// ============================================================================

/**
 * Get remote links for an issue
 */
export async function getRemoteLinks(
  issueKeyOrId: string
): Promise<unknown[]> {
  validateConfig();
  logger.info('Getting remote links', { issueKeyOrId });

  const response = await jiraGet<{ links: unknown[] }>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/remotelink`
  );
  return response.links;
}

/**
 * Create a remote link
 */
export async function createRemoteLink(
  issueKeyOrId: string,
  link: {
    object: {
      url: string;
      title: string;
      summary?: string;
      icon?: {
        url16x16: string;
        title: string;
      };
    };
  }
): Promise<unknown> {
  validateConfig();
  logger.info('Creating remote link', { issueKeyOrId, url: link.object.url });

  const remoteLink = await jiraPost<unknown>(
    `/rest/api/3/issue/${encodeURIComponent(issueKeyOrId)}/remotelink`,
    link
  );
  return remoteLink;
}