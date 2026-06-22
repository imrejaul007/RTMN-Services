# Agent Builder

**Port:** 4188
**Type:** Platform Intelligence Service (Agent Composition)
**Package:** `@hojai/agent-builder`

## Overview

Visual agent workflow builder backend. Agents are composed as directed graphs of nodes (input, llm, tool, condition, output, memory, http, delay, parallel, loop). Stores blueprints, versions, templates, and exports flow-orchestrator-compatible JSON. Pairs with Multi-Agent Runtime (4190) for execution.