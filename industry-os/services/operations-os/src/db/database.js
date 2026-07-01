/**
 * RTMN Operations OS - Database Layer
 * PostgreSQL persistence for all operational data
 *
 * Supports both in-memory (development) and PostgreSQL (production)
 */

const { Pool } = require('pg');

// Environment configuration
const config = {
  usePostgres: process.env.USE_POSTGRES === 'true',
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/operations_os',
  maxConnections: 20,
};

// PostgreSQL pool (production)
let pool = null;

// In-memory stores (development fallback)
const memoryStores = {
  processes: new Map(),
  workflows: new Map(),
  workflowRuns: new Map(),
  projects: new Map(),
  programs: new Map(),
  portfolios: new Map(),
  tasks: new Map(),
  subtasks: new Map(),
  taskDependencies: new Map(),
  sops: new Map(),
  sopVersions: new Map(),
  sopExecutions: new Map(),
  approvals: new Map(),
  approvalChains: new Map(),
  resources: new Map(),
  bookings: new Map(),
  incidents: new Map(),
  incidentUpdates: new Map(),
  risks: new Map(),
  riskMitigations: new Map(),
  qualityAudits: new Map(),
  capas: new Map(),
  changes: new Map(),
  changeApprovals: new Map(),
  knowledge: new Map(),
  plans: new Map(),
  planObjectives: new Map(),
  deliveries: new Map(),
  milestones: new Map(),
  employees: new Map(),
  departments: new Map(),
  twins: new Map(),
  sprints: new Map(),
  okrs: new Map(),
  slas: new Map(),
  runbooks: new Map(),
  runbookSteps: new Map(),
  scenarios: new Map(),
  kpis: new Map(),
  processSteps: new Map(),
  observations: new Map(),
  learnedProcesses: new Map(),
  automations: new Map(),
  entityObservations: new Map(),
};

// SQL schema for PostgreSQL
const SCHEMA = `
-- Core tables
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'planning',
  priority VARCHAR(20) DEFAULT 'medium',
  progress INTEGER DEFAULT 0,
  budget DECIMAL(15,2) DEFAULT 0,
  spent DECIMAL(15,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  department_id VARCHAR(50),
  owner_id VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(50) PRIMARY KEY,
  project_id VARCHAR(50) REFERENCES projects(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  assignee_id VARCHAR(50),
  due_date DATE,
  start_date DATE,
  estimated_hours DECIMAL(10,2) DEFAULT 0,
  logged_hours DECIMAL(10,2) DEFAULT 0,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_dependencies (
  id VARCHAR(50) PRIMARY KEY,
  task_id VARCHAR(50) REFERENCES tasks(id),
  depends_on_id VARCHAR(50) REFERENCES tasks(id),
  type VARCHAR(50) DEFAULT 'blocks',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subtasks (
  id VARCHAR(50) PRIMARY KEY,
  task_id VARCHAR(50) REFERENCES tasks(id),
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  assignee_id VARCHAR(50),
  due_date DATE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS processes (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  owner_id VARCHAR(50),
  status VARCHAR(50) DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  inputs TEXT[],
  outputs TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS process_steps (
  id VARCHAR(50) PRIMARY KEY,
  process_id VARCHAR(50) REFERENCES processes(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'task',
  order_index INTEGER,
  next_steps TEXT[],
  conditions JSONB,
  assignee_role VARCHAR(100),
  sla_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'open',
  affected_users INTEGER DEFAULT 0,
  assignee_id VARCHAR(50),
  reported_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incident_updates (
  id VARCHAR(50) PRIMARY KEY,
  incident_id VARCHAR(50) REFERENCES incidents(id),
  message TEXT,
  author_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risks (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  impact VARCHAR(20) DEFAULT 'medium',
  probability VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'identified',
  mitigation TEXT,
  owner_id VARCHAR(50),
  identified_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approvals (
  id VARCHAR(50) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  requester_id VARCHAR(50),
  amount DECIMAL(15,2),
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  submitted_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS approval_chains (
  id VARCHAR(50) PRIMARY KEY,
  approval_id VARCHAR(50) REFERENCES approvals(id),
  approver_id VARCHAR(50),
  role VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  order_index INTEGER,
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  comments TEXT
);

CREATE TABLE IF NOT EXISTS resources (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  capacity INTEGER,
  utilization INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'available',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quality_audits (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  department VARCHAR(100),
  auditor_id VARCHAR(50),
  status VARCHAR(50) DEFAULT 'scheduled',
  findings JSONB DEFAULT '[]',
  score INTEGER DEFAULT 0,
  scheduled_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capas (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  root_cause TEXT,
  corrective_action TEXT,
  preventive_action TEXT,
  status VARCHAR(50) DEFAULT 'open',
  deadline DATE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  content TEXT,
  tags TEXT[],
  views INTEGER DEFAULT 0,
  author_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'strategic',
  period VARCHAR(50) DEFAULT 'quarterly',
  status VARCHAR(50) DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_objectives (
  id VARCHAR(50) PRIMARY KEY,
  plan_id VARCHAR(50) REFERENCES plans(id),
  objective TEXT NOT NULL,
  key_results JSONB DEFAULT '[]',
  owner_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sprints (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  start_date DATE,
  end_date DATE,
  goals TEXT[],
  status VARCHAR(50) DEFAULT 'planning',
  velocity INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sprint_tasks (
  sprint_id VARCHAR(50) REFERENCES sprints(id),
  task_id VARCHAR(50) REFERENCES tasks(id),
  PRIMARY KEY (sprint_id, task_id)
);

CREATE TABLE IF NOT EXISTS okrs (
  id VARCHAR(50) PRIMARY KEY,
  objective TEXT NOT NULL,
  department VARCHAR(100),
  quarter VARCHAR(20),
  owner_id VARCHAR(50),
  status VARCHAR(50) DEFAULT 'in_progress',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kpis (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  formula TEXT,
  target DECIMAL(15,2),
  current DECIMAL(15,2),
  owner_id VARCHAR(50),
  frequency VARCHAR(50) DEFAULT 'monthly',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS slas (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  response_time_minutes INTEGER,
  resolution_time_minutes INTEGER,
  conditions JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS runbooks (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  steps JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scenarios (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  assumptions JSONB,
  variables JSONB,
  results JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_risks_impact ON risks(impact);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
`;

