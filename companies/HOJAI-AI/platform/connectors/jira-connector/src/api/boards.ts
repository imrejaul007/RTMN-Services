/**
 * Jira Boards API
 * Board management for Scrum and Kanban
 */

import type {
  JiraBoard,
  JiraBoardConfiguration,
  JiraIssue,
  JiraSprint,
} from '../types/index.js';
import {
  jiraGet,
  jiraPost,
  jiraPut,
  jiraDelete,
  validateConfig,
  fetchAllPages,
  PaginatedResult,
} from './client.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('jira-boards');

// ============================================================================
// Board Listing
// ============================================================================

export interface ListBoardsParams {
  type?: 'scrum' | 'kanban' | 'simple';
  name?: string;
  projectKeyOrId?: string;
  startAt?: number;
  maxResults?: number;
}

/**
 * List all boards the user has access to
 * GET /rest/agile/1.0/board
 */
export async function listBoards(
  params?: ListBoardsParams
): Promise<{ values: JiraBoard[]; maxResults: number; startAt: number; total: number; isLast: boolean }> {
  validateConfig();
  logger.info('Listing boards', { params });

  const searchParams: Record<string, unknown> = {
    startAt: params?.startAt ?? 0,
    maxResults: params?.maxResults ?? 50,
  };

  if (params?.type) {
    searchParams.type = params.type;
  }

  if (params?.name) {
    searchParams.name = params.name;
  }

  if (params?.projectKeyOrId) {
    searchParams.projectKeyOrId = params.projectKeyOrId;
  }

  const response = await jiraGet<{
    values: JiraBoard[];
    maxResults: number;
    startAt: number;
    total: number;
    isLast: boolean;
  }>(
    '/rest/agile/1.0/board',
    searchParams
  );
  return response;
}

/**
 * Get all boards (handles pagination)
 */
export async function listAllBoards(
  params?: Omit<ListBoardsParams, 'startAt' | 'maxResults'>
): Promise<JiraBoard[]> {
  const allBoards: JiraBoard[] = await fetchAllPages(
    async (startAt, maxResults) => {
      const result = await listBoards({ ...params, startAt, maxResults });
      return {
        values: result.values,
        startAt: result.startAt,
        maxResults: result.maxResults,
        total: result.total,
        isLast: result.isLast,
      };
    },
    100
  );
  return allBoards;
}

/**
 * Get Scrum boards
 */
export async function listScrumBoards(projectKeyOrId?: string): Promise<JiraBoard[]> {
  return listAllBoards({ type: 'scrum', projectKeyOrId });
}

/**
 * Get Kanban boards
 */
export async function listKanbanBoards(projectKeyOrId?: string): Promise<JiraBoard[]> {
  return listAllBoards({ type: 'kanban', projectKeyOrId });
}

// ============================================================================
// Board CRUD
// ============================================================================

/**
 * Get board details
 * GET /rest/agile/1.0/board/{boardId}
 */
export async function getBoard(boardId: number): Promise<JiraBoard> {
  validateConfig();
  logger.info('Getting board', { boardId });

  const board = await jiraGet<JiraBoard>(`/rest/agile/1.0/board/${boardId}`);
  return board;
}

/**
 * Get board configuration
 * GET /rest/agile/1.0/board/{boardId}/configuration
 */
export async function getBoardConfiguration(
  boardId: number
): Promise<JiraBoardConfiguration> {
  validateConfig();
  logger.info('Getting board configuration', { boardId });

  const config = await jiraGet<JiraBoardConfiguration>(
    `/rest/agile/1.0/board/${boardId}/configuration`
  );
  return config;
}

/**
 * Create a board
 * POST /rest/agile/1.0/board
 */
export async function createBoard(data: {
  name: string;
  type: 'scrum' | 'kanban';
  filterId: number;
  location?: {
    type: 'user' | 'project';
    projectKeyOrId?: string;
    userKey?: string;
  };
}): Promise<JiraBoard> {
  validateConfig();
  logger.info('Creating board', { name: data.name, type: data.type });

  const board = await jiraPost<JiraBoard>('/rest/agile/1.0/board', data);
  logger.info('Board created', { boardId: board.id, name: board.name });
  return board;
}

/**
 * Delete a board
 * DELETE /rest/agile/1.0/board/{boardId}
 */
