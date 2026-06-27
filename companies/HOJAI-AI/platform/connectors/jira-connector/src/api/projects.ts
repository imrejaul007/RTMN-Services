/**
 * Jira Projects API
 * Project CRUD and related operations
 */

import type {
  JiraProject,
  JiraProjectCreate,
  JiraProjectUpdate,
  JiraProjectRole,
  JiraComponent,
  JiraVersion,
  JiraIssueType,
  JiraUser,
} from '../types/index.js';
import { jiraGet, jiraPost, jiraPut, jiraDelete, validateConfig } from './client.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('jira-projects');

// ============================================================================
// Project Listing
// ============================================================================

export interface ListProjectsParams {
  expand?: string;
  recent?: number;
  typeKey?: string;
}

/**
 * List all projects the user has access to
 * GET /rest/api/3/project
 */
export async function listProjects(
  params?: ListProjectsParams
): Promise<JiraProject[]> {
  validateConfig();
  logger.info('Listing projects', { params });

  const projects = await jiraGet<JiraProject[]>('/rest/api/3/project', params);
  return projects;
}

/**
 * List recent projects
 */
export async function listRecentProjects(): Promise<JiraProject[]> {
  return listProjects({ recent: 10 });
}

// ============================================================================
// Project CRUD
// ============================================================================

/**
 * Get project details by key or ID
 * GET /rest/api/3/project/{projectIdOrKey}
 */
export async function getProject(
  projectKeyOrId: string,
  expand?: string[]
): Promise<JiraProject> {
  validateConfig();
  logger.info('Getting project', { projectKeyOrId, expand });

  const params: Record<string, string> = {};
  if (expand) {
    params.expand = expand.join(',');
  }

  const project = await jiraGet<JiraProject>(
    `/rest/api/3/project/${encodeURIComponent(projectKeyOrId)}`,
    params
  );
  return project;
}

/**
 * Create a new project
 * POST /rest/api/3/project
 */
export async function createProject(
  data: JiraProjectCreate
): Promise<JiraProject> {
  validateConfig();
  logger.info('Creating project', { key: data.key, name: data.name });

  const project = await jiraPost<JiraProject>('/rest/api/3/project', data);
  logger.info('Project created', { projectId: project.id, projectKey: project.key });
  return project;
}

/**
 * Update a project
 * PUT /rest/api/3/project/{projectIdOrKey}
 */
export async function updateProject(
  projectKeyOrId: string,
  data: JiraProjectUpdate
): Promise<JiraProject> {
  validateConfig();
  logger.info('Updating project', { projectKeyOrId });

  const project = await jiraPut<JiraProject>(
    `/rest/api/3/project/${encodeURIComponent(projectKeyOrId)}`,
    data
  );
  logger.info('Project updated', { projectKeyOrId });
  return project;
}

/**
 * Delete a project
 * DELETE /rest/api/3/project/{projectIdOrKey}
 */
export async function deleteProject(
  projectKeyOrId: string,
  enableUndo?: boolean
): Promise<void> {
  validateConfig();
  logger.info('Deleting project', { projectKeyOrId, enableUndo });

  const params: Record<string, boolean> = {};
  if (enableUndo !== undefined) {
    params.enableUndo = enableUndo;
  }

  await jiraDelete<void>(
    `/rest/api/3/project/${encodeURIComponent(projectKeyOrId)}`,
    params
  );
  logger.info('Project deleted', { projectKeyOrId });
}

// ============================================================================
// Project Issue Types
// ============================================================================

/**
 * Get all issue types for a project
 */
export async function getProjectIssueTypes(
  projectKeyOrId: string
): Promise<JiraIssueType[]> {
  validateConfig();
  logger.info('Getting project issue types', { projectKeyOrId });

  const project = await getProject(projectKeyOrId, ['issueTypes']);
  return project.issueTypes || [];
}

// ============================================================================
// Project Roles
// ============================================================================

/**
 * Get all project roles
 * GET /rest/api/3/project/{projectIdOrKey}/role
 */