// Database class
class OpsDatabase {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    if (config.usePostgres) {
      pool = new Pool({
        connectionString: config.connectionString,
        max: config.maxConnections,
      });

      // Create tables
      try {
        await pool.query(SCHEMA);
        console.log('✅ PostgreSQL schema initialized');
      } catch (err) {
        console.error('Schema initialization error:', err.message);
      }
    }

    this.initialized = true;
    console.log(`📦 Database initialized: ${config.usePostgres ? 'PostgreSQL' : 'In-Memory'}`);
  }

  // Generic CRUD methods
  get(table, id) {
    if (config.usePostgres) {
      return this.getPostgres(table, id);
    }
    return memoryStores[table]?.get(id);
  }

  set(table, id, data) {
    if (config.usePostgres) {
      return this.setPostgres(table, id, data);
    }
    memoryStores[table] = memoryStores[table] || new Map();
    memoryStores[table].set(id, { ...data, id });
  }

  delete(table, id) {
    if (config.usePostgres) {
      return this.deletePostgres(table, id);
    }
    memoryStores[table]?.delete(id);
  }

  getAll(table) {
    if (config.usePostgres) {
      return this.getAllPostgres(table);
    }
    return Array.from(memoryStores[table]?.values() || []);
  }

  query(table, filter) {
    if (config.usePostgres) {
      return this.queryPostgres(table, filter);
    }
    let results = Array.from(memoryStores[table]?.values() || []);
    if (filter) {
      results = results.filter(item => {
        return Object.entries(filter).every(([key, value]) => item[key] === value);
      });
    }
    return results;
  }

  // PostgreSQL methods
  async getPostgres(table, id) {
    const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    return result.rows[0];
  }

  async setPostgres(table, id, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${table} (id, ${columns.join(', ')})
      VALUES ($1, ${placeholders})
      ON CONFLICT (id) DO UPDATE SET
      ${columns.map((col, i) => `${col} = $${i + 1}`).join(', ')}
    `;

    await pool.query(query, [id, ...values]);
    return { id, ...data };
  }

  async deletePostgres(table, id) {
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  }

  async getAllPostgres(table) {
    const result = await pool.query(`SELECT * FROM ${table}`);
    return result.rows;
  }

  async queryPostgres(table, filter) {
    if (!filter || Object.keys(filter).length === 0) {
      return this.getAllPostgres(table);
    }

    const conditions = Object.keys(filter).map((key, i) => `${key} = $${i + 1}`);
    const values = Object.values(filter);

    const result = await pool.query(
      `SELECT * FROM ${table} WHERE ${conditions.join(' AND ')}`,
      values
    );
    return result.rows;
  }

  // ID generation
  generateId(prefix) {
    return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Clean shutdown
  async close() {
    if (pool) {
      await pool.end();
      console.log('PostgreSQL connection closed');
    }
  }
}

// Singleton instance
const db = new OpsDatabase();

module.exports = { db, memoryStores, SCHEMA };