export async function deleteBoard(boardId: number): Promise<void> {
  validateConfig();
  logger.info('Deleting board', { boardId });

  await jiraDelete<void>(`/rest/agile/1.0/board/${boardId}`);
  logger.info('Board deleted', { boardId });
}

/**
 * Rename a board
 */
export async function renameBoard(
  boardId: number,
  name: string
): Promise<JiraBoard> {
  validateConfig();
  logger.info('Renaming board', { boardId, name });

  const board = await jiraPut<JiraBoard>(
    `/rest/agile/1.0/board/${boardId}`,
    { name }
  );
  logger.info('Board renamed', { boardId });
  return board;
}

// ============================================================================
// Board Issues
// ============================================================================

export interface GetBoardIssuesParams {
  startAt?: number;
  maxResults?: number;
  jql?: string;
  fields?: string[];
  expand?: string[];
}

/**
 * Get issues on a board
 * GET /rest/agile/1.0/board/{boardId}/issue
 */
export async function getBoardIssues(
  boardId: number,
  params?: GetBoardIssuesParams
): Promise<{
  issues: JiraIssue[];
  maxResults: number;
  startAt: number;
  total: number;
  isLast: boolean;
}> {
  validateConfig();
  logger.info('Getting board issues', { boardId, params });

  const searchParams: Record<string, unknown> = {
    startAt: params?.startAt ?? 0,
    maxResults: params?.maxResults ?? 50,
  };

  if (params?.jql) {
    searchParams.jql = params.jql;
  }

  if (params?.fields) {
    searchParams.fields = params.fields.join(',');
  }

  if (params?.expand) {
    searchParams.expand = params.expand.join(',');
  }

  const response = await jiraGet<{
    issues: JiraIssue[];
    maxResults: number;
    startAt: number;
    total: number;
    isLast: boolean;
  }>(
    `/rest/agile/1.0/board/${boardId}/issue`,
    searchParams
  );
  return response;
}

/**
 * Get all issues on a board (handles pagination)
 */
export async function getAllBoardIssues(
  boardId: number,
  params?: Omit<GetBoardIssuesParams, 'startAt' | 'maxResults'>
): Promise<JiraIssue[]> {
  const allIssues: JiraIssue[] = await fetchAllPages(
    async (startAt, maxResults) => {
      const result = await getBoardIssues(boardId, { ...params, startAt, maxResults });
      return {
        values: result.issues,
        startAt: result.startAt,
        maxResults: result.maxResults,
        total: result.total,
        isLast: result.isLast,
      };
    },
    100
  );
  return allIssues;
}

// ============================================================================
// Board Sprints
// ============================================================================

/**
 * Get sprints for a board
 * GET /rest/agile/1.0/board/{boardId}/sprint
 */
export async function getBoardSprints(
  boardId: number,
  params?: {
    state?: 'active' | 'closed' | 'future';
    startAt?: number;
    maxResults?: number;
  }
): Promise<{
  values: JiraSprint[];
  maxResults: number;
  startAt: number;
  total: number;
  isLast: boolean;
}> {
  validateConfig();
  logger.info('Getting board sprints', { boardId, params });

  const searchParams: Record<string, unknown> = {
    startAt: params?.startAt ?? 0,
    maxResults: params?.maxResults ?? 50,
  };

  if (params?.state) {
    searchParams.state = params.state;
  }

  const response = await jiraGet<{
    values: JiraSprint[];
    maxResults: number;
    startAt: number;
    total: number;
    isLast: boolean;
  }>(
    `/rest/agile/1.0/board/${boardId}/sprint`,
    searchParams
  );
  return response;
}

/**
 * Get all sprints for a board (handles pagination)
 */
export async function getAllBoardSprints(
  boardId: number,
  state?: 'active' | 'closed' | 'future'
): Promise<JiraSprint[]> {
  const allSprints: JiraSprint[] = await fetchAllPages(
    async (startAt, maxResults) => {
      const result = await getBoardSprints(boardId, { state, startAt, maxResults });
      return {
        values: result.values,
        startAt: result.startAt,
        maxResults: result.maxResults,
        total: result.total,
        isLast: result.isLast,
      };
    },
    100
  );
  return allSprints;
}

// ============================================================================
// Board Projects
// ============================================================================

/**
 * Get projects linked to a board
 * GET /rest/agile/1.0/board/{boardId}/project
 */
