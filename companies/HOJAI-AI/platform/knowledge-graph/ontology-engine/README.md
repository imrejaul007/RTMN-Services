# Ontology Engine

> Schema management, validation, inference, and taxonomy for knowledge graphs

**Port:** 4751

## Overview

The Ontology Engine is a TypeScript + Express + PostgreSQL service that provides:

- **Schema Management**: CRUD for ontological classes, properties, relationships, and constraints
- **Entity Validation**: Validate entities against class schemas
- **Inference Engine**: Real algorithms for reasoning (property inheritance, transitive closure, symmetric closure, rule-based inference)
- **Taxonomy Management**: Hierarchical category management with traversal algorithms

## Quick Start

```bash
# Install dependencies
npm install

# Start the service
npm run dev

# Run tests
npm test
```

## API Endpoints

### Health
- `GET /ontology/health` - Service health check
- `GET /ontology/ready` - Readiness probe

### Classes
- `POST /ontology/classes` - Create a class
- `GET /ontology/classes` - List all classes
- `GET /ontology/classes/:id` - Get class by ID
- `PUT /ontology/classes/:id` - Update class
- `DELETE /ontology/classes/:id` - Delete class
- `GET /ontology/classes/:id/hierarchy` - Get class hierarchy
- `GET /ontology/classes/:id/children` - Get child classes
- `GET /ontology/classes/:id/lineage` - Get lineage (root to class)
- `GET /ontology/classes/:id/is-subclass-of/:ancestorId` - Check inheritance

### Properties
- `POST /ontology/properties` - Create property
- `GET /ontology/properties?classId=<id>` - List properties for class
- `GET /ontology/properties/:id` - Get property
- `PUT /ontology/properties/:id` - Update property
- `DELETE /ontology/properties/:id` - Delete property
- `GET /ontology/properties/:id/constraints` - Get property constraints
- `POST /ontology/properties/:id/constraints` - Add constraint

### Constraints
- `GET /ontology/constraints` - List all constraints
- `POST /ontology/constraints` - Create constraint
- `PUT /ontology/constraints/:id` - Update constraint
- `DELETE /ontology/constraints/:id` - Delete constraint

### Validation
- `POST /ontology/validate` - Validate entity against class

### Inference
- `POST /ontology/infer` - Run inference engine
- `GET /ontology/infer/stats` - Get inference statistics

### Taxonomy
- `POST /ontology/taxonomy` - Create taxonomy node
- `GET /ontology/taxonomy` - List all nodes
- `GET /ontology/taxonomy/:id` - Get node
- `PUT /ontology/taxonomy/:id` - Update node
- `DELETE /ontology/taxonomy/:id` - Delete node
- `GET /ontology/taxonomy/:id/children` - Get children
- `GET /ontology/taxonomy/:id/ancestors` - Get ancestors
- `GET /ontology/taxonomy/:id/descendants` - Get descendants
- `GET /ontology/taxonomy/:id/subtree` - Get subtree
- `GET /ontology/taxonomy/:id/siblings` - Get siblings
- `GET /ontology/taxonomy/:id/path` - Get root-to-node path
- `POST /ontology/taxonomy/traverse` - Traverse taxonomy
- `GET /ontology/taxonomy/stats` - Get taxonomy statistics

## Authentication

All endpoints (except health) require JWT authentication:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:4751/ontology/classes
```

## Example Usage

### Create a Class

```bash
curl -X POST http://localhost:4751/ontology/classes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Person",
    "description": "A human being",
    "isAbstract": false
  }'
```

### Add Property with Constraints

```bash
# Create property
curl -X POST http://localhost:4751/ontology/properties \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "age",
    "classId": "<person-class-id>",
    "dataType": "number",
    "description": "Age in years"
  }'

# Add range constraint
curl -X POST http://localhost:4751/ontology/properties/<property-id>/constraints \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "constraintType": "range",
    "value": {"min": 0, "max": 150},
    "errorMessage": "Age must be between 0 and 150"
  }'
```

### Validate Entity

```bash
curl -X POST http://localhost:4751/ontology/validate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "classId": "<person-class-id>",
    "data": {
      "name": "John",
      "age": 30
    }
  }'
```

### Run Inference

```bash
curl -X POST http://localhost:4751/ontology/infer \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "facts": [
      {"subject": "A", "predicate": "knows", "object": "B"},
      {"subject": "B", "predicate": "knows", "object": "C"}
    ],
    "maxDepth": 5
  }'
```

### Create Taxonomy

```bash
# Create root
curl -X POST http://localhost:4751/ontology/taxonomy \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Products"}'

# Create child
curl -X POST http://localhost:4751/ontology/taxonomy \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Electronics", "parentId": "<root-id>"}'
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Ontology Engine (4751)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Class CRUD  │  │ Property CRUD│  │Constraint CRUD│    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Inference Engine                     │   │
│  │  • Property Inheritance  • Transitive Closure       │   │
│  │  • Symmetric Closure      • Rule-Based Inference     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Taxonomy Service                     │   │
│  │  • Hierarchical nodes   • Traversal (DFS/BFS)       │   │
│  │  • Ancestor/Descendant   • Path computation          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Validation Service                   │   │
│  │  • Type validation     • Constraint checking         │   │
│  │  • Range/cardinality   • Pattern matching            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │    PostgreSQL       │
                   │  • classes          │
                   │  • properties       │
                   │  • constraints       │
                   │  • relationship_types│
                   │  • inference_rules  │
                   │  • taxonomy_nodes   │
                   │  • instances        │
                   └─────────────────────┘
```

## Inference Algorithms

### Property Inheritance
- BFS traversal up the class hierarchy
- Properties flow down from parent to child classes
- Child classes can override inherited properties

### Transitive Closure
- BFS-based closure computation
- If A→B and B→C via transitive relationship R, then A→C
- Confidence decreases with depth

### Symmetric Closure
- Direct inverse relationship inference
- If A relates to B via symmetric R, then B relates to A

### Rule-Based Inference
- Pattern matching with variable binding
- IF antecedent THEN consequent rules
- Supports composite antecedents

## Taxonomy Traversal

The taxonomy service supports:
- **DFS (Depth-First Search)**: Recursive subtree building
- **BFS (Breadth-First Search)**: Level-order traversal
- **Ancestor queries**: Get all ancestors (breadcrumb)
- **Descendant queries**: Get all descendants
- **Path computation**: Root-to-node path
- **Distance**: Calculate distance between nodes

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

## License

MIT
