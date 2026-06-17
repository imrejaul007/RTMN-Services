# RTMN Organization OS

**Version:** 1.0  
**Port:** 5072  
**Status:** Phase 5 - Building  
**Parent:** RTMN Workforce OS  

---

## Overview

Organization OS provides:
- Visual Org Chart Builder
- AI Organization Design
- Workforce Planning
- Headcount Management
- Position Management
- Succession Planning

---

## Features

### Core
- Interactive org chart (tree, matrix, flat)
- Drag-and-drop restructuring
- Headcount planning
- Budget allocation
- Span of control analysis

### AI
- Organization health scoring
- Restructuring recommendations
- Merger/split simulations
- Leadership pipeline analysis

---

## API Endpoints

### Organization
```
GET    /api/org/chart               - Get org chart
GET    /api/org/chart/:id           - Subtree
POST   /api/org/restructure         - Propose changes
GET    /api/org/health              - Org health
```

### Headcount
```
GET    /api/headcount               - Current headcount
POST   /api/headcount/plan         - Create plan
GET    /api/headcount/projections   - Future headcount
```

### Positions
```
GET    /api/positions               - All positions
POST   /api/positions              - Create position
PATCH  /api/positions/:id          - Update position
```

### Succession
```
GET    /api/succession/:positionId - Succession plan
POST   /api/succession             - Add candidate
```

---

*Last Updated: June 17, 2026*