export async function getBoardProjects(
  boardId: number
): Promise<{ values: { id: number; key: string; name: string }[] }> {
  validateConfig();
  logger.info('Getting board projects', { boardId });

  const response = await jiraGet<{
    values: { id: number; key: string; name: string }[];
  }>(
    `/rest/agile/1.0/board/${boardId}/project`
  );
  return response;
}

// ============================================================================
// Board Epics
// ============================================================================

/**
 * Get epics on a board
 * GET /rest/agile/1.0/board/{boardId}/epic
 */
export async function getBoardEpics(
  boardId: number,
  params?: {
    startAt?: number;
    maxResults?: number;
    done?: 'true' | 'false';
  }
): Promise<{
  values: JiraIssue[];
  maxResults: number;
  startAt: number;
  total: number;
  isLast: boolean;
}> {
  validateConfig();
  logger.info('Getting board epics', { boardId, params });

  const searchParams: Record<string, unknown> = {
    startAt: params?.startAt ?? 0,
    maxResults: params?.maxResults ?? 50,
  };

  if (params?.done !== undefined) {
    searchParams.done = params.done;
  }

  const response = await jiraGet<{
    values: JiraIssue[];
    maxResults: number;
    startAt: number;
    total: number;
    isLast: boolean;
  }>(
    `/rest/agile/1.0/board/${boardId}/epic`,
    searchParams
  );
  return response;
}

/**
 * Get issues in an epic
 * GET /rest/agile/1.0/board/{boardId}/epic/{epicId}/issue
 */
export async function getEpicIssues(
  boardId: number,
  epicId: number,
  params?: {
    startAt?: number;
    maxResults?: number;
    fields?: string[];
  }
): Promise<{
  issues: JiraIssue[];
  maxResults: number;
  startAt: number;
  total: number;
  isLast: boolean;
}> {
  validateConfig();
  logger.info('Getting epic issues', { boardId, epicId, params });

  const searchParams: Record<string, unknown> = {
    startAt: params?.startAt ?? 0,
    maxResults: params?.maxResults ?? 50,
  };

  if (params?.fields) {
    searchParams.fields = params.fields.join(',');
  }

  const response = await jiraGet<{
    issues: JiraIssue[];
    maxResults: number;
    startAt: number;
    total: number;
    isLast: boolean;
  }>(
    `/rest/agile/1.0/board/${boardId}/epic/${epicId}/issue`,
    searchParams
  );
  return response;
}

// ============================================================================
// Board Backlog
// ============================================================================

/**
 * Get backlog issues for a board
 * GET /rest/agile/1.0/board/{boardId}/backlog
 */
export async function getBoardBacklog(
  boardId: number,
  params?: {
    startAt?: number;
    maxResults?: number;
    fields?: string[];
  }
): Promise<{
  issues: JiraIssue[];
  maxResults: number;
  startAt: number;
  total: number;
  isLast: boolean;
}> {
  validateConfig();
  logger.info('Getting board backlog', { boardId, params });

  const searchParams: Record<string, unknown> = {
    startAt: params?.startAt ?? 0,
    maxResults: params?.maxResults ?? 50,
  };

  if (params?.fields) {
    searchParams.fields = params.fields.join(',');
  }

  const response = await jiraGet<{
    issues: JiraIssue[];
    maxResults: number;
    startAt: number;
    total: number;
    isLast: boolean;
  }>(
    `/rest/agile/1.0/board/${boardId}/backlog`,
    searchParams
  );
  return response;
}

/**
 * Rank issues in backlog (move to sprint or reorder)
 * PUT /rest/agile/1.0/board/{boardId}/rank
 */
export async function rankIssues(
  boardId: number,
  issues: string[],
  rankBeforeIssue?: string,
  rankAfterIssue?: string
): Promise<void> {
  validateConfig();
  logger.info('Ranking issues', { boardId, count: issues.length });

  const body: Record<string, unknown> = {
    issues,
  };

  if (rankBeforeIssue) {
    body.rankBeforeIssue = rankBeforeIssue;
  }

  if (rankAfterIssue) {
    body.rankAfterIssue = rankAfterIssue;
  }

  await jiraPut<void>(
    `/rest/agile/1.0/board/${boardId}/rank`,
    body
  );
  logger.info('Issues ranked', { boardId });
}