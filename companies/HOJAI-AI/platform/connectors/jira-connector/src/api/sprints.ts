/**
 * Jira Sprints API
 * Sprint management for Scrum boards
 */

import type {
  JiraSprint,
  JiraSprintCreate,
  JiraSprintUpdate,
  JiraIssue,
  JiraSearchParams,
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

const logger = createLogger('jira-sprints');

// ============================================================================
// Sprint Listing
// ============================================================================

export interface ListSprintsParams {
  state?: 'active' | 'closed' | 'future';
  startAt?: number;
  maxResults?: number;
}

/**
 * List sprints for a board
 * GET /rest/agile/1.0/board/{boardId}/sprint
 */
export async function listSprints(
  boardId: number,
  params?: ListSprintsParams
): Promise<{ sprints: JiraSprint[]; maxResults: number; startAt: number; total: number; isLast: boolean }> {
  validateConfig();
  logger.info('Listing sprints', { boardId, params });

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
 * Get all sprints (handles pagination)
 */
export async function listAllSprints(
  boardId: number,
  state?: 'active' | 'closed' | 'future'
): Promise<JiraSprint[]> {
  const allSprints: JiraSprint[] = await fetchAllPages(
    async (startAt, maxResults) => {
      const result = await listSprints(boardId, { state, startAt, maxResults });
      return {
        values: result.sprints,
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

/**
 * Get active sprints for a board
 */
export async function getActiveSprints(boardId: number): Promise<JiraSprint[]> {
  return listAllSprints(boardId, 'active');
}

/**
 * Get closed sprints for a board
 */
export async function getClosedSprints(boardId: number): Promise<JiraSprint[]> {
  return listAllSprints(boardId, 'closed');
}

/**
 * Get future sprints for a board
 */
export async function getFutureSprints(boardId: number): Promise<JiraSprint[]> {
  return listAllSprints(boardId, 'future');
}

// ============================================================================
// Sprint CRUD
// ============================================================================

/**
 * Get sprint details
 * GET /rest/agile/1.0/sprint/{sprintId}
 */
export async function getSprint(sprintId: number): Promise<JiraSprint> {
  validateConfig();
  logger.info('Getting sprint', { sprintId });

  const sprint = await jiraGet<JiraSprint>(`/rest/agile/1.0/sprint/${sprintId}`);
  return sprint;
}

/**
 * Create a sprint
 * POST /rest/agile/1.0/sprint/{boardId}
 */
export async function createSprint(
  boardId: number,
  data: JiraSprintCreate
): Promise<JiraSprint> {
  validateConfig();
  logger.info('Creating sprint', { boardId, name: data.name });

  const sprint = await jiraPost<JiraSprint>(
    `/rest/agile/1.0/sprint/${boardId}`,
    data
  );
  logger.info('Sprint created', { sprintId: sprint.id, name: sprint.name });
  return sprint;
}

/**
 * Update a sprint
 * PUT /rest/agile/1.0/sprint/{sprintId}
 */
export async function updateSprint(
  sprintId: number,
  data: JiraSprintUpdate
): Promise<JiraSprint> {
  validateConfig();
  logger.info('Updating sprint', { sprintId, data });

  const sprint = await jiraPut<JiraSprint>(
    `/rest/agile/1.0/sprint/${sprintId}`,
    data
  );
  logger.info('Sprint updated', { sprintId });
  return sprint;
}

/**
 * Delete a sprint
 * DELETE /rest/agile/1.0/sprint/{sprintId}
 */
export async function deleteSprint(sprintId: number): Promise<void> {
  validateConfig();
  logger.info('Deleting sprint', { sprintId });

  await jiraDelete<void>(`/rest/agile/1.0/sprint/${sprintId}`);
  logger.info('Sprint deleted', { sprintId });
}

// ============================================================================
// Sprint State Transitions
// ============================================================================

/**
 * Start a sprint
 * POST /rest/agile/1.0/sprint/{sprintId}/activate
 */
export async function startSprint(sprintId: number): Promise<JiraSprint> {
  validateConfig();
  logger.info('Starting sprint', { sprintId });

  const sprint = await jiraPost<JiraSprint>(
    `/rest/agile/1.0/sprint/${sprintId}/activate`
  );
  logger.info('Sprint started', { sprintId });
  return sprint;
}

/**
 * Complete a sprint
 * POST /rest/agile/1.0/sprint/{sprintId}/complete
 */
export async function completeSprint(
  sprintId: number,
  options?: {
    filter?: string; // JQL to identify issues to move out
    moveToSprint?: number; // Sprint ID to move issues to
  }
): Promise<JiraSprint> {
  validateConfig();
  logger.info('Completing sprint', { sprintId, options });

  const body: Record<string, unknown> = {};
  if (options?.filter) {
    body['complete'] = { 'filter': { 'jql': options.filter } };
  }
  if (options?.moveToSprint) {
    body['moveToSprint'] = options.moveToSprint;
  }

  const sprint = await jiraPost<JiraSprint>(
    `/rest/agile/1.0/sprint/${sprintId}/complete`,
    Object.keys(body).length > 0 ? body : undefined
  );
  logger.info('Sprint completed', { sprintId });
  return sprint;
}

/**
 * Rename a sprint
 */
export async function renameSprint(
  sprintId: number,
  name: string
): Promise<JiraSprint> {
  return updateSprint(sprintId, { name });
}

/**
 * Update sprint dates
 */
export async function updateSprintDates(
  sprintId: number,
  startDate: Date,
  endDate: Date
): Promise<JiraSprint> {
  return updateSprint(sprintId, {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });
}

/**
 * Update sprint goal
 */
export async function updateSprintGoal(
  sprintId: number,
  goal: string
): Promise<JiraSprint> {
  return updateSprint(sprintId, { goal });
}

// ============================================================================
// Sprint Issues
// ============================================================================

export interface GetSprintIssuesParams {
  startAt?: number;
  maxResults?: number;
  jql?: string;
  fields?: string[];
  expand?: string[];
}

/**
 * Get issues in a sprint
 * GET /rest/agile/1.0/sprint/{sprintId}/issue
 */
export async function getSprintIssues(
  sprintId: number,
  params?: GetSprintIssuesParams
): Promise<{
  issues: JiraIssue[];
  maxResults: number;
  startAt: number;
  total: number;
  isLast: boolean;
}> {
  validateConfig();
  logger.info('Getting sprint issues', { sprintId, params });

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
    `/rest/agile/1.0/sprint/${sprintId}/issue`,
    searchParams
  );
  return response;
}

/**
 * Get all issues in a sprint (handles pagination)
 */
export async function getAllSprintIssues(
  sprintId: number,
  params?: Omit<GetSprintIssuesParams, 'startAt' | 'maxResults'>
): Promise<JiraIssue[]> {
  const allIssues: JiraIssue[] = await fetchAllPages(
    async (startAt, maxResults) => {
      const result = await getSprintIssues(sprintId, { ...params, startAt, maxResults });
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
// Bulk Issue Operations
// ============================================================================

/**
 * Move issues to a sprint
 * POST /rest/agile/1.0/sprint/{sprintId}/issue
 */
export async function moveIssuesToSprint(
  sprintId: number,
  issueKeys: string[]
): Promise<void> {
  validateConfig();
  logger.info('Moving issues to sprint', { sprintId, count: issueKeys.length });

  if (issueKeys.length === 0) {
    return;
  }

  await jiraPost<void>(
    `/rest/agile/1.0/sprint/${sprintId}/issue`,
    { issues: issueKeys }
  );
  logger.info('Issues moved to sprint', { sprintId, count: issueKeys.length });
}

/**
 * Remove issues from a sprint (move to backlog)
 * DELETE /rest/agile/1.0/sprint/{sprintId}/issue
 */
export async function removeIssuesFromSprint(
  sprintId: number,
  issueKeys: string[]
): Promise<void> {
  validateConfig();
  logger.info('Removing issues from sprint', { sprintId, count: issueKeys.length });

  if (issueKeys.length === 0) {
    return;
  }

  await jiraDelete<void>(
    `/rest/agile/1.0/sprint/${sprintId}/issue`,
    { issues: issueKeys }
  );
  logger.info('Issues removed from sprint', { sprintId, count: issueKeys.length });
}

// ============================================================================
// Sprint Analytics
// ============================================================================

export interface SprintAnalytics {
  sprintId: number;
  sprintName: string;
  state: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  issueCount: {
    total: number;
    completed: number;
    incomplete: number;
    removed: number;
  };
  points: {
    total: number;
    completed: number;
    incomplete: number;
    committed: number;
  };
  velocity: number;
  projectedCompletion?: number;
  daysRemaining?: number;
}

/**
 * Calculate sprint analytics
 */
export async function getSprintAnalytics(
  sprintId: number
): Promise<SprintAnalytics> {
  const sprint = await getSprint(sprintId);
  const issues = await getAllSprintIssues(sprintId, {
    fields: ['status', 'issuetype', 'story_points'],
    expand: ['renderedFields'],
  });

  // Calculate issue counts by status
  const statusCategory = new Map<string, number>();
  let totalPoints = 0;
  let completedPoints = 0;
  let incompletePoints = 0;
  let removedCount = 0;

  for (const issue of issues) {
    const statusKey = issue.fields?.statusCategory?.key || 'undefined';
    statusCategory.set(statusKey, (statusCategory.get(statusKey) || 0) + 1);

    const points = (issue.fields as Record<string, unknown>)?.customfield_10016 as number || 0;
    totalPoints += points;

    if (statusKey === 'done') {
      completedPoints += points;
    } else if (statusKey !== 'new') {
      // Issues that were in progress but not completed
      incompletePoints += points;
    }
  }

  // Check for removed issues (in audit log or changelog)
  // For now, we'll assume no removed issues

  const now = new Date();
  const endDate = sprint.endDate ? new Date(sprint.endDate) : null;
  const daysRemaining = endDate
    ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : undefined;

  // Calculate projected completion
  const daysElapsed = sprint.startDate
    ? Math.ceil((now.getTime() - new Date(sprint.startDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const projectedCompletion =
    daysElapsed > 0 && completedPoints > 0
      ? Math.ceil((totalPoints - completedPoints) / (completedPoints / daysElapsed))
      : undefined;

  return {
    sprintId: sprint.id,
    sprintName: sprint.name,
    state: sprint.state,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    completeDate: sprint.completeDate,
    issueCount: {
      total: issues.length,
      completed: statusCategory.get('done') || 0,
      incomplete: (statusCategory.get('indeterminate') || 0) + (statusCategory.get('new') || 0),
      removed: removedCount,
    },
    points: {
      total: totalPoints,
      completed: completedPoints,
      incomplete: incompletePoints,
      committed: totalPoints, // Assuming committed = total
    },
    velocity: completedPoints,
    projectedCompletion,
    daysRemaining: daysRemaining && daysRemaining > 0 ? daysRemaining : 0,
  };
}

/**
 * Get sprint velocity (completed points per sprint)
 */
export async function getSprintVelocity(
  boardId: number,
  maxSprints: number = 5
): Promise<{ sprintId: number; sprintName: string; velocity: number }[]> {
  const closedSprints = await getClosedSprints(boardId);
  const recentSprints = closedSprints.slice(-maxSprints);

  const velocities: { sprintId: number; sprintName: string; velocity: number }[] = [];

  for (const sprint of recentSprints) {
    const issues = await getAllSprintIssues(sprint.id, {
      fields: ['status', 'story_points'],
    });

    let velocity = 0;
    for (const issue of issues) {
      if (issue.fields?.statusCategory?.key === 'done') {
        velocity += (issue.fields as Record<string, unknown>)?.customfield_10016 as number || 0;
      }
    }

    velocities.push({
      sprintId: sprint.id,
      sprintName: sprint.name,
      velocity,
    });
  }

  return velocities;
}

/**
 * Calculate average velocity
 */
export async function getAverageVelocity(
  boardId: number,
  maxSprints: number = 5
): Promise<number> {
  const velocities = await getSprintVelocity(boardId, maxSprints);

  if (velocities.length === 0) {
    return 0;
  }

  const total = velocities.reduce((sum, v) => sum + v.velocity, 0);
  return Math.round(total / velocities.length);
}