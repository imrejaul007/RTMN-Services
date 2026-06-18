# Leverge - External Client of HOJAI AI

> **⚠️ IMPORTANT: Leverge is NOT part of RTMN or HOJAI AI**
> 
> Leverge is a **separate company** and **external client** of HOJAI AI.
> - ❌ DO NOT audit Leverge code
> - ❌ DO NOT modify Leverge code
> - ✅ Only help Leverge when they REQUEST something
> - ✅ Maintain this folder for client documentation only

---

## Client Overview

| Item | Value |
|------|-------|
| **Company** | Leverge |
| **Type** | External Client of HOJAI AI |
| **Product** | AI-powered Business Intelligence Platform |
| **Services** | 5 microservices (Intelligence, Memory, Twin, Agents, Copilot) |
| **Ports** | 4761-4765 |

---

## Leverge Services

| Service | Port | Description |
|---------|------|-------------|
| leverge-intelligence | 4761 | Business analytics, insights, metrics |
| leverge-memory | 4762 | AI memory, vector storage |
| leverge-twin | 4763 | Digital twin management |
| leverge-agents | 4764 | AI agent orchestration |
| leverge-copilot | 4765 | Business AI assistant |

---

## Integration with HOJAI AI

Leverge connects to these HOJAI AI services:
- **RABTUL Auth** (4002) - JWT authentication
- **TwinOS Hub** (4705) - Digital twin registry
- **AgentOS** - Agent marketplace
- **SUTAR OS** (4140+) - Autonomous operations

---

## Working Directory

Leverge services are stored at RTMN root for convenience:
```
/Users/rejaulkarim/Documents/RTMN/
├── leverge-intelligence/   # Client code - DO NOT MODIFY
├── leverge-memory/        # Client code - DO NOT MODIFY
├── leverge-twin/         # Client code - DO NOT MODIFY
├── leverge-agents/        # Client code - DO NOT MODIFY
└── leverge-copilot/      # Client code - DO NOT MODIFY
```

---

## Only Help When Requested

| Situation | Action |
|-----------|--------|
| Leverge asks for help | ✅ Assist |
| Leverge sends PR/changes | ✅ Review and merge if valid |
| Regular RTMN work | ❌ Don't touch Leverge code |
| Auditing RTMN | ❌ Don't include Leverge |
| Architecture discussions | ❌ Don't mention Leverge |

---

*Last Updated: June 18, 2026*
