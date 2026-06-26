# Knowledge Twin Service

**Port:** 4739  
**Type:** Core Twin  
**Phase:** 1  
**Author:** HOJAI AI

---

## What This Service Does

The Knowledge Twin manages employee knowledge:
- Knowledge nodes
- Expertise areas
- Knowledge gaps

---

## Key Endpoints

### Add Knowledge Node
```
POST /api/twin/:employeeId/knowledge
Body: { concept: string, description?: string, type?: string, category?: string, tags?: [] }
```

### Get Knowledge Nodes
```
GET /api/twin/:employeeId/knowledge?category=sales&search=negotiation
```

### Get Expertise Areas
```
GET /api/twin/:employeeId/knowledge/expertise
```

### Add Expertise
```
POST /api/twin/:employeeId/knowledge/expertise
Body: { domain: string, subdomains?: [], level?: string, yearsExperience?: number }
```

### Get Knowledge Gaps
```
GET /api/twin/:employeeId/knowledge/gaps?filled=false
```

### Add Knowledge Gap
```
POST /api/twin/:employeeId/knowledge/gaps
Body: { topic: string, priority?: string, currentLevel?: string, desiredLevel?: string }
```

### Query Knowledge
```
POST /api/twin/:employeeId/knowledge/query
Body: { query: string, category?: string }
```

### Get Stats
```
GET /api/twin/:employeeId/knowledge/stats
```

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| KnowledgeOS | - | Knowledge management |
| SkillOS | - | Skill tracking |

---

## Data Stored

- Knowledge nodes
- Expertise profiles
- Knowledge gaps
- Learning resources
