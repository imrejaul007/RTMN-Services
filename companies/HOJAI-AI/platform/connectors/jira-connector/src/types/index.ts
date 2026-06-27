/**
 * Jira Connector Types
 * Complete TypeScript types for Jira REST API
 */

// ============================================================================
// Authentication Types
// ============================================================================

export interface JiraBasicAuth {
  type: 'basic';
  email: string;
  apiToken: string;
}

export interface JiraOAuth {
  type: 'oauth';
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface JiraTokenInfo {
  type: 'basic' | 'oauth';
  email?: string;
  connected: boolean;
  expiresAt?: number;
}

// ============================================================================
// Project Types
// ============================================================================

export interface JiraProject {
  expand?: string;
  self?: string;
  id: string;
  key: string;
  name: string;
  description?: string;
  lead?: JiraUser;
  leadName?: string;
  leadKey?: string;
  leadAccountId?: string;
  components?: JiraComponent[];
  versions?: JiraVersion[];
  issueTypes?: JiraIssueType[];
  avatarUrls?: Record<string, string>;
  projectTypeKey?: string;
  simplified?: boolean;
  style?: string;
  isPrivate?: boolean;
  properties?: Record<string, unknown>;
  entityId?: string;
  uuid?: string;
}

export interface JiraProjectCreate {
  key: string;
  name: string;
  description?: string;
  leadAccountId?: string;
  leadKey?: string;
  projectTypeKey?: 'software' | 'service_desk' | 'business';
  projectTemplateKey?: string;
  assigneeType?: 'PROJECT_LEAD' | 'UNASSIGNED';
  avatarId?: number;
  issueSecurityScheme?: number;
  permissionScheme?: number;
  notificationScheme?: number;
  categoryId?: number;
}

export interface JiraProjectUpdate {
  name?: string;
  description?: string;
  leadAccountId?: string;
  leadKey?: string;
  assigneeType?: 'PROJECT_LEAD' | 'UNASSIGNED';
}

export interface JiraComponent {
  self?: string;
  id: string;
  name: string;
  description?: string;
  lead?: JiraUser;
  leadUserName?: string;
  leadAccountId?: string;
  leadAccountType?: string;
  assigneeType?: string;
  assignee?: JiraUser;
  realAssigneeType?: string;
  realAssignee?: JiraUser;
  isAssigneeTypeValid?: boolean;
  project?: string;
  projectId?: number;
}

export interface JiraVersion {
  self?: string;
  id: string;
  name: string;
  description?: string;
  archived?: boolean;
  released?: boolean;
  releaseDate?: string;
  userReleaseDate?: string;
  startDate?: string;
  userStartDate?: string;
  overdue?: boolean;
  userForecast?: string;
  release?: string;
  issuesStatusForFixVersion?: {
    unmappedIssues?: number;
    notDoneIssues?: { count: number };
    doneIssues?: { count: number };
    allIssues?: { count: number };
  };
}

export interface JiraProjectRole {
  self?: string;
  name: string;
  id: number;
  description?: string;
  actors?: JiraActor[];
}

export interface JiraActor {
  id?: number;
  type: string;
  actorUser?: JiraUser;
  actorGroup?: JiraGroup;
  displayName?: string;
}

// ============================================================================
// Issue Types
// ============================================================================

export interface JiraIssueType {
  self?: string;
  id: string;
  description?: string;
  iconUrl?: string;
  name: string;
  subtask?: boolean;
  avatarId?: number;
  entityId?: string;
  iconUrl1?: string;
  iconUrl2?: string;
  iconUrl3?: string;
  iconUrl4?: string;
  iconUrl5?: string;
  iconUrl6?: string;
}

export type JiraPriority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';

export interface JiraIssue {
  expand?: string;
  id: string;
  self?: string;
  key: string;
  fields?: JiraIssueFields;
  renderedFields?: Record<string, unknown>;
  names?: Record<string, string>;
  transitions?: JiraTransition[];
  operations?: {
    linkGroup?: {
      groups?: { id: string; style: string; header: { html: string; weight: number }; links: unknown[] }[];
    };
  };
  changelog?: JiraChangelog;
  version?: number;
  masterKey?: string;
}

export interface JiraIssueFields {
  // Standard fields
  summary: string;
  description?: JiraContent | string;
  issuetype: JiraIssueType;
  status?: JiraStatus;
  priority?: JiraPriority;
  resolution?: JiraResolution;
  resolutiondate?: string;
  created?: string;
  updated?: string;
  duedate?: string;
  assignee?: JiraUser | null;
  reporter?: JiraUser | null;
  creator?: JiraUser;
  labels?: string[];
  component?: string[];
  components?: JiraComponent[];

