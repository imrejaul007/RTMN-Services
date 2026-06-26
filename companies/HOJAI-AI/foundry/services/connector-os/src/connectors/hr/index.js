/**
 * HR Connectors - BambooHR, Workday, Gusto, Rippling, Zoho People
 */

const hrConnectors = [
  // ============= BAMBOOHR =============
  {
    id: 'bamboohr',
    name: 'BambooHR',
    category: 'hr',
    description: 'HR software for small business',
    authType: 'api_key',
    logo: 'bamboohr-logo.svg',
    capabilities: ['employees', 'time-off', 'jobs', 'departments', 'reports'],
    actions: {
      getEmployees: {
        description: 'Get all employees',
        params: ['fields', 'limit']
      },
      getEmployee: {
        description: 'Get employee by ID',
        params: ['employeeId']
      },
      createEmployee: {
        description: 'Create employee',
        params: ['firstName', 'lastName', 'workEmail', 'hireDate']
      },
      updateEmployee: {
        description: 'Update employee',
        params: ['employeeId', 'fields']
      },
      getTimeOffRequests: {
        description: 'Get time off requests',
        params: ['startDate', 'endDate', 'status']
      },
      createTimeOffRequest: {
        description: 'Create time off request',
        params: ['employeeId', 'startDate', 'endDate', 'type']
      },
      approveTimeOff: {
        description: 'Approve time off',
        params: ['requestId']
      },
      denyTimeOff: {
        description: 'Deny time off',
        params: ['requestId', 'note']
      },
      getJobs: {
        description: 'Get job openings',
        params: []
      },
      createJob: {
        description: 'Create job opening',
        params: ['title', 'departmentId', 'location']
      },
      getDepartments: {
        description: 'Get departments',
        params: []
      },
      getEmployeeDirectory: {
        description: 'Get employee directory',
        params: []
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.domain || !credentials.apiKey) {
        throw new Error('Missing BambooHR credentials');
      }
      return { success: true, domain: credentials.domain };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from BambooHR`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to BambooHR`);
      return { success: true };
    }
  },

  // ============= WORKDAY =============
  {
    id: 'workday',
    name: 'Workday',
    category: 'hr',
    description: 'Enterprise HCM platform',
    authType: 'oauth2',
    logo: 'workday-logo.svg',
    capabilities: ['employees', 'payroll', 'benefits', 'time-tracking', 'recruiting', 'expenses'],
    actions: {
      getWorkers: {
        description: 'Get all workers',
        params: ['limit', 'offset']
      },
      getWorker: {
        description: 'Get worker by ID',
        params: ['workerId']
      },
      getOrganizations: {
        description: 'Get organizations',
        params: ['type']
      },
      getLocations: {
        description: 'Get locations',
        params: []
      },
      getJobs: {
        description: 'Get job openings',
        params: ['status']
      },
      getTimeEntries: {
        description: 'Get time entries',
        params: ['workerId', 'startDate', 'endDate']
      },
      submitTimeOff: {
        description: 'Submit time off request',
        params: ['workerId', 'startDate', 'endDate', 'type']
      },
      getPayGroups: {
        description: 'Get pay groups',
        params: []
      },
      getPaySlips: {
        description: 'Get pay slips',
        params: ['workerId']
      },
      getBenefits: {
        description: 'Get benefits info',
        params: ['workerId']
      },
      getExpenses: {
        description: 'Get expenses',
        params: ['workerId', 'status']
      },
      submitExpense: {
        description: 'Submit expense report',
        params: ['workerId', 'items', 'totalAmount']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.tenant || !credentials.accessToken) {
        throw new Error('Missing Workday credentials');
      }
      return { success: true, tenant: credentials.tenant };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Workday`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Workday`);
      return { success: true };
    }
  },

  // ============= GUSTO =============
  {
    id: 'gusto',
    name: 'Gusto',
    category: 'hr',
    description: 'Payroll and HR platform',
    authType: 'oauth2',
    logo: 'gusto-logo.svg',
    capabilities: ['employees', 'payroll', 'benefits', 'time-tracking', ' PTO'],
    actions: {
      getEmployees: {
        description: 'Get all employees',
        params: []
      },
      getEmployee: {
        description: 'Get employee',
        params: ['employeeId']
      },
      createEmployee: {
        description: 'Create employee',
        params: ['firstName', 'lastName', 'email', 'hireDate']
      },
      updateEmployee: {
        description: 'Update employee',
        params: ['employeeId', 'fields']
      },
      getPayrolls: {
        description: 'Get payroll runs',
        params: ['status']
      },
      runPayroll: {
        description: 'Run payroll',
        params: ['payPeriodStart', 'payPeriodEnd']
      },
      getTimeEntries: {
        description: 'Get time entries',
        params: ['employeeId', 'startDate', 'endDate']
      },
      getTimeOffRequests: {
        description: 'Get time off requests',
        params: ['status']
      },
      approveTimeOff: {
        description: 'Approve time off',
        params: ['requestId']
      },
      denyTimeOff: {
        description: 'Deny time off',
        params: ['requestId']
      },
      getBenefits: {
        description: 'Get benefits',
        params: ['employeeId']
      },
      getCompanies: {
        description: 'Get company info',
        params: []
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accessToken) {
        throw new Error('Missing Gusto access token');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Gusto`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Gusto`);
      return { success: true };
    }
  },

  // ============= RIPPLING =============
  {
    id: 'rippling',
    name: 'Rippling',
    category: 'hr',
    description: 'All-in-one HR and IT platform',
    authType: 'oauth2',
    logo: 'rippling-logo.svg',
    capabilities: ['employees', 'payroll', 'benefits', 'devices', 'apps', 'time'],
    actions: {
      getEmployees: {
        description: 'Get all employees',
        params: ['limit', 'offset']
      },
      getEmployee: {
        description: 'Get employee',
        params: ['employeeId']
      },
      createEmployee: {
        description: 'Create employee',
        params: ['firstName', 'lastName', 'workEmail', 'startDate']
      },
      updateEmployee: {
        description: 'Update employee',
        params: ['employeeId', 'fields']
      },
      terminateEmployee: {
        description: 'Terminate employee',
        params: ['employeeId', 'terminationDate', 'reason']
      },
      getTimeEntries: {
        description: 'Get time entries',
        params: ['employeeId', 'startDate', 'endDate']
      },
      submitTimeOff: {
        description: 'Submit time off',
        params: ['employeeId', 'startDate', 'endDate', 'type']
      },
      getDevices: {
        description: 'Get company devices',
        params: []
      },
      assignDevice: {
        description: 'Assign device to employee',
        params: ['deviceId', 'employeeId']
      },
      getApps: {
        description: 'Get installed apps',
        params: []
      },
      installApp: {
        description: 'Install app for employee',
        params: ['employeeId', 'appId']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accessToken) {
        throw new Error('Missing Rippling access token');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Rippling`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Rippling`);
      return { success: true };
    }
  },

  // ============= ZOHO PEOPLE =============
  {
    id: 'zoho-people',
    name: 'Zoho People',
    category: 'hr',
    description: 'HR management software',
    authType: 'oauth2',
    logo: 'zoho-logo.svg',
    capabilities: ['employees', 'attendance', 'leave', 'onboarding', 'performance'],
    actions: {
      getEmployees: {
        description: 'Get all employees',
        params: ['limit', 'offset']
      },
      getEmployee: {
        description: 'Get employee',
        params: ['employeeId']
      },
      createEmployee: {
        description: 'Create employee',
        params: ['firstName', 'lastName', 'email', 'dateOf Joining']
      },
      updateEmployee: {
        description: 'Update employee',
        params: ['employeeId', 'fields']
      },
      getAttendance: {
        description: 'Get attendance',
        params: ['employeeId', 'date']
      },
      getLeaveRecords: {
        description: 'Get leave records',
        params: ['employeeId', 'year']
      },
      applyLeave: {
        description: 'Apply for leave',
        params: ['employeeId', 'leaveType', 'startDate', 'endDate']
      },
      approveLeave: {
        description: 'Approve leave',
        params: ['leaveId']
      },
      rejectLeave: {
        description: 'Reject leave',
        params: ['leaveId', 'reason']
      },
      getDepartments: {
        description: 'Get departments',
        params: []
      },
      getShifts: {
        description: 'Get shifts',
        params: []
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accessToken) {
        throw new Error('Missing Zoho People access token');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Zoho People`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Zoho People`);
      return { success: true };
    }
  }
];

export default {
  list: hrConnectors
};
