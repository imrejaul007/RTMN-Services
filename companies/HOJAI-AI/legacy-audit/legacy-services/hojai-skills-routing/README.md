# Hojai Skills Routing

**Port:** 4910

Skill-based routing for contact centers.

## Features

- Skill definitions and levels (1-5)
- Agent skill assignment
- Skill-based matching algorithm
- Custom routing rules
- Priority routing
- Multiple routing methods (skill_match, rule_based, round_robin)

## Quick Start

```bash
cd hojai-ai/hojai-skills-routing
npm install
npm run dev
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/skills` | Create skill |
| GET | `/api/skills` | List skills |
| POST | `/api/agent-skills` | Add skill to agent |
| GET | `/api/agents/:id/skills` | Get agent skills |
| POST | `/api/rules` | Create routing rule |
| GET | `/api/rules` | List rules |
| POST | `/api/route` | Route conversation |
