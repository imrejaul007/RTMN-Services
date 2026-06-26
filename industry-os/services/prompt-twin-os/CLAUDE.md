# Prompt Twin OS

**Port:** 5266  
**Status:** ✅ Built (June 26, 2026)

Digital Twin for AI Interactions: Prompt versioning, lineage tracking, A/B testing, and analytics for AI model interactions.

## AI Agents (2)

| Agent | Purpose |
|-------|---------|
| Prompt Optimizer Agent | Performance analysis, optimization suggestions, template management |
| Lineage Tracer Agent | Version tracking, impact analysis, attribution mapping |

## Key Features

- **Prompt Versioning**: Version control, rollback, comparison, branching
- **Lineage Tracking**: Input/output tracking, transformation graph, provenance
- **A/B Testing**: Variant management, statistical analysis, winner selection
- **Performance Analytics**: Latency tracking, token usage, cost analysis
- **Template Management**: Prompt templates, variable substitution, reuse

## Endpoints

```
POST /api/prompts                    # Create prompt
GET  /api/prompts                   # List prompts
PATCH /api/prompts/:id            # Update prompt
GET  /api/prompts/:id/versions   # Version history
POST /api/executions              # Log execution
GET  /api/executions/:id        # Execution details
POST /api/tests                  # Create A/B test
GET  /api/tests/:id/analysis   # Test analysis
GET  /api/analytics/:promptId  # Performance analytics
```

## Start

```bash
cd industry-os/services/prompt-twin-os
npm start
# http://localhost:5266/health
```

## Dependencies

- express, cors, helmet, express-rate-limit