export async function getProjectRoles(
  projectKeyOrId: string
): Promise<Record<string, string>> {
  validateConfig();
  logger.info('Getting project roles', { projectKeyOrId });

  const roles = await jiraGet<Record<string, string>>(
    `/rest/api/3/project/${encodeURIComponent(projectKeyOrId)}/role`
  );
  return roles;
}

/**
 * Get details for a specific project role
 * GET /rest/api/3/project/{projectIdOrKey}/role/{roleId}
 */
export async function getProjectRole(
  projectKeyOrId: string,
  roleId: number
): Promise<JiraProjectRole> {
  validateConfig();
  logger.info('Getting project role', { projectKeyOrId, roleId });

  const role = await jiraGet<JiraProjectRole>(
    `/rest/api/3/project/${encodeURIComponent(projectKeyOrId)}/role/${roleId}`
  );
  return role;
}

/**
 * Get actors for a project role
 */
export async function getProjectRoleActors(
  projectKeyOrId: string,
  roleId: number
): Promise<JiraProjectRole> {
  return getProjectRole(projectKeyOrId, roleId);
}

// ============================================================================
// Project Components
// ============================================================================

/**
 * Get all components for a project
 * GET /rest/api/3/project/{projectIdOrKey}/component
 */
export async function getProjectComponents(
  projectKeyOrId: string
): Promise<JiraComponent[]> {
  validateConfig();
  logger.info('Getting project components', { projectKeyOrId });

  const components = await jiraGet<JiraComponent[]>(
    `/rest/api/3/project/${encodeURIComponent(projectKeyOrId)}/component`
  );
  return components;
}

/**
 * Create a component in a project
 * POST /rest/api/3/component
 */
export async function createComponent(
  data: {
    name: string;
    description?: string;
    leadAccountId?: string;
    leadUserName?: string;
    project: string;
    assigneeType?: string;
  }
): Promise<JiraComponent> {
  validateConfig();
  logger.info('Creating component', { name: data.name, project: data.project });

  const component = await jiraPost<JiraComponent>('/rest/api/3/component', data);
  return component;
}

/**
 * Update a component
 * PUT /rest/api/3/component/{componentId}
 */
export async function updateComponent(
  componentId: string,
  data: {
    name?: string;
    description?: string;
    leadAccountId?: string;
    leadUserName?: string;
    assigneeType?: string;
  }
): Promise<JiraComponent> {
  validateConfig();
  logger.info('Updating component', { componentId });

  const component = await jiraPut<JiraComponent>(
    `/rest/api/3/component/${encodeURIComponent(componentId)}`,
    data
  );
  return component;
}

/**
 * Delete a component
 * DELETE /rest/api/3/component/{componentId}
 */
export async function deleteComponent(componentId: string): Promise<void> {
  validateConfig();
  logger.info('Deleting component', { componentId });

  await jiraDelete<void>(
    `/rest/api/3/component/${encodeURIComponent(componentId)}`
  );
}

// ============================================================================
// Project Versions
// ============================================================================

/**
 * Get all versions for a project
 * GET /rest/api/3/project/{projectIdOrKey}/version
 */
export async function getProjectVersions(
  projectKeyOrId: string,
  expand?: string
): Promise<JiraVersion[]> {
  validateConfig();
  logger.info('Getting project versions', { projectKeyOrId, expand });

  const params: Record<string, string> = {};
  if (expand) {
    params.expand = expand;
  }

  const versions = await jiraGet<JiraVersion[]>(
    `/rest/api/3/project/${encodeURIComponent(projectKeyOrId)}/version`,
    params
  );
  return versions;
}

/**
 * Create a version in a project
 * POST /rest/api/3/version
 */
export async function createVersion(
  data: {
    name: string;
    description?: string;
    project: string;
    releaseDate?: string;
    startDate?: string;
    archived?: boolean;
    released?: boolean;
  }
): Promise<JiraVersion> {
  validateConfig();
  logger.info('Creating version', { name: data.name, project: data.project });

  const version = await jiraPost<JiraVersion>('/rest/api/3/version', data);
  return version;
}

