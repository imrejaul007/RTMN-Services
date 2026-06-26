# KnowledgeOS — Continuous Learning & Knowledge Management

**Port:** 4590
**Purpose:** Enables AI workers to continuously learn from company knowledge

---

## Overview

AI workers need continuous learning to:
- Know company policies, SOPs, and culture
- Learn from past interactions and outcomes
- Stay updated on industry trends
- Access real-time data from connected systems
- Build institutional memory that persists

KnowledgeOS provides:
- **Knowledge Bases** — Organized document collections
- **Semantic Search** — RAG-powered retrieval
- **Agent Memory** — Per-agent learning history
- **Feedback Loops** — Learning from outcomes
- **Analytics** — Learning metrics

---

## Core Concepts

### Knowledge Bases
Containers for related documents. Types:
- `company_policies` — HR, legal, compliance
- `product_docs` — Product information, FAQs
- `customer_kb` — Support knowledge base
- `technical_docs` — API docs, architecture
- `training` — Onboarding, training materials

### Document Types
- `policy` — Company policies
- `sop` — Standard operating procedures
- `manual` — User/product manuals
- `report` — Analytics reports
- `email` — Email threads
- `chat` — Chat transcripts
- `ticket` — Support tickets
- `form` — Form responses
- `wiki` — Wiki articles
- `contract` — Contracts, agreements
- `training` — Training materials
- `compliance` — Compliance documents

### Learning Types
- `interaction` — Task execution history
- `feedback` — User corrections/feedback
- `outcome` — Result of an action
- `pattern` — Detected patterns
- `anomaly` — Unusual occurrences
- `success` — Successful outcomes
- `failure` — Failed attempts

---

## API Endpoints

### Knowledge Bases
```
POST /api/knowledge-bases        - Create knowledge base
GET  /api/knowledge-bases        - List knowledge bases
GET  /api/knowledge-bases/:id    - Get knowledge base
DELETE /api/knowledge-bases/:id   - Delete knowledge base
```

### Documents
```
POST /api/documents              - Add document
POST /api/documents/batch        - Batch add documents
GET  /api/documents              - List documents
GET  /api/documents/:id          - Get document
DELETE /api/documents/:id        - Delete document
```

### Search & RAG
```
POST /api/search                  - Semantic search
POST /api/rag                     - Retrieval Augmented Generation
```

### Agent Memory
```
GET  /api/agents/:id/memory      - Get agent memory
POST /api/agents/:id/memory       - Add to memory
POST /api/agents/:id/memory/learn - Mark as learned
DELETE /api/agents/:id/memory    - Clear memory
```

### Feedback
```
POST /api/feedback                - Record feedback
```

### Analytics
```
GET  /api/analytics               - Learning analytics
GET  /api/sessions                - Learning sessions
```

---

## Example Usage

### Create Knowledge Base
```bash
curl -X POST http://localhost:4590/api/knowledge-bases \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Customer Support KB",
    "type": "support",
    "settings": {
      "embeddingModel": "text-embedding-ada-002",
      "chunkSize": 1000,
      "retrievalMode": "hybrid"
    }
  }'
```

### Add Documents
```bash
curl -X POST http://localhost:4590/api/documents \
  -H 'Content-Type: application/json' \
  -d '{
    "kbId": "kb-123",
    "title": "Refund Policy",
    "content": "Our refund policy allows returns within 30 days...",
    "type": "policy"
  }'
```

### Semantic Search
```bash
curl -X POST http://localhost:4590/api/search \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "How do I process a refund for a premium customer?",
    "kbId": "kb-123",
    "maxResults": 5
  }'
```

### RAG Query
```bash
curl -X POST http://localhost:4590/api/rag \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "What is our policy on refunds for VIP customers?",
    "kbId": "kb-123",
    "agentId": "support-agent-1"
  }'
```

### Record Feedback
```bash
curl -X POST http://localhost:4590/api/feedback \
  -H 'Content-Type: application/json' \
  -d '{
    "agentId": "support-agent-1",
    "type": "correction",
    "content": "The agent should have offered a partial refund instead of full refund",
    "outcome": "Customer accepted partial refund",
    "rating": 3
  }'
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    KnowledgeOS                          │
│                      (4590)                             │
├─────────────────────────────────────────────────────────┤
│  Knowledge Base Manager                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │   Company   │ │  Product    │ │  Customer   │      │
│  │   Policies │ │    Docs     │ │     KB      │      │
│  └─────────────┘ └─────────────┘ └─────────────┘      │
├─────────────────────────────────────────────────────────┤
│  Document Processor                                    │
│  Chunking → Embedding → Vector Store                  │
├─────────────────────────────────────────────────────────┤
│  Agent Memory Store                                    │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐             │
│  │ Agent │ │ Agent │ │ Agent │ │ Agent │             │
│  │   1   │ │   2   │ │   3   │ │   4   │             │
│  └───────┘ └───────┘ └───────┘ └───────┘             │
├─────────────────────────────────────────────────────────┤
│  RAG Engine                                           │
│  Query → Embed → Search → Context → LLM              │
└─────────────────────────────────────────────────────────┘
```

---

## Embedding Model

Currently uses mock embeddings. For production:
- OpenAI `text-embedding-ada-002`
- Cohere `embed-english-v2.0`
- Custom fine-tuned embeddings

---

## Next Steps

1. **Add vector DB** — Pinecone, Weaviate, or Qdrant
2. **Add reranking** — For better retrieval quality
3. **Add continuous learning** — Auto-update from feedback
4. **Add knowledge graphs** — For relationship mapping
5. **Add external sources** — Web scraping, RSS feeds
