/**
 * Database seed script - Sample ontology data
 */

import { pool } from './database.js';

async function seed() {
  const client = await pool.connect();

  try {
    console.log('Seeding ontology engine database...');

    // Seed classes
    await client.query(`
      INSERT INTO classes (id, name, description, is_abstract, metadata)
      VALUES
        ('00000000-0000-0000-0000-000000000001', 'Entity', 'Base entity class', true, '{}'),
        ('00000000-0000-0000-0000-000000000002', 'Person', 'A human being', false, '{"tags": ["human", "actor"]}'),
        ('00000000-0000-0000-0000-000000000003', 'Organization', 'An organization', false, '{}'),
        ('00000000-0000-0000-0000-000000000004', 'Product', 'A product or service', false, '{}'),
        ('00000000-0000-0000-0000-000000000005', 'Employee', 'An employee (extends Person)', false, '{}')
      ON CONFLICT (id) DO NOTHING
    `);

    // Set up inheritance
    await client.query(`
      UPDATE classes SET parent_class_id = '00000000-0000-0000-0000-000000000001'
      WHERE id IN ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004')
    `);

    await client.query(`
      UPDATE classes SET parent_class_id = '00000000-0000-0000-0000-000000000002'
      WHERE id = '00000000-0000-0000-0000-000000000005'
    `);

    // Seed properties
    await client.query(`
      INSERT INTO properties (id, name, class_id, data_type, description, default_value)
      VALUES
        ('10000000-0000-0000-0000-000000000001', 'name', '00000000-0000-0000-0000-000000000002', 'string', 'Full name', null),
        ('10000000-0000-0000-0000-000000000002', 'email', '00000000-0000-0000-0000-000000000002', 'string', 'Email address', null),
        ('10000000-0000-0000-0000-000000000003', 'age', '00000000-0000-0000-0000-000000000002', 'number', 'Age in years', null),
        ('10000000-0000-0000-0000-000000000004', 'createdAt', '00000000-0000-0000-0000-000000000002', 'datetime', 'Creation timestamp', null),
        ('10000000-0000-0000-0000-000000000005', 'name', '00000000-0000-0000-0000-000000000003', 'string', 'Organization name', null),
        ('10000000-0000-0000-0000-000000000006', 'founded', '00000000-0000-0000-0000-000000000003', 'date', 'Founded date', null),
        ('10000000-0000-0000-0000-000000000007', 'price', '00000000-0000-0000-0000-000000000004', 'number', 'Product price', 0),
        ('10000000-0000-0000-0000-000000000008', 'department', '00000000-0000-0000-0000-000000000005', 'string', 'Department name', null),
        ('10000000-0000-0000-0000-000000000009', 'employeeId', '00000000-0000-0000-0000-000000000005', 'string', 'Employee ID', null)
      ON CONFLICT (name, class_id) DO NOTHING
    `);

    // Seed constraints
    await client.query(`
      INSERT INTO constraints (id, property_id, constraint_type, value, error_message)
      VALUES
        ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'required', true, 'Name is required'),
        ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'required', true, 'Email is required'),
        ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'pattern', '^[\\w.-]+@[\\w.-]+\\.\\w+$', 'Invalid email format'),
        ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'range', '{"min": 0, "max": 150}', 'Age must be between 0 and 150')
      ON CONFLICT DO NOTHING
    `);

    // Seed relationship types
    await client.query(`
      INSERT INTO relationship_types (id, name, source_class_id, target_class_id, is_transitive, is_symmetric, metadata)
      VALUES
        ('30000000-0000-0000-0000-000000000001', 'knows', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', false, true, '{}'),
        ('30000000-0000-0000-0000-000000000002', 'worksAt', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', false, false, '{}'),
        ('30000000-0000-0000-0000-000000000003', 'ancestorOf', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', true, false, '{}'),
        ('30000000-0000-0000-0000-000000000004', 'partOf', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', true, false, '{}')
      ON CONFLICT (name) DO NOTHING
    `);

    // Seed taxonomy
    await client.query(`
      INSERT INTO taxonomy_nodes (id, name, slug, depth, path, metadata)
      VALUES
        ('40000000-0000-0000-0000-000000000001', 'Products', 'products', 0, '40000000-0000-0000-0000-000000000001', '{}'),
        ('40000000-0000-0000-0000-000000000002', 'Electronics', 'electronics', 1, '40000000-0000-0000-0000-000000000001.40000000-0000-0000-0000-000000000002', '{}'),
        ('40000000-0000-0000-0000-000000000003', 'Clothing', 'clothing', 1, '40000000-0000-0000-0000-000000000001.40000000-0000-0000-0000-000000000003', '{}'),
        ('40000000-0000-0000-0000-000000000004', 'Smartphones', 'smartphones', 2, '40000000-0000-0000-0000-000000000001.40000000-0000-0000-0000-000000000002.40000000-0000-0000-0000-000000000004', '{}'),
        ('40000000-0000-0000-0000-000000000005', 'Laptops', 'laptops', 2, '40000000-0000-0000-0000-000000000001.40000000-0000-0000-0000-000000000002.40000000-0000-0000-0000-000000000005', '{}'),
        ('40000000-0000-0000-0000-000000000006', 'Categories', 'categories', 0, '40000000-0000-0000-0000-000000000006', '{}'),
        ('40000000-0000-0000-0000-000000000007', 'By Price', 'by-price', 1, '40000000-0000-0000-0000-000000000006.40000000-0000-0000-0000-000000000007', '{}'),
        ('40000000-0000-0000-0000-000000000008', 'Budget', 'budget', 2, '40000000-0000-0000-0000-000000000006.40000000-0000-0000-0000-000000000007.40000000-0000-0000-0000-000000000008', '{}')
      ON CONFLICT (id) DO NOTHING
    `);

    // Update parent references
    await client.query(`
      UPDATE taxonomy_nodes SET parent_id = '40000000-0000-0000-0000-000000000001'
      WHERE id IN ('40000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003')
    `);

    await client.query(`
      UPDATE taxonomy_nodes SET parent_id = '40000000-0000-0000-0000-000000000002'
      WHERE id IN ('40000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000005')
    `);

    await client.query(`
      UPDATE taxonomy_nodes SET parent_id = '40000000-0000-0000-0000-000000000006'
      WHERE id = '40000000-0000-0000-0000-000000000007'
    `);

    await client.query(`
      UPDATE taxonomy_nodes SET parent_id = '40000000-0000-0000-0000-000000000007'
      WHERE id = '40000000-0000-0000-0000-000000000008'
    `);

    // Seed inference rules
    await client.query(`
      INSERT INTO inference_rules (id, name, description, rule_type, antecedent, consequent, priority, is_active)
      VALUES
        ('50000000-0000-0000-0000-000000000001', 'All Employees are Persons', 'Employees inherit Person properties', 'property_inheritance',
         '{"predicate": "isA", "subject": "?x", "object": "Employee"}',
         '{"predicate": "isA", "subject": "?x", "object": "Person"}', 10, true),
        ('50000000-0000-0000-0000-000000000002', 'Knows is Symmetric', 'If A knows B, then B knows A', 'symmetric',
         '{"predicate": "knows", "subject": "?a", "object": "?b"}',
         '{"predicate": "knows", "subject": "?b", "object": "?a"}', 5, true)
      ON CONFLICT (name) DO NOTHING
    `);

    console.log('Seeding complete!');
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