/**
 * Update a version
 * PUT /rest/api/3/version/{versionId}
 */
export async function updateVersion(
  versionId: string,
  data: {
    name?: string;
    description?: string;
    releaseDate?: string;
    startDate?: string;
    archived?: boolean;
    released?: boolean;
  }
): Promise<JiraVersion> {
  validateConfig();
  logger.info('Updating version', { versionId });

  const version = await jiraPut<JiraVersion>(
    `/rest/api/3/version/${encodeURIComponent(versionId)}`,
    data
  );
  return version;
}

/**
 * Delete a version
 * DELETE /rest/api/3/version/{versionId}
 */
export async function deleteVersion(
  versionId: string,
  moveFixIssuesTo?: string,
  moveAffectedIssuesTo?: string
): Promise<void> {
  validateConfig();
  logger.info('Deleting version', { versionId, moveFixIssuesTo, moveAffectedIssuesTo });

  const params: Record<string, string> = {};
  if (moveFixIssuesTo) {
    params.moveFixIssuesTo = moveFixIssuesTo;
  }
  if (moveAffectedIssuesTo) {
    params.moveAffectedIssuesTo = moveAffectedIssuesTo;
  }

  await jiraDelete<void>(
    `/rest/api/3/version/${encodeURIComponent(versionId)}`,
    params
  );
}

// ============================================================================
// Project Users
// ============================================================================

/**
 * Get users assigned to a project
 * GET /rest/api/3/project/{projectIdOrKey}/property
 */
export async function getProjectUsers(
  projectKeyOrId: string,
  role?: string
): Promise<JiraUser[]> {
  validateConfig();
  logger.info('Getting project users', { projectKeyOrId, role });

  // Get project roles first
  const roles = await getProjectRoles(projectKeyOrId);

  // If a specific role is requested, get that role's actors
  if (role) {
    const roleUrl = roles[role];
    if (roleUrl) {
      const roleDetails = await getProjectRole(projectKeyOrId, parseInt(role, 10));
      return (roleDetails.actors || []).map(actor => actor.actorUser!).filter(Boolean);
    }
  }

  // Otherwise, collect all users from all roles
  const allUsers = new Map<string, JiraUser>();

  for (const [roleName, roleUrl] of Object.entries(roles)) {
    try {
      const roleId = roleUrl.split('/').pop();
      const roleDetails = await getProjectRole(projectKeyOrId, parseInt(roleId || '0', 10));
      for (const actor of roleDetails.actors || []) {
        if (actor.actorUser) {
          allUsers.set(actor.actorUser.accountId || actor.actorUser.key || '', actor.actorUser);
        }
      }
    } catch (error) {
      logger.warn(`Failed to get role ${roleName}`, { error });
    }
  }

  return Array.from(allUsers.values());
}

// ============================================================================
// Project Notifications
// ============================================================================

/**
 * Get project notification scheme
 */
export async function getNotificationScheme(
  projectKeyOrId: string
): Promise<unknown> {
  validateConfig();
  logger.info('Getting notification scheme', { projectKeyOrId });

  const project = await getProject(projectKeyOrId);
  if (!project.notificationScheme) {
    throw new Error('Project does not have a notification scheme');
  }

  const notificationScheme = await jiraGet<unknown>(project.notificationScheme);
  return notificationScheme;
}

/**
 * Get project permission scheme
 */
export async function getPermissionScheme(
  projectKeyOrId: string
): Promise<unknown> {
  validateConfig();
  logger.info('Getting permission scheme', { projectKeyOrId });

  const project = await getProject(projectKeyOrId);
  if (!project.permissionScheme) {
    throw new Error('Project does not have a permission scheme');
  }

  const permissionScheme = await jiraGet<unknown>(project.permissionScheme);
  return permissionScheme;
}