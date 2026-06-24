/**
 * In-memory store — shared by all services in this starter.
 *
 * v0 keeps everything in memory so the 30-min journey boots instantly
 * with zero infrastructure. Replace with MongoDB / Postgres when
 * you're ready; the function signatures stay the same.
 */

class Store {
  constructor() {
    // HR
    this.departments = new Map();
    this.employees = new Map();
    this.leaveRequests = new Map();
    // Sales
    this.leads = new Map();
    this.deals = new Map();
    this.accounts = new Map();
    // CRM
    this.customers = new Map();
    this.npsSurveys = new Map();
    // Finance
    this.accounts_gl = new Map(); // chart of accounts (different "account")
    this.ledger = new Map();
    // CXO
    this.kpis = new Map();
    this.pillars = new Map();
    // Operations
    this.projects = new Map();
    this.incidents = new Map();
    // Marketing
    this.campaigns = new Map();
    this.audiences = new Map();
    // Activity log
    this.activity = [];
  }

  log(actor, action, payload) {
    this.activity.push({ at: new Date().toISOString(), actor, action, payload });
    if (this.activity.length > 1000) this.activity.shift();
  }

  reset() {
    for (const k of Object.keys(this)) {
      if (this[k] instanceof Map) this[k].clear();
    }
    this.activity = [];
  }
}

const store = new Store();

// Seed: a single default department so HR has something to attach employees to
store.departments.set('dept-eng', {
  id: 'dept-eng', name: 'Engineering', parentId: null, managerId: null, createdAt: new Date().toISOString()
});

export default store;
