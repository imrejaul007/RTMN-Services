# Architecture OS

**Port:** 5270  
**Status:** ✅ Built (June 26, 2026)

System Design & Architecture Platform: Architecture patterns, dependency mapping, design reviews, and technical debt tracking.

## AI Agents (2)

| Agent | Purpose |
|-------|---------|
| Architecture Advisor | Pattern recommendations, technology selection, best practices |
| Dependency Analyzer | Dependency mapping, circular dependency detection, impact analysis |

## Key Features

- **Architecture Patterns**: Microservices, event-driven, CQRS, hexagonal, serverless
- **Design Reviews**: Automated reviews, best practice validation, risk assessment
- **Dependency Mapping**: Service dependencies, data flow visualization, coupling analysis
- **Technology Selection**: Tech stack recommendations, comparison analysis

## Endpoints

```
POST /api/architectures              # Design architecture
GET  /api/architectures              # List architectures
GET  /api/patterns                   # Get patterns
POST /api/patterns/recommend        # Recommend pattern
POST /api/reviews                   # Create review
GET  /api/reviews/:id               # Review details
POST /api/dependencies/map         # Map dependencies
GET  /api/dependencies/:service     # Service dependencies
```

## Start

```bash
cd industry-os/services/architecture-os
npm start
# http://localhost:5270/health
```

## Dependencies

- express, cors, helmet, express-rate-limit