  // Links
  parent?: JiraIssueRef;
  subtasks?: JiraIssueRef[];
  linkedIssues?: {
    data?: {
      id: string;
      self: string;
      type: { id: string; name: string; inward: string; outward: string };
      outwardIssue?: JiraIssueRef;
      inwardIssue?: JiraIssueRef;
    }[];
  };

  // Sprint and Agile
  sprint?: JiraSprint;
  sprints?: JiraSprint[];
  epic?: {
    id: number;
    key: string;
    self: string;
    name: string;
    summary: string;
    color?: { key: string };
    done: boolean;
  };
  'Epic Name']?: string;
  'Epic Link']?: string;
  customfield_10020?: JiraSprint[];
  customfield_10021?: string;

  // Time tracking
  timetracking?: {
    remainingEstimate?: string;
    timeSpent?: string;
    remainingEstimateSeconds?: number;
    timeSpentSeconds?: number;
  };
  aggregateprogress?: {
    progress?: number;
    total?: number;
    percent?: number;
  };

  // Story points
  customfield_10016?: number | null;
  storyPoints?: number;

  // Project info
  project?: JiraProjectRef;
  security?: {
    id: string;
    securityLevelId: number;
    name: string;
  };

  // Dates
  created?: string;
  updated?: string;
  lastViewed?: string;

  // Comments
  comment?: {
    comments: JiraComment[];
    maxResults: number;
    startAt: number;
    total: number;
    expand: string;
  };

  // Attachments
  attachment?: JiraAttachment[];

  // Worklog
  worklog?: {
    startAt: number;
    maxResults: number;
    total: number;
    worklogs: JiraWorklog[];
  };

  // Transitions
  statusCategory?: {
    id: number;
    key: string;
    colorName: string;
    name: string;
  };

  // Custom fields - commonly used
  [customfield: string]: unknown;
}

export interface JiraIssueRef {
  id: string;
  key: string;
  self: string;
  fields?: {
    summary?: string;
    status?: JiraStatus;
    priority?: JiraPriority;
    issuetype?: JiraIssueType;
  };
}

export interface JiraProjectRef {
  id: string;
  key: string;
  name: string;
  avatarUrls?: Record<string, string>;
}

export interface JiraStatus {
  self?: string;
  description?: string;
  iconUrl?: string;
  name: string;
  id: string;
  statusCategory?: {
    id: number;
    key: string;
    colorName: string;
    name: string;
  };
}

export interface JiraResolution {
  self?: string;
  id: string;
  description: string;
  name: string;
}

export interface JiraChangelog {
  startAt?: number;
  maxResults?: number;
  total?: number;
  histories?: JiraChangeHistory[];
}

export interface JiraChangeHistory {
  id: string;
  created: string;
  items: {
    field: string;
    fromString: string | null;
    toString: string | null;
    from: string | null;
    to: string | null;
  }[];
  author?: JiraUser;
}

// ============================================================================
// Issue CRUD Types
// ============================================================================

