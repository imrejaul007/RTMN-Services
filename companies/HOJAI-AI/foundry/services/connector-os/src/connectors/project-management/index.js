/**
 * Project Management Connectors - Jira, Asana, Monday, Linear, Notion, Trello
 */

const projectConnectors = [
  // ============= JIRA =============
  {
    id: 'jira',
    name: 'Jira',
    category: 'project-management',
    description: 'Project tracking and issue tracking',
    authType: 'oauth2',
    logo: 'jira-logo.svg',
    capabilities: ['issues', 'projects', 'boards', 'sprints', 'workflows', 'epics'],
    actions: {
      getProjects: {
        description: 'Get all projects',
        params: []
      },
      getProject: {
        description: 'Get project by key',
        params: ['projectKey']
      },
      createProject: {
        description: 'Create project',
        params: ['name', 'key', 'type', 'lead']
      },
      getIssues: {
        description: 'Get issues',
        params: ['project', 'jql', 'maxResults']
      },
      getIssue: {
        description: 'Get issue by key',
        params: ['issueKey']
      },
      createIssue: {
        description: 'Create issue',
        params: ['project', 'summary', 'description', 'issueType', 'priority']
      },
      updateIssue: {
        description: 'Update issue',
        params: ['issueKey', 'fields']
      },
      deleteIssue: {
        description: 'Delete issue',
        params: ['issueKey']
      },
      assignIssue: {
        description: 'Assign issue',
        params: ['issueKey', 'assignee']
      },
      transitionIssue: {
        description: 'Transition issue',
        params: ['issueKey', 'transition']
      },
      addComment: {
        description: 'Add comment',
        params: ['issueKey', 'body']
      },
      getComments: {
        description: 'Get comments',
        params: ['issueKey']
      },
      addAttachment: {
        description: 'Add attachment',
        params: ['issueKey', 'filename', 'content']
      },
      getBoards: {
        description: 'Get boards',
        params: ['projectKey']
      },
      getSprints: {
        description: 'Get sprints',
        params: ['boardId']
      },
      createSprint: {
        description: 'Create sprint',
        params: ['boardId', 'name', 'startDate', 'endDate']
      },
      addIssueToSprint: {
        description: 'Add issue to sprint',
        params: ['sprintId', 'issueKey']
      },
      getWorklogs: {
        description: 'Get worklogs',
        params: ['issueKey']
      },
      addWorklog: {
        description: 'Add worklog',
        params: ['issueKey', 'timeSpent', 'started']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.domain || !credentials.email || !credentials.apiToken) {
        throw new Error('Missing Jira credentials');
      }
      return { success: true, domain: credentials.domain };
    },
    search: async (credentials, params) => {
      return {
        results: [
          { key: 'PROJ-1', summary: 'Sample Issue', status: 'To Do', assignee: 'john' }
        ]
      };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Jira`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Jira`);
      return { success: true };
    }
  },

  // ============= ASANA =============
  {
    id: 'asana',
    name: 'Asana',
    category: 'project-management',
    description: 'Work management platform',
    authType: 'oauth2',
    logo: 'asana-logo.svg',
    capabilities: ['projects', 'tasks', 'subtasks', 'sections', 'teams', 'goals'],
    actions: {
      getProjects: {
        description: 'Get all projects',
        params: ['workspace', 'team']
      },
      getProject: {
        description: 'Get project',
        params: ['projectId']
      },
      createProject: {
        description: 'Create project',
        params: ['name', 'workspace', 'team', 'notes']
      },
      updateProject: {
        description: 'Update project',
        params: ['projectId', 'fields']
      },
      getTasks: {
        description: 'Get tasks',
        params: ['project', 'section']
      },
      getTask: {
        description: 'Get task',
        params: ['taskId']
      },
      createTask: {
        description: 'Create task',
        params: ['name', 'projects', 'assignee', 'dueDate']
      },
      updateTask: {
        description: 'Update task',
        params: ['taskId', 'fields']
      },
      deleteTask: {
        description: 'Delete task',
        params: ['taskId']
      },
      addSubtask: {
        description: 'Add subtask',
        params: ['parentTaskId', 'name']
      },
      addComment: {
        description: 'Add comment',
        params: ['taskId', 'text']
      },
      addAttachments: {
        description: 'Add attachment',
        params: ['taskId', 'file']
      },
      getSections: {
        description: 'Get sections',
        params: ['projectId']
      },
      createSection: {
        description: 'Create section',
        params: ['projectId', 'name']
      },
      moveTaskToSection: {
        description: 'Move task to section',
        params: ['taskId', 'sectionId']
      },
      getTeams: {
        description: 'Get teams',
        params: ['workspace']
      },
      getUsers: {
        description: 'Get users',
        params: ['workspace']
      },
      getGoals: {
        description: 'Get goals',
        params: ['workspace']
      },
      createGoal: {
        description: 'Create goal',
        params: ['name', 'workspace', 'dueDate']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accessToken) {
        throw new Error('Missing Asana access token');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Asana`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Asana`);
      return { success: true };
    }
  },

  // ============= MONDAY.COM =============
  {
    id: 'monday',
    name: 'Monday.com',
    category: 'project-management',
    description: 'Work management platform',
    authType: 'api_key',
    logo: 'monday-logo.svg',
    capabilities: ['boards', 'items', 'groups', 'columns', 'updates', 'integrations'],
    actions: {
      getBoards: {
        description: 'Get all boards',
        params: ['workspaceId']
      },
      getBoard: {
        description: 'Get board',
        params: ['boardId']
      },
      createBoard: {
        description: 'Create board',
        params: ['boardName', 'workspaceId', 'kind']
      },
      getItems: {
        description: 'Get board items',
        params: ['boardId', 'groupBy']
      },
      getItem: {
        description: 'Get item',
        params: ['itemId']
      },
      createItem: {
        description: 'Create item',
        params: ['boardId', 'groupId', 'itemName', 'columnValues']
      },
      updateItem: {
        description: 'Update item',
        params: ['itemId', 'columnValues']
      },
      deleteItem: {
        description: 'Delete item',
        params: ['itemId']
      },
      createGroup: {
        description: 'Create group',
        params: ['boardId', 'groupName']
      },
      getGroups: {
        description: 'Get groups',
        params: ['boardId']
      },
      addUpdate: {
        description: 'Add update',
        params: ['itemId', 'body']
      },
      getUpdates: {
        description: 'Get updates',
        params: ['itemId']
      },
      getUsers: {
        description: 'Get workspace users',
        params: ['workspaceId']
      },
      changeColumnValue: {
        description: 'Change column value',
        params: ['itemId', 'columnId', 'value']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.apiKey) {
        throw new Error('Missing Monday.com API key');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Monday.com`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Monday.com`);
      return { success: true };
    }
  },

  // ============= LINEAR =============
  {
    id: 'linear',
    name: 'Linear',
    category: 'project-management',
    description: 'Issue tracking for software teams',
    authType: 'api_key',
    logo: 'linear-logo.svg',
    capabilities: ['issues', 'projects', 'teams', 'cycles', 'labels'],
    actions: {
      getIssues: {
        description: 'Get issues',
        params: ['teamId', 'filter', 'first']
      },
      getIssue: {
        description: 'Get issue',
        params: ['issueId']
      },
      createIssue: {
        description: 'Create issue',
        params: ['teamId', 'title', 'description', 'priority', 'assigneeId']
      },
      updateIssue: {
        description: 'Update issue',
        params: ['issueId', 'fields']
      },
      deleteIssue: {
        description: 'Delete issue',
        params: ['issueId']
      },
      archiveIssue: {
        description: 'Archive issue',
        params: ['issueId']
      },
      getProjects: {
        description: 'Get projects',
        params: []
      },
      createProject: {
        description: 'Create project',
        params: ['name', 'teamId', 'description']
      },
      getTeams: {
        description: 'Get teams',
        params: []
      },
      createTeam: {
        description: 'Create team',
        params: ['name', 'key']
      },
      getCycles: {
        description: 'Get cycles',
        params: ['teamId']
      },
      createCycle: {
        description: 'Create cycle',
        params: ['teamId', 'name', 'startDate', 'endDate']
      },
      getLabels: {
        description: 'Get labels',
        params: ['teamId']
      },
      createLabel: {
        description: 'Create label',
        params: ['teamId', 'name', 'color']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.apiKey) {
        throw new Error('Missing Linear API key');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Linear`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Linear`);
      return { success: true };
    }
  },

  // ============= NOTION =============
  {
    id: 'notion',
    name: 'Notion',
    category: 'project-management',
    description: 'All-in-one workspace',
    authType: 'oauth2',
    logo: 'notion-logo.svg',
    capabilities: ['pages', 'databases', 'blocks', 'comments', 'users'],
    actions: {
      search: {
        description: 'Search pages and databases',
        params: ['query', 'filter', 'sort']
      },
      getPage: {
        description: 'Get page',
        params: ['pageId']
      },
      createPage: {
        description: 'Create page',
        params: ['parentId', 'properties', 'children']
      },
      updatePage: {
        description: 'Update page',
        params: ['pageId', 'properties']
      },
      archivePage: {
        description: 'Archive page',
        params: ['pageId']
      },
      getDatabase: {
        description: 'Get database',
        params: ['databaseId']
      },
      queryDatabase: {
        description: 'Query database',
        params: ['databaseId', 'filter', 'sorts']
      },
      createDatabase: {
        description: 'Create database',
        params: ['parentPageId', 'title', 'properties']
      },
      createDatabaseItem: {
        description: 'Create database item',
        params: ['databaseId', 'properties']
      },
      updateDatabaseItem: {
        description: 'Update database item',
        params: ['pageId', 'properties']
      },
      getBlockChildren: {
        description: 'Get blocks',
        params: ['blockId']
      },
      appendBlock: {
        description: 'Append block',
        params: ['blockId', 'children']
      },
      updateBlock: {
        description: 'Update block',
        params: ['blockId', 'block']
      },
      deleteBlock: {
        description: 'Delete block',
        params: ['blockId']
      },
      getComments: {
        description: 'Get comments',
        params: ['blockId']
      },
      addComment: {
        description: 'Add comment',
        params: ['blockId', 'richText']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accessToken) {
        throw new Error('Missing Notion access token');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Notion`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Notion`);
      return { success: true };
    }
  },

  // ============= TRELLO =============
  {
    id: 'trello',
    name: 'Trello',
    category: 'project-management',
    description: 'Kanban-style boards',
    authType: 'api_key',
    logo: 'trello-logo.svg',
    capabilities: ['boards', 'lists', 'cards', 'members', 'checklists'],
    actions: {
      getBoards: {
        description: 'Get all boards',
        params: ['filter']
      },
      getBoard: {
        description: 'Get board',
        params: ['boardId']
      },
      createBoard: {
        description: 'Create board',
        params: ['name', 'description', 'idOrganization']
      },
      getLists: {
        description: 'Get board lists',
        params: ['boardId']
      },
      createList: {
        description: 'Create list',
        params: ['name', 'idBoard', 'pos']
      },
      getCards: {
        description: 'Get list cards',
        params: ['listId']
      },
      getCard: {
        description: 'Get card',
        params: ['cardId']
      },
      createCard: {
        description: 'Create card',
        params: ['name', 'idList', 'desc', 'idMembers']
      },
      updateCard: {
        description: 'Update card',
        params: ['cardId', 'fields']
      },
      deleteCard: {
        description: 'Delete card',
        params: ['cardId']
      },
      moveCard: {
        description: 'Move card',
        params: ['cardId', 'idList', 'pos']
      },
      addComment: {
        description: 'Add comment',
        params: ['cardId', 'text']
      },
      addChecklist: {
        description: 'Add checklist',
        params: ['cardId', 'name']
      },
      addChecklistItem: {
        description: 'Add checklist item',
        params: ['checklistId', 'name']
      },
      addMember: {
        description: 'Add member to card',
        params: ['cardId', 'idMember']
      },
      getMembers: {
        description: 'Get board members',
        params: ['boardId']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.apiKey || !credentials.token) {
        throw new Error('Missing Trello credentials');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Trello`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Trello`);
      return { success: true };
    }
  }
];

export default {
  list: projectConnectors
};
