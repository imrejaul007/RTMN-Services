# Ontology Engine - Service Documentation

> **Version:** 1.0.0
> **Port:** 4751
> **Location:** `companies/HOJAI-AI/platform/knowledge-graph/ontology-engine/`

## Service Purpose

The Ontology Engine provides enterprise-grade ontological schema management for the RTMN knowledge graph ecosystem. It enables:

1. **Schema Definition**: Define classes, properties, relationships, and constraints
2. **Entity Validation**: Validate data against schemas
3. **Inference**: Reason over ontologies using real algorithms
4. **Taxonomy**: Hierarchical category management

## Architecture

```
ontology-engine/
├── src/
│   ├── index.ts           # Main entry point
│   ├── models/types.ts     # TypeScript domain types
│   ├── db/
│   │   ├── database.ts    # PostgreSQL connection pool
│   │   └── schema.sql     # Database schema
│   ├── services/
│   │   ├── classService.ts         # Class CRUD
│   │   ├── propertyService.ts      # Property CRUD
│   │   ├── relationshipTypeService.ts  # Relationship CRUD
│   │   ├── constraintService.ts   # Constraint CRUD
│   │   ├── validationService.ts   # Schema validation
│   │   └── taxonomyService.ts     # Taxonomy management
│   ├── inference/
│   │   └── inferenceEngine.ts     # Inference algorithms
│   ├── routes/
│   │   └── ontology.ts     # Express routes
│   └── middleware/
│       └── auth.ts         # JWT authentication
├── __tests__/
│   └── unit/               # 112 vitest tests
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Key Services

### ClassService
Manages ontological classes with:
- CRUD operations
- Inheritance hierarchy (parent-child)
- Property aggregation (direct + inherited)
- Lineage tracking (root to class path)

### PropertyService
Manages class properties with:
- CRUD operations
- Type validation (string, number, boolean, date, array, object, uri, enum)
- Constraint attachment
- Inheritance from parent classes

### ConstraintService
Defines validation constraints:
- `required`: Value must be present
- `type`: Value must be of specific type
- `cardinality`: Array length constraints (min/max)
- `range`: Numeric range (min/max)
- `pattern`: Regex pattern matching
- `custom`: Custom validation logic

### ValidationService
Validates entities against schemas:
- Property type checking
- Constraint evaluation
- Required property validation
- Unknown property warnings (strict mode)

### InferenceEngine
Real reasoning algorithms:
- **Property Inheritance**: BFS traversal up class hierarchy
- **Transitive Closure**: BFS closure for transitive relationships
- **Symmetric Closure**: Direct inverse inference
- **Rule-Based Inference**: Pattern matching with variable binding

### TaxonomyService
Hierarchical category management:
- CRUD operations for taxonomy nodes
- DFS/BFS traversal
- Ancestor/descendant queries
- Path computation
- Distance calculation

## API Reference

### Authentication
All endpoints (except `/ontology/health`) require JWT Bearer token:
```
Authorization: Bearer <token>
```

### Endpoints

#### Classes
| Method | Path | Description |
|--------|------|-------------|
| POST | `/ontology/classes` | Create class |
| GET | `/ontology/classes` | List classes |
| GET | `/ontology/classes/:id` | Get class |
| PUT | `/ontology/classes/:id` | Update class |
| DELETE | `/ontology/classes/:id` | Delete class |
| GET | `/ontology/classes/:id/hierarchy` | Get ancestors |
| GET | `/ontology/classes/:id/children` | Get children |
| GET | `/ontology/classes/:id/lineage` | Get root-to-class path |

#### Properties
| Method | Path | Description |
|--------|------|-------------|
| POST | `/ontology/properties` | Create property |
| GET | `/ontology/properties?classId=<id>` | List properties |
| GET | `/ontology/properties/:id` | Get property |
| PUT | `/ontology/properties/:id` | Update property |
| DELETE | `/ontology/properties/:id` | Delete property |
| POST | `/ontology/properties/:id/constraints` | Add constraint |

#### Validation
| Method | Path | Description |
|--------|------|-------------|
| POST | `/ontology/validate` | Validate entity |

#### Inference
| Method | Path | Description |
|--------|------|-------------|
| POST | `/ontology/infer` | Run inference |
| GET | `/ontology/infer/stats` | Get stats |

#### Taxonomy
| Method | Path | Description |
|--------|------|-------------|
| POST | `/ontology/taxonomy` | Create node |
| GET | `/ontology/taxonomy` | List nodes |
| GET | `/ontology/taxonomy/:id` | Get node |
| PUT | `/ontology/taxonomy/:id` | Update node |
| DELETE | `/ontology/taxonomy/:id` | Delete node |
| GET | `/ontology/taxonomy/:id/ancestors` | Get ancestors |
| GET | `/ontology/taxonomy/:id/descendants` | Get descendants |
| GET | `/ontology/taxonomy/:id/subtree` | Get subtree |
| POST | `/ontology/taxonomy/traverse` | Traverse tree |

## Example Usage

### Create Schema
```typescript
// Create Person class
POST /ontology/classes
{
  "name": "Person",
  "description": "A human being"
}

// Add name property
POST /ontology/properties
{
  "name": "name",
  "classId": "<person-class-id>",
  "dataType": "string"
}

// Add age property with range constraint
POST /ontology/properties
{
  "name": "age",
  "classId": "<person-class-id>",
  "dataType": "number"
}

POST /ontology/properties/<age-property-id>/constraints
{
  "constraintType": "range",
  "value": {"min": 0, "max": 150}
}
```

### Validate Entity
```typescript
POST /ontology/validate
{
  "classId": "<person-class-id>",
  "data": {
    "name": "John",
    "age": 30
  }
}

// Response
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```

### Run Inference
```typescript
POST /ontology/infer
{
  "facts": [
    {"subject": "A", "predicate": "knows", "object": "B"},
    {"subject": "B", "predicate": "knows", "object": "C"}
  ],
  "maxDepth": 5
}

// Response includes inferred transitive relationships
```

## Database Schema

### Tables
- `classes` - Ontological classes with inheritance
- `properties` - Class properties with types
- `relationship_types` - Relationships between classes
- `constraints` - Validation constraints
- `inference_rules` - Custom inference rules
- `taxonomy_nodes` - Hierarchical taxonomy
- `instances` - Entity instances
- `instance_relationships` - Instance relationships

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

**112 tests** covering:
- ClassService (17 tests)
- PropertyService (14 tests)
- RelationshipTypeService (13 tests)
- ConstraintService (12 tests)
- ValidationService (15 tests)
- TaxonomyService (20 tests)
- InferenceEngine (9 tests)
- Auth middleware (12 tests)

## Development

```bash
# Install dependencies
npm install

# Run in dev mode with watch
npm run dev

# Build for production
npm run build

# Run migrations
npm run db:migrate

# Seed sample data
npm run db:seed
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4751 | Service port |
| `DB_HOST` | localhost | PostgreSQL host |
| `DB_PORT` | 5432 | PostgreSQL port |
| `DB_NAME` | ontology_engine | Database name |
| `DB_USER` | postgres | Database user |
| `DB_PASSWORD` | postgres | Database password |
| `JWT_SECRET` | (default) | JWT signing secret |

## Related Services

- **Knowledge Graph OS** (4501) - Graph database for entities
- **TwinOS Hub** (4705) - Digital twin management
- **MemoryOS** (4703) - AI memory layer

## Integration Points

The Ontology Engine integrates with:
- RTMN Unified Hub for routing
- TwinOS for digital twin schema definitions
- MemoryOS for knowledge representation
- AgentOS for agent capability schemas