export interface JiraIssueCreate {
  update?: Record<string, { add: unknown[] }[]>;
  fields: {
    project: { id: string } | { key: string };
    summary: string;
    description?: JiraContent | string;
    issuetype: { id: string } | { name: string };
    parent?: { id: string } | { key: string };
    priority?: { id: string } | { name: string };
    labels?: string[];
    components?: { id: string }[];
    fixVersions?: { id: string }[];
    customfield_10016?: number;
    [key: string]: unknown;
  };
  properties?: unknown[];
}

export interface JiraIssueUpdate {
  update?: Record<string, { set?: unknown; add?: unknown; remove?: unknown }[]>;
  fields?: Record<string, unknown>;
  properties?: unknown[];
}

export interface JiraTransition {
  id: string;
  name: string;
  to: JiraStatus;
  hasScreen: boolean;
  isGlobal: boolean;
  isInitial: boolean;
  isAvailable: boolean;
  isConditional: boolean;
  isMandatory: boolean;
  parameters?: Record<string, unknown>;
  scope?: {
    type: string;
    project: { id: string };
  };
  validators?: {
    type: string;
    configuration: Record<string, unknown>;
  }[];
  fields?: Record<string, { required: boolean }>;
}

export interface JiraTransitionRequest {
  transition?: { id: string };
  fields?: Record<string, unknown>;
  update?: Record<string, { set?: unknown }[]>;
  properties?: { key: string; value: unknown }[];
}

// ============================================================================
// Comment Types
// ============================================================================

export interface JiraComment {
  self?: string;
  id: string;
  author?: JiraUser;
  body?: JiraContent | string;
  renderedBody?: string;
  updateAuthor?: JiraUser;
  created?: string;
  updated?: string;
  visibility?: {
    type: string;
    value: string;
  };
  properties?: unknown[];
  jsdAuthoredPublic?: boolean;
}

export interface JiraCommentCreate {
  body: JiraContent | string;
  visibility?: {
    type: 'group' | 'role';
    value: string;
  };
  properties?: unknown[];
}

// ============================================================================
// Attachment Types
// ============================================================================

export interface JiraAttachment {
  self?: string;
  id: string;
  filename: string;
  author?: JiraUser;
  created?: string;
  size: number;
  mimeType: string;
  content?: string;
  thumbnail?: string;
  properties?: Record<string, unknown>;
}

// ============================================================================
// Worklog Types
// ============================================================================

export interface JiraWorklog {
  self?: string;
  id: string;
  author?: JiraUser;
  updateAuthor?: JiraUser;
  created?: string;
  updated?: string;
  started?: string;
  timeSpent?: string;
  timeSpentSeconds?: number;
  idBoard?: string;
  goal?: string;
  issueId?: string;
}

export interface JiraWorklogCreate {
  timeSpent: string;
  timeSpentSeconds?: number;
  started?: string;
  comment?: JiraContent | string;
  visibility?: {
    type: 'group' | 'role';
    value: string;
  };
  properties?: unknown[];
}

export interface JiraWorklogUpdate {
  timeSpent?: string;
  timeSpentSeconds?: number;
  started?: string;
  comment?: JiraContent | string;
  visibility?: {
    type: 'group' | 'role';
    value: string;
  };
  properties?: unknown[];
}

// ============================================================================
// User Types
// ============================================================================

export interface JiraUser {
  self?: string;
  accountId?: string;
  accountType?: string;
  key?: string;
  name?: string;
  emailAddress?: string;
  displayName?: string;
  active?: boolean;
  timeZone?: string;
  avatarUrls?: {
    '48x48'?: string;
    '24x24'?: string;
    '16x16'?: string;
    '32x32'?: string;
  };
  groups?: {
    size: number;
    items: { name: string; self: string }[];
  };
  applicationRoles?: {
    size: number;
    items: { name: string; self: string }[];
  };
  expand?: string;
}

export interface JiraGroup {
  name: string;
  self?: string;
  users?: {
    size: number;
    items: JiraUser[];
    pagingCallback?: unknown;
    nextPage?: string;
  };
  expanded?: boolean;
}

