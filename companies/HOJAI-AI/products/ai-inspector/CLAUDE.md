# AI Inspector - Visual Debugger for AI Agents

> **Version:** 1.0.0
> **Port:** 5173 (dev) / 5174 (production)
> **Purpose:** Visual debugger for AI agents - inspect agent state, tokens, memory, tools, and errors in real-time

---

## Features

- **Dashboard View** - Overview of all agent sessions with health metrics
- **Session Inspector** - Deep dive into individual agent execution
- **Execution Trace** - Step-by-step view of agent reasoning
- **Tool Call Monitor** - Track API calls, latency, errors
- **Memory Inspector** - Working/long-term/context memory visualization
- **Input/Output Viewer** - See what the agent received and produced
- **Service Health Grid** - Monitor all connected services

---

## Quick Start

```bash
cd companies/HOJAI-AI/products/ai-inspector
npm install
npm run dev
```

Open http://localhost:5173

---

## Architecture

```
ai-inspector/
├── src/
│   ├── api/
│   │   └── inspector.ts      # API client for observability services
│   ├── components/
│   │   ├── Dashboard.tsx     # Main dashboard with session list
│   │   └── SessionInspector.tsx # Deep-dive session view
│   ├── App.tsx               # Main app with routing
│   └── main.tsx              # Entry point
├── package.json
└── vite.config.ts
```

---

## API Integration

The inspector connects to:

| Service | URL | Purpose |
|---------|-----|---------|
| RTMN Hub | localhost:4399 | Agent session data |
| SUTAR Gateway | localhost:4140 | Agent execution |
| MemoryOS | localhost:4703 | Memory state |
| TwinOS | localhost:4705 | Context |
| CorpID | localhost:4702 | Identity |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INSPECTOR_API_URL` | http://localhost:4399/api/ai | Backend API |
| `HUB_URL` | http://localhost:4399 | RTMN Hub URL |

---

*Built: June 25, 2026*
