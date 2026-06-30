# HOJAI Visual Workflow Builder

> **Status:** ✅ BUILT
> **Purpose:** Drag-drop canvas for building workflow templates

A visual workflow editor for creating automation templates with support for:
- **12 node types** (Trigger, Memory, Twin, AI Agent, Intelligence, SUTAR, Condition, Action, Human, Integration, Notification, CRM)
- **100+ pre-built templates** from `platform/hojai-templates/`
- **Export to JSON** for use with FlowOS

---

## Quick Start

```bash
cd foundry/services/visual-builder
npm install
npm start

# Open browser
open http://localhost:4600
```

---

## Features

### Node Types

| Type | Icon | Color | Purpose |
|------|------|-------|---------|
| **Trigger** | ⚡ | Green | Starts workflow |
| **Memory** | 🧠 | Purple | Load/save memory |
| **Twin** | 👥 | Cyan | Digital twin operations |
| **AI Agent** | 🤖 | Blue | AI worker tasks |
| **Intelligence** | 📊 | Yellow | Analytics/scoring |
| **SUTAR** | 🤝 | Pink | Commerce/negotiation |
| **Condition** | 🔀 | Indigo | Branch logic |
| **Action** | ⚙️ | Gray | Perform actions |
| **Human** | 👤 | Orange | Human approval |
| **Integration** | 🔌 | Lime | External services |
| **Notification** | 📧 | Teal | Send notifications |
| **CRM** | 📋 | Purple | CRM operations |

### Canvas Features

- **Drag nodes** to reposition
- **Connect nodes** by dragging between handles
- **Delete nodes** with Delete key
- **Edit properties** in the right panel
- **Zoom controls** at bottom right
- **Export to JSON** for workflow templates

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/node-types` | List node types |
| GET | `/api/templates` | List templates |
| GET | `/api/templates/:id` | Get template |
| POST | `/api/workflows` | Create workflow |
| GET | `/api/workflows` | List workflows |
| GET | `/api/workflows/:id` | Get workflow |
| PUT | `/api/workflows/:id` | Update workflow |
| POST | `/api/workflows/:id/nodes` | Add node |
| PUT | `/api/workflows/:id/nodes/:nodeId` | Update node |
| DELETE | `/api/workflows/:id/nodes/:nodeId` | Delete node |
| POST | `/api/workflows/:id/connections` | Add connection |
| GET | `/api/workflows/:id/export` | Export as template |

---

## Template Schema

Exported workflows match the HOJAI template schema:

```json
{
  "id": "sales-lead-qualification",
  "name": "Lead Qualification Pipeline",
  "category": "sales",
  "description": "...",
  "triggers": [
    { "type": "webhook", "source": "website_form", "event": "lead.created" }
  ],
  "nodes": [
    { "id": "1", "type": "trigger", "name": "Lead Created", "config": {} },
    { "id": "2", "type": "ai_agent", "name": "Qualify Lead", "config": { "agent": "sdr_agent" } },
    { "id": "3", "type": "condition", "name": "Score Check", "config": { "field": "score", "operator": ">=", "value": 70 } }
  ],
  "connections": [
    { "from": "1", "to": "2" },
    { "from": "2", "to": "3" }
  ]
}
```

---

## Integration with FlowOS

Workflows created in the Visual Builder can be:

1. **Exported** as JSON templates
2. **Imported** into FlowOS for execution
3. **Saved** to the template registry
4. **Published** to the marketplace

---

## Screenshots

```
┌─────────────────────────────────────────────────────────────┐
│ 🎨 HOJAI Visual Builder                    💾 Save  📤 Export │
├──────────┬────────────────────────────────────────────────┤
│          │                                                 │
│ Node     │     ┌──────────┐      ┌──────────┐           │
│ Types    │     │  ⚡     │      │  🤖     │           │
│          │     │ Trigger │──────│ AI Agent│           │
│ ⚡ Trigger│     └──────────┘      └──────────┘           │
│ 🧠 Memory │           │                                  │
│ 👥 Twin   │           ▼                                  │
│ 🤖 Agent │     ┌──────────┐                            │
│ 📊 Intel │     │  🔀     │                            │
│ 🤝 SUTAR │     │Condition│────── Yes ────►             │
│ 🔀 Cond  │     └──────────┘                            │
│ ⚙️ Action│          │                                  │
│ 👤 Human │          ▼ No                               │
│ 🔌 Integ │          ▼                                  │
│ 📧 Notif │                                                 │
│ 📋 CRM   │                                                 │
├──────────┼──────────────────────────┬─────────────────────┤
│          │                          │ Properties         │
│          │                          │                    │
│          │                          │ Name: Score Check  │
│          │                          │ Type: condition    │
│          │                          │                    │
│          │                          │ Config:            │
│          │                          │ {                  │
│          │                          │   "field": "score",│
│          │                          │   "op": ">="      │
│          │                          │ }                  │
└──────────┴──────────────────────────┴─────────────────────┘
```

---

## Related

- [HOJAI Templates](../hojai-templates/) — 100+ workflow templates
- [FlowOS](../flow/) — Workflow execution engine
- [SkillOS](../../platform/agent-os/skill-library/) — Skill definitions
