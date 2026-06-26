/**
 * Accounting Connectors - QuickBooks, Xero, Tally, Zoho Books, FreshBooks
 */

const accountingConnectors = [
  // ============= QUICKBOOKS ONLINE =============
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    category: 'accounting',
    description: 'Accounting software by Intuit',
    authType: 'oauth2',
    logo: 'quickbooks-logo.svg',
    capabilities: ['invoices', 'bills', 'customers', 'vendors', 'accounts', 'payments', 'reports'],
    actions: {
      getInvoices: {
        description: 'Get all invoices',
        params: ['limit', 'offset', 'query']
      },
      createInvoice: {
        description: 'Create an invoice',
        params: ['customerId', 'lineItems', 'dueDate']
      },
      sendInvoice: {
        description: 'Send invoice',
        params: ['invoiceId']
      },
      getInvoice: {
        description: 'Get invoice by ID',
        params: ['invoiceId']
      },
      voidInvoice: {
        description: 'Void an invoice',
        params: ['invoiceId']
      },
      getCustomers: {
        description: 'Get customers',
        params: ['limit', 'query']
      },
      createCustomer: {
        description: 'Create a customer',
        params: ['displayName', 'primaryEmail', 'phone']
      },
      getVendors: {
        description: 'Get vendors',
        params: ['limit']
      },
      createVendor: {
        description: 'Create a vendor',
        params: ['displayName', 'primaryEmail', 'phone']
      },
      getBills: {
        description: 'Get bills',
        params: ['limit', 'vendorId']
      },
      createBill: {
        description: 'Create a bill',
        params: ['vendorId', 'lineItems', 'dueDate']
      },
      payBill: {
        description: 'Pay a bill',
        params: ['billId', 'paymentMethodRef']
      },
      getAccounts: {
        description: 'Get accounts',
        params: ['accountType']
      },
      createAccount: {
        description: 'Create an account',
        params: ['name', 'accountType', 'accountSubType']
      },
      getPayments: {
        description: 'Get payments',
        params: ['limit']
      },
      createPayment: {
        description: 'Record payment',
        params: ['totalAmt', 'customerId', 'lineDetail']
      },
      getReports: {
        description: 'Get reports',
        params: ['reportType', 'startDate', 'endDate']
      },
      getProfitLoss: {
        description: 'Get P&L report',
        params: ['startDate', 'endDate']
      },
      getBalanceSheet: {
        description: 'Get balance sheet',
        params: ['date']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.realmId || !credentials.accessToken) {
        throw new Error('Missing QuickBooks credentials');
      }
      return { success: true, realmId: credentials.realmId };
    },
    search: async (credentials, params) => {
      return {
        results: [
          { id: 'INV-001', docNumber: 'INV-001', totalAmt: 5000, customer: { name: 'Customer A' } }
        ]
      };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from QuickBooks`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to QuickBooks`);
      return { success: true };
    }
  },

  // ============= XERO =============
  {
    id: 'xero',
    name: 'Xero',
    category: 'accounting',
    description: 'Cloud accounting software',
    authType: 'oauth2',
    logo: 'xero-logo.svg',
    capabilities: ['invoices', 'contacts', 'accounts', 'bank', 'reports', 'payments'],
    actions: {
      getInvoices: {
        description: 'Get all invoices',
        params: ['status', 'contactId', 'page']
      },
      createInvoice: {
        description: 'Create an invoice',
        params: ['type', 'contact', 'lineItems', 'dueDate']
      },
      sendInvoice: {
        description: 'Email invoice',
        params: ['invoiceId']
      },
      getInvoice: {
        description: 'Get invoice by ID',
        params: ['invoiceId']
      },
      voidInvoice: {
        description: 'Void invoice',
        params: ['invoiceId']
      },
      getContacts: {
        description: 'Get contacts',
        params: ['page', 'includeArchived']
      },
      createContact: {
        description: 'Create contact',
        params: ['name', 'emailAddress', 'phones']
      },
      getAccounts: {
        description: 'Get accounts',
        params: []
      },
      createAccount: {
        description: 'Create account',
        params: ['code', 'name', 'type']
      },
      getBankTransactions: {
        description: 'Get bank transactions',
        params: ['bankAccountId', 'page']
      },
      getBankTransfers: {
        description: 'Get bank transfers',
        params: []
      },
      createBankTransfer: {
        description: 'Create bank transfer',
        params: ['fromBankAccountId', 'toBankAccountId', 'amount']
      },
      getPayments: {
        description: 'Get payments',
        params: ['invoiceId']
      },
      createPayment: {
        description: 'Create payment',
        params: ['invoiceId', 'accountId', 'amount']
      },
      getReports: {
        description: 'Get reports',
        params: ['reportType', 'date']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accessToken || !credentials.tenantId) {
        throw new Error('Missing Xero credentials');
      }
      return { success: true, tenantId: credentials.tenantId };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Xero`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Xero`);
      return { success: true };
    }
  },

  // ============= TALLY =============
  {
    id: 'tally',
    name: 'TallyPrime',
    category: 'accounting',
    description: 'Indian accounting software',
    authType: 'xml_api',
    logo: 'tally-logo.svg',
    capabilities: ['vouchers', 'masters', 'reports', 'inventory', 'gst'],
    actions: {
      getVouchers: {
        description: 'Get vouchers',
        params: ['voucherType', 'fromDate', 'toDate']
      },
      createVoucher: {
        description: 'Create voucher',
        params: ['voucherType', 'date', 'entries']
      },
      getLedgers: {
        description: 'Get ledgers',
        params: ['group']
      },
      createLedger: {
        description: 'Create ledger',
        params: ['name', 'group', 'openingBalance']
      },
      getGroups: {
        description: 'Get groups',
        params: []
      },
      createGroup: {
        description: 'Create group',
        params: ['name', 'parent']
      },
      getStockItems: {
        description: 'Get stock items',
        params: []
      },
      createStockItem: {
        description: 'Create stock item',
        params: ['name', 'unit', 'rate']
      },
      getReports: {
        description: 'Get reports',
        params: ['reportType']
      },
      getBalanceSheet: {
        description: 'Get balance sheet',
        params: ['fromDate', 'toDate']
      },
      getProfitLoss: {
        description: 'Get P&L',
        params: ['fromDate', 'toDate']
      },
      getGSTReports: {
        description: 'Get GST reports',
        params: ['gstType', 'period']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.url) {
        throw new Error('Missing Tally server URL');
      }
      return { success: true, url: credentials.url };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Tally`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Tally`);
      return { success: true };
    }
  },

  // ============= ZOHO BOOKS =============
  {
    id: 'zoho-books',
    name: 'Zoho Books',
    category: 'accounting',
    description: 'Online accounting software',
    authType: 'oauth2',
    logo: 'zoho-logo.svg',
    capabilities: ['invoices', 'contacts', 'accounts', 'bank', 'inventory', 'reports', 'projects'],
    actions: {
      getInvoices: {
        description: 'Get all invoices',
        params: ['invoiceNumber', 'status', 'customerId']
      },
      createInvoice: {
        description: 'Create an invoice',
        params: ['customerId', 'lineItems', 'dueDate']
      },
      emailInvoice: {
        description: 'Email invoice',
        params: ['invoiceId', 'toMailIds']
      },
      voidInvoice: {
        description: 'Void invoice',
        params: ['invoiceId']
      },
      getContacts: {
        description: 'Get contacts',
        params: ['contactType', 'searchText']
      },
      createContact: {
        description: 'Create contact',
        params: ['contactName', 'email', 'phone']
      },
      getAccounts: {
        description: 'Get accounts',
        params: ['accountType']
      },
      createAccount: {
        description: 'Create account',
        params: ['accountName', 'accountType']
      },
      getBankTransactions: {
        description: 'Get bank transactions',
        params: ['accountId', 'fromDate', 'toDate']
      },
      getInvoices: {
        description: 'Get bills',
        params: ['vendorId', 'status']
      },
      createBill: {
        description: 'Create a bill',
        params: ['vendorId', 'lineItems', 'dueDate']
      },
      getItems: {
        description: 'Get items',
        params: []
      },
      createItem: {
        description: 'Create item',
        params: ['name', 'rate', 'unit', 'sku']
      },
      getProjects: {
        description: 'Get projects',
        params: []
      },
      createProject: {
        description: 'Create project',
        params: ['projectName', 'customerId']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accessToken) {
        throw new Error('Missing Zoho Books access token');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Zoho Books`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Zoho Books`);
      return { success: true };
    }
  },

  // ============= FRESHBOOKS =============
  {
    id: 'freshbooks',
    name: 'FreshBooks',
    category: 'accounting',
    description: 'Accounting software for small business',
    authType: 'oauth2',
    logo: 'freshbooks-logo.svg',
    capabilities: ['invoices', 'clients', 'expenses', 'time-tracking', 'reports'],
    actions: {
      getInvoices: {
        description: 'Get invoices',
        params: ['status', 'clientId']
      },
      createInvoice: {
        description: 'Create invoice',
        params: ['clientId', 'lines', 'dueDate']
      },
      sendInvoice: {
        description: 'Send invoice',
        params: ['invoiceId', 'email']
      },
      getClients: {
        description: 'Get clients',
        params: []
      },
      createClient: {
        description: 'Create client',
        params: ['email', 'fname', 'lname', 'organization']
      },
      getExpenses: {
        description: 'Get expenses',
        params: ['clientId']
      },
      createExpense: {
        description: 'Create expense',
        params: ['amount', 'category', 'date', 'clientId']
      },
      getTimeEntries: {
        description: 'Get time entries',
        params: ['projectId']
      },
      createTimeEntry: {
        description: 'Create time entry',
        params: ['projectId', 'duration', 'description']
      },
      getProjects: {
        description: 'Get projects',
        params: ['clientId']
      },
      createProject: {
        description: 'Create project',
        params: ['name', 'clientId']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accessToken) {
        throw new Error('Missing FreshBooks access token');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from FreshBooks`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to FreshBooks`);
      return { success: true };
    }
  }
];

export default {
  list: accountingConnectors
};