export interface JiraRole {
  self?: string;
  name: string;
  id: number;
  description?: string;
  scope?: {
    type: string;
    project?: { id: string };
  };
  actors?: JiraActor[];
  translation?: string;
}

// ============================================================================
// Content/Description Types
// ============================================================================

export interface JiraContent {
  version: number;
  type: string;
  content?: JiraContentBlock[];
  text?: string;
}

export interface JiraContentBlock {
  type: string;
  content?: JiraContentBlock[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  attrs?: Record<string, unknown>;
}

// ============================================================================
// Search Types
// ============================================================================

export interface JiraSearchParams {
  jql?: string;
  startAt?: number;
  maxResults?: number;
  fields?: string[];
  expand?: string[];
  properties?: string[];
  fieldsByKeys?: boolean;
  validateQuery?: 'strict' | 'warn' | 'none' | 'good faith';
  value?: number;
}

export interface JiraSearchResult {
  expand?: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
  names?: Record<string, string>;
  schema?: Record<string, unknown>;
}

export interface JiraField {
  key: string;
  name: string;
  custom?: boolean;
  orderable?: boolean;
  navigable?: boolean;
  searchable?: boolean;
  clauseNames?: string[];
  schema?: {
    type: string;
    system?: string;
    custom?: string;
    customId?: number;
  };
}

// ============================================================================
// Sprint & Board Types
// ============================================================================

export interface JiraSprint {
  id: number;
  name: string;
  self?: string;
  state: 'active' | 'closed' | 'future';
  boardId?: number;
  goal?: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  activatedDate?: string;
  sequence?: number;
}

export interface JiraSprintCreate {
  name: string;
  startDate?: string;
  endDate?: string;
  goal?: string;
}

export interface JiraSprintUpdate {
  name?: string;
  startDate?: string;
  endDate?: string;
  goal?: string;
  state?: 'active' | 'closed' | 'future';
}

export interface JiraBoard {
  self?: string;
  id: number;
  name: string;
  type: 'scrum' | 'kanban' | 'simple';
  location?: {
    type: string;
    projectId: number;
    projectKey: string;
    projectName: string;
    userId?: number;
    userKey?: string;
    userName?: string;
  };
  filter?: {
    id: string;
    name: string;
    description: string;
    owner?: JiraUser;
    jql: string;
    favourite: boolean;
  };
  subQuery?: {
    query: string;
  };
  epigenetic?: {
    location?: {
      type: string;
      value: string;
    };
  };
}

export interface JiraBoardConfiguration {
  id: number;
  name: string;
  self?: string;
  location?: {
    type: string;
    projectId: number;
    projectKey: string;
    projectName: string;
  };
  filter?: { id: string };
  subQuery?: { query: string };
  constraint: string;
  defaultColumns: string[];
  estimation?: {
    type: 'FIELD' | 'STORY_POINTS';
    field?: {
      fieldId: string;
      displayName: string;
    };
  };
  ranking?: {
    type: 'RANK' | 'FIELD';
    field?: {
      fieldId: string;
      displayName: string;
    };
  };
  groupByEpics?: boolean;
  swimlanes?: {
    mode: 'NONE' | 'STATUS' | 'EPIC' | 'ASSIGNEE' | 'COMPONENT' | 'VERSION' | 'PRIORITY';
    mapping?: {
      fieldId: string;
      displayName: string;
    }[];
  };
  startWeekOn?: string;
  dateFormat?: { pattern: string; translatorId: number };
  workDays?: string;
  defaultIssueLayout?: {
    type: 'NONE' | 'BASIC' | 'FULL';
  };
}

// ============================================================================
// Webhook Types
// ============================================================================

export type JiraWebhookEvent =
  | 'jira:issue_created'
  | 'jira:issue_updated'
  | 'jira:issue_deleted'
  | 'jira:worklog_updated'
  | 'comment_created'
  | 'comment_updated'
  | 'comment_deleted'
  | 'project_created'
  | 'project_updated'
  | 'project_deleted'
  | 'sprint_started'
  | 'sprint_closed'
  | 'sprint_created'
  | 'board_created'
  | 'board_updated'
  | 'board_deleted'
  | 'version_created'
  | 'version_updated'
  | 'version_deleted'
  | 'issuelink_created'
  | 'issuelink_deleted'
  | 'user_created'
  | 'user_updated'
  | 'group_added_to_role'
  | 'jira:attachment_updated';

export interface JiraWebhookPayload {
  timestamp: number;
  webhookEvent: JiraWebhookEvent;
  user?: JiraUser;
  issue?: JiraIssue;
  comment?: JiraComment;
  sprint?: JiraSprint;
  board?: JiraBoard;
  project?: JiraProject;
  version?: JiraVersion;
  worklog?: JiraWorklog;
  changelog?: JiraChangelog;
}

export interface JiraWebhookRegistration {
  url: string;
  name: string;
  events: JiraWebhookEvent[];
  filters?: {
    issue_related_events?: string;
  };
  excludeBody?: boolean;
}

export interface JiraWebhookList {
  webhooks: {
    id: string;
    name: string;
    url: string;
    events: JiraWebhookEvent[];
    filters?: {
      issue_related_events?: string;
    };
    excludeBody?: boolean;
    created: string;
    lastUpdated: string;
  }[];
  pagination?: {
    startAt: number;
    maxResults: number;
    total: number;
  };
}

// ============================================================================
// API Response Types
// ============================================================================

export interface JiraAPIError {
  errorMessages: string[];
  errors?: Record<string, string>;
  status?: number;
}

export interface JiraPaginatedResponse<T> {
  self: string;
  nextPage?: string;
  maxResults: number;
  startAt: number;
  total: number;
  isLast: boolean;
  values?: T[];
  expand?: string;
}

// ============================================================================
// JQL Types
// ============================================================================

export interface JQLBuilder {
  project(projectKey: string): JQLBuilder;
  issueType(type: string): JQLBuilder;
  status(status: string | string[]): JQLBuilder;
  assignee(accountId: string): JQLBuilder;
  reporter(accountId: string): JQLBuilder;
  sprint(sprintId: number): JQLBuilder;
  fixVersion(version: string): JQLBuilder;
  labels(label: string | string[]): JQLBuilder;
  component(component: string): JQLBuilder;
  createdAfter(date: Date): JQLBuilder;
  createdBefore(date: Date): JQLBuilder;
  updatedAfter(date: Date): JQLBuilder;
  updatedBefore(date: Date): JQLBuilder;
  dueAfter(date: Date): JQLBuilder;
  dueBefore(date: Date): JQLBuilder;
  orderBy(field: string, direction?: 'ASC' | 'DESC'): JQLBuilder;
  and(): JQLBuilder;
  or(): JQLBuilder;
  build(): string;
}

// ============================================================================
// Observer Event Types
// ============================================================================

export interface JiraObserverEvent {
  id: string;
  source: 'jira';
  type: JiraWebhookEvent;
  userId: string;
  timestamp: string;
  data: {
    issue?: {
      key: string;
      summary: string;
      status: string;
      assignee?: string;
      reporter?: string;
    };
    project?: {
      key: string;
      name: string;
    };
    sprint?: {
      id: number;
      name: string;
      state: string;
    };
    board?: {
      id: number;
      name: string;
    };
  };
}

// ============================================================================
// Connector Config Types
// ============================================================================

export interface JiraConnectorConfig {
  jiraUrl: string;
  auth: JiraBasicAuth | JiraOAuth;
  webhookSecret?: string;
  observerUserId?: string;
  retryAttempts?: number;
  retryDelay?: number;
  requestTimeout?: number;
}

export interface JiraConnectorState {
  connected: boolean;
  authType: 'basic' | 'oauth' | null;
  email?: string;
  lastValidation?: string;
  webhookRegistered?: boolean;
}