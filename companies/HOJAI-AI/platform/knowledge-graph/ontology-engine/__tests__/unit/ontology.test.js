import { describe, it, expect } from 'vitest';

// Schema class definition
class SchemaClass {
  constructor(name, properties = {}) {
    this.name = name;
    this.properties = properties;
    this.parent = null;
    this.instances = [];
  }

  addProperty(name, type, required = false) {
    this.properties[name] = { type, required };
    return this;
  }

  setParent(parent) {
    this.parent = parent;
    return this;
  }

  getAllProperties() {
    if (!this.parent) return this.properties;
    return { ...this.parent.getAllProperties(), ...this.properties };
  }

  validate(data) {
    const errors = [];
    const allProps = this.getAllProperties();
    for (const [name, prop] of Object.entries(allProps)) {
      if (prop.required && !(name in data)) {
        errors.push(`Missing required property: ${name}`);
      }
    }
    return { valid: errors.length === 0, errors };
  }
}

// Validation helpers
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function validateDate(date) {
  const d = new Date(date);
  return !isNaN(d.getTime());
}

function validateType(value, type) {
  switch (type) {
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number';
    case 'boolean': return typeof value === 'boolean';
    case 'email': return validateEmail(value);
    case 'url': return validateUrl(value);
    case 'date': return validateDate(value);
    case 'array': return Array.isArray(value);
    case 'object': return typeof value === 'object' && !Array.isArray(value);
    default: return true;
  }
}

// Taxonomy helpers
function buildTaxonomy(categories) {
  const tree = { name: 'root', children: [] };
  for (const cat of categories) {
    let current = tree;
    for (const part of cat.path.split('/')) {
      let child = current.children.find(c => c.name === part);
      if (!child) {
        child = { name: part, children: [] };
        current.children.push(child);
      }
      current = child;
    }
    if (cat.metadata) current.metadata = cat.metadata;
  }
  return tree;
}

function searchTaxonomy(tree, query) {
  const results = [];
  function search(node, path) {
    const currentPath = path ? `${path}/${node.name}` : node.name;
    if (node.name.toLowerCase().includes(query.toLowerCase())) {
      results.push({ name: node.name, path: currentPath });
    }
    if (node.children) {
      for (const child of node.children) {
        search(child, currentPath);
      }
    }
  }
  search(tree, '');
  return results;
}

describe('Ontology Engine - Schema Classes', () => {
  it('should create a schema class', () => {
    const Person = new SchemaClass('Person');
    expect(Person.name).toBe('Person');
    expect(Person.properties).toEqual({});
  });

  it('should add properties to class', () => {
    const Person = new SchemaClass('Person');
    Person.addProperty('name', 'string', true);
    Person.addProperty('age', 'number', false);
    expect(Person.properties.name.required).toBe(true);
    expect(Person.properties.age.required).toBe(false);
  });

  it('should validate required properties', () => {
    const Person = new SchemaClass('Person');
    Person.addProperty('name', 'string', true);
    const result = Person.validate({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required property: name');
  });

  it('should pass validation with required properties', () => {
    const Person = new SchemaClass('Person');
    Person.addProperty('name', 'string', true);
    const result = Person.validate({ name: 'Karim' });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should inherit parent properties', () => {
    const Animal = new SchemaClass('Animal');
    Animal.addProperty('name', 'string', true);

    const Dog = new SchemaClass('Dog');
    Dog.setParent(Animal);
    Dog.addProperty('breed', 'string', false);

    const allProps = Dog.getAllProperties();
    expect(allProps.name).toBeDefined();
    expect(allProps.breed).toBeDefined();
  });
});

describe('Ontology Engine - Type Validation', () => {
  it('should validate string type', () => {
    expect(validateType('hello', 'string')).toBe(true);
    expect(validateType(123, 'string')).toBe(false);
  });

  it('should validate number type', () => {
    expect(validateType(42, 'number')).toBe(true);
    expect(validateType('42', 'number')).toBe(false);
  });

  it('should validate boolean type', () => {
    expect(validateType(true, 'boolean')).toBe(true);
    expect(validateType(1, 'boolean')).toBe(false);
  });

  it('should validate email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid')).toBe(false);
  });

  it('should validate URL', () => {
    expect(validateUrl('https://hojai.ai')).toBe(true);
    expect(validateUrl('not-a-url')).toBe(false);
  });

  it('should validate date', () => {
    expect(validateDate('2026-06-30')).toBe(true);
    expect(validateDate('invalid')).toBe(false);
  });

  it('should validate array', () => {
    expect(validateType([1, 2, 3], 'array')).toBe(true);
    expect(validateType({}, 'array')).toBe(false);
  });

  it('should validate object', () => {
    expect(validateType({ key: 'value' }, 'object')).toBe(true);
    expect(validateType([], 'object')).toBe(false);
  });
});

describe('Ontology Engine - Taxonomy', () => {
  const categories = [
    { path: 'technology/ai', metadata: { level: 1 } },
    { path: 'technology/web', metadata: { level: 1 } },
    { path: 'technology/ai/ml', metadata: { level: 2 } },
    { path: 'business/saas', metadata: { level: 1 } }
  ];

  it('should build taxonomy tree', () => {
    const tree = buildTaxonomy(categories);
    expect(tree.name).toBe('root');
    expect(tree.children.length).toBe(2); // technology, business
  });

  it('should search taxonomy', () => {
    const tree = buildTaxonomy(categories);
    const results = searchTaxonomy(tree, 'ai');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should return correct paths', () => {
    const tree = buildTaxonomy(categories);
    const results = searchTaxonomy(tree, 'ml');
    expect(results[0].path).toBe('technology/ai/ml');
  });

  it('should find nested categories', () => {
    const tree = buildTaxonomy(categories);
    const results = searchTaxonomy(tree, 'technology');
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('Ontology Engine - Integration', () => {
  it('should model company hierarchy', () => {
    const Organization = new SchemaClass('Organization');
    Organization.addProperty('name', 'string', true);
    Organization.addProperty('founded', 'date', false);

    const Company = new SchemaClass('Company');
    Company.setParent(Organization);
    Company.addProperty('revenue', 'number', false);
    Company.addProperty('employees', 'number', false);

    const allProps = Company.getAllProperties();
    expect(allProps.name).toBeDefined();
    expect(allProps.founded).toBeDefined();
    expect(allProps.revenue).toBeDefined();
  });

  it('should validate product schema', () => {
    const Product = new SchemaClass('Product');
    Product.addProperty('name', 'string', true);
    Product.addProperty('price', 'number', true);
    Product.addProperty('url', 'url', false);
    Product.addProperty('categories', 'array', false);

    const result = Product.validate({
      name: 'SUTAR OS',
      price: 999,
      url: 'https://hojai.ai/sutar'
    });
    expect(result.valid).toBe(true);
  });

  it('should model industry taxonomy', () => {
    const industries = [
      { path: 'healthcare/hospital' },
      { path: 'healthcare/clinic' },
      { path: 'finance/banking' },
      { path: 'finance/insurance' }
    ];
    const tree = buildTaxonomy(industries);
    expect(tree.children.length).toBe(2);
  });
});
