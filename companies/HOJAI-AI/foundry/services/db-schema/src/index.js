/**
 * HOJAI Studio - DB Schema Service
 * Visual database schema designer
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}
const PORT = 4750;
app.use(express.json());

const schemas = new Map(); // projectId -> schema data

// Data types
const DATA_TYPES = {
  string: { mysql: 'VARCHAR(255)', postgres: 'VARCHAR(255)', mongodb: 'String', sqlite: 'TEXT' },
  text: { mysql: 'TEXT', postgres: 'TEXT', mongodb: 'String', sqlite: 'TEXT' },
  integer: { mysql: 'INT', postgres: 'INTEGER', mongodb: 'Number', sqlite: 'INTEGER' },
  bigint: { mysql: 'BIGINT', postgres: 'BIGINT', mongodb: 'Number', sqlite: 'INTEGER' },
  decimal: { mysql: 'DECIMAL(10,2)', postgres: 'DECIMAL(10,2)', mongodb: 'Number', sqlite: 'REAL' },
  boolean: { mysql: 'BOOLEAN', postgres: 'BOOLEAN', mongodb: 'Boolean', sqlite: 'INTEGER' },
  date: { mysql: 'DATE', postgres: 'DATE', mongodb: 'Date', sqlite: 'TEXT' },
  datetime: { mysql: 'DATETIME', postgres: 'TIMESTAMP', mongodb: 'Date', sqlite: 'TEXT' },
  json: { mysql: 'JSON', postgres: 'JSONB', mongodb: 'Object', sqlite: 'TEXT' },
  uuid: { mysql: 'CHAR(36)', postgres: 'UUID', mongodb: 'String', sqlite: 'TEXT' },
  email: { mysql: 'VARCHAR(255)', postgres: 'VARCHAR(255)', mongodb: 'String', sqlite: 'TEXT' },
  url: { mysql: 'VARCHAR(500)', postgres: 'VARCHAR(500)', mongodb: 'String', sqlite: 'TEXT' }
};

// REST API - Schemas
app.post('/api/schemas', requireInternal, (req, res) => {
  const { projectId, name, database = 'postgres' } = req.body;
  const schema = {
    id: uuidv4(),
    projectId,
    name,
    database,
    tables: [],
    enums: [],
    relationships: [],
    indexes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  schemas.set(projectId, schema);
  res.json(schema);
});

app.get('/api/schemas/:projectId', (req, res) => {
  const schema = schemas.get(req.params.projectId);
  if (!schema) return res.status(404).json({ error: 'Schema not found' });
  res.json(schema);
});

// REST API - Tables
app.post('/api/schemas/:projectId/tables', requireInternal, (req, res) => {
  const schema = schemas.get(req.params.projectId);
  if (!schema) return res.status(404).json({ error: 'Schema not found' });

  const { name, columns = [], primaryKey, timestamps = true } = req.body;

  // Add default columns
  const tableColumns = [...columns];
  if (timestamps) {
    tableColumns.push({ name: 'createdAt', type: 'datetime', nullable: false, default: 'now()' });
    tableColumns.push({ name: 'updatedAt', type: 'datetime', nullable: false, default: 'now()' });
  }

  const table = {
    id: uuidv4(),
    name,
    columns: tableColumns,
    primaryKey: primaryKey || (tableColumns.find(c => c.name === 'id') ? 'id' : null),
    foreignKeys: [],
    indexes: []
  };

  schema.tables.push(table);
  schema.updatedAt = new Date().toISOString();
  res.json(table);
});

app.patch('/api/schemas/:projectId/tables/:tableId', requireInternal, (req, res) => {
  const schema = schemas.get(req.params.projectId);
  if (!schema) return res.status(404).json({ error: 'Schema not found' });

  const table = schema.tables.find(t => t.id === req.params.tableId);
  if (!table) return res.status(404).json({ error: 'Table not found' });

  Object.assign(table, req.body);
  schema.updatedAt = new Date().toISOString();
  res.json(table);
});

app.delete('/api/schemas/:projectId/tables/:tableId', requireInternal, (req, res) => {
  const schema = schemas.get(req.params.projectId);
  if (!schema) return res.status(404).json({ error: 'Schema not found' });

  schema.tables = schema.tables.filter(t => t.id !== req.params.tableId);
  // Remove related relationships
  schema.relationships = schema.relationships.filter(r => r.fromTable !== req.params.tableId && r.toTable !== req.params.tableId);
  schema.updatedAt = new Date().toISOString();
  res.json({ deleted: true });
});

// REST API - Columns
app.post('/api/schemas/:projectId/tables/:tableId/columns', requireInternal, (req, res) => {
  const schema = schemas.get(req.params.projectId);
  if (!schema) return res.status(404).json({ error: 'Schema not found' });

  const table = schema.tables.find(t => t.id === req.params.tableId);
  if (!table) return res.status(404).json({ error: 'Table not found' });

  const { name, type, nullable = true, default: defaultValue, unique = false, primaryKey = false } = req.body;
  const column = { id: uuidv4(), name, type, nullable, default: defaultValue, unique, primaryKey };
  table.columns.push(column);

  if (primaryKey) table.primaryKey = column.id;
  schema.updatedAt = new Date().toISOString();
  res.json(column);
});

// REST API - Relationships
app.post('/api/schemas/:projectId/relationships', requireInternal, (req, res) => {
  const schema = schemas.get(req.params.projectId);
  if (!schema) return res.status(404).json({ error: 'Schema not found' });

  const { fromTable, fromColumn, toTable, toColumn, type = 'many-to-one' } = req.body;
  const relationship = { id: uuidv4(), fromTable, fromColumn, toTable, toColumn, type };
  schema.relationships.push(relationship);
  schema.updatedAt = new Date().toISOString();
  res.json(relationship);
});

// REST API - Generate SQL
app.get('/api/schemas/:projectId/sql', (req, res) => {
  const schema = schemas.get(req.params.projectId);
  if (!schema) return res.status(404).json({ error: 'Schema not found' });

  const { database = schema.database, format = 'create' } = req.query;
  const sql = generateSQL(schema, database, format);

  res.json({ database, format, sql });
});

// REST API - Generate Migrations
app.get('/api/schemas/:projectId/migrations', (req, res) => {
  const schema = schemas.get(req.params.projectId);
  if (!schema) return res.status(404).json({ error: 'Schema not found' });

  res.json({
    up: generateSQL(schema, schema.database, 'create'),
    down: generateSQL(schema, schema.database, 'drop')
  });
});

// REST API - Import from existing DB
app.post('/api/schemas/:projectId/import', requireInternal, (req, res) => {
  const schema = schemas.get(req.params.projectId);
  if (!schema) return res.status(404).json({ error: 'Schema not found' });

  const { tables } = req.body;
  schema.tables = tables || [];
  schema.updatedAt = new Date().toISOString();
  res.json(schema);
});

function generateSQL(schema, database, format) {
  if (format === 'drop') {
    return schema.tables.map(t => `DROP TABLE IF EXISTS ${t.name};`).join('\n');
  }

  const lines = [];

  schema.tables.forEach(table => {
    const colDefs = table.columns.map(col => {
      const type = DATA_TYPES[col.type]?.[database] || col.type;
      let def = `  ${col.name} ${type}`;
      if (!col.nullable) def += ' NOT NULL';
      if (col.default) def += ` DEFAULT ${col.default}`;
      if (col.unique) def += ' UNIQUE';
      return def;
    });

    if (table.primaryKey) {
      const pkCol = table.columns.find(c => c.id === table.primaryKey);
      if (pkCol) colDefs.push(`  PRIMARY KEY (${pkCol.name})`);
    }

    // Add foreign keys
    schema.relationships
      .filter(r => r.fromTable === table.id)
      .forEach(r => {
        const fromCol = table.columns.find(c => c.id === r.fromColumn);
        const toTable = schema.tables.find(t => t.id === r.toTable);
        const toCol = toTable?.columns.find(c => c.id === r.toColumn);
        if (fromCol && toTable && toCol) {
          colDefs.push(`  FOREIGN KEY (${fromCol.name}) REFERENCES ${toTable.name}(${toCol.name})`);
        }
      });

    lines.push(`CREATE TABLE ${table.name} (\n${colDefs.join(',\n')}\n);`);
  });

  return lines.join('\n\n');
}

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'db-schema', schemas: schemas.size }));
app.listen(PORT, () => console.log(`DB Schema running on port ${PORT}`));
